import { neighbors } from './engine.js'
import { adjacentSteps } from './variant-board.js'
import type { Expedition, ExpeditionAction } from '../types/variants.js'
import type { RiverDirection } from '../types/pressure.js'

/** The character can only occupy water while standing on the actual boat. */
export function aboardRiverBoat(run: Expedition): boolean {
  return !!run.pressure && run.player === run.pressure.boat
}

/** Resolve a charted direction without wrapping across a board edge. */
export function downstreamCell(run: Expedition, index: number): number | null {
  const direction = run.pressure?.currents[index]
  const width = run.game.config.width
  const offset =
    direction === 'north' ? -width : direction === 'south' ? width : direction === 'west' ? -1 : 1
  const target = index + offset

  return adjacentSteps(run.game, index).includes(target) ? target : null
}

/** Currents permit downstream and cross-stream paddling, never an upstream shortcut. */
function followsCurrent(run: Expedition, from: number, to: number): boolean {
  const width = run.game.config.width
  const direction: RiverDirection | undefined = run.pressure?.currents[from]
  const dx = (to % width) - (from % width)
  const dy = Math.floor(to / width) - Math.floor(from / width)

  return direction === 'east'
    ? dx >= 0
    : direction === 'west'
      ? dx <= 0
      : direction === 'north'
        ? dy <= 0
        : dy >= 0
}

/** Share boat/shore edges between path previews, actual movement and reachable frontiers. */
export function riverNeighbors(run: Expedition, index: number): number[] {
  const river = run.pressure
  const ordinary = adjacentSteps(run.game, index)
  if (!river) return ordinary

  const afloat = aboardRiverBoat(run)
  const water = river.water.includes(index)

  return ordinary.filter((other) => {
    const nextWater = river.water.includes(other)
    if (!water && !nextWater) return true
    if (!water) return other === river.boat && river.docks.includes(other)
    if (!nextWater) return river.docks.includes(index)
    if (!afloat || river.anchored) return false

    return followsCurrent(run, index, other)
  })
}

/** Water is examined from an anchored boat within its eight-neighbor sounding reach. */
export function riverSurveyPath(run: Expedition, index: number): number[] | null {
  const river = run.pressure
  if (!river || !river.water.includes(index)) return null

  return aboardRiverBoat(run) &&
    river.anchored &&
    neighbors(run.game.config, run.player).includes(index)
    ? [run.player]
    : null
}

/** Mooring the boat is reusable; raised anchors are required before following a current. */
export function toggleRiverAnchor(run: Expedition): Expedition {
  if (!run.pressure || run.phase !== 'exploring' || !aboardRiverBoat(run)) return run

  return {
    ...run,
    steps: run.steps + 1,
    pressure: { ...run.pressure, anchored: !run.pressure.anchored, voyage: [] },
  }
}

/** A stationary boat can secure a neighboring bollard or the pontoon directly beneath it. */
export function riverMooringReady(run: Expedition, index: number): boolean {
  const river = run.pressure

  return (
    !!river &&
    run.phase === 'exploring' &&
    aboardRiverBoat(run) &&
    river.anchored &&
    river.moorings.some((entry) => entry.index === index && !entry.secured) &&
    (index === run.player || adjacentSteps(run.game, run.player).includes(index))
  )
}

/** Shared pointer and keyboard intent keeps traversable pontoons available as sailing destinations. */
export function riverCellAction(run: Expedition, index: number): ExpeditionAction {
  if (riverMooringReady(run, index)) return { type: 'interact', index }

  return { type: run.game.cells[index]?.visibility === 'revealed' ? 'move' : 'reveal', index }
}

/** Secure a bollard from a stationary boat, not by walking past a token. */
export function secureRiverMooring(run: Expedition, index: number): Expedition {
  const river = run.pressure
  if (!river || !riverMooringReady(run, index)) return run

  return {
    ...run,
    steps: run.steps + 1,
    pressure: {
      ...river,
      moorings: river.moorings.map((entry) =>
        entry.index === index ? { ...entry, secured: true } : entry,
      ),
      voyage: [],
      ties: [...new Set([...river.ties, run.player])],
    },
  }
}

/** Commit the same public sailing path for both hull and passenger; dock on disembarkation. */
export function carryRiverBoat(
  before: Expedition,
  after: Expedition,
  path: readonly number[],
): Expedition {
  const river = after.pressure
  if (!river || !aboardRiverBoat(before) || before.player === after.player) return after
  const voyage = path.filter((index) => river.water.includes(index))
  const boat = voyage.at(-1) ?? river.boat

  return {
    ...after,
    pressure: {
      ...river,
      boat,
      anchored: after.player !== boat,
      voyage,
      line: riverLine(river.line, voyage),
    },
  }
}

/** A deliberate drift advances along known safe water only, never scouting or moving an empty boat. */
export function driftRiverBoat(run: Expedition): Expedition {
  const river = run.pressure
  if (!river || run.phase !== 'exploring' || !aboardRiverBoat(run) || river.anchored) return run
  const target = downstreamCell(run, run.player)
  const cell = target === null ? null : run.game.cells[target]
  if (
    target === null ||
    !river.water.includes(target) ||
    run.walls.includes(target) ||
    cell?.visibility !== 'revealed' ||
    cell.mine
  )
    return run

  return {
    ...run,
    player: target,
    steps: run.steps + 1,
    pressure: {
      ...river,
      boat: target,
      waits: river.waits + 1,
      voyage: [river.boat, target],
      line: riverLine(river.line, [target]),
    },
  }
}

/** Erase sailed loops so the recoverable rope route stays bounded by the board area. */
function riverLine(previous: readonly number[], path: readonly number[]): number[] {
  const line = [...previous]
  for (const index of path) {
    const existing = line.indexOf(index)
    if (existing >= 0) line.splice(existing + 1)
    else line.push(index)
  }

  return line
}

/** Haul against the current along the existing rope only; no new water becomes reachable. */
export function haulRiverBoat(run: Expedition): Expedition {
  const river = run.pressure
  if (!river || run.phase !== 'exploring' || !aboardRiverBoat(run) || river.line.length < 2)
    return run
  const previousTie = river.line.findLastIndex(
    (index, position) => position < river.line.length - 1 && river.ties.includes(index),
  )
  const stop = Math.max(0, previousTie)
  const boat = river.line[stop]!

  return {
    ...run,
    player: boat,
    steps: run.steps + 1,
    pressure: {
      ...river,
      boat,
      anchored: true,
      voyage: river.line.slice(stop).reverse(),
      line: river.line.slice(0, stop + 1),
    },
  }
}
