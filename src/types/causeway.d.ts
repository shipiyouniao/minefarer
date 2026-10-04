/** Reusable planks are either carried, lying on dry land, or spanning a straight channel. */
export type CausewayPosition =
  | { readonly kind: 'held' }
  | { readonly kind: 'shore'; readonly index: number }
  | { readonly kind: 'laid'; readonly from: number; readonly to: number }

export interface CausewayPlank {
  readonly length: 2 | 4
  readonly position: CausewayPosition
}

/** Only accepted bridge moves are journalled; previews are derived from public geography. */
export interface CausewayFloor {
  readonly water: readonly number[]
  readonly rocks: readonly number[]
  readonly planks: readonly CausewayPlank[]
  readonly placements: number
}

export interface CausewaySpan {
  readonly from: number
  readonly to: number
  readonly water: readonly number[]
  readonly approach: readonly number[]
}

export interface CausewayChart {
  readonly width: number
  readonly height: number
  readonly islands: readonly (readonly [number, number, number, number])[]
  readonly entrance: number
  readonly exit: number
  readonly treasures: readonly number[]
  readonly clues: readonly number[]
  readonly mines: readonly number[]
  readonly long: boolean
}
