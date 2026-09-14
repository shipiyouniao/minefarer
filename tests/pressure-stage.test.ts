import { recollectionUnlocks } from '../src/game/recollection.js'
import { downstreamCell } from '../src/game/pressure.js'
import { walkingPath } from '../src/game/dungeon-path.js'
import { storyEnvelopeStatus, encodeStory } from '../src/persistence/story-encoder.js'
import { exploreOldFerry } from './old-ferry-helpers.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { solvePressureFloor, PRESSURE_DEPARTURE } from './pressure-helpers.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { readyChapterTwo } from './recollection-helpers.js'
import { StorySession } from '../src/application/story-session.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { solveFerry } from './ferry-helpers.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'

test('three water minefields require local soundings, directed sailing and secured moorings', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (let floor = 1; floor <= 3; floor++) {
    const solved = solvePressureFloor(floor)
    assert.ok(solved, `crossing ${floor}`)
    assert.equal(solvePressureFloor(floor, false), null)
    assert.ok(solved.actions.filter((action) => action.type === 'reveal').length >= 14 * floor)
    assert.ok(solved.actions.some((action) => action.type === 'moor'))
    assert.ok(solved.actions.some((action) => action.type === 'interact'))
    const mines = run.game.cells.map((cell) => cell.mine)
    for (const action of solved.actions) {
      const before = run
      run = actExpedition(run, action)
      assert.notEqual(run, before, JSON.stringify(action))
      if (run.pressure!.water.includes(run.player)) assert.equal(run.pressure!.boat, run.player)
      if (action.type === 'reveal' && before.pressure!.water.includes(action.index)) {
        assert.ok(before.pressure!.anchored)
        assert.equal(run.player, before.player, 'sounding never walks onto a hidden mine')
        assert.deepEqual(
          run.collected,
          before.collected,
          'sounding does not remotely collect a chest',
        )
        assert.deepEqual(run.travelled, before.travelled, 'sounding does not record sailing')
      }
    }
    assert.deepEqual(
      run.game.cells.map((cell) => cell.mine),
      mines,
    )
    assert.ok(run.pressure!.moorings.every((entry) => entry.secured))
    assert.equal(run.health, run.maxHealth)
    assert.equal(run.phase, floor === 3 ? 'won' : 'reward')
    if (run.phase === 'reward')
      run = actExpedition(run, {
        type: 'relic',
        relic: run.offers.find((entry) => entry === 'purse') ?? run.offers[0]!,
      })
  }
})

test('an empty or anchored boat cannot drift, reveal distant water or secure anchors from shore', () => {
  const shore = createExpedition(PRESSURE_DEPARTURE)
  assert.equal(actExpedition(shore, { type: 'end-turn' }), shore)
  for (const entry of shore.pressure!.moorings)
    assert.equal(actExpedition(shore, { type: 'interact', index: entry.index }), shore)
  let aboard = actExpedition(shore, { type: 'move', index: shore.pressure!.boat })
  assert.notEqual(aboard, shore)
  assert.equal(actExpedition(aboard, { type: 'end-turn' }), aboard)
  const board = aboard.game
  for (let count = 0; count < 200; count++) aboard = actExpedition(aboard, { type: 'end-turn' })
  assert.equal(aboard.game, board)
  assert.ok(aboard.pressure!.moorings.every((entry) => !entry.secured))
  assert.equal(actExpedition(aboard, { type: 'reveal', index: 20 }), aboard)
  assert.equal(actExpedition(shore, { type: 'reveal', index: shore.pressure!.boat + 2 }), shore)
})

test('sailing cannot replace a forbidden upstream step with ordinary ground movement', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  let detours = 0
  for (const action of solvePressureFloor(1)!.actions) {
    const path = action.type === 'move' ? walkingPath(run, action.index) : null
    run = actExpedition(run, action)
    if (path && path.length > 1 && run.player === run.pressure!.boat) {
      const previous = path.at(-2)!
      if (!run.pressure!.water.includes(previous)) continue
      const back = walkingPath(run, previous)
      if (!back || back.length > 2) detours++
    }
  }
  assert.ok(detours >= 2, 'actual routes contain upstream edges that require a circuit or a rope')
})

test('hauling retraces only the paid-out rope without erasing discoveries or generating new travel', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (const action of solvePressureFloor(1)!.actions) {
    run = actExpedition(run, action)
    if (run.pressure!.line.length > 5) break
  }
  const river = run.pressure!
  assert.ok(river.line.length > 5)
  const returned = actExpedition(run, { type: 'haul' })
  assert.equal(returned.player, river.line[0])
  assert.equal(returned.pressure!.boat, returned.player)
  assert.deepEqual(returned.pressure!.voyage, [...river.line].reverse())
  assert.deepEqual(returned.pressure!.line, [returned.player])
  assert.equal(returned.game, run.game)
  assert.equal(returned.travelled, run.travelled)
  assert.equal(actExpedition(returned, { type: 'haul' }), returned)
})

