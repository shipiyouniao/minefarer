import { authoredPowerLayout } from './authored-power-layout.js'
import type { AuthoredPowerFloor, PowerDungeonLayout } from '../types/floor-power.js'
/** Hand-authored sluice topology and minefields; no runtime randomness or copied chapter rooms. */
export const FERRY_FLOORS: readonly AuthoredPowerFloor[] = [
  {
    rows: [
      '#################',
      '#.....**#...*...#',
      '#.E.*...#...**..#',
      '#..****.#.......#',
      '#....*..........#',
      '#*......#..***..#',
      '#.......#*......#',
      '#......*#*.*.**.#',
      '#*.....*#########',
      '#...*..*#.....**#',
      '#.......#.*...*.#',
      '#.......#...*..*#',
      '#.*........*..*.#',
      '#.....*.#.......#',
      '#*.S.**.#.....*.#',
      '#.......#.....**#',
      '#################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [
        {
          index: 174,
          input: null,
          selected: null,
        },
      ],
      doors: [
        {
          index: 76,
          input: {
            junction: 174,
            branch: 0,
          },
        },
        {
          index: 212,
          input: {
            junction: 174,
            branch: 1,
          },
        },
      ],
      receivers: [
        {
          index: 44,
          input: {
            junction: 174,
            branch: 0,
          },
          recorded: false,
        },
        {
          index: 232,
          input: {
            junction: 174,
            branch: 1,
          },
          recorded: false,
        },
      ],
    },
  },
  {
    rows: [
      '###################',
      '#.......*#......**#',
      '#..S..*.*#..*..*.*#',
      '#.....**.#.......*#',
      '#..****.......*...#',
      '#......*.#..*...*.#',
      '#...*.*..#..*..*..#',
      '#..*.....##########',
      '#.....*.*#........#',
      '#*.......#........#',
      '#........#...*.*..#',
      '#.......*#...*...*#',
      '#..*............*.#',
      '#.**.....#....*...#',
      '#*..*....#..**..E.#',
      '#**.***..#.**..*..#',
      '###################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [
        {
          index: 175,
          input: null,
          selected: null,
        },
        {
          index: 69,
          input: {
            junction: 175,
            branch: 0,
          },
          selected: null,
        },
      ],
      doors: [
        {
          index: 85,
          input: {
            junction: 175,
            branch: 0,
          },
        },
        {
          index: 237,
          input: {
            junction: 175,
            branch: 1,
          },
        },
      ],
      receivers: [
        {
          index: 49,
          input: {
            junction: 69,
            branch: 0,
          },
          recorded: false,
        },
        {
          index: 130,
          input: {
            junction: 69,
            branch: 1,
          },
          recorded: false,
        },
        {
          index: 259,
          input: {
            junction: 175,
            branch: 1,
          },
          recorded: false,
        },
      ],
    },
  },
  {
    rows: [
      '###################',
      '#.......#**....*..#',
      '#.E*...*#........*#',
      '#...**..#.......**#',
      '#....*.....*......#',
      '#***....#...*.....#',
      '#..*....#*...**...#',
      '#....*..#.*.....*.#',
      '#.......#......*..#',
      '#..**...###########',
      '#..*....#.*....**.#',
      '#.**...*#*..*.....#',
      '#....*..#.*..**...#',
      '#.**....#...*.*..*#',
      '#....*.....*......#',
      '#*......#........*#',
      '#*.S....#.........#',
      '#*...***#....*.*..#',
      '###################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [
        {
          index: 213,
          input: null,
          selected: null,
        },
        {
          index: 68,
          input: {
            junction: 213,
            branch: 0,
          },
          selected: null,
        },
        {
          index: 130,
          input: {
            junction: 68,
            branch: 0,
          },
          selected: null,
        },
      ],
      doors: [
        {
          index: 84,
          input: {
            junction: 213,
            branch: 0,
          },
        },
        {
          index: 274,
          input: {
            junction: 213,
            branch: 1,
          },
        },
      ],
      receivers: [
        {
          index: 48,
          input: {
            junction: 130,
            branch: 0,
          },
          recorded: false,
        },
        {
          index: 168,
          input: {
            junction: 130,
            branch: 1,
          },
          recorded: false,
        },
        {
          index: 296,
          input: {
            junction: 213,
            branch: 1,
          },
          recorded: false,
        },
        {
          index: 320,
          input: {
            junction: 213,
            branch: 1,
          },
          recorded: false,
        },
      ],
    },
  },
]
export const FERRY_CURRENT_ROWS: readonly (readonly number[])[] = [
  [3, 11],
  [1, 10],
  [3, 13],
]
/** Reconstruct the selected reach under its own stable campaign revision. */
export function ferryLayout(floor: number): PowerDungeonLayout {
  const content = FERRY_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown ferry reach')
  const layout = authoredPowerLayout(content)
  const width = layout.game.config.width
  const root = content.power.junctions[0]!.index
  // Two separated banks have opposite feeds. Static controls and doors never drift.
  const rows = FERRY_CURRENT_ROWS[floor - 1]!
  const excluded = new Set([
    layout.entrance,
    layout.exit,
    ...layout.walls,
    ...content.power.junctions.map((entry) => entry.index),
    ...content.power.receivers.map((entry) => entry.index),
    ...content.power.doors.map((entry) => entry.index),
  ])
  const lanes = rows.flatMap((baseRow, ordinal) =>
    Array.from({ length: floor }, (_, band) => {
      const row = baseRow + band
      const cells = Array.from({ length: 4 }, (_, offset) => row * width + width - 6 + offset)
      if (cells.some((index) => excluded.has(index)))
        throw new Error('Current overlaps a fixed landmark')
      return {
        cells,
        hold: { junction: root, branch: ordinal === 0 ? (0 as const) : (1 as const) },
        direction: floor === 1 || ordinal === 0 ? (1 as const) : (-1 as const),
      }
    }),
  )
  return { ...layout, current: { lanes, cycle: 0, permutation: [] } }
}
