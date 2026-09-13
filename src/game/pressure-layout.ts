import { authoredPowerLayout } from './authored-power-layout.js'
import type { AuthoredPowerFloor } from '../types/floor-power.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'
export const PRESSURE_FLOORS: readonly AuthoredPowerFloor[] = [
  {
    rows: [
      '#################',
      '#ooo...###.*.*.*#',
      '#oSo...###.*...*#',
      '#ooo..*###**.*..#',
      '#...**.###**...*#',
      '#..**..###....*.#',
      '#...*..###*..**.#',
      '#..*.oo###oo....#',
      '#....oo###oo....#',
      '#....oo###oo.*..#',
      '#...*.*###......#',
      '#...*..###....*.#',
      '#......###.....*#',
      '#..*...###.....*#',
      '#.....*###....E.#',
      '#...*..###......#',
      '#################',
    ],
    power: { purpose: 'drainage', junctions: [], receivers: [], doors: [] },
  },
  {
    rows: [
      '###################',
      '#ooo*...###..*.*.*#',
      '#oSo*..*###......*#',
      '#ooo..oo###oo..*..#',
      '#*.*.*oo###oo.*.*.#',
      '#*..**oo###oo.....#',
      '#..*.*..###.*.*...#',
      '#.......###...*...#',
      '#.......###########',
      '#.*.*.**###*......#',
      '#.....*.###*......#',
      '#...*.oo###oo..*..#',
      '#.*...oo###oo.....#',
      '#.**..oo###oo..*..#',
      '#.E....*###*......#',
      '#..*....###.......#',
      '###################',
    ],
    power: { purpose: 'drainage', junctions: [], receivers: [], doors: [] },
  },
  {
    rows: [
      '###################',
      '#.......###.*...*.#',
      '#.E....*###....*..#',
      '#..*..oo###oo.*...#',
      '#*.**.oo###oo...*.#',
      '#*.*..oo###oo.....#',
      '#..*...*###**.*...#',
      '#*.*...*###.......#',
      '#.....*.###*....*.#',
      '###################',
      '#....*.*###..*....#',
      '#....*.*###.**....#',
      '#.....*.###...*..*#',
      '#....*oo###oo...*.#',
      '#.*..*oo###oo.....#',
      '#ooo..oo###oo.....#',
      '#oSo...*###.*.*...#',
      '#ooo....###.......#',
      '###################',
    ],
    power: { purpose: 'drainage', junctions: [], receivers: [], doors: [] },
  },
]
/** Static islands require boarding a raft; mine positions never rotate into free discoveries. */
export function pressureLayout(floor: number): DungeonLayout {
  const content = PRESSURE_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown ferry crossing')
  const { power, ...base } = authoredPowerLayout(content)
  const { width, height } = base.game.config,
    left = (width / 2) | 0
  const water = Array.from({ length: height - 2 }, (_, r) => [
    (r + 1) * width + left - 1,
    (r + 1) * width + left,
    (r + 1) * width + left + 1,
  ]).flat()
  const stops =
    floor === 1
      ? [width * ((height / 2) | 0) + left - 1, width * ((height / 2) | 0) + left + 1]
      : [
          width * 4 + left - 1,
          width * 4 + left + 1,
          width * (height - 5) + left + 1,
          width * (height - 5) + left - 1,
        ]
  if (floor === 3) stops.reverse()
  const moorings =
    floor === 1
      ? [width * (height - 3) + width - 4]
      : floor === 2
        ? [width * 2 + width - 3, width * (height - 3) + width - 3]
        : [width * (height - 3) + width - 3, width * 2 + width - 3]
  return {
    ...base,
    walls: base.walls.filter((i) => i !== stops[0]),
    game: {
      ...base.game,
      cells: base.game.cells.map((c, i) =>
        water.includes(i) || content.rows.join('')[i] === 'o'
          ? { ...c, visibility: 'revealed' }
          : c,
      ),
    },
    pressure: { water, stops, position: 0, waits: 0, moorings },
  }
}
