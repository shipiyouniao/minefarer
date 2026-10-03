/** Marked rescue boats are separate from the player's inventory. */
export interface ConvoyBoat {
  readonly position: number
  readonly destination: number
  /** Number of animation/simulation ticks required to cross one cell. */
  readonly pace: 1 | 2
  readonly arrived: boolean
}

/** Every reach is authored as public orthogonal water geometry. */
export interface ConvoyReach {
  readonly from: number
  readonly to: number
  readonly path: readonly number[]
}

export interface ConvoyVoyage {
  readonly path: readonly number[]
  readonly pace: 1 | 2
}

export interface ConvoyFloor {
  readonly ports: readonly number[]
  readonly reaches: readonly ConvoyReach[]
  readonly boats: readonly ConvoyBoat[]
  readonly round: number
  readonly voyages: readonly ConvoyVoyage[]
  readonly starts: readonly ConvoyBoat[]
  readonly history: readonly (readonly ConvoyBoat[])[]
}

/** A forecast checks every occupied cell and edge at the same simulation time. */
export interface ConvoyPlan {
  readonly voyages: readonly ConvoyVoyage[]
  readonly collision: number | null
  readonly tick: number
  readonly allowed: boolean
  readonly reason: 'ready' | 'idle' | 'route' | 'collision'
}

/** Indexed public lanes make authored boards reviewable without embedding hidden movement rules. */
export interface ConvoyLayoutSpec {
  readonly width: number
  readonly height: number
  readonly ports: readonly number[]
  readonly reaches?: readonly ConvoyReach[]
  readonly lanes: readonly (readonly [number, number])[]
  readonly boats: readonly (readonly [number, number, 1 | 2])[]
}
