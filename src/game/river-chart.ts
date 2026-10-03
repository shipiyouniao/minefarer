import { placedBoard, shuffled } from './variant-board.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'
import type { RiverChart, RiverDirection } from '../types/pressure.js'

/** Horizontal reaches bend around the bank; vertical reaches connect neighboring rows. */
function channelPath(from: number, to: number, width: number): number[] {
  const path = [from]
  let x = from % width,
    y = Math.floor(from / width)
  const tx = to % width,
    ty = Math.floor(to / width)
  /** Append each physical square so navigation and its animation use identical geometry. */
  const reach = (cx: number, cy: number): void => {
    while (x !== cx || y !== cy) {
      if (x !== cx) x += Math.sign(cx - x)
      else y += Math.sign(cy - y)
      path.push(y * width + x)
    }
  }
  if (y === ty && Math.abs(tx - x) >= 3) {
    const direction = Math.sign(tx - x)
    reach(x + direction, y)
    reach(x, y - 1)
    reach(tx - direction, y)
    reach(x, ty)
  }
  reach(tx, ty)
  return path
}

/** Build a public current network with fixed mines; safe branches form the authored escape route. */
export function buildRiverChart(chart: RiverChart): DungeonLayout {
  const { width, height } = chart
  const docks = chart.rows.flatMap((y) => chart.columns.map((x) => y * width + x))
  const boat = docks[chart.start]!,
    arrival = docks[chart.finish]!
  const entrance = boat + (boat % width < width / 2 ? -1 : 1)
  const exit = arrival + (arrival % width < width / 2 ? -1 : 1)
  const paths = chart.edges.map(([from, to]) => channelPath(docks[from]!, docks[to]!, width))
  const currents: (RiverDirection | null)[] = Array(width * height).fill(null)
  const reserved = new Set([
    entrance,
    exit,
    ...docks,
    ...paths.flatMap((path, i) => (chart.hazardous.includes(i) ? [] : path)),
  ])
  for (const path of paths) {
    for (let i = 1; i < path.length - 1; i++) {
      const index = path[i]!,
        next = path[i + 1]!
      const direction =
        next === index + 1 ? 'east' : next === index - 1 ? 'west' : next > index ? 'south' : 'north'
      if (currents[index] && currents[index] !== direction)
        throw new Error('Conflicting river currents')
      currents[index] = direction
    }
  }
  const walls = Array.from({ length: width * height }, (_, index) => index).filter(
    (index) =>
      index < width ||
      index >= width * (height - 1) ||
      index % width === 0 ||
      index % width === width - 1,
  )
  // Islands occupy the spaces between reaches, never a berth or a navigable channel.
  for (let row = 1; row < chart.rows.length; row++) {
    for (let column = 1; column < chart.columns.length; column++) {
      const x = Math.floor((chart.columns[column - 1]! + chart.columns[column]!) / 2)
      const y = Math.floor((chart.rows[row - 1]! + chart.rows[row]!) / 2)
      for (const index of [y * width + x, y * width + x + 1])
        if (!reserved.has(index) && !currents[index]) walls.push(index)
    }
  }
  const water = Array.from({ length: width * height }, (_, index) => index).filter(
    (index) => !walls.includes(index) && index !== entrance && index !== exit,
  )
  const mines = new Set<number>()
  for (const edge of chart.hazardous) {
    const path = paths[edge]!
    const candidates = path.filter((index) => !reserved.has(index))
    const index = candidates[Math.floor(candidates.length / 2)]
    if (index === undefined) throw new Error('Hazardous reach has no separate water')
    mines.add(index)
  }
  const candidates = shuffled(
    water.filter((index) => !reserved.has(index) && !mines.has(index)),
    chart.seed,
  )
  for (const index of candidates.slice(0, chart.mines - mines.size)) mines.add(index)
  if (mines.size !== chart.mines) throw new Error('River chart cannot fit the mine budget')
  const game = placedBoard({ width, height, mines: mines.size }, mines, chart.seed, entrance)
  let layout: DungeonLayout = {
    entrance,
    exit,
    walls,
    treasures: chart.treasures.map((index) => docks[index]!),
    game: {
      ...game,
      cells: game.cells.map((cell, index) => ({
        ...cell,
        visibility:
          docks.includes(index) ||
          index === entrance ||
          index === exit ||
          (!walls.includes(index) &&
            !cell.mine &&
            !currents[index] &&
            ((index % width) + Math.floor(index / width)) % 3 === 0)
            ? 'revealed'
            : 'hidden',
      })),
    },
    pressure: { water, currents, docks, boat, voyage: [], line: [boat] },
  }
  for (let turn = 0; turn < (chart.rotation ?? 0); turn++) layout = rotateChart(layout)
  return layout
}

/** Rotate geography and public arrows together, including asymmetric rectangular charts. */
function rotateChart(layout: DungeonLayout): DungeonLayout {
  const { width, height } = layout.game.config
  /** Convert an old coordinate into the clockwise chart. */
  const turn = (index: number): number =>
    (index % width) * height + height - 1 - Math.floor(index / width)
  const cells = [...layout.game.cells]
  const currents = [...layout.pressure!.currents]
  const directions = { north: 'east', east: 'south', south: 'west', west: 'north' } as const
  layout.game.cells.forEach((cell, index) => {
    cells[turn(index)] = cell
  })
  layout.pressure!.currents.forEach((direction, index) => {
    currents[turn(index)] = direction ? directions[direction] : null
  })
  return {
    ...layout,
    entrance: turn(layout.entrance),
    exit: turn(layout.exit),
    walls: layout.walls.map(turn),
    treasures: layout.treasures.map(turn),
    game: {
      ...layout.game,
      config: { ...layout.game.config, width: height, height: width },
      firstClick: layout.game.firstClick === null ? null : turn(layout.game.firstClick),
      cells,
    },
    pressure: {
      ...layout.pressure!,
      water: layout.pressure!.water.map(turn),
      currents,
      docks: layout.pressure!.docks.map(turn),
      boat: turn(layout.pressure!.boat),
      line: layout.pressure!.line.map(turn),
      voyage: [],
    },
  }
}
