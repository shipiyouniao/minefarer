import { placedBoard, shuffled } from './variant-board.js'
import { neighbors } from './engine.js'
import { riverSoundingCells } from './pressure.js'
import { riverRoutes, sailRiverBoat, haulRiverBoat } from './pressure.js'
import { combatStats, damageExpedition, incomingCombatDamage } from './combat-build.js'
import { applyDamageRelics, available, claim } from './relic-effects.js'
import { strikeDamage } from './combat-relics.js'
import { recordTravel } from './exploration-relics.js'
import { roomTravel, roomDiscoveries } from './mirror-state.js'
import type { Expedition, ExpeditionAction } from '../types/variants.js'
import type { DungeonLayout } from '../types/dungeon-generation.js'
import type { RiverDirection } from '../types/pressure.js'
import type { KeelcrabEncounter } from '../types/keelcrab.js'
import type { TacticalPlan, ExploreTransition } from '../types/tactical.js'

const SIZE = 17
const DOCKS: readonly number[] = [54, 64, 234, 224]

/** Trace an orthogonal reach through explicit corner coordinates. */
function reach(points: readonly number[]): number[] {
  const path = [points[0]!]
  for (const destination of points.slice(1)) {
    let index = path.at(-1)!
    while (index !== destination) {
      index +=
        index % SIZE !== destination % SIZE
          ? Math.sign((destination % SIZE) - (index % SIZE))
          : Math.sign(destination - index) * SIZE
      path.push(index)
    }
  }
  return path
}

/** Separate inner clockwise reaches from longer outer counterclockwise reaches. */
export function keelcrabPaths(): readonly (readonly number[])[] {
  return [
    ...DOCKS.map((dock, i) => reach([dock, DOCKS[(i + 1) % 4]!])),
    reach([54, 53, 223, 224]),
    reach([64, 47, 37, 54]),
    reach([234, 235, 65, 64]),
    reach([224, 241, 251, 234]),
  ]
}

/** Bank soundings frame covered channels; each reach contains one genuinely towable floating mine. */
export function keelcrabLayout(seed = 0): DungeonLayout {
  const paths = keelcrabPaths()
  const lanes = new Set(paths.flat())
  const walls = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => {
    const x = i % SIZE,
      y = Math.floor(i / SIZE)
    return x === 0 || y === 0 || x === 16 || y === 16 || (x >= 6 && x <= 10 && y >= 6 && y <= 10)
  })
  const water = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !walls.includes(i))
  const bank = new Set(
    [...lanes]
      .flatMap((i) => neighbors({ width: SIZE, height: SIZE, mines: 0 }, i))
      .filter((i) => !lanes.has(i)),
  )
  const mines = new Set(
    paths.map((path, i) => shuffled(path.slice(3, -3), seed ^ (0xc4ab + i * 7919))[0]!),
  )
  for (const index of shuffled(
    water.filter((i) => !lanes.has(i) && !bank.has(i)),
    seed ^ 0x48c,
  ).slice(0, 8))
    mines.add(index)
  const currents: (RiverDirection | null)[] = Array(SIZE * SIZE).fill(null)
  for (const path of paths)
    for (let i = 1; i < path.length - 1; i++) {
      const at = path[i]!,
        next = path[i + 1]!
      currents[at] =
        next === at + 1 ? 'east' : next === at - 1 ? 'west' : next > at ? 'south' : 'north'
    }
  const boat = DOCKS[seed % 4]!
  const game = placedBoard({ width: SIZE, height: SIZE, mines: mines.size }, mines, seed, boat)
  return {
    entrance: boat,
    exit: 144,
    walls,
    treasures: [],
    game: {
      ...game,
      cells: game.cells.map((cell, index) => ({
        ...cell,
        visibility:
          DOCKS.includes(index) || (bank.has(index) && !walls.includes(index))
            ? 'revealed'
            : 'hidden',
      })),
    },
    pressure: { water, currents, docks: [...DOCKS], boat, line: [boat], voyage: [] },
  }
}

