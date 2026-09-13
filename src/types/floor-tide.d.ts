import type { PowerFeed } from './floor-power.js'
/** Fixed current lanes move tile knowledge; their connected feed holds them still. */
export interface CurrentLane {
  readonly cells: readonly number[]
  readonly hold: PowerFeed
  readonly direction: 1 | -1
}
export interface FloorTide {
  readonly lanes: readonly CurrentLane[]
  readonly cycle: number
  readonly permutation: readonly number[]
}
