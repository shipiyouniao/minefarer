import { randomIndex, neighbors } from './engine.js'
import { shuffled } from './variant-board.js'
import { buildCausewayChart, orientCausewayChart } from './causeway-layout.js'
import type { Config } from '../types/game.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'

/** Seeded banks, winding channels and endpoints vary independently of authored campaign charts. */
export function generateRecollectionCauseway(seed: number, config: Config): DungeonLayout {
  const next = randomIndex(Math.imul(seed ^ 0xca1, 0x9e3779b1) >>> 0)
  const { width, height, mines } = config
  const count = width >= 15 ? 2 : 1
  const gaps = Array.from({ length: count }, (_, i) =>
    width >= 13 && i === 0 && next(2) === 1 ? 4 : 2,
  )
  const widths = Array.from({ length: count + 1 }, () => 2)
  for (
    let extra = width - 2 - gaps.reduce((a, b) => a + b, 0) - widths.length * 2;
    extra > 0;
    extra--
  )
    widths[next(widths.length)]!++
  const islands: [number, number, number, number][] = []
  const land = new Set<number>()
  let offset = 0
  for (let y = 1; y < height - 1; y++) {
    if (y % 3 === 1) offset = next(3) - 1
    let x = 1
    for (let bank = 0; bank < widths.length; bank++) {
      const left = bank === 0 ? 1 : x + offset
      const right = bank === widths.length - 1 ? width - 1 : x + widths[bank]! + offset
      islands.push([left, y, right - left, 1])
      for (let column = left; column < right; column++) land.add(y * width + column)
      x += widths[bank]! + (gaps[bank] ?? 0)
    }
  }
  const startRow = 1 + next(height - 2)
  const endRow = 1 + next(height - 2)
  const crossing = Math.min(startRow, endRow) + next(Math.abs(startRow - endRow) + 1)
  const reverse = next(2) === 0
  const entrance = startRow * width + (reverse ? width - 2 : 1)
  const exit = endRow * width + (reverse ? 1 : width - 2)
  const reserved = new Set<number>([entrance, exit])
  for (const index of neighbors(config, entrance)) if (land.has(index)) reserved.add(index)
  for (let x = 1; x < width - 1; x++)
    if (land.has(crossing * width + x)) reserved.add(crossing * width + x)
  for (const [row, column] of [
    [startRow, entrance % width],
    [endRow, exit % width],
  ])
    for (let y = Math.min(row!, crossing); y <= Math.max(row!, crossing); y++)
      reserved.add(y * width + column!)
  const treasures = shuffled(
    [...reserved].filter((index) => index !== entrance && index !== exit),
    seed ^ 0x7ca5,
  ).slice(0, 3)
  if (treasures.length !== 3) throw new Error('Causeway needs three reachable cache sites')
  const candidates = shuffled(
    [...land].filter((index) => !reserved.has(index)),
    seed ^ 0x1a2b,
  )
  if (candidates.length < mines)
    throw new Error('Causeway terrain cannot fit the selected mine budget')
  const chart = buildCausewayChart(
    orientCausewayChart(
      {
        width,
        height,
        islands,
        entrance,
        exit,
        treasures,
        clues: [],
        mines: candidates.slice(0, mines),
        long: gaps.includes(4),
      },
      width === height ? next(4) : next(2) * 2,
    ),
  )
  return { ...chart, game: { ...chart.game, seed } }
}
