import { convoyPosition } from '../src/game/convoy.js'
import type { ConvoyFloor } from '../src/types/convoy.js'
import type { ExpeditionAction } from '../src/types/variants.js'
import type { ConvoySearchMoves, ConvoySearchPair, ConvoySearchEntry } from './convoy-search.js'

/** Search only fleet arrangements, avoiding thousands of copied full-board expedition snapshots. */
export function solveHarbor(fleet: ConvoyFloor): ExpeditionAction[] | null {
  const ports = fleet.ports,
    count = ports.length,
    base = count + 1,
    size = base ** 4
  const goals = fleet.boats.map((boat) => ports.indexOf(boat.destination))
  const distances = ports.map((_, goal) => {
    const result = Array<number>(count).fill(999),
      queue = [goal]
    result[goal] = 0
    for (const at of queue)
      for (const reach of fleet.reaches.filter((r) => r.to === ports[at])) {
        const from = ports.indexOf(reach.from)
        if (result[from]! > result[at]! + 1) {
          result[from] = result[at]! + 1
          queue.push(from)
        }
      }
    return result
  })
  const moves: ConvoySearchMoves[] = fleet.boats.map((boat, i) => {
    const result: ConvoySearchMoves = { all: [], at: ports.map(() => []) }
    for (let j = 0; j < count; j++)
      for (const path of [
        [ports[j]!],
        ...fleet.reaches.filter((r) => r.from === ports[j]).map((r) => r.path),
      ]) {
        const to = ports.indexOf(path.at(-1)!)
        result.at[j]!.push(result.all.length)
        result.all.push({
          path,
          pace: boat.pace,
          next: path.length > 1 && to === goals[i] ? count : to,
          arrived: false,
        })
      }
    result.at.push([result.all.length])
    result.all.push({ path: [boat.destination], pace: boat.pace, next: count, arrived: true })
    return result
  })
  const pairs: ConvoySearchPair[] = []
  for (let a = 0; a < 4; a++)
    for (let b = a + 1; b < 4; b++) {
      const first = moves[a]!.all,
        second = moves[b]!.all,
        table = new Uint8Array(first.length * second.length)
      for (let x = 0; x < first.length; x++)
        for (let y = 0; y < second.length; y++) {
          const u = first[x]!,
            v = second[y]!,
            duration = Math.max((u.path.length - 1) * u.pace, (v.path.length - 1) * v.pace)
          let p = convoyPosition(u.path, u.pace, 0, fleet.boats[a]!.destination, u.arrived),
            q = convoyPosition(v.path, v.pace, 0, fleet.boats[b]!.destination, v.arrived)
          for (let tick = 1; tick <= duration; tick++) {
            const i = convoyPosition(u.path, u.pace, tick, fleet.boats[a]!.destination, u.arrived),
              j = convoyPosition(v.path, v.pace, tick, fleet.boats[b]!.destination, v.arrived)
            if (i !== null && j !== null && (i === j || (i === q && j === p))) {
              table[x * second.length + y] = 1
              break
            }
            p = i
            q = j
          }
        }
      pairs.push({ a, b, table, stride: second.length })
    }
  /** Each boat occupies a berth or the one off-channel arrival state. */
  const encode = (positions: readonly number[]): number =>
    positions.reduce((value, position) => value * base + position, 0)
  /** Recover the four public boat positions from one bounded state key. */
  const decode = (state: number): number[] => {
    const positions: number[] = []
    for (let i = 0; i < 4; i++) {
      positions.unshift(state % base)
      state = Math.floor(state / base)
    }
    return positions
  }
  const best = new Uint16Array(size).fill(65535),
    parent = new Int32Array(size).fill(-1),
    heap: ConvoySearchEntry[] = []
  /** Favor progress without claiming the first discovered schedule is globally shortest. */
  const push = (entry: ConvoySearchEntry): void => {
    let i = heap.length
    heap.push(entry)
    while (i) {
      const p = (i - 1) >> 1
      if (heap[p]![0] <= entry[0]) break
      heap[i] = heap[p]!
      i = p
    }
    heap[i] = entry
  }
  /** Remove the next promising public arrangement from the bounded search. */
  const pop = (): ConvoySearchEntry => {
    const first = heap[0]!,
      last = heap.pop()!
    if (heap.length) {
      let i = 0
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1
        if (child + 1 < heap.length && heap[child + 1]![0] < heap[child]![0]) child++
        if (heap[child]![0] >= last[0]) break
        heap[i] = heap[child]!
        i = child
      }
      heap[i] = last
    }
    return first
  }
  const start = encode(
      fleet.boats.map((boat) => (boat.arrived ? count : ports.indexOf(boat.position))),
    ),
    goal = encode([count, count, count, count])
  best[start] = 0
  push([0, 0, start])
  while (heap.length) {
    const [, depth, state] = pop()
    if (best[state] !== depth) continue
    if (state === goal) {
      const states = [goal]
      while (states.at(-1) !== start) states.push(parent[states.at(-1)!]!)
      states.reverse()
      return states.slice(1).map((state, j) => {
        const previous = decode(states[j]!),
          next = decode(state)
        return {
          type: 'convoy',
          orders: next.map((position, i) =>
            position === previous[i]
              ? 0
              : position === count
                ? fleet.boats[i]!.destination
                : ports[position]!,
          ),
        }
      })
    }
    const positions = decode(state),
      choices: number[] = []
    /** Reject colliding pairs before expanding the rest of a simultaneous order. */
    const expand = (i: number): void => {
      if (i < 4) {
        for (const choice of moves[i]!.at[positions[i]!]!) {
          choices[i] = choice
          if (
            pairs.some(
              (pair) => pair.b === i && pair.table[choices[pair.a]! * pair.stride + choice],
            )
          )
            continue
          expand(i + 1)
        }
        return
      }
      const next = choices.map((choice, i) => moves[i]!.all[choice]!.next),
        id = encode(next)
      if (id === state || best[id]! <= depth + 1) return
      best[id] = depth + 1
      parent[id] = state
      const distance = next.reduce(
        (sum, position, i) => sum + (position === count ? 0 : distances[goals[i]!]![position]!),
        0,
      )
      push([depth + 1 + distance * 1.8, depth + 1, id])
    }
    expand(0)
  }
  return null
}
