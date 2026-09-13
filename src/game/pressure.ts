import type { Config, Game } from '../types/game.js'
import type {
  PressureBounds,
  PressureConstraint,
  PressureFootprint,
  PressurePair,
  PressureReading,
} from '../types/pressure.js'

/** Reject malformed authoring rather than silently clipping an instrument's area. */
export function pressureCells(config: Config, area: PressureFootprint): readonly number[] {
  if (
    !Number.isInteger(config.width) ||
    !Number.isInteger(config.height) ||
    config.width <= 0 ||
    config.height <= 0 ||
    !Number.isInteger(area.column) ||
    !Number.isInteger(area.row) ||
    (area.size !== 2 && area.size !== 3) ||
    area.column < 0 ||
    area.row < 0 ||
    area.column + area.size > config.width ||
    area.row + area.size > config.height
  )
    throw new RangeError('Pressure footprint must be a complete 2x2 or 3x3 board area')
  return Array.from(
    { length: area.size * area.size },
    (_, offset) =>
      (area.row + Math.floor(offset / area.size)) * config.width +
      area.column +
      (offset % area.size),
  )
}

/** Recalculate from the current board after every tide; flags never change a reading. */
export function pressureReadings(
  game: Game,
  pairs: readonly PressurePair[],
): readonly PressureReading[] {
  if (game.cells.length !== game.config.width * game.config.height)
    throw new RangeError('Pressure board dimensions do not match its cells')
  const ids = new Set<string>()
  return pairs.map((pair) => {
    if (!pair.id.trim() || ids.has(pair.id))
      throw new RangeError('Pressure pair IDs must be nonempty and unique')
    ids.add(pair.id)
    const a = pressureCells(game.config, pair.a)
    const b = pressureCells(game.config, pair.b)
    if (a.some((index) => b.includes(index)))
      throw new RangeError('A pressure pair must compare disjoint footprints')
    return {
      id: pair.id,
      a,
      b,
      difference:
        a.filter((index) => game.cells[index]!.mine).length -
        b.filter((index) => game.cells[index]!.mine).length,
    }
  })
}

/** Propagate only published count bounds through A minus B, without access to the board. */
export function constrainPressure(
  difference: number,
  a: PressureBounds,
  b: PressureBounds,
): PressureConstraint | null {
  if (
    !Number.isInteger(difference) ||
    [a, b].some(
      (bound) =>
        !Number.isInteger(bound.min) ||
        !Number.isInteger(bound.max) ||
        bound.min < 0 ||
        bound.max < bound.min,
    )
  )
    throw new RangeError('Pressure bounds must be nonnegative integer intervals')
  const narrowedA = {
    min: Math.max(a.min, b.min + difference),
    max: Math.min(a.max, b.max + difference),
  }
  const narrowedB = {
    min: Math.max(b.min, a.min - difference),
    max: Math.min(b.max, a.max - difference),
  }
  if (narrowedA.min > narrowedA.max || narrowedB.min > narrowedB.max) return null
  return { a: narrowedA, b: narrowedB }
}
