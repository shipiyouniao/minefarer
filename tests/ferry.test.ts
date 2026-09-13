import { actExpedition, createExpedition } from '../src/game/expedition.js'
import { FERRY_DEPARTURE } from './ferry-helpers.js'
import { feedPowered } from '../src/game/floor-power.js'
import { CampSession } from '../src/application/camp-session.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { solveFerry } from './ferry-helpers.js'
import { readyChapterTwo } from './recollection-helpers.js'
import { FakeRuntime, MemoryStorage } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { StorySession } from '../src/application/story-session.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'
import { pendingFerryScene } from '../src/game/ferry-story.js'
import { ferryLayout } from '../src/game/ferry-layout.js'
import { neighbors } from '../src/game/engine.js'
import { dialogueParts, dialogueTerms } from '../src/ui/dialogue-terms.js'

test('ferry reaches solve using public clues and sluices without tools, guesses or damage', () => {
  const solved = solveFerry()
  assert.equal(solved.run.phase, 'won')
  assert.ok(solved.actions.filter((action) => action.type === 'interact').length >= 20)
  for (let floor = 1; floor <= 3; floor++) {
    const room = ferryLayout(floor)
    assert.ok(room.game.config.mines >= 40)
    for (const device of [...room.power.junctions, ...room.power.receivers, ...room.power.doors])
      assert.equal(room.game.cells[device.index]!.mine, false)
    for (const [index, cell] of room.game.cells.entries())
      if (!cell.mine)
        assert.equal(
          cell.adjacent,
          neighbors(room.game.config, index).filter((at) => room.game.cells[at]!.mine).length,
        )
  }
})

test('ferry departure is physically gated, replays exactly and settles once beside other attempts', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage)
  const camp = readyChapterTwo(repo),
    story = new StorySession(camp)
  const stageRepo = repo.forCampaign('reed-channels')
  assert.equal(new ExpeditionSession(stageRepo, new FakeRuntime()).start('explorer', []), false)
  assert.ok(story.travelNorthwest())
  assert.ok(story.completeRegionalScene('reed-arrival'))
  assert.ok(story.completeRegionalScene('ferry-lead'))
  assert.ok(camp.story.accepted?.includes('investigate-ferry'))
  assert.equal(new ExpeditionSession(stageRepo, new FakeRuntime()).start('explorer', []), false)
  assert.ok(story.moveCamp(50))
  assert.equal(story.travelNorthwest(), false)
  const before = repo.expedition()!
  let stage = new ExpeditionSession(stageRepo, new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  stage.completeCampaignScene('ferry-entry')
  for (const action of solveFerry().actions) {
    assert.ok(stage.dispatch(action), JSON.stringify(action))
    if (stage.run?.phase === 'won') break
    const run = stage.run
    stage = new ExpeditionSession(
      new VariantRepository(storage).forCampaign('reed-channels'),
      new FakeRuntime(),
    )
    assert.deepEqual(stage.run, run)
    assert.ok(stage.stageProgress.scenes.includes('ferry-entry'))
  }
  assert.equal(stage.run?.phase, 'won')
  const after = new VariantRepository(storage).expedition()!
  assert.deepEqual(after.journal, before.journal)
  assert.deepEqual(
    campaignProgress(after.campaign, 'northwest-bastion'),
    campaignProgress(before.campaign, 'northwest-bastion'),
  )
  assert.equal(after.camp.supplies, before.camp.supplies + 160)
  assert.ok(after.story?.facts?.includes('ferry-channel-cleared'))
  assert.ok(after.story?.completed.includes('investigate-ferry'))
  assert.equal(
    pendingFerryScene(null, campaignProgress(after.campaign, 'reed-channels')),
    'ferry-end',
  )
  const freshCamp = new CampSession(new VariantRepository(storage))
  freshCamp.completeStageScene('reed-channels', 'ferry-end')
  assert.equal(pendingFerryScene(null, freshCamp.stageProgress('reed-channels')), null)
  assert.equal(
    new ExpeditionSession(
      new VariantRepository(storage).forCampaign('reed-channels'),
      new FakeRuntime(),
    ).start('explorer', []),
    false,
  )
  assert.equal(new VariantRepository(storage).expedition()!.camp.supplies, after.camp.supplies)
  const road = new StorySession(freshCamp)
  assert.ok(road.moveCamp(50))
  assert.ok(road.travelNorthwest())
  assert.equal(road.run?.board.scene.id, 'old-ferry')
  const restored = new StorySession(new CampSession(new VariantRepository(storage)))
  assert.equal(restored.run?.board.scene.id, 'old-ferry')
  assert.ok(restored.travelNorthwest())
  assert.equal(restored.run, null)
  assert.equal(restored.camp.story.campPosition, 50)
  assert.equal(new VariantRepository(storage).expedition()!.camp.supplies, after.camp.supplies)
})

