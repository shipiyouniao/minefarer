import assert from 'node:assert/strict'
import test from 'node:test'
import { solvePressureFloor, PRESSURE_DEPARTURE } from './pressure-helpers.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { pressureReadings } from '../src/game/pressure.js'
import { deducePressure } from '../src/game/pressure-deduction.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { readyChapterTwo } from './recollection-helpers.js'
import { StorySession } from '../src/application/story-session.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { solveFerry } from './ferry-helpers.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'

test('pressure reaches need relational clues and tides, not guesses, damage or paid tools', () => {
  let run = createExpedition(PRESSURE_DEPARTURE)
  assert.equal(run.game.cells[run.pressure!.lessonTarget]!.visibility, 'hidden')
  const firstReading = pressureReadings(run.game, run.pressure!.pairs)[0]!
  assert.equal(firstReading.difference, 0)
  assert.ok(
    firstReading.a.every(
      (i) => run.game.cells[i]!.visibility === 'revealed' && !run.game.cells[i]!.mine,
    ),
  )
  for (let floor = 1; floor <= 3; floor++) {
    const solved = solvePressureFloor(floor)
    assert.ok(solved, `floor ${floor}`)
    if (floor > 1)
      assert.equal(solvePressureFloor(floor, floor - 1), null, 'each new comparison is necessary')
    assert.equal(
      solvePressureFloor(floor, false),
      null,
      'ordinary clues alone must not solve the route',
    )
    assert.ok(solved.actions.some((a) => a.type === 'interact'))
    assert.ok(run.game.config.mines >= 40)
    for (const action of solved.actions) run = actExpedition(run, action)
    assert.equal(run.health, run.maxHealth)
    assert.ok(run.pressure!.moorings.every((i) => run.travelled.includes(i)))
    assert.equal(run.phase, floor === 3 ? 'won' : 'reward')
    if (run.phase === 'reward')
      run = actExpedition(run, {
        type: 'relic',
        relic: run.offers.find((x) => x === 'purse') ?? run.offers[0]!,
      })
  }
})

test('pressure deductions never inspect covered mine truth or accept guessed flags', () => {
  const run = createExpedition(PRESSURE_DEPARTURE)
  const readings = pressureReadings(run.game, run.pressure!.pairs)
  const expected = deducePressure(run.game, run.walls, readings)
  const changed = {
    ...run.game,
    cells: run.game.cells.map((c) =>
      c.visibility === 'revealed'
        ? c
        : { ...c, mine: !c.mine, adjacent: 8, visibility: 'flagged' as const },
    ),
  }
  assert.deepEqual(deducePressure(changed, run.walls, readings), expected)
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
  assert.ok(world.dispatch({ type: 'visit', index: 85 }))
  const slot = repo.forCampaign('pressure-cove')
  let stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  stage.completeCampaignScene('pressure-entry')
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
