import { adjacentSteps, shuffled } from './variant-board.js'
import { randomIndex } from './engine.js'
import type { RecollectionLayout } from '../types/recollection.js'
import type { CurrentLane, FloorTide } from '../types/floor-tide.js'

/** Removing every moving tile must leave a connected shore that touches every possible landing. */
function stableShore(layout: RecollectionLayout, moving: readonly number[]): boolean {
  const excluded = new Set([...layout.walls, ...moving])
  const found = new Set([layout.entrance])
  const queue = [layout.entrance]
  for (const index of queue) {
    for (const other of adjacentSteps(layout.game, index)) {
      if (excluded.has(other) || found.has(other) || layout.game.cells[other]!.mine) continue
      found.add(other)
      queue.push(other)
    }
  }
  if (
    layout.game.cells.some((cell, index) => !cell.mine && !excluded.has(index) && !found.has(index))
  )
    return false

  return moving.every((index) =>
    adjacentSteps(layout.game, index).some((other) => found.has(other)),
  )
}

/** Pick disjoint variable tidal strips whose permutations preserve access for every switch sequence. */
export function recollectionCurrent(layout: RecollectionLayout, seed: number): FloorTide | null {
  const power = layout.power
  if (!power) return null
  const next = randomIndex(seed ^ 0x71da1)
  const { width, height } = layout.game.config
  const vertical = next(2) === 0
  const excluded = new Set([
    layout.entrance,
    layout.exit,
    ...layout.walls,
    ...power.junctions.map((entry) => entry.index),
    ...power.receivers.map((entry) => entry.index),
  ])
  const candidates: number[][] = []
  for (let strip = 0; strip < (vertical ? width : height); strip++) {
    for (let start = 0; start < (vertical ? height : width) - 1; start++) {
      const cells: number[] = []
      const length = 2 + next(4)
      for (
        let offset = 0;
        offset < length && start + offset < (vertical ? height : width);
        offset++
      ) {
        const index = vertical ? (start + offset) * width + strip : strip * width + start + offset
        if (excluded.has(index)) break
        cells.push(index)
      }
      if (
        cells.length >= 2 &&
        cells.some((index) => layout.game.cells[index]!.mine) &&
        cells.some((index) => !layout.game.cells[index]!.mine)
      )
        candidates.push(cells)
    }
  }
  const lanes: CurrentLane[] = []
  const moving: number[] = []
  const maximum = 2 + next(Math.max(2, Math.floor(width / 3)))
  for (const cells of shuffled(candidates, seed ^ 0x71deb)) {
    if (
      cells.some((index) => moving.includes(index)) ||
      !stableShore(layout, [...moving, ...cells])
    )
      continue
    const junction = power.junctions[next(power.junctions.length)]!
    lanes.push({
      cells,
      hold: { junction: junction.index, branch: next(2) === 0 ? 0 : 1 },
      direction: next(2) === 0 ? 1 : -1,
    })
    moving.push(...cells)
    if (lanes.length >= maximum) break
  }

  return lanes.length >= 2 && moving.length >= Math.max(4, width - 3)
    ? { lanes, cycle: 0, permutation: [] }
    : null
}
