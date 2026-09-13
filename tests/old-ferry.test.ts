import assert from 'node:assert/strict'
import test from 'node:test'
import { createStoryRun, storyPath } from '../src/game/story.js'
import { checkpointStory, restoreStoryWorld } from '../src/game/story-checkpoint.js'
import { decodeStoryWorld } from '../src/persistence/story-world-decoder.js'
import { parseJson } from '../src/persistence/json-reader.js'
import { storyEnvelopeStatus } from '../src/persistence/story-encoder.js'
import { MemoryStorage } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { CampSession } from '../src/application/camp-session.js'
import { readyChapterTwo } from './recollection-helpers.js'
import { exploreOldFerry } from './old-ferry-helpers.js'

test('Old Ferry requires public-clue exploration from either safe landing and retains its route', () => {
  for (const [start, destination] of [
    [28, 85],
    [85, 28],
  ]) {
    const initial = { ...createStoryRun(10), player: start! }
    assert.equal(initial.board.game.config.mines, 11)
    assert.ok(initial.board.game.cells.filter((c) => c.visibility === 'hidden').length > 50)
    assert.equal(storyPath(initial.board, start!, destination!), null)
    const solved = exploreOldFerry(initial, destination)
    assert.ok(solved.actions.filter((a) => a.type === 'visit').length >= 8)
    const saved = checkpointStory(solved.run)
    assert.deepEqual(
      restoreStoryWorld(decodeStoryWorld(parseJson(JSON.stringify(saved)))!),
      solved.run,
    )
  }
})

test('legacy empty ferry migrates locally, relocates unsafe players and remains writable', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage),
    camp = readyChapterTwo(repo)
  const checkpoint = checkpointStory(createStoryRun(10)).scenes[0]!
  const { terrainRevision, ...legacy } = checkpoint
  assert.equal(terrainRevision, 1)
  const previous = camp.story.world!.scenes
  camp.saveStory({
    ...camp.story,
    arrived: false,
    journal: null,
    world: {
      revision: 2,
      active: 'old-ferry',
      hasVisited: true,
      scenes: [...previous, { ...legacy, player: 17 }],
    },
  })
  const restored = new CampSession(new VariantRepository(storage))
  assert.equal(restored.story.world!.scenes.at(-1)!.player, 28)
  assert.deepEqual(restored.story.world!.scenes.slice(0, -1), previous)
  assert.deepEqual(restored.story.completed, camp.story.completed)
  assert.deepEqual(restored.story.dialogue, camp.story.dialogue)
  restored.saveStory({ ...restored.story, mapOwned: false })
  assert.equal(new CampSession(new VariantRepository(storage)).story.mapOwned, false)
  const raw = storage.getItem('minesweeper.variants.v1.expedition')!
  assert.equal(storyEnvelopeStatus(raw), 'supported')
  assert.equal(
    storyEnvelopeStatus(raw.replace('"terrainRevision":1', '"terrainRevision":2')),
    'unsupported',
  )
})