test('Pressure Cove has a physical gate, replays every action and rewards completion only once', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage),
    camp = readyChapterTwo(repo),
    story = new StorySession(camp)
  assert.equal(
    new ExpeditionSession(repo.forCampaign('pressure-cove'), new FakeRuntime()).start(
      'explorer',
      [],
    ),
    false,
  )
  story.travelNorthwest()
  story.completeRegionalScene('reed-arrival')
  story.completeRegionalScene('ferry-lead')
  story.moveCamp(50)
  const ferry = new ExpeditionSession(repo.forCampaign('reed-channels'), new FakeRuntime())
  assert.ok(ferry.start('explorer', []))
  ferry.completeCampaignScene('ferry-entry')
  for (const action of solveFerry().actions) assert.ok(ferry.dispatch(action))
  ferry.completeCampaignScene('ferry-end')
  assert.ok(ferry.returnToCamp())
  assert.ok(recollectionUnlocks(repo.expedition()!).floors.includes('tidal'))
  assert.ok(!recollectionUnlocks(repo.expedition()!).floors.includes('river'))
  const world = new StorySession(camp)
  assert.ok(camp.story.accepted?.includes('investigate-pressure'))
  assert.ok(world.travelNorthwest())
  for (const action of exploreOldFerry(world.run!).actions) assert.ok(world.dispatch(action))
  const slot = repo.forCampaign('pressure-cove')
  let stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  stage.completeCampaignScene('pressure-entry')
  const oldStorage = new MemoryStorage()
  const recovery = repo.expedition()!
  oldStorage.setItem(
    'minesweeper.variants.v1.expedition',
    JSON.stringify({
      ...recovery,
      story: encodeStory(recovery.story!),
      campaign: {
        ...recovery.campaign,
        stages: recovery.campaign!.stages.map((entry) =>
          entry.id === 'pressure-cove'
            ? {
                ...entry,
                journal: {
                  ...entry.journal!,
                  returnSupplies: 175,
                  departure: { ...entry.journal!.departure, campaign: 'pressure-cove-v2' },
                },
              }
            : entry,
        ),
      },
    }),
  )
  assert.equal(
    storyEnvelopeStatus(oldStorage.getItem('minesweeper.variants.v1.expedition')),
    'supported',
  )
  const retired = new ExpeditionSession(
    new VariantRepository(oldStorage).forCampaign('pressure-cove'),
    new FakeRuntime(),
  )
  assert.equal(retired.run, null)
  assert.equal(
    new VariantRepository(oldStorage).expedition()!.camp.supplies,
    recovery.camp.supplies + 175,
  )
  assert.equal(
    new VariantRepository(oldStorage).expedition()!.camp.supplies,
    recovery.camp.supplies + 175,
    'retiring the same stage twice never repeats its checkpoint credit',
  )
  assert.ok(retired.start('explorer', []))
  retired.completeCampaignScene('pressure-entry')
  assert.ok(retired.dispatch({ type: 'move', index: retired.run!.pressure!.boat }))
  assert.ok(retired.dispatch({ type: 'moor' }))
  assert.equal(
    new ExpeditionSession(
      new VariantRepository(oldStorage).forCampaign('pressure-cove'),
      new FakeRuntime(),
    ).run?.pressure?.anchored,
    false,
  )

  const abandonedStorage = new MemoryStorage()
  abandonedStorage.setItem(
    'minesweeper.variants.v1.expedition',
    storage.getItem('minesweeper.variants.v1.expedition')!,
  )
  const abandonedRepo = new VariantRepository(abandonedStorage)
  const abandoned = new ExpeditionSession(
    abandonedRepo.forCampaign('pressure-cove'),
    new FakeRuntime(),
  )
  assert.ok(abandoned.dispatch({ type: 'retreat' }))
  assert.ok(abandoned.returnToCamp())
  assert.equal(
    campaignProgress(abandonedRepo.expedition()!.campaign, 'pressure-cove').cleared,
    false,
  )
  assert.ok(!abandonedRepo.expedition()!.story?.facts?.includes('pressure-cove-cleared'))

  for (let floor = 1; floor <= 3; floor++) {
    for (const action of solvePressureFloor(floor)!.actions) {
      assert.ok(stage.dispatch(action), JSON.stringify(action))
      if (stage.run?.phase === 'won') break
      const expected = stage.run
      stage = new ExpeditionSession(
        new VariantRepository(storage).forCampaign('pressure-cove'),
        new FakeRuntime(),
      )
      assert.deepEqual(stage.run, expected)
    }
    if (stage.run?.phase === 'reward')
      assert.ok(
        stage.dispatch({
          type: 'relic',
          relic: stage.run.offers.find((x) => x === 'purse') ?? stage.run.offers[0]!,
        }),
      )
  }
  assert.equal(stage.run?.phase, 'won')
  stage.completeCampaignScene('pressure-end')
  assert.ok(stage.returnToCamp())
  const saved = repo.expedition()!
  assert.ok(campaignProgress(saved.campaign, 'pressure-cove').cleared)
  assert.ok(camp.story.facts?.includes('pressure-cove-cleared'))
  assert.ok(camp.story.completed.includes('investigate-pressure'))
  assert.equal(new StorySession(camp).run?.board.scene.id, 'old-ferry')
  const supplies = saved.camp.supplies
  new ExpeditionSession(
    new VariantRepository(storage).forCampaign('pressure-cove'),
    new FakeRuntime(),
  )
  assert.equal(repo.expedition()!.camp.supplies, supplies)
})

test('drifting onto a discovered chest collects it once, while hauling grants no second reward', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (const action of solvePressureFloor(1)!.actions) {
    run = actExpedition(run, action)
    const target = downstreamCell(run, run.player)
    if (
      run.player !== run.pressure!.boat ||
      run.pressure!.anchored ||
      target === null ||
      !run.pressure!.water.includes(target) ||
      run.game.cells[target]!.visibility !== 'revealed'
    )
      continue
    const fixture = { ...run, treasures: [target], collected: [] }
    const drifted = actExpedition(fixture, { type: 'end-turn' })
    assert.notEqual(drifted, fixture)
    assert.deepEqual(drifted.collected, [target])
    assert.ok(drifted.loot > fixture.loot)
    assert.ok(drifted.travelled.includes(target))
    assert.equal(actExpedition(drifted, { type: 'haul' }).loot, drifted.loot)
    return
  }
  assert.fail('the playable river must include a known downstream landing')
})
