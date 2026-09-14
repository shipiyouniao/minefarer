import { generateDungeon } from './dungeon-generator.js'
import { adjacentSteps, shuffled } from './variant-board.js'
import { randomIndex } from './engine.js'
import type { Config } from '../types/game.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'
import type { RiverDirection } from '../types/pressure.js'

/** A spring or circulating basin gives each generated reach its own visible flow field. */
function generatedCurrents(config: Config, origin: number, seed: number): RiverDirection[] {
  const next = randomIndex(seed ^ 0x718ea)
  const circulate = next(2) === 0
  const clockwise = next(2) === 0
  const centerX = circulate ? 2 + next(config.width - 4) : origin % config.width
  const centerY = circulate ? 2 + next(config.height - 4) : Math.floor(origin / config.width)

  return Array.from({ length: config.width * config.height }, (_, index) => {
    const x = (index % config.width) - centerX
    const y = Math.floor(index / config.width) - centerY
    if (!circulate)
      return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'west' : 'east') : y < 0 ? 'north' : 'south'
    if (Math.abs(y) >= Math.abs(x)) return y < 0 === clockwise ? 'east' : 'west'
    return x > 0 === clockwise ? 'south' : 'north'
  })
}

/** Derive current-reachable water before publishing any goals; stranded safe cells become banks. */
function sailingDistances(
  layout: DungeonLayout,
  currents: readonly RiverDirection[],
): ReadonlyMap<number, number> {
  const distance = new Map([[layout.entrance, 0]])
  const width = layout.game.config.width
  const queue = [layout.entrance]
  for (const index of queue) {
    const direction = currents[index]
    for (const other of adjacentSteps(layout.game, index)) {
      if (distance.has(other) || layout.walls.includes(other) || layout.game.cells[other]!.mine)
        continue
      const dx = (other % width) - (index % width)
      const dy = Math.floor(other / width) - Math.floor(index / width)
      const against =
        direction === 'east'
          ? dx < 0
          : direction === 'west'
            ? dx > 0
            : direction === 'north'
              ? dy > 0
              : dy < 0
      if (against) continue
      distance.set(other, distance.get(index)! + 1)
      queue.push(other)
    }
  }

  return distance
}

/** Generate terrain, currents, moorings and destinations from a fresh seed, never campaign rows. */
export function generateRecollectionRiver(seed: number, config: Config): DungeonLayout {
  const next = randomIndex(seed ^ 0x718e7)
  const count = 1 + next(config.width <= 11 ? 2 : 3)
  for (let attempt = 0; attempt < 64; attempt++) {
    const roomSeed = (seed + Math.imul(attempt, 0x45d9f3b)) >>> 0
    const layout = generateDungeon(roomSeed, config.mines, config.width, config.height)
    const currents = generatedCurrents(config, layout.entrance, roomSeed)
    const distance = sailingDistances(layout, currents)
    const available = config.width * config.height - config.mines - layout.walls.length
    if (distance.size < available * 0.75) continue
    const sites = shuffled(
      [...distance.keys()].filter(
        (index) => distance.get(index)! >= 4 && layout.game.cells[index]!.adjacent > 0,
      ),
      roomSeed ^ 0xa7c40,
    )
    if (sites.length < count + 4) continue
    const farthest = Math.max(...distance.values())
    const exit = shuffled(
      [...distance.keys()].filter((index) => distance.get(index)! >= Math.max(6, farthest - 2)),
      roomSeed ^ 0xe817,
    )[0]
    if (exit === undefined) continue
    const moorings = sites.filter((index) => index !== exit).slice(0, count)
    const treasures = sites
      .filter((index) => index !== exit && !moorings.includes(index))
      .slice(0, 3)
    if (treasures.length !== 3) continue
    const walls = layout.game.cells.flatMap((cell, index) =>
      !cell.mine && !distance.has(index) ? [index] : [],
    )
    const wallSet = new Set(walls)

    return {
      ...layout,
      exit,
      walls,
      treasures,
      game: {
        ...layout.game,
        cells: layout.game.cells.map((cell, index) =>
          wallSet.has(index)
            ? { ...cell, visibility: 'hidden' }
            : moorings.includes(index)
              ? { ...cell, visibility: 'revealed' }
              : cell,
        ),
      },
      pressure: {
        water: layout.game.cells.flatMap((_, index) => (!wallSet.has(index) ? [index] : [])),
        currents,
        docks: [layout.entrance, exit],
        boat: layout.entrance,
        anchored: true,
        waits: 0,
        moorings: moorings.map((index) => ({ index, secured: false })),
        voyage: [],
        line: [layout.entrance],
        ties: [layout.entrance],
      },
    }
  }

  throw new Error('Unable to generate a connected river with the required mine budget')
}
