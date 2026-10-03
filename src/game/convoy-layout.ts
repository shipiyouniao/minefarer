import { convoyHarbor } from './convoy-harbor.js'
import { placedBoard } from './variant-board.js'
import type { ConvoyLayoutSpec, ConvoyReach } from '../types/convoy.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'

export const CONVOY_FLOORS = 4
export const WRECK_BOSS_FLOOR = CONVOY_FLOORS + 1

/** The original two lessons retain their exact coordinates, lanes, destinations and speeds. */
function convoySpec(floor: number): ConvoyLayoutSpec {
  switch (floor) {
    case 1:
      return {
        width: 15,
        height: 13,
        ports: [92, 102, 97, 37, 157],
        lanes: [
          [0, 2],
          [1, 2],
          [2, 3],
          [2, 4],
        ],
        boats: [
          [0, 1, 1],
          [1, 0, 1],
        ],
      }
    case 2:
      return {
        width: 15,
        height: 13,
        ports: [92, 102, 95, 99, 35, 159],
        lanes: [
          [0, 2],
          [2, 3],
          [3, 1],
          [2, 4],
          [3, 5],
        ],
        boats: [
          [0, 1, 1],
          [1, 0, 2],
        ],
      }
    case 3:
      return {
        width: 17,
        height: 15,
        ports: [121, 133, 42, 212, 124, 130, 127, 56, 198],
        lanes: [
          [0, 4],
          [4, 6],
          [6, 5],
          [5, 1],
          [2, 6],
          [6, 3],
          [4, 7],
          [5, 8],
        ],
        boats: [
          [0, 1, 1],
          [1, 2, 2],
          [2, 0, 1],
        ],
      }
    case 4:
      return convoyHarbor()
    default:
      throw new RangeError('Unknown convoy chart')
  }
}

/** Public reaches follow complete straight channels; crossings without a berth cannot turn. */
function convoyReach(from: number, to: number, width: number): ConvoyReach {
  if (from % width !== to % width && Math.floor(from / width) !== Math.floor(to / width))
    throw new RangeError('Convoy lane must be orthogonal')
  const step = from % width === to % width ? Math.sign(to - from) * width : Math.sign(to - from)
  const path = [from]
  while (path.at(-1) !== to) path.push(path.at(-1)! + step)
  return { from, to, path }
}

/** Combine charted water with finite fleet orders; no invisible mines or automatic safe-boat choices. */
export function convoyLayout(floor: number): DungeonLayout {
  const spec = convoySpec(floor)
  const reaches =
    spec.reaches ??
    [...spec.lanes, ...spec.lanes.map(([a, b]) => [b, a] as const)].map(([a, b]) =>
      convoyReach(spec.ports[a]!, spec.ports[b]!, spec.width),
    )
  const water = new Set(reaches.flatMap((r) => r.path))
  const walls = Array.from({ length: spec.width * spec.height }, (_, i) => i).filter(
    (i) => !water.has(i),
  )
  const boats = spec.boats.map(([from, to, pace]) => ({
    position: spec.ports[from]!,
    destination: spec.ports[to]!,
    pace,
    arrived: false,
  }))
  const entrance = boats[0]!.position,
    exit = boats[0]!.destination
  const game = placedBoard(
    { width: spec.width, height: spec.height, mines: 0 },
    new Set(),
    0,
    entrance,
  )
  return {
    entrance,
    exit,
    walls,
    treasures: [],
    game: { ...game, cells: game.cells.map((cell) => ({ ...cell, visibility: 'revealed' })) },
    convoy: {
      ports: spec.ports,
      reaches,
      boats,
      starts: boats,
      history: [],

      round: 0,
      voyages: [],
    },
  }
}
