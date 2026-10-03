import { recollectionUnlocks } from '../src/game/recollection.js'
import { professionSkillAvailability } from '../src/game/profession-skills.js'
import { riverRoutes } from '../src/game/pressure.js'
import { storyEnvelopeStatus, encodeStory } from '../src/persistence/story-encoder.js'
import { exploreOldFerry } from './old-ferry-helpers.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { solvePressureFloor, PRESSURE_DEPARTURE } from './pressure-helpers.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { MemoryStorage, FakeRuntime, CURRENT_DEPARTURE } from './helpers.js'
import { readyChapterTwo } from './recollection-helpers.js'
import { StorySession } from '../src/application/story-session.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { solveFerry } from './ferry-helpers.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'
import { loadExpeditionSave } from '../src/persistence/variant-decoders.js'
import { EXPEDITION_RULES_REVISION } from '../src/persistence/expedition-format.js'

test('a rules revision banks an old campaign checkpoint even when its content ID has not changed', () => {
  const repo = new VariantRepository(new MemoryStorage())
  readyChapterTwo(repo)
  const save = repo.expedition()!
  const raw = JSON.stringify({
    ...save,
    journal: null,
    story: encodeStory(save.story!),
    campaign: {
      schemaVersion: 1,
      stages: [
        {
          id: 'tower-control',
          cleared: false,
          lesson: 4,
          scenes: [],
          records: [],
          recordSaved: false,
          journal: {
            rulesRevision: EXPEDITION_RULES_REVISION - 1,
            returnSupplies: 175,
            departure: { campaign: 'tower-control-v1' },
            actions: [],
          },
        },
      ],
    },
  })
  const loaded = loadExpeditionSave(raw)!
  assert.equal(loaded.save.camp.supplies, save.camp.supplies + 175)
  assert.equal(loaded.save.campaign!.stages[0]!.journal, null)
  const encoded = JSON.stringify({ ...loaded.save, story: encodeStory(loaded.save.story!) })
  assert.equal(loadExpeditionSave(encoded)!.returnedSupplies, null)
  for (const revision of [null, -1, EXPEDITION_RULES_REVISION, EXPEDITION_RULES_REVISION + 1]) {
    const malformed = JSON.parse(raw)
    malformed.campaign.stages[0].journal.rulesRevision = revision
    assert.equal(
      loadExpeditionSave(JSON.stringify(malformed))!.save.camp.supplies,
      save.camp.supplies,
    )
  }
})

test('three crossings require whole-route deductions and continuous voyages without an anchor toggle', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (let floor = 1; floor <= 3; floor++) {
    const solved = solvePressureFloor(floor)
    assert.ok(solved, `crossing ${floor}`)
    assert.equal(solvePressureFloor(floor, false), null)
    assert.ok(solved.actions.filter((action) => action.type === 'reveal').length >= 4)
    assert.ok(solved.actions.filter((action) => action.type === 'sail').length >= 3)
    assert.ok(
      solved.run.collected.length < solved.run.treasures.length,
      'optional branches can be skipped',
    )
    const mines = run.game.cells.map((cell) => cell.mine)
    for (const action of solved.actions) {
      const before = run
      run = actExpedition(run, action)
      assert.notEqual(run, before, JSON.stringify(action))
      if (run.pressure!.water.includes(run.player)) assert.equal(run.pressure!.boat, run.player)
      if (action.type === 'reveal' && before.pressure!.water.includes(action.index)) {
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
    assert.equal(run.health, run.maxHealth)
    assert.equal(run.phase, floor === 3 ? 'won' : 'reward')
    if (run.phase === 'reward')
      run = actExpedition(run, {
        type: 'relic',
        relic: run.offers.find((entry) => entry === 'purse') ?? run.offers[0]!,
      })
  }
})

test('quick-open checks a reachable channel without moving the boat', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (const action of solvePressureFloor(1)!.actions) {
    run = actExpedition(run, action)
    if (run.player !== run.pressure!.boat) continue
    for (const [index, cell] of run.game.cells.entries()) {
      if (cell.visibility !== 'revealed' || !cell.adjacent) continue
      const next = actExpedition(run, { type: 'chord', index })
      if (
        next.game.cells.filter((c) => c.visibility === 'revealed').length <=
        run.game.cells.filter((c) => c.visibility === 'revealed').length
      )
        continue
      assert.equal(next.player, run.player)
      assert.equal(next.pressure!.boat, run.pressure!.boat)
      assert.equal(next.health, run.health)
      return
    }
  }
  assert.fail('Expected a useful public-clue quick-open before departure')
})

