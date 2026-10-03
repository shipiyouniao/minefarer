export interface ConvoySearchMove {
  readonly path: readonly number[]
  readonly pace: 1 | 2
  readonly next: number
  readonly arrived: boolean
}
export interface ConvoySearchMoves {
  readonly all: ConvoySearchMove[]
  readonly at: number[][]
}
export interface ConvoySearchPair {
  readonly a: number
  readonly b: number
  readonly table: Uint8Array
  readonly stride: number
}
export type ConvoySearchEntry = readonly [number, number, number]
