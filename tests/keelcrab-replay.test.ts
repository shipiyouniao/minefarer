import assert from 'node:assert/strict'
import test from 'node:test'
import { readyWreck } from './wreck-helpers.js'
import { finishRecollectionFloor } from './recollection-helpers.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { milestoneProgress } from '../src/game/milestones.js'
import { solveKeelcrab } from './keelcrab-helpers.js'
import { riverSoundingCells } from '../src/game/pressure.js'
import type { Expedition } from '../src/types/variants.js'

test('all five Recollection difficulties restore every naval action beyond ordinary board bounds', () => {
  for (const difficulty of ['relaxed', 'standard', 'advanced', 'expert', 'abyss'] as const) {
    const storage = new MemoryStorage(),
      repo = new VariantRepository(storage)
    readyWreck(repo)
    const save = repo.expedition()!
    repo.saveExpedition({
      ...save,
      journal: null,
      camp: {
        ...save.camp,
        milestones: { ...milestoneProgress(save.camp), bossKinds: ['keelcrab'] },
      },
    })
    let session = new ExpeditionSession(repo, new FakeRuntime())
    assert.ok(
      session.start('explorer', [], difficulty, { floors: ['ordinary'], bosses: ['keelcrab'] }),
    )
    while (session.run?.phase !== 'boss') {
      finishRecollectionFloor(session)
      if (session.run?.phase === 'reward') {
        assert.ok(
          session.dispatch(
            session.run.offers.length
              ? { type: 'relic', relic: session.run.offers[0]! }
              : { type: 'descend' },
          ),
        )
      }
    }
    assert.equal(session.run.encounter?.kind, 'keelcrab')
    const sounding = riverSoundingCells(session.run)
    const gray = session.run.pressure!.water.find(
      (i) => !sounding.has(i) && session.run!.game.cells[i]!.visibility === 'hidden',
    )!
    for (const type of ['flag', 'mark-safe', 'mark-safe'] as const) {
      assert.ok(session.dispatch({ type, index: gray }))
      const expected: Expedition | null = session.run
      session = new ExpeditionSession(new VariantRepository(storage), new FakeRuntime())
      assert.deepEqual(session.run, expected)
    }
    let largest = 0
    for (const action of solveKeelcrab(session.run)!) {
      assert.ok(session.dispatch(action))
      if (action.type === 'sail') largest = Math.max(largest, action.index)
      const expected: Expedition | null = session.run
      if (expected?.phase === 'won') break
      session = new ExpeditionSession(new VariantRepository(storage), new FakeRuntime())
      assert.deepEqual(session.run, expected, `${difficulty}: ${JSON.stringify(action)}`)
      assert.equal(repo.recovered, false)
    }
    assert.ok(largest >= 235)
  }
})
