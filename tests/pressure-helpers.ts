import { pressureLayout } from '../src/game/pressure-layout.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { revealDungeon } from '../src/game/dungeon-reveal.js'
import { approachPath, walkingPath } from '../src/game/dungeon-path.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'
export const PRESSURE_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  campaign: 'pressure-cove-v2' as const,
  seed: 0,
}
/** Follow ordinary visible clues and physically board/disembark; no hidden mine truth guides the route. */
export function solvePressureFloor(
  floor: number,
  tides = true,
): { run: Expedition; actions: ExpeditionAction[] } | null {
  const layout = pressureLayout(floor)
  let run: Expedition = {
    ...createExpedition(PRESSURE_DEPARTURE),
    ...layout,
    floor,
    player: layout.entrance,
    travelled: [layout.entrance],
  }
  run = { ...run, game: revealDungeon(run, run.entrance) }
  const actions: ExpeditionAction[] = []
  /** Record only accepted player actions for session replay tests. */
  const apply = (action: ExpeditionAction): boolean => {
    const next = actExpedition(run, action)
    if (next === run) return false
    run = next
    actions.push(action)
    return true
  }
  for (let turn = 0; turn < 24; turn++) {
    for (let pass = 0; pass < 100; pass++) {
      let changed = false
      const known = deduceMines(run.game, run.walls)
      for (const index of known.mines)
        if (run.game.cells[index]?.visibility === 'hidden')
          changed = apply({ type: 'flag', index }) || changed
      for (const index of known.safe)
        if (
          index !== run.exit &&
          run.game.cells[index]?.visibility === 'hidden' &&
          approachPath(run, index)
        )
          changed = apply({ type: 'reveal', index }) || changed
      if (!changed) break
    }
    for (const index of run.pressure!.moorings)
      if (walkingPath(run, index)) apply({ type: 'move', index })
    if (run.pressure!.moorings.every((i) => run.travelled.includes(i)))
      apply({
        type: run.game.cells[run.exit]?.visibility === 'revealed' ? 'move' : 'reveal',
        index: run.exit,
      })
    if (run.phase === 'won' || run.phase === 'reward')
      return run.health === run.maxHealth ? { run, actions } : null
    if (!tides) return null
    const ferry = run.pressure!,
      raft = ferry.stops[ferry.position]!
    if (walkingPath(run, raft)) apply({ type: 'move', index: raft })
    apply({ type: 'end-turn' })
  }
  return null
}
