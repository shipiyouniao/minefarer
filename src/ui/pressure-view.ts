import { message } from '../i18n.js'
import { pressureFloorName } from './pressure-copy.js'
import { sharedStyles } from './shared-styles.js'
import type { Expedition } from '../types/variants.js'
import type { Language } from '../types/localization.js'
/** Waiting moves only the visible raft; the shore remains a static Minesweeper puzzle. */
export function pressureObjective(language: Language, run: Expedition): string {
  if (!run.pressure) return ''
  const ferry = run.pressure
  return `<section class="pressure-objective"><h3>${pressureFloorName(language, run.floor)}</h3><p>${message(language, 'pressure.objective')}</p><div class="pressure-actions"><span>${message(language, 'pressure.progress', { count: ferry.moorings.filter((i) => run.travelled.includes(i)).length, total: ferry.moorings.length })}</span><button class="primary-button ${sharedStyles['primary-button']}" data-control="end-turn">${message(language, 'pressure.wait')}</button><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help" aria-haspopup="dialog">${message(language, 'pressure.help')}</button></div></section>`
}
/** A compact visual guide uses the existing styled information dialog. */
export function pressureGuide(language: Language): string {
  return `<div class="pressure-help">${['①', '②', '③'].map((n, i) => `<section><div class="pressure-help-picture" aria-hidden="true">${crossingDiagram(i)}</div><h3>${n}</h3><p>${i === 0 ? message(language, 'pressure.board') : i === 1 ? message(language, 'pressure.ride') : message(language, 'pressure.land')}</p></section>`).join('')}<p>${message(language, 'pressure.static')}</p></div>`
}
/** Water, next stop and passenger are drawn without hiding ordinary shore clues. */
export function renderPressure(root: HTMLElement, run: Expedition, language: Language): void {
  const ferry = run.pressure
  if (!ferry) return
  const board = root.querySelector<HTMLElement>('[data-side="a"]')
  board?.classList.add('raft-board')
  board?.style.setProperty('--raft-rows', String(run.game.config.height))
  const at = ferry.stops[ferry.position]!,
    next = ferry.stops[(ferry.position + 1) % ferry.stops.length]!
  for (const index of ferry.water) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) continue
    cell.classList.remove('wall-cell')
    cell.classList.add('pressure-water')
    cell.setAttribute('aria-disabled', String(index !== at))
    cell.setAttribute(
      'aria-label',
      index === at ? message(language, 'pressure.raft') : message(language, 'pressure.water'),
    )
    cell.innerHTML =
      index === at
        ? `<span class="pressure-raft" aria-hidden="true"></span>`
        : index === next
          ? '<span class="pressure-next" aria-hidden="true">◇</span>'
          : ''
  }
  for (const index of ferry.moorings) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) continue
    cell.classList.toggle('pressure-occupied', run.player === index)
    cell.innerHTML = `<span class="pressure-mooring" aria-hidden="true">⚓${run.travelled.includes(index) ? '✓' : ''}</span>${run.game.cells[index]!.visibility === 'revealed' ? `<span class="landmark-clue">${run.game.cells[index]!.adjacent || ''}</span>` : ''}`
  }
  const visited = ferry.stops.some((i) => run.travelled.includes(i))
  if (run.floor === 1 && (!visited || (run.player === at && ferry.waits <= 1))) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${at}"]`)
    const coach = document.createElement('span')
    coach.className = 'pressure-coach'
    coach.setAttribute('role', 'note')
    coach.textContent = !visited
      ? message(language, 'pressure.board')
      : ferry.waits === 0
        ? message(language, 'pressure.ride')
        : message(language, 'pressure.land')
    cell?.append(coach)
  }
}
/** Animate raft and passenger together, with no rearrangement of shore tiles. */
export async function animatePressure(
  root: HTMLElement,
  before: Expedition | null,
  after: Expedition | null,
): Promise<void> {
  if (
    !before?.pressure ||
    !after?.pressure ||
    before.floor !== after.floor ||
    before.pressure.waits === after.pressure.waits ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const source = root.querySelector<HTMLElement>(
      `[data-side="a"] [data-cell="${before.pressure.stops[before.pressure.position]}"]`,
    ),
    target = root.querySelector<HTMLElement>(
      `[data-side="a"] [data-cell="${after.pressure.stops[after.pressure.position]}"]`,
    )
  if (!source || !target) return
  const a = source.getBoundingClientRect(),
    b = target.getBoundingClientRect()
  const raft = target.querySelector<HTMLElement>('.pressure-raft')
  const passenger =
    before.player === before.pressure.stops[before.pressure.position]
      ? root.querySelector<HTMLElement>('[data-side="a"] .dungeon-player')
      : null
  const animations: Animation[] = []
  for (const element of [raft, passenger]) {
    if (!element) continue
    const destination = element.style.transform || 'translate(0,0)'
    const animation = element.animate(
      [
        { transform: `${destination} translate(${a.x - b.x}px,${a.y - b.y}px)` },
        { transform: destination },
      ],
      { duration: 650, easing: 'ease-in-out' },
    )
    animation.id = 'ferry-crossing'
    animations.push(animation)
  }
  await Promise.allSettled(animations.map((animation) => animation.finished))
}

/** Shared raft art identifies the overworld crossing without reusing the removed instrument. */
export function raftImage(): string {
  return '<svg class="dungeon-sprite" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="49" rx="28" ry="9" fill="#a6cdcf"/><g fill="#c9a66d" stroke="#86643f" stroke-width="2"><rect x="9" y="20" width="8" height="34" rx="4"/><rect x="18" y="17" width="8" height="36" rx="4"/><rect x="27" y="15" width="8" height="39" rx="4"/><rect x="36" y="17" width="8" height="37" rx="4"/><rect x="45" y="20" width="8" height="34" rx="4"/></g><path d="M8 28h46M8 44h46" stroke="#e9d8a7" stroke-width="4"/><path d="M34 6v24" stroke="#735a3e" stroke-width="3"/><path d="m36 6 17 14H36Z" fill="#f0e6c8"/></svg>'
}
/** Illustrate boarding, riding and disembarking on the same river geometry. */
function crossingDiagram(step: number): string {
  const raft = step === 0 ? 34 : 76,
    person = step === 0 ? 15 : step === 1 ? 88 : 125
  return `<svg viewBox="0 0 140 72" aria-hidden="true"><rect width="140" height="72" rx="8" fill="#b7d9d9"/><path d="M0 0h30v72H0Zm110 0h30v72h-30Z" fill="#c4d6b5"/><rect x="${raft}" y="32" width="28" height="23" rx="5" fill="#b99663" stroke="#82643e"/><path d="M${raft} 39h28m-28 9h28" stroke="#eedbb5" stroke-width="2"/><circle cx="${person}" cy="24" r="7" fill="#477d71"/><path d="M${step === 0 ? 20 : step === 1 ? 46 : 96} 62h22l-5-4m5 4-5 4" fill="none" stroke="#456f65" stroke-width="2"/></svg>`
}