test('dialogue vocabulary preserves exact text and separates names, places, objects and warnings', () => {
  for (const [language, text] of [
    ['zh', '妮娅在采石场发现了行囊，危险。'],
    ['en', 'Nia found a satchel at the quarry. Danger.'],
    ['ja', '採石場で行嚢を見つけた。危険。'],
  ] as const) {
    const parts = dialogueParts(text, dialogueTerms(language))
    assert.equal(parts.map((part) => part.text).join(''), text)
    for (const kind of ['place', 'item', 'warning'])
      assert.ok(parts.some((part) => part.kind === kind))
  }
  assert.deepEqual(dialogueParts('Niamh', dialogueTerms('en')), [{ text: 'Niamh', kind: null }])
  assert.equal(
    dialogueParts('<script>Nia</script>', dialogueTerms('en'))
      .map((part) => part.text)
      .join(''),
    '<script>Nia</script>',
  )
})

test('sluices hold connected lanes while tiles, flags and clues follow the other tide', () => {
  let run = createExpedition(FERRY_DEPARTURE)
  let tides = 0
  for (const action of solveFerry().actions) {
    const before = run
    run = actExpedition(run, action)
    if (before.floor !== run.floor || before.current?.cycle === run.current?.cycle) continue
    tides++
    assert.equal(action.type, 'interact')
    assert.equal(new Set(run.current!.permutation).size, run.game.cells.length)
    for (const lane of run.current!.lanes) {
      const held = feedPowered(run.power!, lane.hold)
      lane.cells.forEach((index, offset) => {
        const to = held
          ? index
          : lane.cells[(offset + lane.direction + lane.cells.length) % lane.cells.length]!
        assert.equal(run.current!.permutation[index], to)
        assert.equal(run.game.cells[to]!.mine, before.game.cells[index]!.mine)
        assert.equal(run.game.cells[to]!.visibility, before.game.cells[index]!.visibility)
      })
    }
    for (const [index, cell] of run.game.cells.entries())
      assert.equal(
        cell.adjacent,
        neighbors(run.game.config, index).filter((other) => run.game.cells[other]!.mine).length,
      )
    assert.equal(
      run.game.cells.filter((cell) => cell.mine).length,
      before.game.cells.filter((cell) => cell.mine).length,
    )
    assert.deepEqual(run.sonar.readings, [])
  }
  assert.ok(tides >= 8)
})

test('an unfinished pre-tide attempt retires without replaying it under new rules', () => {
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage)
  const camp = readyChapterTwo(repo),
    story = new StorySession(camp)
  story.travelNorthwest()
  story.completeRegionalScene('reed-arrival')
  story.completeRegionalScene('ferry-lead')
  story.moveCamp(50)
  const stage = new ExpeditionSession(repo.forCampaign('reed-channels'), new FakeRuntime())
  assert.ok(stage.start('explorer', []))
  stage.completeCampaignScene('ferry-entry')
  const key = 'minesweeper.variants.v1.expedition'
  storage.setItem(key, storage.getItem(key)!.replaceAll('reed-channels-v2', 'reed-channels-v1'))
  const restored = new CampSession(new VariantRepository(storage))
  assert.equal(restored.stageProgress('reed-channels').journal, null)
  assert.deepEqual(restored.stageProgress('reed-channels').scenes, [])
  assert.equal(restored.stageProgress('reed-channels').cleared, false)
  const wallet = restored.camp.supplies
  assert.equal(new CampSession(new VariantRepository(storage)).camp.supplies, wallet)
  const fresh = new ExpeditionSession(
    new VariantRepository(storage).forCampaign('reed-channels'),
    new FakeRuntime(),
  )
  assert.ok(fresh.start('explorer', []))
  assert.equal(fresh.run?.current?.cycle, 0)
})
