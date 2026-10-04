import { actExpedition, frontierCells } from '../src/game/expedition.js'
import { causewaySpans, heldCausewayPlank } from '../src/game/causeway.js'
import { walkingPath } from '../src/game/dungeon-path.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import { adjacentSteps } from '../src/game/variant-board.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'
import type { CausewaySpan } from '../src/types/causeway.js'

/** Terrain labels use only charted land/water, not concealed hazards. */
export function causewayIslands(run: Expedition): Map<number, number> {
  const floor = run.causeway!
  const labels = new Map<number, number>()
  let id = 0
  for (let index = 0; index < run.game.cells.length; index++) {
    if (labels.has(index) || floor.water.includes(index) || floor.rocks.includes(index)) continue
    labels.set(index, id)
    const queue = [index]
    for (const cell of queue)
      for (const next of adjacentSteps(run.game, cell)) {
        if (!labels.has(next) && !floor.water.includes(next) && !floor.rocks.includes(next)) {
          labels.set(next, id)
          queue.push(next)
        }
      }
    id++
  }
  return labels
}

/** Deduce from public clues, then carry both planks across each explored crossing with real intents. */
export function solveCauseway(
  initial: Expedition,
): { run: Expedition; actions: ExpeditionAction[] } | null {
  let run = initial
  const actions: ExpeditionAction[] = []
  const labels = causewayIslands(run)
  const visited = new Set([labels.get(run.player)])
  const stack: CausewaySpan[] = []
  const tried = new Set<string>()
  const apply = (action: ExpeditionAction): boolean => {
    const next = actExpedition(run, action)
    if (next === run) return false
    run = next
    actions.push(action)
    return true
  }
  const survey = (): void => {
    for (let pass = 0; pass < 100; pass++) {
      const known = deduceMines(run.game, run.walls)
      let changed = false
      for (const index of known.mines)
        if (run.game.cells[index]?.visibility === 'hidden')
          changed = apply({ type: 'flag', index }) || changed
      for (const index of known.safe)
        if (run.game.cells[index]?.visibility === 'hidden' && frontierCells(run).has(index))
          changed = apply({ type: 'reveal', index }) || changed
      if (!changed || run.phase !== 'exploring') return
    }
  }
  const carry = (span: CausewaySpan, plank: number): boolean => {
    if (heldCausewayPlank(run) !== plank && !apply({ type: 'bridge-pick', board: plank }))
      return false
    if (!apply({ type: 'bridge', from: span.from, to: span.to })) return false
    survey()
    if (run.phase !== 'exploring') return true
    if (!walkingPath(run, span.to)) {
      apply({ type: 'bridge-pick', board: plank })
      return false
    }
    const other = run.causeway!.planks.findIndex((_, i) => i !== plank)
    if (other >= 0 && !apply({ type: 'bridge-pick', board: other })) return false
    if (run.player !== span.to && !apply({ type: 'move', index: span.to })) return false
    if (run.phase !== 'exploring') return true
    return apply({ type: 'bridge-pick', board: plank })
  }
  for (let turn = 0; turn < 500; turn++) {
    survey()
    if (run.phase === 'won' || run.phase === 'reward') return { run, actions }
    for (const index of run.treasures)
      if (!run.collected.includes(index) && walkingPath(run, index)) apply({ type: 'move', index })
    if (walkingPath(run, run.exit)) {
      apply({ type: 'move', index: run.exit })
      return { run, actions }
    }
    const current = labels.get(run.player)
    visited.add(current)
    const knowledge = run.game.cells.filter((cell) => cell.visibility !== 'hidden').length
    const options = run
      .causeway!.planks.flatMap((plank, board) => {
        if (
          plank.position.kind !== 'held' &&
          !walkingPath(
            run,
            plank.position.kind === 'shore' ? plank.position.index : plank.position.from,
          )
        )
          return []
        const preview: Expedition = {
          ...run,
          causeway: {
            ...run.causeway!,
            planks: run.causeway!.planks.map((p, i) => ({
              ...p,
              position:
                i === board
                  ? { kind: 'held' }
                  : p.position.kind === 'held'
                    ? { kind: 'shore', index: run.player }
                    : p.position,
            })),
          },
        }
        return causewaySpans(preview)
          .filter(
            (span) =>
              labels.get(span.from) === current &&
              !tried.has(`${span.from}:${span.to}:${knowledge}`),
          )
          .map((span) => ({ span, board }))
      })
      .sort(
        (a, b) =>
          Number(visited.has(labels.get(a.span.to))) - Number(visited.has(labels.get(b.span.to))) ||
          Number(run.game.cells[b.span.to]!.visibility === 'revealed') -
            Number(run.game.cells[a.span.to]!.visibility === 'revealed'),
      )
    const chosen = options[0]
    if (chosen) {
      tried.add(`${chosen.span.from}:${chosen.span.to}:${knowledge}`)
      if (carry(chosen.span, chosen.board)) stack.push(chosen.span)
    } else {
      const back = stack.pop()
      if (!back) return null
      const board = run.causeway!.planks.findIndex((plank) => plank.length === back.water.length)
      if (!carry({ ...back, from: back.to, to: back.from }, board)) return null
    }
  }
  return null
}
