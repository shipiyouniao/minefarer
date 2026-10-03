import { actExpedition, createExpedition } from '../src/game/expedition.js'
import { convoyLayout } from '../src/game/convoy.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import { solveHarbor } from './harbor-search.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'

export const WRECK_DEPARTURE = {
  ...CURRENT_DEPARTURE,
  campaign: 'wreck-harbor-v3' as const,
  seed: 0,
}

/** Start an isolated authored puzzle while production progression remains separately covered. */
export function convoyFixture(floor: number): Expedition {
  const layout = convoyLayout(floor)
  return { ...createExpedition(WRECK_DEPARTURE), ...layout, floor, player: layout.entrance }
}

/** Enumerate public orders, including waiting; neither hidden mines nor private state is inspected. */
export function convoyOrders(run: Expedition): ExpeditionAction[] {
  const convoy = run.convoy!
  const choices = convoy.boats.map((boat) =>
    boat.arrived
      ? [0]
      : [
          0,
          ...convoy.reaches
            .filter((reach) => reach.from === boat.position)
            .map((reach) => reach.to),
        ],
  )
  let orders: number[][] = [[]]
  for (const options of choices)
    orders = orders.flatMap((order) => options.map((index) => [...order, index]))
  return orders.map((orders) => ({ type: 'convoy', orders }))
}

/** Find a dispatch sequence using only accepted actions and visible routes. */
export function solveConvoy(initial: Expedition): ExpeditionAction[] | null {
  if (initial.floor === 4) return solveHarbor(initial.convoy!)
  const queue = [{ run: initial, actions: [] as ExpeditionAction[] }]
  const seen = new Set<string>([convoyKey(initial)])
  for (let at = 0; at < queue.length; at++) {
    const { run, actions } = queue[at]!
    if (run.phase === 'reward') return actions
    for (const action of convoyOrders(run)) {
      const next = actExpedition(run, action)
      const key = convoyKey(next)
      if (next !== run && !seen.has(key)) {
        seen.add(key)
        queue.push({ run: next, actions: [...actions, action] })
      }
    }
  }
  return null
}

/** Earlier arrival at the same fleet arrangement dominates later schedules. */
function convoyKey(run: Expedition): string {
  return run.convoy!.boats.map((boat) => `${boat.position}/${boat.arrived}`).join(':')
}
