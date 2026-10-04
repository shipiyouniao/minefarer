import { REED_CAMP_GATE } from './regional-camps.js'
import type { StoryScene, StoryProgress } from '../types/story.js'
import type { WorldPortal } from '../types/world-route.js'

export const WEST_ROAD_GATE = 12
export const WEST_CAMP_GATE = 19
export const PASS_SHORTCUT = 92
export const BASTION_GATE = 16

/** The old bridge is an actual persistent scene west of the tower road, with a single river crossing. */
export const NORTHWEST_SCENES: readonly StoryScene[] = [
  {
    id: 'northwest-bridge',
    rows: [
      '#############',
      '#Eoo..#.....#',
      '#oo*..#..*..#',
      '#ooooo#ooooo#',
      '#..ooo#ooo..#',
      '#ooooooooooo#',
      '#..ooo#ooo..#',
      '#..*..#o.*..#',
      '#ooooo#ooooo#',
      '#ooooo#ooooS#',
      '#############',
    ],
    water: [19, 32, 45, 58, 84, 97, 110, 123],
    bridge: [70, 71, 72],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
  {
    id: 'blockade-pass',
    rows: [
      '#############',
      '#ooEoooo....#',
      '#ooo..oo.*..#',
      '#o*..ooo....#',
      '#oooooo####o#',
      '#..*ooooooo.#',
      '#......o*ooo#',
      '#ooooooooooS#',
      '#############',
    ],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
  {
    id: 'old-ferry',
    rows: [
      '#############',
      '#ooo*..#...*#',
      '#oES*..#*...#',
      '#ooooooooooo#',
      '#o*....#...o#',
      '#o.....#...o#',
      '#ooooooooooo#',
      '#..*...#.*..#',
      '#############',
    ],
    water: [20, 33, 59, 72, 98],
    bridge: [46, 85],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
  {
    id: 'driftwood-bank',
    rows: [
      '###############',
      '#ooo..*#......#',
      '#o*o...#*...*.#',
      '#oooooo#...*..#',
      '#ooo*..#......#',
      '#oSooooo*.....#',
      '#oo.*..#oooooo#',
      '#ooooooooooooE#',
      '#o*o...#*..o..#',
      '#oooooo#...o*.#',
      '###############',
    ],
    water: [22, 37, 52, 67, 97, 127, 142],
    bridge: [82, 112],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
  {
    id: 'split-bank',
    rows: [
      '#############',
      '#..*..#.....#',
      '#..ooo#.*...#',
      '#oooooEooooo#',
      '#ooo..#...*.#',
      '#ooo*.#.....#',
      '#Soooooooooo#',
      '#oo...#.*...#',
      '#############',
    ],
    water: [19, 32, 58, 71, 97],
    bridge: [45, 84],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
  {
    id: 'upstream-steps',
    rows: [
      '#############',
      '#..*..oooooo#',
      '#....oooo*o.#',
      '#oooooo....o#',
      '#o...*o....o#',
      '#ESooooooooo#',
      '#oo...oo*..o#',
      '#oo*..oooooo#',
      '#############',
    ],
    clue: null,
    safeClue: null,
    teachingMine: null,
    teachingSafe: null,
  },
]

/** The shortcut unlocks by crossing the bridge, never by clicking the atlas. */
export const NORTHWEST_PORTALS: readonly WorldPortal[] = [
  {
    scene: 'old-ferry',
    index: 85,
    destination: 'split-bank',
    arrival: 79,
    requires: 'pressure-cove-cleared',
  },
  {
    scene: 'split-bank',
    index: 79,
    destination: 'old-ferry',
    arrival: 85,
    requires: 'pressure-cove-cleared',
  },
  {
    scene: 'split-bank',
    index: 45,
    destination: 'upstream-steps',
    arrival: 66,
    requires: 'causeway-cleared',
  },
  {
    scene: 'upstream-steps',
    index: 66,
    destination: 'split-bank',
    arrival: 45,
    requires: 'causeway-cleared',
  },
  {
    scene: 'old-ferry',
    index: 76,
    destination: 'driftwood-bank',
    arrival: 77,
    requires: 'wreck-rumor',
    outcome: 'wreck-crew-found',
  },
  {
    scene: 'driftwood-bank',
    index: 77,
    destination: 'old-ferry',
    arrival: 76,
    requires: 'wreck-rumor',
  },
  {
    scene: 'reed-camp',
    index: 50,
    destination: 'old-ferry',
    arrival: 28,
    requires: 'ferry-channel-cleared',
  },
  {
    scene: 'old-ferry',
    index: 28,
    destination: 'reed-camp',
    arrival: 50,
    requires: 'ferry-channel-cleared',
  },
  {
    scene: 'blockade-pass',
    index: BASTION_GATE,
    destination: 'reed-camp',
    arrival: REED_CAMP_GATE,
    requires: 'chapter-one-cleared',
    outcome: 'reed-camp-reached',
  },
  {
    scene: 'reed-camp',
    index: REED_CAMP_GATE,
    destination: 'blockade-pass',
    arrival: BASTION_GATE,
    requires: 'chapter-one-cleared',
  },
  {
    scene: 'north-road',
    index: WEST_ROAD_GATE,
    destination: 'northwest-bridge',
    arrival: 128,
    requires: 'west-line-restored',
  },
  {
    scene: 'northwest-bridge',
    index: 128,
    destination: 'north-road',
    arrival: WEST_ROAD_GATE,
    requires: 'west-line-restored',
  },
  {
    scene: 'northwest-bridge',
    index: 14,
    destination: 'blockade-pass',
    arrival: 102,
    requires: 'west-line-restored',
    outcome: 'west-shortcut',
  },
  {
    scene: 'blockade-pass',
    index: 102,
    destination: 'northwest-bridge',
    arrival: 14,
    requires: 'west-line-restored',
  },
  {
    scene: 'blockade-pass',
    index: PASS_SHORTCUT,
    destination: 'camp',
    arrival: WEST_CAMP_GATE,
    requires: 'west-shortcut',
  },
  {
    scene: 'camp',
    index: WEST_CAMP_GATE,
    destination: 'blockade-pass',
    arrival: PASS_SHORTCUT,
    requires: 'west-shortcut',
  },
]

/** Rendering and movement share the same unlock condition and never consult covered mine truth. */
export function northwestPortals(
  scene: StoryScene['id'],
  progress: StoryProgress,
): readonly WorldPortal[] {
  return NORTHWEST_PORTALS.filter(
    (portal) => portal.scene === scene && progress.facts?.includes(portal.requires),
  )
}

/** Both bridge approaches and eastward road pads remain permanently clear for future connections. */
export const OLD_FERRY_MAIN_ROAD = [
  28,
  29,
  ...Array.from({ length: 11 }, (_, i) => 40 + i),
  53,
  63,
  66,
  76,
  ...Array.from({ length: 11 }, (_, i) => 79 + i),
] as const
