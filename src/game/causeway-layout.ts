import { placedBoard } from './variant-board.js'
import { CAUSEWAY_CHARTS } from './causeway-charts.js'
import { revealDungeon } from './dungeon-reveal.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'
import type { CausewayChart } from '../types/causeway.js'

/** Authored islands and explicit mines retain their identities when bridges are recovered. */
export function causewayLayout(floor: number): DungeonLayout {
  const chart = CAUSEWAY_CHARTS[floor - 1]
  if (!chart) throw new RangeError('Unknown causeway floor')
  return buildCausewayChart(orientCausewayChart(chart, floor - 1))
}

/** Rotate full geometry, clues and landmarks together, preserving every physical connection. */
export function orientCausewayChart(original: CausewayChart, turns: number): CausewayChart {
  let chart = original
  for (let turn = 0; turn < turns; turn++) {
    const { width, height } = chart
    /** One clockwise coordinate transform is shared by all tile-bound content. */
    const rotate = (index: number): number =>
      (index % width) * height + height - 1 - Math.floor(index / width)
    chart = {
      ...chart,
      width: height,
      height: width,
      islands: chart.islands.map(([x, y, w, h]) => [height - y - h, x, h, w]),
      entrance: rotate(chart.entrance),
      exit: rotate(chart.exit),
      clues: chart.clues.map(rotate),
      treasures: chart.treasures.map(rotate),
      mines: chart.mines.map(rotate),
    }
  }
  return chart
}

/** Campaign and Recollection share the same public terrain and bridge representation. */
export function buildCausewayChart(chart: CausewayChart): DungeonLayout {
  const rocks: number[] = [],
    water: number[] = []
  for (let y = 0; y < chart.height; y++)
    for (let x = 0; x < chart.width; x++) {
      const index = y * chart.width + x
      if (!x || !y || x === chart.width - 1 || y === chart.height - 1) rocks.push(index)
      else if (
        !chart.islands.some(
          ([left, top, width, height]) =>
            x >= left && y >= top && x < left + width && y < top + height,
        )
      )
        water.push(index)
    }
  const walls = [...rocks, ...water]
  let game = placedBoard(
    { width: chart.width, height: chart.height, mines: chart.mines.length },
    new Set(chart.mines),
    0,
    chart.entrance,
  )
  game = {
    ...game,
    phase: 'playing',
    cells: game.cells.map((cell) => ({ ...cell, visibility: 'hidden' })),
  }
  game = revealDungeon({ game, walls }, chart.entrance)
  game = {
    ...game,
    cells: game.cells.map((cell, index) =>
      chart.clues.includes(index) ? { ...cell, visibility: 'revealed' } : cell,
    ),
  }
  return {
    game,
    walls,
    entrance: chart.entrance,
    exit: chart.exit,
    treasures: chart.treasures,
    causeway: {
      rocks,
      water,
      placements: 0,
      planks: [
        { length: 2, position: { kind: 'held' } },
        ...(chart.long
          ? [{ length: 4 as const, position: { kind: 'shore' as const, index: chart.entrance } }]
          : []),
      ],
    },
  }
}
