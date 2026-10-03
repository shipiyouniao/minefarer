import type { TacticalState } from './tactical.js'

/** A naval round advances only when the boat commits a complete voyage. */
export interface KeelcrabEncounter extends TacticalState {
  readonly kind: 'keelcrab'
  readonly charged: boolean
  readonly weakSide: number
  readonly weakCells: readonly number[]
  readonly wake: readonly number[]
  readonly resolution: null | {
    readonly targets: readonly number[]
    readonly hit: number | null
    readonly counter: number | null
    readonly damage: number
  }
}
