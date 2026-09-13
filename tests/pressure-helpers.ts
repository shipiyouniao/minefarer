import { pressureLayout } from '../src/game/pressure-layout.js'
import { pressureReadings } from '../src/game/pressure.js'
import { deducePressure } from '../src/game/pressure-deduction.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { revealDungeon } from '../src/game/dungeon-reveal.js'
import { approachPath } from '../src/game/dungeon-path.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'
export const PRESSURE_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  campaign: 'pressure-cove-v1' as const,
  seed: 0,
}
/** Authoring verifier uses only displayed numbers and published differences, never hidden mine bits. */
export function solvePressureFloor(
  floor: number,
  paired: boolean | number = true,
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
  /** Replay the same accepted actions as the UI, recording a deterministic witness. */
  const apply = (action: ExpeditionAction): boolean => {
    const next = actExpedition(run, action)
    if (next === run) return false
    run = next
    actions.push(action)
    return true
  }
  for (let cycle = 0; cycle < 5; cycle++) {
    for (let pass = 0; pass < 100; pass++) {
      let changed = false
      const known = deducePressure(
        run.game,
        run.walls,
        paired
          ? pressureReadings(run.game, run.pressure!.pairs).slice(
              0,
              typeof paired === 'number' ? paired : undefined,
            )
          : [],
      )
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
      if (run.game.cells[index]?.visibility === 'revealed') apply({ type: 'move', index })
    if (run.pressure!.moorings.every((i) => run.travelled.includes(i)))
      apply({
        type: run.game.cells[run.exit]?.visibility === 'revealed' ? 'move' : 'reveal',
        index: run.exit,
      })
    if (run.phase === 'won' || run.phase === 'reward')
      return run.health === run.maxHealth ? { run, actions } : null
    if (!apply({ type: 'interact', index: run.power!.junctions[0]!.index })) break
  }
  return null
}
