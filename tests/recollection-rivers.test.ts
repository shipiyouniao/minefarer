import { currentArrow } from '../src/ui/current-view.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { generateRecollectionFloor } from '../src/game/recollection-layout.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { expeditionConfig } from '../src/game/variant-difficulty.js'
import { adjacentSteps } from '../src/game/variant-board.js'
import { riverNeighbors, riverCellAction } from '../src/game/pressure.js'
import { advanceCurrent, currentPermutation } from '../src/game/floor-tide.js'
import { enterEncounter } from '../src/game/encounter-roster.js'
import { recollectionUnlocks } from '../src/game/recollection.js'
import { campaignProgress, updateCampaign } from '../src/game/campaign-catalog.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { readyChapterTwo, finishRecollectionFloor } from './recollection-helpers.js'
import { solveRiver } from './pressure-helpers.js'
import { CURRENT_DEPARTURE, FakeRuntime, MemoryStorage } from './helpers.js'
import type { Expedition } from '../src/types/variants.js'

/** Traverse real directed sailing edges or the unchanged walking shore without revealing a cell. */
function connected(run: Expedition): Set<number> {
  const found = new Set([run.entrance]),
    queue = [run.entrance]
  for (const index of queue) {
    for (const other of run.pressure
      ? riverNeighbors(run, index)
      : adjacentSteps(run.game, index)) {
      if (found.has(other) || run.walls.includes(other) || run.game.cells[other]!.mine) continue
      found.add(other)
      queue.push(other)
    }
  }
  return found
}

test('random rivers and tidal lanes preserve mine budgets, accessibility and independent mechanism variation', () => {
  const forecasts = new Set<string>()
  for (const difficulty of ['relaxed', 'standard', 'advanced', 'expert', 'abyss'] as const) {
    const rivers = new Set<string>(),
      tides = new Set<string>()
    for (let seed = 0; seed < 24; seed++) {
      for (const kind of ['tidal', 'river'] as const) {
        const config = expeditionConfig({ ...CURRENT_DEPARTURE, difficulty }, 1)
        const layout = generateRecollectionFloor(kind, seed * 7919, config)
        let run: Expedition = {
          ...createExpedition({ ...CURRENT_DEPARTURE, difficulty }),
          ...layout,
          player: layout.entrance,
        }
        if (run.pressure) {
          run = { ...run, pressure: { ...run.pressure, anchored: false } }
          rivers.add(JSON.stringify([run.pressure!.currents, run.pressure!.moorings, run.walls]))
          const found = connected(run)
          assert.ok(
            run.pressure!.moorings.every((entry) =>
              adjacentSteps(run.game, entry.index).some((index) => found.has(index)),
            ),
          )
          assert.ok(found.has(run.exit))
          assert.ok(
            run.game.cells.every(
              (cell, index) => cell.mine || run.walls.includes(index) || found.has(index),
            ),
          )
        } else {
          assert.ok(run.current && run.power)
          tides.add(JSON.stringify([run.current.lanes, run.power.junctions]))
          assert.ok(run.current.lanes.length >= 2)
          assert.ok(
            run.current.lanes.every(
              (lane) =>
                lane.cells.some((index) => run.game.cells[index]!.mine) &&
                lane.cells.some((index) => !run.game.cells[index]!.mine),
            ),
          )
          // Arbitrary switch sequences rotate hazards while every safe landing remains connected.
          for (let turn = 0; turn < 20; turn++) {
            const permutation = currentPermutation(run)
            for (const lane of run.current!.lanes) {
              const from = lane.cells[lane.direction === 1 ? 0 : 1]!,
                to = permutation[from]!
              if (to === from) continue
              const delta = to - from
              const expected =
                Math.abs(delta) === config.width ? (delta > 0 ? '↓' : '↑') : delta > 0 ? '→' : '←'
              assert.equal(
                currentArrow(lane, config.width),
                expected,
                'forecast follows the actual permutation',
              )
              forecasts.add(expected)
            }
            const before = run
            run = advanceCurrent(before, {
              ...run,
              power: {
                ...run.power!,
                junctions: run.power!.junctions.map((entry, index) =>
                  index === turn % run.power!.junctions.length
                    ? { ...entry, selected: entry.selected === 0 ? 1 : 0 }
                    : entry,
                ),
              },
            })
            const found = connected(run)
            assert.equal(run.game.cells.filter((cell) => cell.mine).length, config.mines)
            assert.ok(found.has(run.exit))
            assert.ok(
              run.game.cells.every(
                (cell, index) => cell.mine || run.walls.includes(index) || found.has(index),
              ),
            )
            assert.deepEqual(run.walls, before.walls)
          }
        }
        const boss = enterEncounter({
          ...run,
          floor: 3,
          departure: {
            ...run.departure,
            difficulty: 'relaxed',
            recollection: { floors: [kind], bosses: ['bastion'] },
          },
        })
        assert.ok(boss.encounter)
        assert.equal(boss.pressure, undefined)
        assert.equal(boss.current, undefined)
      }
    }
    assert.equal(rivers.size, 24)
    assert.equal(tides.size, 24)
  }
  assert.deepEqual([...forecasts].sort(), ['↑', '↓', '←', '→'].sort())
})

