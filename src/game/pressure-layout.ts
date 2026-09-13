import { authoredPowerLayout } from './authored-power-layout.js'
import { pressureCells } from './pressure.js'
import type { AuthoredPowerFloor, PowerDungeonLayout } from '../types/floor-power.js'
import type { PressurePair, PressureFootprint } from '../types/pressure.js'

export const PRESSURE_FLOORS: readonly AuthoredPowerFloor[] = [
  {
    rows: [
      '#################',
      '#...*.....**...*#',
      '#.S.....*..*....#',
      '#.....**.*....**#',
      '#.*.*...**.*.*..#',
      '#.*.....*.*.***.#',
      '#*.*.*.*.*.*....#',
      '#...*...........#',
      '#.*........*.*..#',
      '#**...*.........#',
      '#.*..........*..#',
      '#....*..........#',
      '#...............#',
      '#.........*.....#',
      '#.............E.#',
      '#.........*.....#',
      '#################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [{ index: 37, input: null, selected: 0 }],
      receivers: [],
      doors: [],
    },
  },
  {
    rows: [
      '###################',
      '#...***...*.*.*.*.#',
      '#.S......**.....**#',
      '#.....*.*.....*...#',
      '#.*.*....**..*...*#',
      '#.......*...*.....#',
      '#*...*.*.......*..#',
      '#.*..........*....#',
      '#..*..*...........#',
      '#..*...*..........#',
      '#......*..*.....*.#',
      '#........*........#',
      '#.....*.......*...#',
      '#*..........*.....#',
      '#.*......*......E.#',
      '#.....**...*.*....#',
      '###################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [{ index: 41, input: null, selected: 0 }],
      receivers: [],
      doors: [],
    },
  },
  {
    rows: [
      '###################',
      '#...*..*.....*.*..#',
      '#.S......*.....*..#',
      '#.........*...*...#',
      '#...*..**....*...*#',
      '#..**......*......#',
      '#.*..*.......*....#',
      '#...*.....*.*...*.#',
      '#*.*...*.*.*.*.**.#',
      '#.....*.....*...*.#',
      '#**......*........#',
      '#.*......**.....*.#',
      '#..........*...*..#',
      '#......*..........#',
      '#.................#',
      '#........*...*.*..#',
      '#........*......E*#',
      '#...........***...#',
      '###################',
    ],
    power: {
      purpose: 'drainage',
      junctions: [{ index: 41, input: null, selected: 0 }],
      receivers: [],
      doors: [],
    },
  },
]
/** Fixed observations and an open shoreline replace the previous branching pipe maze. */
export function pressureLayout(floor: number): PowerDungeonLayout {
  const content = PRESSURE_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown pressure reach')
  const base = authoredPowerLayout(content),
    { width, height } = base.game.config
  const pairs: PressurePair[] = [
    { id: 'AB', a: { column: 1, row: 1, size: 2 }, b: { column: 4, row: 2, size: 2 } },
  ]
  if (floor >= 2)
    pairs.push({ id: 'BC', a: { column: 4, row: 2, size: 2 }, b: { column: 7, row: 4, size: 2 } })
  if (floor >= 3)
    pairs.push({ id: 'CD', a: { column: 7, row: 4, size: 2 }, b: { column: 10, row: 7, size: 2 } })
  const instruments = pairs.map((_, i) => width * (2 + i) + 3)
  const moorings =
    floor === 1
      ? [width * (height - 3) + width - 4]
      : [width * 3 + width - 4, width * (height - 4) + 3]
  const anchors = new Set([
    ...base.walls,
    base.entrance,
    base.exit,
    ...instruments,
    ...moorings,
    ...pressureCells(base.game.config, pairs[0]!.a),
  ])
  const lanes = []
  for (let row = 1; row < height - 1; row++) {
    for (let bank = 0; bank < 2; bank++) {
      const start = bank === 0 ? 1 : Math.floor(width / 2),
        end = bank === 0 ? Math.floor(width / 2) : width - 1
      let cells: number[] = []
      for (let c = start; c <= end; c++) {
        const index = row * width + c
        if (c === end || anchors.has(index)) {
          if (cells.length > 1)
            lanes.push({
              cells,
              hold: { junction: instruments[0]!, branch: bank === 0 ? (0 as const) : (1 as const) },
              direction: floor === 1 || bank === 0 ? (1 as const) : (-1 as const),
            })
          cells = []
        } else cells.push(index)
      }
    }
  }
  return orientPressure(
    {
      ...base,
      pressure: { pairs, instruments, moorings, lessonTarget: width * 2 + 4 },
      current: { lanes, cycle: 0, permutation: [] },
    },
    floor,
  )
}

/** Mirror later reaches so entrances, landings and flow forecasts retain their authored relationship. */
function orientPressure(layout: PowerDungeonLayout, floor: number): PowerDungeonLayout {
  if (floor === 1) return layout
  const { width, height } = layout.game.config
  /** Horizontal reflection is self-inverse; the last reach reflects both axes. */
  const transform = (index: number): number =>
    (floor === 3 ? height - 1 - Math.floor(index / width) : Math.floor(index / width)) * width +
    width -
    1 -
    (index % width)
  /** A reflected square keeps its size and uses the minimum transformed coordinate. */
  const area = (value: PressureFootprint): PressureFootprint => ({
    ...value,
    column: width - value.column - value.size,
    row: floor === 3 ? height - value.row - value.size : value.row,
  })
  return {
    ...layout,
    entrance: transform(layout.entrance),
    exit: transform(layout.exit),
    walls: layout.walls.map(transform),
    game: {
      ...layout.game,
      cells: layout.game.cells.map((_, i) => layout.game.cells[transform(i)]!),
      firstClick: layout.game.firstClick === null ? null : transform(layout.game.firstClick),
    },
    power: {
      ...layout.power,
      junctions: layout.power.junctions.map((j) => ({ ...j, index: transform(j.index) })),
    },
    pressure: {
      ...layout.pressure!,
      pairs: layout.pressure!.pairs.map((pair) => ({ ...pair, a: area(pair.a), b: area(pair.b) })),
      instruments: layout.pressure!.instruments.map(transform),
      moorings: layout.pressure!.moorings.map(transform),
      lessonTarget: transform(layout.pressure!.lessonTarget),
    },
    current: {
      ...layout.current!,
      lanes: layout.current!.lanes.map((lane) => ({
        ...lane,
        cells: lane.cells.map(transform).reverse(),
        direction: lane.direction === 1 ? (-1 as const) : (1 as const),
        hold: { ...lane.hold, junction: transform(lane.hold.junction) },
      })),
    },
  }
}