/** Both current lanes on the same shore share a side identity. */
function sideOf(path: readonly number[]): number {
  const middle = path[Math.floor(path.length / 2)]!
  const x = middle % SIZE,
    y = Math.floor(middle / SIZE)
  return y <= 3 ? 0 : x >= 13 ? 1 : y >= 13 ? 2 : 3
}

/** Freeze attack geometry at the berth, independently of preview or hidden information. */
function forecast(run: Expedition, encounter: KeelcrabEncounter): KeelcrabEncounter {
  const paths = keelcrabPaths()
  // A clockwise sweep is announced independently of the boat. Chasing its current berth
  // with alternating sides would trap the player between two berths in the second phase.
  const side = (DOCKS.indexOf(run.entrance) + encounter.turn - 1) % 4
  const enraged = encounter.health * 2 <= encounter.maxHealth
  const targets = paths.flatMap((path, i) =>
    sideOf(path) === side && (enraged || i < 4 === (encounter.turn % 3 !== 0))
      ? path.slice(1, -1)
      : [],
  )
  const weakCells = paths
    .filter((path) => sideOf(path) === encounter.weakSide)
    .map((path) => path[Math.floor(path.length / 2)]!)
  return {
    ...encounter,
    weakCells,
    intent: {
      kind: 'swarm',
      targets: [...new Set([...targets, ...(enraged ? encounter.wake : [])])].filter(
        (i) => !run.pressure!.docks.includes(i),
      ),
      damage: enraged ? 4 : 3,
    },
  }
}

/** Install the same encounter in the authored side story and the selected Recollection pool. */
export function enterKeelcrab(run: Expedition): Expedition {
  const { circuits, power, rail, current, convoy, ...prior } = run
  const layout = keelcrabLayout(run.departure.campaign ? 0 : run.departure.seed + run.floor)
  const maxHealth =
    run.departure.difficulty === 'abyss' ? 45 : run.departure.difficulty === 'expert' ? 35 : 30
  const result: Expedition = {
    ...prior,
    ...layout,
    player: layout.entrance,
    travelled: [layout.entrance],
    priorTravel: run.priorTravel + roomTravel(run),
    collected: [],
    scannedRows: [],
    confirmedMines: [],
    triggeredMines: [],
    surveyedCells: [],
    probeReport: null,
    phase: 'boss',
    encounter: null,
  }
  const encounter: KeelcrabEncounter = {
    kind: 'keelcrab',
    boss: 144,
    health: maxHealth,
    maxHealth,
    priorDiscoveries: roomDiscoveries(run),
    lastDamage: 0,
    turn: 1,
    points: combatStats(result).actions,
    braced: false,
    turnTriggers: [],
    event: 'entered',
    intent: { kind: 'swarm', targets: [], damage: 3 },
    charged: false,
    weakSide: (DOCKS.indexOf(layout.entrance) + 1) % 4,
    weakCells: [],
    wake: [],
    resolution: null,
  }
  return { ...result, encounter: forecast(result, encounter) }
}

/** Public route previews expose the whole sweep and whether a loaded harpoon can hit the flank. */
export function keelcrabPlan(run: Expedition, action: ExpeditionAction): TacticalPlan {
  // Notes do not inspect the water or move the boat; distance only limits soundings.
  if (action.type === 'flag' || action.type === 'mark-safe') {
    const allowed =
      Number.isInteger(action.index) &&
      !!run.game.cells[action.index] &&
      !run.walls.includes(action.index)
    return { path: [], cost: 0, allowed, reason: allowed ? 'ready' : 'inactive' }
  }
  if (['reveal', 'probe', 'sonar'].includes(action.type) && 'index' in action) {
    const allowed = riverSoundingCells(run).has(action.index)
    return { path: [], cost: 0, allowed, reason: allowed ? 'ready' : 'inactive' }
  }
  if (action.type === 'sweep')
    return {
      path: [],
      cost: 0,
      allowed: run.scans > 0,
      reason: run.scans > 0 ? 'ready' : 'inactive',
    }
  let path: readonly number[] = []
  if (action.type === 'sail') {
    const route = riverRoutes(run).find((entry) => entry.launch === action.index)
    if (route && !route.unknown.length && !route.blocked.length) path = route.path
  } else if (action.type === 'haul') {
    const next = haulRiverBoat({ ...run, phase: 'exploring' })
    if (next.pressure && next.player !== run.player) path = next.pressure.voyage
  }
  return {
    path,
    cost: 0,
    allowed: action.type === 'retreat' || path.length > 1,
    reason: path.length > 1 || action.type === 'retreat' ? 'ready' : 'inactive',
  }
}

