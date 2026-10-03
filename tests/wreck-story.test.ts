import assert from 'node:assert/strict'
import test from 'node:test'
import { readyWreck } from './wreck-helpers.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { StorySession } from '../src/application/story-session.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { exploreOldFerry } from './old-ferry-helpers.js'
import { solveConvoy } from './convoy-helpers.js'
import { solveKeelcrab } from './keelcrab-helpers.js'
import { recollectionUnlocks } from '../src/game/recollection.js'
import { pendingWreckScene } from '../src/game/wreck-story.js'
import { STORY_SCENES } from '../src/game/story-content.js'
import { northwestPortals } from '../src/game/northwest-world.js'
import { storyTaskLocation } from '../src/game/story-task-location.js'
import type { Expedition } from '../src/types/variants.js'

test('optional rescue persists its invitation, physical route, five playable steps and once-only ending', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage),
    camp = readyWreck(repo)
  let world = new StorySession(camp)
  assert.equal(world.run?.board.scene.id, 'old-ferry')
  assert.equal(
    northwestPortals('old-ferry', camp.story).some((p) => p.destination === 'driftwood-bank'),
    false,
  )
  const slot = repo.forCampaign('wreck-harbor')
  assert.equal(new ExpeditionSession(slot, new FakeRuntime()).start('explorer', []), false)
  camp.acceptWreckRumor()
  const invited = JSON.stringify(repo.expedition())
  camp.acceptWreckRumor()
  assert.equal(JSON.stringify(repo.expedition()), invited)
  assert.ok(camp.story.accepted?.includes('silence-wreck'))
  assert.ok(!camp.story.completed.includes('silence-wreck'))
  assert.equal(storyTaskLocation(camp.story, 'silence-wreck'), 'driftwood-bank')
  for (const action of exploreOldFerry(world.run!, 76).actions) assert.ok(world.dispatch(action))
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'driftwood-bank')
  assert.ok(camp.story.facts?.includes('wreck-crew-found'))
  for (const action of exploreOldFerry(world.run!, 118).actions) assert.ok(world.dispatch(action))
  let stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  assert.equal(stage.run?.floor, 1)
  const abandonedStorage = new MemoryStorage()
  for (const [key, value] of storage.data) abandonedStorage.setItem(key, value)
  const abandonedRepo = new VariantRepository(abandonedStorage)
  const abandoned = new ExpeditionSession(
    abandonedRepo.forCampaign('wreck-harbor'),
    new FakeRuntime(),
  )
  assert.ok(abandoned.dispatch({ type: 'retreat' }))
  assert.ok(abandoned.returnToCamp())
  assert.ok(!abandonedRepo.expedition()!.story?.facts?.includes('wreck-silenced'))
  assert.ok(!recollectionUnlocks(abandonedRepo.expedition()!).bosses.includes('keelcrab'))
  for (const floor of [1, 2, 3, 4, 5]) {
    const entry = pendingWreckScene(stage.run, stage.stageProgress)!
    stage.completeCampaignScene(entry)
    const actions = floor < 5 ? solveConvoy(stage.run!)! : solveKeelcrab(stage.run!)!
    assert.ok(actions)
    if (floor === 4) {
      const initial: Expedition = stage.run!
      for (const action of [
        actions[0]!,
        { type: 'convoy-undo' } as const,
        actions[0]!,
        { type: 'convoy-reset' } as const,
      ]) {
        assert.ok(stage.dispatch(action))
        const expected: Expedition | null = stage.run
        stage = new ExpeditionSession(
          new VariantRepository(storage).forCampaign('wreck-harbor'),
          new FakeRuntime(),
        )
        assert.deepEqual(stage.run, expected)
      }
      assert.deepEqual(stage.run!.convoy!.boats, initial.convoy!.boats)
      assert.equal(stage.run!.convoy!.round, 0)
    }
    for (const action of actions) {
      assert.ok(stage.dispatch(action), JSON.stringify(action))
      if (stage.run?.phase === 'won') break
      const expected: Expedition | null = stage.run
      stage = new ExpeditionSession(
        new VariantRepository(storage).forCampaign('wreck-harbor'),
        new FakeRuntime(),
      )
      assert.deepEqual(stage.run, expected)
    }
    const beat = pendingWreckScene(stage.run, stage.stageProgress)
    if (beat) stage.completeCampaignScene(beat)
    if (floor < 5) {
      assert.ok(!recollectionUnlocks(repo.expedition()!).bosses.includes('keelcrab'))
      assert.ok(stage.dispatch({ type: 'descend' }))
    }
  }
  assert.equal(stage.run?.phase, 'won')
  assert.deepEqual(camp.camp.storyEquipment, ['pilot-bell'])
  assert.ok(camp.story.facts?.includes('wreck-convoy-home'))
  assert.ok(camp.story.facts?.includes('wreck-silenced'))
  assert.ok(camp.story.completed.includes('silence-wreck'))
  assert.ok(recollectionUnlocks(repo.expedition()!).bosses.includes('keelcrab'))
  assert.equal(pendingWreckScene(stage.run, stage.stageProgress), null)
  const supplies = camp.camp.supplies
  assert.ok(stage.returnToCamp())
  stage = new ExpeditionSession(slot, new FakeRuntime())
  assert.equal(camp.camp.supplies, supplies)
  assert.equal(stage.start('explorer', []), false)
  world = new StorySession(camp)
  assert.equal(world.run?.board.scene.id, 'driftwood-bank')
  assert.equal(world.run?.player, 118)
  assert.ok(world.dispatch({ type: 'visit', index: 77 }))
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'old-ferry')
  assert.ok(world.travelNorthwest())
  assert.equal(world.run?.board.scene.id, 'driftwood-bank')
  assert.equal(world.run?.health, 3)
})

test('driftwood banks keep water impassable and a safe bidirectional road to the pier', () => {
  const scene = STORY_SCENES.find((s) => s.id === 'driftwood-bank')!
  assert.ok(scene.rows.every((row) => row.length === 15))
  for (const index of scene.water!) assert.equal(scene.rows.join('')[index], '#')
  for (const index of [77, 92, ...Array.from({ length: 13 }, (_, i) => 106 + i)])
    assert.ok(['o', 'S', 'E'].includes(scene.rows.join('')[index]!))
})
