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
/** Reconstruct the selected reach under its own stable campaign revision. */
export function ferryLayout(floor: number): PowerDungeonLayout {
  const content = FERRY_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown ferry reach')
  return authoredPowerLayout(content)
}