test('each chapter-two completion unlocks only its own Recollection family, and the choice survives reload', () => {
  const repository = new VariantRepository(new MemoryStorage())
  const camp = readyChapterTwo(repository)
  camp.saveStory({ ...camp.story, facts: [...camp.story.facts!, 'recollection-awakened'] })
  let saved = repository.expedition()!
  repository.saveExpedition({ ...saved, journal: null })
  for (const [stage, kind] of [
    ['reed-channels', 'tidal'],
    ['pressure-cove', 'river'],
  ] as const) {
    let session = new ExpeditionSession(repository, new FakeRuntime())
    assert.ok(!recollectionUnlocks(repository.expedition()!).floors.includes(kind))
    assert.equal(
      session.start('explorer', [], 'relaxed', { floors: [kind], bosses: ['bastion'] }),
      false,
    )
    saved = repository.expedition()!
    repository.saveExpedition({
      ...saved,
      campaign: updateCampaign(saved.campaign, {
        ...campaignProgress(saved.campaign, stage),
        cleared: true,
      }),
    })
    session = new ExpeditionSession(repository, new FakeRuntime())
    assert.ok(session.start('explorer', [], 'relaxed', { floors: [kind], bosses: ['bastion'] }))
    assert.deepEqual(new ExpeditionSession(repository, new FakeRuntime()).run, session.run)
    assert.ok(session.dispatch({ type: 'retreat' }))
    assert.ok(session.returnToCamp())
  }
})

test('generated tidal and river floors complete through accepted actions and replay the same expedition', () => {
  for (const kind of ['tidal', 'river'] as const) {
    const repository = new VariantRepository(new MemoryStorage())
    const camp = readyChapterTwo(repository)
    camp.saveStory({ ...camp.story, facts: [...camp.story.facts!, 'recollection-awakened'] })
    const saved = repository.expedition()!,
      stage = kind === 'tidal' ? 'reed-channels' : 'pressure-cove'
    repository.saveExpedition({
      ...saved,
      journal: null,
      campaign: updateCampaign(saved.campaign, {
        ...campaignProgress(saved.campaign, stage),
        cleared: true,
      }),
    })
    const runtime = new FakeRuntime()
    let session = new ExpeditionSession(repository, runtime)
    if (kind === 'river') {
      // Find a public-clue-solvable sample; this is not a promise that every random seed needs no guess.
      const seed = Array.from({ length: 48 }, (_, index) => index).find((seed) =>
        solveRiver(
          createExpedition({
            ...CURRENT_DEPARTURE,
            difficulty: 'relaxed',
            seed,
            recollection: { floors: ['river'], bosses: ['bastion'] },
          }),
        ),
      )
      assert.notEqual(seed, undefined)
      runtime.seed = seed!
    }
    assert.ok(session.start('explorer', [], 'relaxed', { floors: [kind], bosses: ['bastion'] }))
    if (kind === 'tidal') finishRecollectionFloor(session)
    else {
      const plan = solveRiver(session.run!)
      assert.ok(plan)
      for (const action of plan.actions) {
        assert.ok(session.dispatch(action))
        assert.deepEqual(new ExpeditionSession(repository, runtime).run, session.run)
      }
    }
    assert.equal(session.run!.phase, 'reward')
    session = new ExpeditionSession(repository, runtime)
    assert.ok(session.dispatch({ type: 'relic', relic: session.run!.offers[0]! }))
    assert.equal(session.run!.floor, 2)
    assert.equal(!!session.run!.pressure, kind === 'river')
    assert.equal(!!session.run!.current, kind === 'tidal')
    assert.deepEqual(new ExpeditionSession(repository, runtime).run, session.run)
  }
})

test('generated pontoons remain clickable sailing destinations after their mooring is secured', () => {
  let run = createExpedition({
    ...CURRENT_DEPARTURE,
    difficulty: 'relaxed',
    seed: 7,
    recollection: { floors: ['river'], bosses: ['bastion'] },
  })
  const plan = solveRiver(run)
  assert.ok(plan)
  let checked = false
  for (const action of plan.actions) {
    for (const mooring of run.pressure!.moorings) {
      if (!mooring.secured) continue
      const moved = actExpedition(run, { type: 'move', index: mooring.index })
      if (moved === run) continue
      assert.deepEqual(riverCellAction(run, mooring.index), { type: 'move', index: mooring.index })
      assert.deepEqual(actExpedition(run, riverCellAction(run, mooring.index)), moved)
      checked = true
    }
    run = actExpedition(run, action)
  }
  assert.ok(checked, 'the regression crosses a real secured water mooring')
})
