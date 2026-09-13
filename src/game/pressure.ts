import type { Expedition } from '../types/variants.js'
/** A tide moves the raft and its passenger; static banks retain all knowledge. */
export function waitForFerry(run: Expedition): Expedition {
  const ferry = run.pressure
  if (!ferry || run.phase !== 'exploring') return run
  const previous = ferry.stops[ferry.position]!
  const position = (ferry.position + 1) % ferry.stops.length
  const next = ferry.stops[position]!
  const aboard = run.player === previous
  return {
    ...run,
    player: aboard ? next : run.player,
    steps: run.steps + 1,
    travelled: aboard ? [...new Set([...run.travelled, next])] : run.travelled,
    walls: [
      ...run.walls.filter((i) => !ferry.water.includes(i)),
      ...ferry.water.filter((i) => i !== next),
    ],
    pressure: { ...ferry, position, waits: ferry.waits + 1 },
  }
}
