import assert from 'node:assert/strict'
import test from 'node:test'
import { generateRecollectionCauseway } from '../src/game/recollection-causeway.js'
import { VARIANT_TIERS, expeditionConfig } from '../src/game/variant-difficulty.js'
import { createExpedition } from '../src/game/expedition.js'
import { enterEncounter } from '../src/game/encounter-roster.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import { solveCauseway } from './causeway-helpers.js'

test('seeded bridges vary geography and endpoints while preserving all five mine budgets and a physical completion', () => {
  for (const tier of VARIANT_TIERS) {
    const shapes = new Set<string>(),
      starts = new Set<number>(),
      ends = new Set<number>()
    for (let seed = 0; seed < 128; seed++) {
      const departure = {
        ...CURRENT_DEPARTURE,
        difficulty: tier.id,
        seed,
        recollection: { floors: ['causeway' as const], bosses: ['bastion' as const] },
      }
      const floor = (seed % tier.floors) + 1
      const config = expeditionConfig(departure, floor)
      const layout = generateRecollectionCauseway(seed, config)
      assert.deepEqual(layout, generateRecollectionCauseway(seed, config))
      assert.equal(layout.game.config.mines, config.mines)
      assert.equal(layout.game.cells.filter((c) => c.mine).length, config.mines)
      assert.ok(layout.causeway!.water.every((i) => !layout.game.cells[i]!.mine))
      assert.equal(layout.treasures.length, 3)
      shapes.add(layout.causeway!.water.join(','))
      starts.add(layout.entrance)
      ends.add(layout.exit)
      if (seed < 6) {
        const base = createExpedition(departure)
        const run = {
          ...base,
          ...layout,
          player: layout.entrance,
          game: {
            ...layout.game,
            cells: layout.game.cells.map((c) => ({
              ...c,
              visibility: c.mine ? ('flagged' as const) : ('revealed' as const),
            })),
          },
        }
        assert.ok(solveCauseway(run), `${tier.id}:${seed}: physical route`)
      }
    }
    assert.ok(shapes.size >= 35, `${tier.id}: geography variation`)
    assert.ok(starts.size >= 9)
    assert.ok(ends.size >= 9)
  }
})

test('the shared boss transition removes bridge resources and terrain', () => {
  const run = createExpedition({
    ...CURRENT_DEPARTURE,
    recollection: { floors: ['causeway'], bosses: ['bastion'] },
  })
  const boss = enterEncounter({ ...run, floor: 3 })
  assert.equal(boss.causeway, undefined)
  assert.equal(boss.encounter?.kind, 'bastion')
})
