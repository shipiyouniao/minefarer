import { neighbors } from './engine.js'
import { adjacentSteps } from './variant-board.js'
import type { Expedition, ExpeditionAction } from '../types/variants.js'
import type { RiverRoute } from '../types/pressure.js'

/** The character can only occupy water while standing on the actual boat. */
export function aboardRiverBoat(run: Expedition): boolean {
  return !!run.pressure && run.player === run.pressure.boat
}

/** Follow a public arrow without wrapping across a board edge. */
function downstreamCell(run: Expedition, index: number): number | null {
  const direction = run.pressure?.currents[index]
  if (!direction) return null
  const width = run.game.config.width
  const offset =
    direction === 'north' ? -width : direction === 'south' ? width : direction === 'west' ? -1 : 1
  const target = index + offset
  return adjacentSteps(run.game, index).includes(target) ? target : null
}

/** Trace departures to their first berth, rejecting loops using public geometry alone. */
export function riverRoutes(run: Expedition): RiverRoute[] {
  const river = run.pressure
  if (!river || !aboardRiverBoat(run)) return []
  const routes: RiverRoute[] = []
  for (const launch of adjacentSteps(run.game, river.boat)) {
    const path = [river.boat]
    let index: number | null = launch
    while (
      index !== null &&
      river.water.includes(index) &&
      !run.walls.includes(index) &&
      !path.includes(index)
    ) {
      path.push(index)
      if (river.docks.includes(index)) {
        // Wrong flags remain blocking hypotheses; previews never consult concealed mine truth.
        routes.push({
          launch,
          destination: index,
          path,
          unknown: path.filter((cell) => run.game.cells[cell]?.visibility === 'hidden'),
          blocked: path.filter(
            (cell) =>
              (run.game.cells[cell]?.visibility === 'flagged' &&
                (run.encounter?.kind !== 'keelcrab' ||
                  path.filter((i) => run.game.cells[i]?.visibility === 'flagged').length > 1)) ||
              (run.game.cells[cell]?.visibility === 'revealed' && run.game.cells[cell]?.mine),
          ),
        })
        break
      }
      index = downstreamCell(run, index)
    }
  }
  return routes
}

/** Walking can board or disembark; it cannot substitute for a committed voyage. */
export function riverNeighbors(run: Expedition, index: number): number[] {
  const river = run.pressure
  const ordinary = adjacentSteps(run.game, index)
  if (!river) return ordinary
  return ordinary.filter((other) => {
    const water = river.water.includes(index),
      nextWater = river.water.includes(other)
    if (!water && !nextWater) return true
    if (!water) return other === river.boat && river.docks.includes(other)
    return !nextWater && index === river.boat && river.docks.includes(index)
  })
}

/** A berth surveys its outgoing channels and banks; a new berth exposes new work. */
export function riverSoundingCells(run: Expedition): Set<number> {
  const river = run.pressure
  if (!river || !aboardRiverBoat(run)) return new Set()
  const cells = new Set<number>()
  for (const index of [run.player, ...riverRoutes(run).flatMap((route) => route.path)])
    for (const nearby of [index, ...neighbors(run.game.config, index)])
      if (river.water.includes(nearby) && !run.walls.includes(nearby)) cells.add(nearby)
  return cells
}

/** Sounding never moves the boat or collects a distant treasure. */
export function riverSurveyPath(run: Expedition, index: number): number[] | null {
  return riverSoundingCells(run).has(index) ? [run.player] : null
}

/** Only the separate departure control can launch; cells retain ordinary reveal/move intent. */
export function riverCellAction(run: Expedition, index: number): ExpeditionAction {
  return { type: run.game.cells[index]?.visibility === 'revealed' ? 'move' : 'reveal', index }
}

/** Erase loops so backtracking remains bounded by the board area. */
function riverLine(previous: readonly number[], path: readonly number[]): number[] {
  const line = [...previous]
  for (const index of path) {
    const existing = line.indexOf(index)
    if (existing >= 0) line.splice(existing + 1)
    else line.push(index)
  }
  return line
}

/** One departure carries hull and passenger through the entire cleared route. */
export function sailRiverBoat(run: Expedition, launch: number): Expedition {
  const river = run.pressure
  if (!river || run.phase !== 'exploring') return run
  const route = riverRoutes(run).find((entry) => entry.launch === launch)
  if (!route || route.unknown.length || route.blocked.length) return run
  return {
    ...run,
    player: route.destination,
    steps: run.steps + 1,
    pressure: {
      ...river,
      boat: route.destination,
      voyage: route.path,
      line: riverLine(river.line, route.path),
    },
  }
}

/** Return only through sailed water to the previous berth, retaining all discoveries. */
export function haulRiverBoat(run: Expedition): Expedition {
  const river = run.pressure
  if (!river || run.phase !== 'exploring' || !aboardRiverBoat(run) || river.line.length < 2)
    return run
  const stop = river.line.findLastIndex(
    (index, position) => position < river.line.length - 1 && river.docks.includes(index),
  )
  if (stop < 0) return run
  const boat = river.line[stop]!
  return {
    ...run,
    player: boat,
    steps: run.steps + 1,
    pressure: {
      ...river,
      boat,
      voyage: river.line.slice(stop).reverse(),
      line: river.line.slice(0, stop + 1),
    },
  }
}
