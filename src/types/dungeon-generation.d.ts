import type { PressureFloor } from './pressure.js'
import type { CausewayFloor } from './causeway.js'
import type { ConvoyFloor } from './convoy.js'
import type { Game } from './game.js'

/** Generated terrain and public landmarks, independent of run resources. */
export interface DungeonLayout {
  readonly causeway?: CausewayFloor
  readonly convoy?: ConvoyFloor
  readonly pressure?: PressureFloor
  readonly game: Game
  readonly entrance: number
  readonly exit: number
  readonly walls: readonly number[]
  readonly treasures: readonly number[]
}

/** A mechanic can reject terrain before the generator accepts its final layout. */
export type DungeonLayoutFilter = (layout: DungeonLayout) => boolean
