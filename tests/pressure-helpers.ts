import { pressureLayout } from '../src/game/pressure-layout.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { walkingPath } from '../src/game/dungeon-path.js'
import { aboardRiverBoat, riverRoutes, riverSoundingCells } from '../src/game/pressure.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'

export const PRESSURE_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  campaign: 'pressure-cove-v4' as const,
  seed: 0,
}

/** Use public deductions and charted whole voyages, never hidden mine truth, to explore the network. */
export function solveRiver(
  initial: Expedition,
  navigate = true,
): { run: Expedition; actions: ExpeditionAction[] } | null {
  let run = initial
  const actions: ExpeditionAction[] = []
  const tried = new Set<string>()
  const positions = new Set<string>()
  /** Apply only accepted production actions, including safe returns along prior voyages. */
  const apply = (action: ExpeditionAction): boolean => {
    const next = actExpedition(run, action)
    if (next === run) return false
    run = next
    actions.push(action)
    return true
  }
  for (let turn = 0; turn < 600; turn++) {
    if (!aboardRiverBoat(run)) {
      if (!navigate || !apply({ type: 'move', index: run.pressure!.boat })) return null
    }
    for (let pass = 0; pass < 60; pass++) {
      const known = deduceMines(run.game, run.walls)
      const reach = riverSoundingCells(run)
      let changed = false
      for (const index of known.mines)
        if (run.game.cells[index]?.visibility === 'hidden')
          changed = apply({ type: 'flag', index }) || changed
      for (const index of known.safe)
        if (reach.has(index) && run.game.cells[index]?.visibility === 'hidden')
          changed = apply({ type: 'reveal', index }) || changed
      if (!changed) break
    }
    if (!navigate) return null
    if (walkingPath(run, run.exit)) {
      apply({ type: 'move', index: run.exit })
      return run.phase === 'won' || run.phase === 'reward' ? { run, actions } : null
    }
    const count = run.game.cells.filter((cell) => cell.visibility === 'revealed').length
    const state = `${run.player}:${count}:${run.pressure!.line.join(',')}`
    if (positions.has(state)) return null
    positions.add(state)
    const route = riverRoutes(run)
      .filter((route) => !route.unknown.length && !route.blocked.length)
      .find((route) => !tried.has(`${run.player}:${route.launch}:${count}`))
    if (route) {
      tried.add(`${run.player}:${route.launch}:${count}`)
      if (!apply({ type: 'sail', index: route.launch })) return null
      if (run.phase === 'reward' || run.phase === 'won') return { run, actions }
    } else if (!apply({ type: 'haul' })) return null
  }
  return null
}

/** Restore each authored beginning independently of relic selection on prior floors. */
export function solvePressureFloor(
  floor: number,
  navigate = true,
): { run: Expedition; actions: ExpeditionAction[] } | null {
  const layout = pressureLayout(floor)
  const base = createExpedition(PRESSURE_DEPARTURE)
  return solveRiver(
    { ...base, ...layout, floor, player: layout.entrance, travelled: [layout.entrance] },
    navigate,
  )
}
