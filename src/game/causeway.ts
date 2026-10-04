import { walkingPath } from './dungeon-path.js'
import { recordTravel } from './exploration-relics.js'
import type { Expedition } from '../types/variants.js'
import type { CausewayPosition, CausewaySpan } from '../types/causeway.js'

/** Straight planks never wrap across rows or include either dry landing. */
export function causewayWater(from: number, to: number, width: number): number[] {
  if (
    from === to ||
    (from % width !== to % width && Math.floor(from / width) !== Math.floor(to / width))
  )
    return []
  const step = from % width === to % width ? Math.sign(to - from) * width : Math.sign(to - from)
  const water: number[] = []
  for (let index = from + step; index !== to; index += step) water.push(index)
  return water
}

/** The one carried plank is a floor resource, independent of equipment or currency. */
export function heldCausewayPlank(run: Expedition): number {
  return run.causeway?.planks.findIndex((plank) => plank.position.kind === 'held') ?? -1
}

/** Preview from reachable dry shores without inspecting a covered landing's mine bit. */
export function causewaySpans(run: Expedition): CausewaySpan[] {
  const floor = run.causeway
  const plank = floor?.planks[heldCausewayPlank(run)]
  if (!floor || !plank || run.phase !== 'exploring') return []
  const { width, height } = run.game.config
  const covered = new Set(
    floor.planks.flatMap((p) =>
      p.position.kind === 'laid' ? causewayWater(p.position.from, p.position.to, width) : [],
    ),
  )
  const spans: CausewaySpan[] = []
  for (let from = 0; from < run.game.cells.length; from++) {
    if (floor.water.includes(from) || run.game.cells[from]?.visibility !== 'revealed') continue
    const approach = walkingPath(run, from)
    if (!approach) continue
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const x: number = (from % width) + dx * (plank.length + 1)
      const y: number = Math.floor(from / width) + dy * (plank.length + 1)
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const to = y * width + x
      if (
        floor.water.includes(to) ||
        floor.rocks.includes(to) ||
        run.game.cells[to]?.visibility === 'flagged'
      )
        continue
      const water = causewayWater(from, to, width)
      if (
        water.length !== plank.length ||
        water.some((i) => !floor.water.includes(i) || covered.has(i))
      )
        continue
      spans.push({ from, to, water, approach })
    }
  }
  return spans.sort(
    (a, b) => a.approach.length - b.approach.length || a.from - b.from || a.to - b.to,
  )
}

/** Rebuild physical obstacles from immutable terrain and current plank positions. */
function replaceCausewayPosition(
  run: Expedition,
  board: number,
  position: CausewayPosition,
): Expedition {
  const floor = run.causeway!
  const planks = floor.planks.map((plank, index) =>
    index === board ? { ...plank, position } : plank,
  )
  const covered = new Set(
    planks.flatMap((plank) =>
      plank.position.kind === 'laid'
        ? causewayWater(plank.position.from, plank.position.to, run.game.config.width)
        : [],
    ),
  )
  return {
    ...run,
    causeway: { ...floor, planks },
    walls: [...floor.rocks, ...floor.water.filter((index) => !covered.has(index))],
    game: {
      ...run.game,
      cells: run.game.cells.map((cell, index) =>
        covered.has(index) ? { ...cell, visibility: 'revealed' } : cell,
      ),
    },
  }
}

/** Walk to the chosen shore and lay the carried plank; the landing stays covered until explored. */
export function layCausewayPlank(run: Expedition, from: number, to: number): Expedition {
  const span = causewaySpans(run).find((entry) => entry.from === from && entry.to === to)
  if (!span) return run
  const next = replaceCausewayPosition(run, heldCausewayPlank(run), { kind: 'laid', from, to })
  return recordTravel(
    {
      ...next,
      player: from,
      steps: run.steps + 1,
      causeway: { ...next.causeway!, placements: next.causeway!.placements + 1 },
    },
    span.approach,
  )
}

/** A bridge can be retrieved from either dry end; carrying another plank swaps it onto that shore. */
export function causewayPickupPath(run: Expedition, board: number): readonly number[] | null {
  const plank = run.causeway?.planks[board]
  if (
    run.phase !== 'exploring' ||
    !Number.isInteger(board) ||
    !plank ||
    plank.position.kind === 'held'
  )
    return null
  const targets =
    plank.position.kind === 'shore'
      ? [plank.position.index]
      : [plank.position.from, plank.position.to]
  return (
    targets
      .map((index) => walkingPath(run, index))
      .filter((path): path is number[] => path !== null)
      .sort((a, b) => a.length - b.length)[0] ?? null
  )
}

/** Picking up preserves knowledge and treasures; accepted travel is credited once by the shared ledger. */
export function pickCausewayPlank(run: Expedition, board: number): Expedition {
  const path = causewayPickupPath(run, board)
  if (!path) return run
  const shore = path.at(-1)!
  const held = heldCausewayPlank(run)
  const dropped =
    held < 0 ? run : replaceCausewayPosition(run, held, { kind: 'shore', index: shore })
  const next = replaceCausewayPosition(dropped, board, { kind: 'held' })
  return recordTravel({ ...next, player: shore, steps: run.steps + 1 }, path)
}

/** Recover from a misplaced build or a mobility-skill detour without refunding tools or discoveries. */
export function resetCausewayPlanks(run: Expedition): Expedition {
  const floor = run.causeway
  if (!floor || run.phase !== 'exploring') return run
  if (
    run.player === run.entrance &&
    floor.planks.every((plank, i) =>
      i === 0
        ? plank.position.kind === 'held'
        : plank.position.kind === 'shore' && plank.position.index === run.entrance,
    )
  )
    return run
  return {
    ...run,
    player: run.entrance,
    steps: run.steps + 1,
    walls: [...floor.rocks, ...floor.water],
    causeway: {
      ...floor,
      planks: floor.planks.map((plank, i) => ({
        ...plank,
        position: i === 0 ? { kind: 'held' } : { kind: 'shore', index: run.entrance },
      })),
    },
  }
}
