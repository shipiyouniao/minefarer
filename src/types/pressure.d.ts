/** A public current constrains navigation without exposing buried mines. */
export type RiverDirection = 'north' | 'east' | 'south' | 'west'

/** A secured shore bollard opens a permanent stopping place on this crossing. */
export interface RiverMooring {
  readonly index: number
  readonly secured: boolean
}

/** Navigation owns the boat separately from the passenger and ordinary shore paths. */
export interface PressureFloor {
  readonly water: readonly number[]
  readonly currents: readonly RiverDirection[]
  readonly docks: readonly number[]
  readonly boat: number
  readonly anchored: boolean
  readonly waits: number
  readonly moorings: readonly RiverMooring[]
  readonly voyage: readonly number[]
  readonly line: readonly number[]
  readonly ties: readonly number[]
}

/** Authored shore, water and landmarks; currents derive from the visible channel geometry. */
export interface RiverFloorContent {
  readonly rows: readonly string[]
}
