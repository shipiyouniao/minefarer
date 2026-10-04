import assert from 'node:assert/strict'
import test from 'node:test'
import { causewayLayout } from '../src/game/causeway-layout.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { causewaySpans, heldCausewayPlank } from '../src/game/causeway.js'
import { walkingPath } from '../src/game/dungeon-path.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import { solveCauseway } from './causeway-helpers.js'

export const CAUSEWAY_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  seed: 0,
  campaign: 'broken-causeway-v1' as const,
}

test('all three authored reaches combine public Minesweeper deductions with reusable physical bridges', () => {
  for (let floor = 1; floor <= 3; floor++) {
    const layout = causewayLayout(floor)
    const initial = {
      ...createExpedition(CAUSEWAY_DEPARTURE),
      ...layout,
      floor,
      player: layout.entrance,
      travelled: [layout.entrance],
    }
    const solved = solveCauseway(initial)
    assert.ok(solved, `floor ${floor}`)
    assert.equal(solved.run.phase, floor === 3 ? 'won' : 'reward')
    assert.equal(solved.run.health, initial.health)
    assert.equal(solved.run.probes, initial.probes)
    assert.equal(solved.run.scans, initial.scans)
    assert.ok(solved.actions.some((a) => a.type === 'bridge'))
    assert.ok(solved.actions.some((a) => a.type === 'bridge-pick'))
    assert.ok(solved.actions.some((a) => a.type === 'flag'))
    const fullyKnown = {
      ...initial,
      game: {
        ...initial.game,
        cells: initial.game.cells.map((c) =>
          c.mine ? c : { ...c, visibility: 'revealed' as const },
        ),
      },
    }
    assert.equal(
      walkingPath(fullyKnown, initial.exit),
      null,
      'knowledge alone cannot cross deep water',
    )
  }
})

test('bridge previews do not inspect concealed mines, spend resources or move the player', () => {
  const initial = createExpedition(CAUSEWAY_DEPARTURE)
  const poisoned = {
    ...initial,
    game: {
      ...initial.game,
      cells: initial.game.cells.map((c) =>
        c.visibility === 'hidden' ? { ...c, mine: !c.mine, adjacent: 8 - c.adjacent } : c,
      ),
    },
  }
  assert.deepEqual(causewaySpans(poisoned), causewaySpans(initial))
  const first = causewaySpans(initial)[0]!
  const built = actExpedition(initial, { type: 'bridge', from: first.from, to: first.to })
  assert.equal(built.game.cells[first.to]?.visibility, initial.game.cells[first.to]?.visibility)
  assert.equal(built.health, initial.health)
  assert.equal(heldCausewayPlank(built), -1)
  assert.ok(first.water.every((index) => !built.walls.includes(index)))
  const recovered = actExpedition(built, { type: 'bridge-pick', board: 0 })
  assert.equal(heldCausewayPlank(recovered), 0)
  assert.ok(first.water.every((index) => recovered.walls.includes(index)))
  const again = actExpedition(recovered, { type: 'bridge', from: first.from, to: first.to })
  assert.equal(
    again.game.cells.filter((c) => c.visibility === 'revealed').length,
    built.game.cells.filter((c) => c.visibility === 'revealed').length,
  )
  assert.equal(actExpedition(initial, { type: 'bridge', from: -1, to: 0 }), initial)
  assert.equal(actExpedition(initial, { type: 'bridge-pick', board: 50 }), initial)
  const reset = actExpedition(
    { ...again, health: 4, probes: 0, loot: 12 },
    { type: 'bridge-reset' },
  )
  assert.equal(reset.player, initial.entrance)
  assert.equal(reset.health, 4)
  assert.equal(reset.probes, 0)
  assert.equal(reset.loot, 12)
  assert.deepEqual(reset.game, again.game)
  assert.deepEqual(reset.travelled, again.travelled)
  assert.equal(heldCausewayPlank(reset), 0)
  assert.equal(actExpedition(reset, { type: 'bridge-reset' }), reset)
})
