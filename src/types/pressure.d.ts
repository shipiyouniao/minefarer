/** Charted currents are public; unmarked water is only available for soundings. */
export type RiverDirection = 'north' | 'east' | 'south' | 'west'

/** A route is traced without reading concealed mine positions. */
export interface RiverRoute {
  readonly launch: number
  readonly destination: number
  readonly path: readonly number[]
  readonly unknown: readonly number[]
  readonly blocked: readonly number[]
}

/** The boat stops only at berths; the paid-out line provides a safe way back. */
export interface PressureFloor {
  readonly water: readonly number[]
  readonly currents: readonly (RiverDirection | null)[]
  readonly docks: readonly number[]
  readonly boat: number
  readonly voyage: readonly number[]
  readonly line: readonly number[]
}

/** Shared chart construction accepts authored or freshly generated route networks. */
export interface RiverChart {
  readonly rotation?: 0 | 1 | 2 | 3
  readonly width: number
  readonly height: number
  readonly mines: number
  readonly columns: readonly number[]
  readonly rows: readonly number[]
  readonly edges: readonly (readonly [number, number])[]
  readonly hazardous: readonly number[]
  readonly start: number
  readonly finish: number
  readonly treasures: readonly number[]
  readonly seed: number
}