/** Resolve a committed voyage's full footprint before charging the next harpoon; previews never advance time. */
export function actKeelcrab(
  run: Expedition,
  action: ExpeditionAction,
  explore: ExploreTransition,
): Expedition {
  const encounter = run.encounter
  if (encounter?.kind !== 'keelcrab' || run.phase !== 'boss') return run
  if (action.type === 'retreat') return { ...run, phase: 'retreated' }
  const plan = keelcrabPlan(run, action)
  if (!plan.allowed) return run
  if (!['sail', 'haul'].includes(action.type)) {
    const surveying: Expedition = { ...run, phase: 'exploring' }
    const next = explore(surveying, action)
    return next === surveying
      ? run
      : { ...next, phase: next.phase === 'lost' ? 'lost' : 'boss', encounter }
  }
  let moved =
    action.type === 'sail'
      ? sailRiverBoat({ ...run, phase: 'exploring' }, action.index)
      : haulRiverBoat({ ...run, phase: 'exploring' })
  const flags = plan.path.filter((i) => run.game.cells[i]!.visibility === 'flagged')
  if (flags.length) {
    const cells = moved.game.cells.map((cell, i) =>
      flags.includes(i) ? { ...cell, mine: false, visibility: 'revealed' as const } : cell,
    )
    moved = {
      ...moved,
      confirmedMines: moved.confirmedMines.filter((i) => !flags.includes(i)),
      game: {
        ...moved.game,
        config: { ...moved.game.config, mines: cells.filter((c) => c.mine).length },
        cells: cells.map((cell, i) => ({
          ...cell,
          adjacent: neighbors(moved.game.config, i).filter((n) => cells[n]!.mine).length,
        })),
      },
    }
  }
  const hit = plan.path.slice(1).find((i) => encounter.intent.targets.includes(i)) ?? null
  const counter = encounter.charged
    ? (plan.path.slice(1).find((i) => encounter.weakCells.includes(i)) ?? null)
    : null
  const damage = hit === null ? 0 : incomingCombatDamage(run, encounter.intent.damage)
  const injured = damage
    ? applyDamageRelics(run, { ...moved, ...damageExpedition(moved, damage) }, null)
    : moved
  const shot = injured.health > 0 && counter !== null ? strikeDamage(run) : 0
  const health = Math.max(0, encounter.health - shot)
  let next: Expedition = {
    ...recordTravel(injured, plan.path),
    phase: injured.health === 0 ? 'lost' : 'boss',
  }
  if (shot && available(next, 'duelist-edge')) next = claim(next, 'duelist-edge')
  if (hit === null && available(next, 'shelter-cloak'))
    next = { ...claim(next, 'shelter-cloak'), shields: Math.min(2, next.shields + 1) }
  const updated: KeelcrabEncounter = {
    ...encounter,
    health,
    lastDamage: encounter.health - health,
    turn: encounter.turn + 1,
    charged: shot ? false : encounter.charged || plan.path.length - 1 >= 12,
    weakSide: shot ? (encounter.weakSide + 2) % 4 : encounter.weakSide,
    wake: plan.path.slice(1, -1),
    turnTriggers: [],
    event: health === 0 ? 'defeated' : shot ? 'struck' : damage ? 'hit' : 'evaded',
    resolution: { targets: encounter.intent.targets, hit, counter: shot ? counter : null, damage },
  }
  return { ...next, encounter: forecast(next, updated) }
}
