import { authoredPowerLayout } from './authored-power-layout.js'
import type { AuthoredPowerFloor, PowerDungeonLayout } from '../types/floor-power.js'
/** Hand-authored sluice topology and minefields; no runtime randomness or copied chapter rooms. */
export const FERRY_FLOORS: readonly AuthoredPowerFloor[] = [
  {
    rows: [
      '#################',
      '#***..**#**.....#',
      '#*E*..*.#.....*.#',
      '#.*..*..#.*...*.#',
      '#.............*.#',
      '#......*#...*...#',
      '#......*#.***.*.#',
      '#*.*....#...*.*.#',
      '#..*..*.#########',
      '#...*...#*...*..#',
      '#......*#.*.*...#',
      '#......*#.......#',
      '#..*..........*.#',
      '#.......#.......#',
      '#..S..*.#.......#',
      '#......*#...*...#',
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
      '#......**#***.*...#',
      '#*.S..**.#........#',
      '#....**.*#*...***.#',
      '#*............*.**#',
      '#*.....*.#*......*#',
      '#**....*.#........#',
      '#.*......##########',
      '#........#........#',
      '#..*.....#.....***#',
      '#........#*...*.**#',
      '#........#......**#',
      '#.*.*...*..*....*.#',
      '#...*.*..#....*...#',
      '#....*...#......E.#',
      '#........#..**....#',
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
      '#.*.*...#*.*...*..#',
      '#*E*.*..#....*..**#',
      '#.*.***.#.....**.*#',
      '#...........*.*...#',
      '#*.*...*#.....*..*#',
      '#.......#*....*...#',
      '#.*...**#....*....#',
      '#.*...*.#.........#',
      '#.......###########',
      '#*.....*#...**....#',
      '#*......#..*.....*#',
      '#.......#.......*.#',
      '#...*.*.#*.*......#',
      '#*..**....*....*..#',
      '#*......#........*#',
      '#..S....#...**....#',
      '#.......#.......*.#',
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
/** Reconstruct broad tidal banks, leaving only walls and physical landmarks anchored. */
export function ferryLayout(floor: number): PowerDungeonLayout {
  const content = FERRY_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown ferry reach')
  const layout = authoredPowerLayout(content)
  const { width, height } = layout.game.config
  const root = content.power.junctions[0]!.index
  const divider = floor === 3 ? 8 : Math.floor(width / 2)
  const excluded = new Set([
    layout.entrance,
    layout.exit,
    ...layout.walls,
    ...content.power.junctions.map((entry) => entry.index),
    ...content.power.receivers.map((entry) => entry.index),
  ])
  const lanes = []
  for (let row = 1; row < height - 1; row++) {
    for (let bank = 0; bank < 2; bank++) {
      const left = bank === 0 ? 1 : divider + 1
      const right = bank === 0 ? divider : width - 1
      let cells: number[] = []
      for (let column = left; column <= right; column++) {
        const index = row * width + column
        if (column === right || excluded.has(index)) {
          if (cells.length > 1)
            lanes.push({
              cells,
              hold: { junction: root, branch: bank === 0 ? (0 as const) : (1 as const) },
              direction: floor === 1 || bank === 0 ? (1 as const) : (-1 as const),
            })
          cells = []
        } else cells.push(index)
      }
    }
  }
  return { ...layout, current: { lanes, cycle: 0, permutation: [] } }
}
