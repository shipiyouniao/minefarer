import { placedBoard } from './variant-board.js'
import type { RiverFloorContent, RiverDirection } from '../types/pressure.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'

export const PRESSURE_FLOORS: readonly RiverFloorContent[] = [
  {
    rows: [
      '###############',
      '#~*~~~~~~~~~DE#',
      '#*o~*~*o~~~~o.#',
      '#~*~~~~~*~~~T~#',
      '#~~*~~T~~~~*~~#',
      '#~~~~~~~~~~~~~#',
      '#**~~*###~~~~*#',
      '#~o*~oA##~~~o~#',
      '#~~~~*###**~~~#',
      '#~**~~~~**~T~~#',
      '#~~~~~~~~~*~~~#',
      '#~~~~~~~*~~~~~#',
      '#.oo~*~o~~*~*~#',
      '#SBo~~~~~~~~*~#',
      '###############',
    ],
  },
  {
    rows: [
      '#################',
      '#~~~~~~**~~~*~DE#',
      '#~o~~~*~o~~~~~o.#',
      '#~*~~~~~*~~~*~~~#',
      '#~~~###~~*~~~~~*#',
      '#~*oA##*~*~~~~~~#',
      '#~~~###~~~~~~*~~#',
      '#~~~~~*~~~~*~**~#',
      '#*o~~~~*~~~~~~o*#',
      '#~~~~~T**~~*T*~*#',
      '#~~~~T~~~~###~**#',
      '#~~***~**oA##**~#',
      '#~~~**~~~~###~~~#',
      '#~~~~~~~~~~~*~~~#',
      '#.oo~~~~o~~~~~~~#',
      '#SBo~~~~*~~~~~~~#',
      '#################',
    ],
  },
  {
    rows: [
      '###################',
      '#~~T**~~~~~~~~~~DE#',
      '#~o~~~~~*o~~~~T~o.#',
      '#~~~*~~~~~~~~~~~~~#',
      '#~~**~*~~~~###~*~~#',
      '#~*~*~~~~*oA##~*~~#',
      '#~~~*~~~o~~###~~**#',
      '#~~~~~~~~*~~~~~*~*#',
      '#*~*~~~~~~**~~*~~~#',
      '#~o~~###~***~~~~o~#',
      '#~~~oA##~*~~~~~*~~#',
      '#*~~~###~~*~~~~~*~#',
      '#*~*~**~~o~~~~~~~*#',
      '#~~~~~~**~*~###*~*#',
      '#~~~o~~~~~~oA##~~*#',
      '#~~~~~~~*T~~###~~~#',
      '#.oo~~~~~o*~***~*~#',
      '#SBo~~*~~~~~~*~*~~#',
      '###################',
    ],
  },
]

/** The chart shows a clockwise circulation; sideways paddling selects inner or outer channels. */
function riverDirection(index: number, width: number, height: number): RiverDirection {
  const x = (index % width) - (width - 1) / 2
  const y = Math.floor(index / width) - (height - 1) / 2

  return Math.abs(y) >= Math.abs(x) ? (y < 0 ? 'east' : 'west') : x > 0 ? 'south' : 'north'
}

/** Build fixed water minefields and honest eight-neighbor clues from authored content. */
export function authoredRiverLayout(content: RiverFloorContent): DungeonLayout {
  const width = content.rows[0]!.length
  const height = content.rows.length
  if (content.rows.some((row) => row.length !== width)) throw new RangeError('Ragged river chart')
  const symbols = [...content.rows.join('')]
  const entrance = symbols.indexOf('S')
  const boat = symbols.indexOf('B')
  const exit = symbols.indexOf('E')
  if (entrance < 0 || boat < 0 || exit < 0)
    throw new RangeError('River chart needs a departure, boat and exit')
  const water = symbols.flatMap((symbol, index) => ('~*oBDT'.includes(symbol) ? [index] : []))
  const mines = new Set(symbols.flatMap((symbol, index) => (symbol === '*' ? [index] : [])))
  const game = placedBoard({ width, height, mines: mines.size }, mines, 0, entrance)

  return {
    entrance,
    exit,
    walls: symbols.flatMap((symbol, index) => ('#A'.includes(symbol) ? [index] : [])),
    treasures: symbols.flatMap((symbol, index) => (symbol === 'T' ? [index] : [])),
    game: {
      ...game,
      cells: game.cells.map((cell, index) => ({
        ...cell,
        visibility: 'oBDSEA.'.includes(symbols[index]!) ? 'revealed' : 'hidden',
      })),
    },
    pressure: {
      water,
      currents: symbols.map((_, index) => riverDirection(index, width, height)),
      docks: symbols.flatMap((symbol, index) => ('BD'.includes(symbol) ? [index] : [])),
      boat,
      anchored: true,
      waits: 0,
      moorings: symbols.flatMap((symbol, index) =>
        symbol === 'A' ? [{ index, secured: false }] : [],
      ),
      voyage: [],
      line: [boat],
      ties: [boat],
    },
  }
}

/** Each authored crossing owns its coastline; old raft journals retire instead of replaying new rules. */
export function pressureLayout(floor: number): DungeonLayout {
  const content = PRESSURE_FLOORS[floor - 1]
  if (!content) throw new RangeError('Unknown river crossing')

  return authoredRiverLayout(content)
}