test('waymarkers cannot strand a return mark on water and retain their skill after disembarking', () => {
  // After boarding, a movement skill cannot leave a mark behind in the water.
  for (const difficulty of ['relaxed', 'standard', 'advanced', 'expert', 'abyss'] as const) {
    let river = createExpedition({
      ...CURRENT_DEPARTURE,
      profession: 'waymarker',
      difficulty,
      seed: 7,
      recollection: { floors: ['river'], bosses: ['bastion'] },
    })
    river = actExpedition(river, { type: 'move', index: river.pressure!.boat })
    assert.equal(river.player, river.pressure!.boat)
    assert.equal(professionSkillAvailability(river), 'ashore-only')
    assert.equal(actExpedition(river, { type: 'skill' }), river)
    assert.equal(river.waymark, undefined)
  }

  // The authored shore lets the same character board, disembark and place a valid mark.
  const shore = createExpedition({ ...PRESSURE_DEPARTURE, profession: 'waymarker' })
  const aboard = actExpedition(shore, { type: 'move', index: shore.pressure!.boat })
  assert.notEqual(aboard, shore)
  assert.equal(actExpedition(aboard, { type: 'skill' }), aboard)
  const landed = actExpedition(aboard, { type: 'move', index: shore.player })
  assert.notEqual(landed, aboard)
  assert.equal(professionSkillAvailability(landed), 'ready')
  const placed = actExpedition(landed, { type: 'skill' })
  assert.equal(placed.waymark!.index, landed.player)
  assert.equal(placed.skillUsed, false)
  const boardedAgain = actExpedition(placed, { type: 'move', index: placed.pressure!.boat })
  assert.equal(professionSkillAvailability(boardedAgain), 'ashore-only')
  assert.equal(actExpedition(boardedAgain, { type: 'skill' }), boardedAgain)
  assert.deepEqual(boardedAgain.waymark, placed.waymark)
})

test('previews expose geometry and known flags, never concealed mines; ordinary movement cannot bypass a voyage', () => {
  const shore = createExpedition(PRESSURE_DEPARTURE)
  assert.equal(actExpedition(shore, { type: 'sail', index: shore.pressure!.boat - 15 }), shore)
  const aboard = actExpedition(shore, { type: 'move', index: shore.pressure!.boat })
  const routes = riverRoutes(aboard)
  assert.ok(routes.length >= 2)
  const altered = {
    ...aboard,
    game: {
      ...aboard.game,
      cells: aboard.game.cells.map((cell) =>
        cell.visibility === 'hidden' ? { ...cell, mine: !cell.mine, adjacent: 8 } : cell,
      ),
    },
  }
  assert.deepEqual(riverRoutes(altered), routes)
  for (const route of routes) {
    assert.ok(route.path.length >= 5)
    assert.equal(actExpedition(aboard, { type: 'move', index: route.launch }), aboard)
    assert.equal(actExpedition(aboard, { type: 'end-turn' }), aboard)
    if (route.unknown.length)
      assert.equal(actExpedition(aboard, { type: 'sail', index: route.launch }), aboard)
  }
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
  assert.deepEqual(returned.travelled, run.travelled)
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
                  departure: { ...entry.journal!.departure, campaign: 'pressure-cove-v3' },
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
  assert.deepEqual(
    new ExpeditionSession(
      new VariantRepository(oldStorage).forCampaign('pressure-cove'),
      new FakeRuntime(),
    ).run,
    retired.run,
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

test('one voyage visits every intermediate tile and collects treasure only once, with no required berth checklist', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (const action of solvePressureFloor(1)!.actions) {
    if (action.type === 'sail') {
      const route = riverRoutes(run).find((route) => route.launch === action.index)!
      const treasure = route.path[2]!
      const fixture = { ...run, treasures: [treasure], collected: [] }
      const sailed = actExpedition(fixture, action)
      assert.equal(sailed.player, route.destination)
      assert.deepEqual(sailed.pressure!.voyage, route.path)
      assert.ok(route.path.every((index) => sailed.travelled.includes(index)))
      assert.deepEqual(sailed.collected, [treasure])
      const returned = actExpedition(sailed, { type: 'haul' })
      assert.equal(returned.loot, sailed.loot)
      assert.equal(actExpedition(returned, action).loot, sailed.loot)
      return
    }
    run = actExpedition(run, action)
  }
  assert.fail('Expected a whole voyage')
})
