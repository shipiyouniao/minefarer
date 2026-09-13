import { walkingPath } from '../src/game/dungeon-path.js'
import { storyEnvelopeStatus } from '../src/persistence/story-encoder.js'
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

test('all three crossings require boarding while shore deduction remains static', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  for (let floor = 1; floor <= 3; floor++) {
    const solved = solvePressureFloor(floor)
    assert.ok(solved, `crossing ${floor}`)
    assert.equal(solvePressureFloor(floor, false), null)
    assert.ok(solved.actions.some((a) => a.type === 'end-turn'))
    const mines = run.game.cells.map((c) => c.mine)
    for (const action of solved.actions) run = actExpedition(run, action)
    assert.deepEqual(
      run.game.cells.map((c) => c.mine),
      mines,
    )
    assert.equal(run.health, run.maxHealth)
    assert.equal(run.phase, floor === 3 ? 'won' : 'reward')
    if (run.phase === 'reward')
      run = actExpedition(run, {
        type: 'relic',
        relic: run.offers.find((x) => x === 'purse') ?? run.offers[0]!,
      })
  }
})

test('repeated waiting cannot reveal shore clues, visit anchors or finish a crossing', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  const shore = run.game.cells.flatMap((c, i) =>
    run.pressure!.water.includes(i) ? [] : [{ index: i, cell: c }],
  )
  const originalBoard = run.game
  const original = run.player
  for (let n = 0; n < 200; n++) run = actExpedition(run, { type: 'end-turn' })
  assert.equal(run.player, original)
  assert.equal(run.game, originalBoard)
  assert.equal(run.phase, 'exploring')
  assert.ok(run.pressure!.moorings.every((i) => !run.travelled.includes(i)))
  for (const { index, cell } of shore) assert.deepEqual(run.game.cells[index], cell)
  for (let step = 0; step < run.pressure!.stops.length; step++) {
    const visible = {
      ...run,
      game: {
        ...run.game,
        cells: run.game.cells.map((c) => ({ ...c, visibility: 'revealed' as const })),
      },
    }
    for (const goal of run.pressure!.moorings)
      assert.equal(
        walkingPath(visible, goal),
        null,
        'even complete shore knowledge cannot replace the crossing',
      )
    run = actExpedition(run, { type: 'end-turn' })
  }
  let aboard = createExpedition(PRESSURE_DEPARTURE)
  for (const action of solvePressureFloor(1)!.actions) {
    if (action.type === 'end-turn') break
    aboard = actExpedition(aboard, action)
  }
  assert.equal(aboard.player, aboard.pressure!.stops[aboard.pressure!.position])
  const known = aboard.game
  for (let n = 0; n < 200; n++) aboard = actExpedition(aboard, { type: 'end-turn' })
  assert.equal(aboard.game, known)
  assert.equal(aboard.phase, 'exploring')
  assert.ok(aboard.pressure!.moorings.every((i) => !aboard.travelled.includes(i)))
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
  const world = new StorySession(camp)
  assert.ok(camp.story.accepted?.includes('investigate-pressure'))
  assert.ok(world.travelNorthwest())
  for (const action of exploreOldFerry(world.run!).actions) assert.ok(world.dispatch(action))
  const slot = repo.forCampaign('pressure-cove')
  let stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  stage.completeCampaignScene('pressure-entry')
  const oldStorage = new MemoryStorage()
  oldStorage.setItem(
    'minesweeper.variants.v1.expedition',
    storage
      .getItem('minesweeper.variants.v1.expedition')!
      .replaceAll('pressure-cove-v2', 'pressure-cove-v1'),
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
  assert.ok(retired.start('explorer', []))
  retired.completeCampaignScene('pressure-entry')
  assert.ok(retired.dispatch({ type: 'end-turn' }))
  assert.equal(
    new ExpeditionSession(
      new VariantRepository(oldStorage).forCampaign('pressure-cove'),
      new FakeRuntime(),
    ).run?.pressure?.waits,
    1,
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
