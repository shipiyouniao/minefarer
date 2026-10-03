import { recordTravel } from './exploration-relics.js'
import type { Expedition } from '../types/variants.js'
import type { ConvoyFloor, ConvoyPlan } from '../types/convoy.js'
export { convoyLayout } from './convoy-layout.js'

/** A docked boat leaves the navigation lane only after its arrival tick has resolved. */
export function convoyPosition(
  path: readonly number[],
  pace: number,
  tick: number,
  goal: number,
  arrived: boolean,
): number | null {
  if (arrived || (path.length > 1 && path.at(-1) === goal && tick > (path.length - 1) * pace))
    return null
  return path[Math.min(path.length - 1, Math.floor(tick / pace))]!
}

/** Forecast the entire fleet together; holding still remains an occupied berth, not an absent boat. */
export function planConvoy(convoy: ConvoyFloor, choices: readonly number[]): ConvoyPlan {
  let invalid = choices.length !== convoy.boats.length
  const voyages = convoy.boats.map((boat, i) => {
    const to = choices[i] ?? 0
    const route = convoy.reaches.find((reach) => reach.from === boat.position && reach.to === to)
    if (to !== 0 && (boat.arrived || !route)) invalid = true
    return {
      path: to !== 0 && route && !boat.arrived ? route.path : [boat.position],
      pace: boat.pace,
    }
  })
  if (invalid) return { voyages, collision: null, tick: 0, allowed: false, reason: 'route' }
  if (voyages.every((voyage) => voyage.path.length === 1))
    return { voyages, collision: null, tick: 0, allowed: false, reason: 'idle' }
  const duration = Math.max(...voyages.map((v) => (v.path.length - 1) * v.pace))
  /** Inspect a simultaneous instant using only the published lane and speed. */
  const positions = (tick: number): readonly (number | null)[] =>
    voyages.map((v, i) =>
      convoyPosition(v.path, v.pace, tick, convoy.boats[i]!.destination, convoy.boats[i]!.arrived),
    )
  for (let tick = 1; tick <= duration; tick++) {
    const previous = positions(tick - 1),
      next = positions(tick)
    for (let a = 0; a < next.length; a++)
      for (let b = a + 1; b < next.length; b++) {
        const first = next[a],
          second = next[b]
        if (
          first !== null &&
          second !== null &&
          (first === second || (first === previous[b] && second === previous[a]))
        )
          return { voyages, collision: first!, tick, allowed: false, reason: 'collision' }
      }
  }
  return { voyages, collision: null, tick: duration, allowed: true, reason: 'ready' }
}

/** Only a jointly safe departure changes the fleet; rejected plans consume no resources. */
export function launchConvoy(run: Expedition, orders: readonly number[]): Expedition {
  if (!run.convoy || run.phase !== 'exploring') return run
  const plan = planConvoy(run.convoy, orders)
  if (!plan.allowed) return run
  const boats = run.convoy.boats.map((boat, i) => {
    const position = plan.voyages[i]!.path.at(-1)!
    return { ...boat, position, arrived: boat.arrived || position === boat.destination }
  })
  return {
    ...recordTravel(run, plan.voyages[0]!.path),
    steps: run.steps + 1,
    player: boats[0]!.position,
    convoy: {
      ...run.convoy,
      boats,
      history: [...run.convoy.history, run.convoy.boats],
      round: run.convoy.round + 1,
      voyages: plan.voyages,
    },
  }
}

/** Reconsider an uncompleted schedule without refunding resources or repeating travel credit. */
export function rewindConvoy(run: Expedition, reset: boolean): Expedition {
  const fleet = run.convoy
  if (!fleet || run.phase !== 'exploring' || fleet.round === 0) return run
  const boats = reset ? fleet.starts : fleet.history.at(-1)!
  return {
    ...run,
    steps: run.steps + 1,
    player: boats[0]!.position,
    convoy: {
      ...fleet,
      boats,
      round: reset ? 0 : fleet.round - 1,
      history: reset ? [] : fleet.history.slice(0, -1),
      voyages: [],
    },
  }
}
