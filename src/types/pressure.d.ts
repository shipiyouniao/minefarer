/** Fixed square sampling area in board coordinates, unaffected by drifting tiles. */
export interface PressureFootprint {
  readonly column: number
  readonly row: number
  readonly size: 2 | 3
}

/** An authored instrument compares two disjoint areas; players cannot move them. */
export interface PressurePair {
  readonly id: string
  readonly a: PressureFootprint
  readonly b: PressureFootprint
}

/** Public observation contains only the difference, never either hidden absolute count. */
export interface PressureReading {
  readonly id: string
  readonly a: readonly number[]
  readonly b: readonly number[]
  readonly difference: number
}

/** A public count interval for either footprint, including unresolved ambiguity. */
export interface PressureBounds {
  readonly min: number
  readonly max: number
}

/** Constraint propagation keeps both areas uncertain unless evidence narrows them. */
export interface PressureConstraint {
  readonly a: PressureBounds
  readonly b: PressureBounds
}

/** Authored observations and safe physical landings for one pressure reach. */
export interface PressureFloor {
  readonly pairs: readonly PressurePair[]
  readonly instruments: readonly number[]
  readonly moorings: readonly number[]
  readonly lessonTarget: number
}
