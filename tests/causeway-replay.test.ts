import assert from 'node:assert/strict'
import test from 'node:test'
import { readyWreck } from './wreck-helpers.js'
import { MemoryStorage, FakeRuntime } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { ExpeditionSession } from '../src/application/expedition-session.js'
import { campaignProgress, updateCampaign } from '../src/game/campaign-catalog.js'
import { frontierCells } from '../src/game/expedition.js'
import { causewaySpans, heldCausewayPlank } from '../src/game/causeway.js'
import { VARIANT_TIERS } from '../src/game/variant-difficulty.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'

test('new Recollection bridge intents reload exactly at every difficulty without changing other families', () => {
  for (const tier of VARIANT_TIERS) {
    const storage = new MemoryStorage(),
      repo = new VariantRepository(storage)
    readyWreck(repo)
    const save = repo.expedition()!
    repo.saveExpedition({
      ...save,
      journal: null,
      campaign: updateCampaign(save.campaign, {
        ...campaignProgress(save.campaign, 'broken-causeway'),
        cleared: true,
      }),
    })
    let session = new ExpeditionSession(repo, new FakeRuntime())
    assert.ok(session.start('explorer', [], tier.id, { floors: ['causeway'], bosses: ['bastion'] }))
    const dispatch = (action: ExpeditionAction): void => {
      assert.ok(session.dispatch(action), JSON.stringify(action))
      const expected: Expedition | null = session.run
      session = new ExpeditionSession(new VariantRepository(storage), new FakeRuntime())
      assert.deepEqual(session.run, expected)
    }
    // A safe-oracle fixture exercises serialization only; the campaign solver separately proves public deductions.
    for (let step = 0; step < 100 && !causewaySpans(session.run!).length; step++) {
      const index = [...frontierCells(session.run!)].find((i) => !session.run!.game.cells[i]!.mine)
      if (index === undefined) {
        const other = session.run!.causeway!.planks.findIndex((p) => p.position.kind !== 'held')
        assert.ok(other >= 0)
        dispatch({ type: 'bridge-pick', board: other })
      } else dispatch({ type: 'reveal', index })
    }
    const span = causewaySpans(session.run!)[0]
    assert.ok(span)
    const board = heldCausewayPlank(session.run!)
    dispatch({ type: 'bridge', from: span.from, to: span.to })
    dispatch({ type: 'bridge-pick', board })
    if (session.run!.player !== session.run!.entrance || board !== 0)
      dispatch({ type: 'bridge-reset' })
  }
})
