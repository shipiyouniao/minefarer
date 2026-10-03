import { buildRiverChart } from './river-chart.js'
import { randomIndex } from './engine.js'
import { shuffled } from './variant-board.js'
import type { Config } from '../types/game.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'

/** A fresh directed tree supplies safe routes; extra branches offer charted but hazardous shortcuts. */
export function generateRecollectionRiver(seed: number, config: Config): DungeonLayout {
  const next = randomIndex(seed ^ 0x718e7)
  const columns = [2, Math.floor(config.width / 2), config.width - 3]
  const rows = [2, Math.floor(config.height / 2), config.height - 3]
  const start = [0, 2, 6, 8][next(4)]!
  const edges: [number, number][] = []
  const found = new Set([start])
  const queue = [start]
  const distance = new Map([[start, 0]])
  for (const from of queue) {
    const candidates = shuffled(
      [from - 3, from + 3, from - 1, from + 1].filter(
        (to) =>
          to >= 0 &&
          to < 9 &&
          (Math.abs(to - from) === 3 || Math.floor(to / 3) === Math.floor(from / 3)),
      ),
      seed ^ from,
    )
    for (const to of candidates) {
      if (found.has(to)) continue
      found.add(to)
      edges.push([from, to])
      queue.push(to)
      distance.set(to, distance.get(from)! + 1)
    }
  }
  const finish = [0, 2, 6, 8]
    .filter((index) => index !== start)
    .sort((a, b) => distance.get(b)! - distance.get(a)!)[0]!
  const hazardous: number[] = []
  for (let from = 0; from < 9; from++) {
    for (const to of [from + 1, from + 3]) {
      if (to >= 9 || (to === from + 1 && Math.floor(from / 3) !== Math.floor(to / 3))) continue
      if (edges.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) continue
      hazardous.push(edges.length)
      edges.push(next(2) === 0 ? [from, to] : [to, from])
    }
  }
  const treasures = shuffled(
    [...found].filter((index) => index !== start && index !== finish),
    seed ^ 0x73ea5,
  ).slice(0, 3)
  return buildRiverChart({
    ...config,
    columns,
    rows,
    edges,
    hazardous,
    start,
    finish,
    treasures,
    seed,
  })
}
