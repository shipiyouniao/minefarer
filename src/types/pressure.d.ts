/** A moving raft connects static banks. Waiting never changes land mines or clues. */
export interface PressureFloor {
  readonly water: readonly number[]
  readonly stops: readonly number[]
  readonly position: number
  readonly waits: number
  readonly moorings: readonly number[]
}
