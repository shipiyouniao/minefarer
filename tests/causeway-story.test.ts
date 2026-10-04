import assert from 'node:assert/strict'
import test from 'node:test'
import { readyWreck } from './wreck-helpers.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { StorySession } from '../src/application/story-session.js'
import { pendingCausewayScene } from '../src/game/causeway-story.js'
import { recollectionUnlocks } from '../src/game/recollection.js'
import { northwestPortals } from '../src/game/northwest-world.js'
import { STORY_SCENES } from '../src/game/story-content.js'
import { STORY_SCENE_IDS } from '../src/game/story-checkpoint.js'
import { storyTaskLocation } from '../src/game/story-task-location.js'
import { solveCauseway } from './causeway-helpers.js'
import type { Expedition } from '../src/types/variants.js'

test('causeway follows Pressure Cove independently of the side quest, restores every bridge and opens a persistent return route', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage),
    camp = readyWreck(repo)
  let world = new StorySession(camp)
  assert.ok(camp.story.accepted?.includes('cross-causeway'))
  assert.equal(storyTaskLocation(camp.story, 'cross-causeway'), 'split-bank')
  const slot = repo.forCampaign('broken-causeway')
  let stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.equal(stage.start('explorer', []), false)
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'split-bank')
  assert.ok(world.dispatch({ type: 'visit', index: 45 }))
  assert.ok(!world.travelNorthwest())
  const before = camp.camp.supplies
  assert.ok(stage.start('explorer', []))
  const abandonedStorage = new MemoryStorage()
  for (const [k, v] of storage.data) abandonedStorage.setItem(k, v)
  const abandonedRepo = new VariantRepository(abandonedStorage)
  const abandoned = new ExpeditionSession(
    abandonedRepo.forCampaign('broken-causeway'),
    new FakeRuntime(),
  )
  assert.ok(abandoned.dispatch({ type: 'retreat' }))
  assert.ok(!recollectionUnlocks(abandonedRepo.expedition()!).floors.includes('causeway'))
  for (let floor = 1; floor <= 3; floor++) {
    const entry = pendingCausewayScene(stage.run, stage.stageProgress)!
    assert.ok(entry)
    stage.completeCampaignScene(entry)
    const solution = solveCauseway(stage.run!)
    assert.ok(solution)
    for (const action of solution.actions) {
      assert.ok(stage.dispatch(action), JSON.stringify(action))
      if (stage.run?.phase === 'won') break
      if (action.type === 'bridge' || action.type === 'bridge-pick') {
        const expected: Expedition | null = stage.run
        stage = new ExpeditionSession(
          new VariantRepository(storage).forCampaign('broken-causeway'),
          new FakeRuntime(),
        )
        assert.deepEqual(stage.run, expected)
        assert.equal(pendingCausewayScene(stage.run, stage.stageProgress), null)
      }
    }
    if (floor < 3)
      assert.ok(
        stage.dispatch(
          stage.run!.offers[0]
            ? { type: 'relic', relic: stage.run!.offers[0] }
            : { type: 'descend' },
        ),
      )
  }
  assert.equal(stage.run?.phase, 'won')
  assert.equal(camp.camp.supplies, before + 220)
  assert.ok(camp.story.completed.includes('cross-causeway'))
  assert.ok(recollectionUnlocks(repo.expedition()!).floors.includes('causeway'))
  stage.returnToCamp()
  const resumed = new ExpeditionSession(slot, new FakeRuntime())
  assert.equal(pendingCausewayScene(resumed.run, resumed.stageProgress), 'causeway-end')
  camp.completeStageScene('broken-causeway', 'causeway-end')
  camp.completeStageScene('broken-causeway', 'causeway-end')
  assert.equal(camp.camp.supplies, before + 220)
  assert.equal(pendingCausewayScene(null, camp.stageProgress('broken-causeway')), null)
  world = new StorySession(camp)
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'upstream-steps')
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'split-bank')
  assert.ok(
    northwestPortals('split-bank', camp.story).some(
      (p) => p.index === 45 && p.destination === 'upstream-steps',
    ),
  )
  assert.equal(resumed.start('explorer', []), false)
})

test('new scenes append stable save IDs and retain mine-free through roads with optional hazards', () => {
  assert.deepEqual(
    STORY_SCENES.map((s) => s.id),
    STORY_SCENE_IDS,
  )
  assert.equal(STORY_SCENE_IDS[10], 'old-ferry')
  for (const id of ['split-bank', 'upstream-steps']) {
    const scene = STORY_SCENES.find((s) => s.id === id)!
    assert.ok(scene.rows.every((r) => r.length === 13))
    assert.ok(scene.rows.join('').includes('*'))
    for (const i of scene.water ?? []) assert.equal(scene.rows.join('')[i], '#')
  }
})
