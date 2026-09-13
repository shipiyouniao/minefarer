import { message } from '../i18n.js'
import { feedPowered } from '../game/floor-power.js'
import type { Expedition } from '../types/variants.js'
import type { Language } from '../types/localization.js'
/** Keep the tide explanation beside its board with a collapsible touch-friendly guide. */
export function currentObjective(language: Language, run: Expedition): string {
  if (!run.current) return ''
  return `<details class="current-guide" ${run.current.cycle === 0 ? 'open' : ''}><summary>${message(language, 'current.title')} · ${run.current.cycle}</summary><p>${message(language, 'current.guide')}</p><p>${message(language, 'current.legend')}</p></details>`
}
/** Tint each bank and mark each lane once; flags and clue badges retain their own styling. */
export function renderCurrent(root: HTMLElement, run: Expedition, language: Language): void {
  if (!run.current || !run.power) return
  for (const lane of run.current.lanes) {
    const held = feedPowered(run.power, lane.hold)
    for (const index of lane.cells) {
      const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
      if (!cell) continue
      cell.classList.add(held ? 'current-held' : 'current-moving')
      cell.dataset['currentCell'] = String(index)
      if (index === lane.cells[0]) {
        const badge = document.createElement('span')
        badge.className = 'current-arrow'
        badge.textContent = `${lane.hold.branch === 0 ? 'A' : 'B'} ${held ? '⌁' : lane.direction === 1 ? '→' : '←'}`
        badge.setAttribute('aria-hidden', 'true')
        cell.append(badge)
      }
      const label = held ? message(language, 'current.held') : message(language, 'current.moving')
      cell.title = `${cell.title} ${label}`
      cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')}, ${label}`)
    }
  }
}
/** Animate each destination from its old tile position after the exact permutation is committed. */
export async function animateCurrent(
  root: HTMLElement,
  before: Expedition,
  after: Expedition,
): Promise<void> {
  if (
    !before.current ||
    !after.current ||
    before.floor !== after.floor ||
    before.current.cycle === after.current.cycle ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const animations: Animation[] = []
  // Capture the unanimated grid once: later reads must not measure already moving neighbors.
  const positions = new Map(
    [...root.querySelectorAll<HTMLElement>('[data-side="a"] [data-cell]')].map(
      (cell) => [Number(cell.dataset['cell']), cell.getBoundingClientRect()] as const,
    ),
  )
  after.current.permutation.forEach((to, from) => {
    if (to === from) return
    const source = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${from}"]`)
    const target = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${to}"]`)
    if (!source || !target) return
    const a = positions.get(from),
      b = positions.get(to)
    if (!a || !b) return
    animations.push(
      target.animate(
        [
          { transform: `translate(${a.x - b.x}px,${a.y - b.y}px)`, opacity: 0.6 },
          { transform: 'translate(0,0)', opacity: 1 },
        ],
        { duration: 650, easing: 'ease-in-out' },
      ),
    )
  })
  await Promise.allSettled(animations.map((animation) => animation.finished))
}
