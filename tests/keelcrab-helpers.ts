import { actExpedition } from '../src/game/expedition.js'
import { riverRoutes, riverSoundingCells } from '../src/game/pressure.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import type { Expedition, ExpeditionAction } from '../src/types/variants.js'

/** Sound only logically proven cells; never consult covered mine truth or spend limited tools. */
export function surveyKeelcrab(initial: Expedition): {
  run: Expedition
  actions: ExpeditionAction[]
} {
  if (initial.phase !== 'boss') return { run: initial, actions: [] }
  let run = initial
  const actions: ExpeditionAction[] = []
  for (let i = 0; i < run.game.cells.length * 2; i++) {
    const known = deduceMines(run.game, run.walls),
      area = riverSoundingCells(run)
    const safe = [...known.safe].find(
      (i) => area.has(i) && run.game.cells[i]!.visibility === 'hidden',
    )
    const mine = [...known.mines].find(
      (i) => area.has(i) && run.game.cells[i]!.visibility === 'hidden',
    )
    const action: ExpeditionAction | undefined =
      safe !== undefined
        ? { type: 'reveal', index: safe }
        : mine !== undefined
          ? { type: 'flag', index: mine }
          : undefined
    if (!action) break
    const next = actExpedition(run, action)
    if (next === run) throw new Error('Public sounding was rejected')
    actions.push(action)
    run = next
  }
  return { run, actions }
}

/** Search only the public sweep and countershot state; retain every actual accepted voyage. */
export function solveKeelcrab(initial: Expedition): readonly ExpeditionAction[] | null {
  const queue: { run: Expedition; actions: ExpeditionAction[] }[] = [{ run: initial, actions: [] }]
  const seen = new Set<string>()
  for (let at = 0; at < queue.length && at < 18000; at++) {
    const candidate = queue[at]!
    const sounded = surveyKeelcrab(candidate.run)
    const run = sounded.run,
      actions = [...candidate.actions, ...sounded.actions]
    const e = run.encounter
    if (e?.kind !== 'keelcrab') return null
    if (e.health === 0) return actions
    if (actions.filter((a) => a.type === 'sail').length >= 60) continue
    const key = [
      run.player,
      e.turn % 12,
      e.health,
      Number(e.charged),
      e.weakSide,
      e.wake.join(','),
      run.game.cells.map((c) => c.visibility[0]).join(''),
    ].join(':')
    if (seen.has(key)) continue
    seen.add(key)
    for (const route of riverRoutes(run)) {
      if (route.path.slice(1).some((i) => e.intent.targets.includes(i))) continue
      const action = { type: 'sail', index: route.launch } as const
      const next = actExpedition(run, action)
      if (next !== run && next.health >= initial.health && next.shields >= initial.shields)
        queue.push({ run: next, actions: [...actions, action] })
    }
  }
  return null
}
