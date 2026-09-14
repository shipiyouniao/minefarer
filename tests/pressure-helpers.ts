import { pressureLayout } from '../src/game/pressure-layout.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { walkingPath } from '../src/game/dungeon-path.js'
import { adjacentSteps } from '../src/game/variant-board.js'
import { aboardRiverBoat } from '../src/game/pressure.js'
import { neighbors } from '../src/game/engine.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'

export const PRESSURE_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  campaign: 'pressure-cove-v3' as const,
  seed: 0,
}

/** Public clues choose soundings; directed known-water paths choose the next working position. */
export function solveRiver(
  initial: Expedition,
  navigate = true,
): { run: Expedition; actions: ExpeditionAction[] } | null {
  let run = initial
  const actions: ExpeditionAction[] = []
  const positions = new Set<string>()
  /** Every step passes through the production reducer, including anchor changes and moorings. */
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
    if (!run.pressure!.anchored) apply({ type: 'moor' })

    for (let pass = 0; pass < 30; pass++) {
      const known = deduceMines(run.game, run.walls)
      let changed = false
      for (const index of known.mines)
        if (run.game.cells[index]?.visibility === 'hidden')
          changed = apply({ type: 'flag', index }) || changed
      for (const index of known.safe)
        if (
          run.game.cells[index]?.visibility === 'hidden' &&
          neighbors(run.game.config, run.player).includes(index)
        )
          changed = apply({ type: 'reveal', index }) || changed
      if (!changed) break
    }
    for (const mooring of run.pressure!.moorings)
      if (!mooring.secured && adjacentSteps(run.game, run.player).includes(mooring.index))
        apply({ type: 'interact', index: mooring.index })

    if (!navigate) return null
    apply({ type: 'moor' })
    if (run.pressure!.moorings.every((entry) => entry.secured) && walkingPath(run, run.exit)) {
      apply({ type: 'move', index: run.exit })
      return run.phase === 'reward' || run.phase === 'won' ? { run, actions } : null
    }

    const known = deduceMines(run.game, run.walls)
    const targets = run.pressure!.water.filter((index) => {
      if (run.game.cells[index]?.visibility !== 'revealed') return false
      return (
        run.pressure!.moorings.some(
          (entry) => !entry.secured && adjacentSteps(run.game, index).includes(entry.index),
        ) ||
        known.safe.some(
          (other) =>
            run.game.cells[other]?.visibility === 'hidden' &&
            neighbors(run.game.config, index).includes(other),
        )
      )
    })
    const paths = targets.flatMap((index) => {
      const path = walkingPath(run, index)
      return path && path.length > 1 ? [path] : []
    })
    paths.sort((a, b) => a.length - b.length)
    const state = `${run.player}:${run.game.cells.filter((cell) => cell.visibility === 'revealed').length}:${run.pressure!.moorings.filter((entry) => entry.secured).length}`
    if (positions.has(state)) return null
    positions.add(state)
    if (!paths[0] && apply({ type: 'haul' })) continue
    if (!paths[0] || !apply({ type: 'move', index: paths[0].at(-1)! })) return null
  }

  return null
}

/** Replay a crossing from its authored beginning with the ordinary starting profession. */
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
