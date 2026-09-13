import { neighbors } from './engine.js'
import { feedPowered } from './floor-power.js'
import type { Expedition } from '../types/variants.js'
/** A visible feed predicts the exact next tide; there is no hidden random shuffle. */
export function currentPermutation(run: Expedition): readonly number[] {
  const permutation = run.game.cells.map((_, index) => index)
  if (!run.current || !run.power) return permutation
  for (const lane of run.current.lanes) {
    if (feedPowered(run.power, lane.hold)) continue
    lane.cells.forEach((from, index) => {
      permutation[from] =
        lane.cells[(index + lane.direction + lane.cells.length) % lane.cells.length]!
    })
  }
  return permutation
}
/** Each accepted selector change sends a tide through the unheld lanes. */
export function advanceCurrent(before: Expedition, run: Expedition): Expedition {
  if (
    !run.current ||
    !run.power ||
    before.floor !== run.floor ||
    !before.power ||
    !run.power.junctions.some(
      (entry, index) => entry.selected !== before.power!.junctions[index]!.selected,
    )
  )
    return run
  const permutation = currentPermutation(run)
  const cells = [...run.game.cells]
  permutation.forEach((to, from) => {
    cells[to] = run.game.cells[from]!
  })
  /** Tile-bound knowledge travels with its original cell, including player mistakes. */
  const map = (indices: readonly number[]): number[] => indices.map((index) => permutation[index]!)
  return {
    ...run,
    player: permutation[run.player]!,
    travelled: map(run.travelled),
    collected: map(run.collected),
    treasures: map(run.treasures),
    confirmedMines: map(run.confirmedMines),
    triggeredMines: map(run.triggeredMines),
    surveyedCells: map(run.surveyedCells),
    scannedRows: [],
    probeReport: null,
    waymark: run.waymark ? { ...run.waymark, index: permutation[run.waymark.index]! } : undefined,
    rift: run.rift
      ? { ...run.rift, from: permutation[run.rift.from]!, to: permutation[run.rift.to]! }
      : undefined,
    sonar: { ...run.sonar, readings: [] },
    game: {
      ...run.game,
      cells: cells.map((cell, index) => ({
        ...cell,
        adjacent: neighbors(run.game.config, index).filter((other) => cells[other]!.mine).length,
      })),
      safeMarks: map(run.game.safeMarks),
      firstClick: run.game.firstClick === null ? null : permutation[run.game.firstClick]!,
      exploded: run.game.exploded === null ? null : permutation[run.game.exploded]!,
    },
    current: { ...run.current, cycle: run.current.cycle + 1, permutation },
  }
}
