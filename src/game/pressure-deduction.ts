import { neighbors } from './engine.js'
import { constrainPressure } from './pressure.js'
import type { Game } from '../types/game.js'
import type { PressureReading } from '../types/pressure.js'
import type { MineConstraint, MineDeduction } from '../types/combat-build.js'

/** Infer only from public numbers and paired observations; flags never count as evidence. */
export function deducePressure(
  game: Game,
  walls: readonly number[],
  readings: readonly PressureReading[],
): MineDeduction {
  const safe = new Set(walls)
  const mines = new Set<number>()
  game.cells.forEach((cell, index) => {
    if (cell.visibility === 'revealed') safe.add(index)
  })
  const constraints: MineConstraint[] = []
  game.cells.forEach((cell, index) => {
    if (cell.visibility === 'revealed' && !walls.includes(index))
      constraints.push({
        cells: neighbors(game.config, index).filter((i) => !walls.includes(i)),
        mines: cell.adjacent,
      })
  })
  /** Bounds refer to true deductions, never a player's guessed flags. */
  const bounds = (cells: readonly number[]): { min: number; max: number } => ({
    min: cells.filter((i) => mines.has(i)).length,
    max: cells.filter((i) => !safe.has(i)).length,
  })
  /** Only an exact all-safe or all-mine remainder licenses new cell knowledge. */
  const apply = (cells: readonly number[], min: number, max: number): void => {
    const known = cells.filter((i) => mines.has(i)).length
    const unknown = cells.filter((i) => !safe.has(i) && !mines.has(i))
    if (max === known) unknown.forEach((i) => safe.add(i))
    if (min === known + unknown.length) unknown.forEach((i) => mines.add(i))
  }
  for (let pass = 0; pass < game.cells.length; pass++) {
    const previous = safe.size + mines.size
    const reduced = constraints.map((c) => ({
      cells: c.cells.filter((i) => !safe.has(i) && !mines.has(i)),
      mines: c.mines - c.cells.filter((i) => mines.has(i)).length,
    }))
    for (const c of reduced) {
      if (c.mines < 0 || c.mines > c.cells.length) continue
      apply(c.cells, c.mines, c.mines)
      for (const other of reduced) {
        if (c.cells.length >= other.cells.length || !c.cells.every((i) => other.cells.includes(i)))
          continue
        const remaining = other.cells.filter((i) => !c.cells.includes(i)),
          count = other.mines - c.mines
        if (count >= 0 && count <= remaining.length) apply(remaining, count, count)
      }
    }
    for (const reading of readings) {
      const result = constrainPressure(reading.difference, bounds(reading.a), bounds(reading.b))
      if (!result) continue
      apply(reading.a, result.a.min, result.a.max)
      apply(reading.b, result.b.min, result.b.max)
    }
    if (previous === safe.size + mines.size) break
  }
  return { safe: [...safe].filter((i) => !walls.includes(i)), mines: [...mines] }
}
