import { OLD_FERRY_MAIN_ROAD } from '../src/game/northwest-world.js'
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

test('Old Ferry keeps its main route clear while optional exploration persists', () => {
  for (const [start, destination] of [
    [28, 85],
    [85, 28],
  ]) {
    const initial = { ...createStoryRun(10), player: start! }
    assert.equal(initial.board.game.config.mines, 7)
    assert.ok(initial.board.game.cells.filter((c) => c.visibility === 'hidden').length > 20)
    assert.ok(storyPath(initial.board, start!, destination!))
    const solved = exploreOldFerry(initial, destination)
    assert.ok(solved.actions.filter((a) => a.type === 'visit').length >= 1)
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
  assert.equal(terrainRevision, 2)
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
    storyEnvelopeStatus(raw.replace('"terrainRevision":2', '"terrainRevision":3')),
    'unsupported',
  )
})

test('every safe shore tile and future road pad connects to the permanent main road', () => {
  const run = createStoryRun(10)
  for (const i of OLD_FERRY_MAIN_ROAD)
    assert.ok(
      !run.board.walls.includes(i) &&
        !run.board.game.cells[i]!.mine &&
        run.board.game.cells[i]!.visibility === 'revealed',
    )
  for (const pad of [50, 89]) assert.ok(storyPath(run.board, 28, pad))
  const surveyed = {
    ...run.board,
    game: {
      ...run.board.game,
      cells: run.board.game.cells.map((c) => ({ ...c, visibility: 'revealed' as const })),
    },
  }
  for (const [i, c] of surveyed.game.cells.entries())
    if (!c.mine && !surveyed.walls.includes(i))
      assert.ok(storyPath(surveyed, 28, i), `safe cell ${i} must not be stranded`)
})

test('clearing the main road preserves side flags and prior damage in terrain revision one', () => {
  const current = checkpointStory(createStoryRun(10))
  const older = {
    ...current,
    scenes: current.scenes.map((c) => ({
      ...c,
      terrainRevision: 1,
      health: 2,
      revealed: [40],
      flagged: [47, 17],
      triggered: [47],
    })),
  }
  const restored = decodeStoryWorld(parseJson(JSON.stringify(older)))!
  assert.equal(restored.scenes[0]!.terrainRevision, 2)
  assert.equal(restored.scenes[0]!.health, 2)
  assert.deepEqual(restored.scenes[0]!.flagged, [17])
  assert.deepEqual(restored.scenes[0]!.triggered, [])
  assert.deepEqual(restored.scenes[0]!.revealed, [])
})
