import {
  causewaySpans,
  causewayWater,
  causewayPickupPath,
  heldCausewayPlank,
} from '../game/causeway.js'
import { message, translations } from '../i18n.js'
import { icon } from '../icons.js'
import { sharedStyles } from './shared-styles.js'
import { mountAnchoredLesson } from './anchored-lesson.js'
import type { Expedition } from '../types/variants.js'
import type { CausewaySpan } from '../types/causeway.js'
import type { Language } from '../types/localization.js'
import type { CampaignSceneId } from '../types/campaign.js'
import type { SignalLine } from '../types/signal-story.js'

/** Chapter titles do not leak into generated Recollection floors. */
export function causewayObjective(language: Language, run: Expedition): string {
  const title = run.departure.recollection
    ? message(language, 'causeway.recollection')
    : run.floor === 1
      ? message(language, 'causeway.floor-1')
      : run.floor === 2
        ? message(language, 'causeway.floor-2')
        : message(language, 'causeway.floor-3')
  return `<section class="pressure-objective causeway-objective"><strong>${title}</strong><span>${message(language, 'causeway.objective')}</span><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help" aria-haspopup="dialog">${icon('help')}${message(language, 'causeway.help')}</button></section>`
}

/** A pair of compact cards shows the real carried/placed resources and one explicit placement action. */
export function causewayControls(language: Language, run: Expedition): string {
  const held = heldCausewayPlank(run)
  return `<div class="river-controls causeway-controls"><div class="causeway-inventory">${run.causeway!.planks.map((plank, i) => `<div class="causeway-card ${plank.position.kind === 'held' ? 'is-held' : ''}"><span class="causeway-plank-picture" aria-hidden="true">${plank.length}</span><span><strong>${plank.length === 2 ? message(language, 'causeway.short') : message(language, 'causeway.long')}</strong><small>${message(language, 'causeway.length', { count: plank.length })} · ${plank.position.kind === 'held' ? message(language, 'causeway.held') : plank.position.kind === 'shore' ? message(language, 'causeway.shore') : message(language, 'causeway.laid')}</small></span>${plank.position.kind === 'held' ? '<span aria-hidden="true">✓</span>' : `<button class="secondary-button ${sharedStyles['secondary-button']}" data-control="bridge-pick:${i}" ${causewayPickupPath(run, i) ? '' : 'disabled'}>${held >= 0 ? message(language, 'causeway.swap') : plank.position.kind === 'laid' ? message(language, 'causeway.recover') : message(language, 'causeway.pick')}</button>`}</div>`).join('')}</div><div class="causeway-placement"><button class="river-control" data-control="bridge-plan" ${held < 0 ? 'disabled' : ''}>${icon('arrow')}${message(language, 'causeway.choose')}</button><button class="river-control" data-control="bridge-build" disabled>${message(language, 'causeway.build')}</button></div><p class="causeway-hint" role="status">${held < 0 ? message(language, 'causeway.empty') : message(language, 'causeway.ready')}</p></div>`
}

/** Water is public impassable terrain; bridge clues and loose planks keep ordinary number badges. */
export function renderCauseway(root: HTMLElement, run: Expedition, language: Language): void {
  const floor = run.causeway
  if (!floor) return
  const messages = translations[language]
  const grid = root.querySelector<HTMLElement>('[data-side="a"]')
  grid?.classList.add('causeway-board')
  for (const index of floor.water) {
    const cell = grid?.querySelector<HTMLElement>(`[data-cell="${index}"]`)
    if (!cell) continue
    const plank = floor.planks.find(
      (p) =>
        p.position.kind === 'laid' &&
        causewayWater(p.position.from, p.position.to, run.game.config.width).includes(index),
    )
    cell.classList.remove('wall-cell')
    cell.classList.add('causeway-water')
    cell.innerHTML = ''
    const coordinate = `${messages.row} ${Math.floor(index / run.game.config.width) + 1}, ${messages.column} ${(index % run.game.config.width) + 1}`
    cell.setAttribute(
      'aria-label',
      `${coordinate}: ${plank ? message(language, 'causeway.bridge') : message(language, 'causeway.water')}`,
    )
    if (plank?.position.kind === 'laid') {
      cell.classList.add('causeway-bridge')
      cell.dataset['bridgeAxis'] =
        plank.position.from % run.game.config.width === plank.position.to % run.game.config.width
          ? 'vertical'
          : 'horizontal'
      const number = run.game.cells[index]!.adjacent
      cell.innerHTML = `<span class="causeway-deck" aria-hidden="true"></span>${number ? `<span class="landmark-clue">${number}</span>` : ''}`
      cell.setAttribute(
        'aria-label',
        `${coordinate}: ${message(language, 'causeway.bridge')}, ${number}`,
      )
    }
  }
  for (const plank of floor.planks)
    if (plank.position.kind === 'shore') {
      const cell = grid?.querySelector<HTMLElement>(`[data-cell="${plank.position.index}"]`)
      const label =
        plank.length === 2
          ? message(language, 'causeway.short')
          : message(language, 'causeway.long')
      cell?.insertAdjacentHTML(
        'beforeend',
        `<span class="causeway-loose causeway-plank-picture" aria-hidden="true">${plank.length}</span>`,
      )
      if (cell) cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')}, ${label}`)
    }
}

/** Placement is a visible preview; only the separate build button journals a bridge. */
export function renderCausewayPlan(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  choosing: boolean,
  selection: CausewaySpan | null,
): void {
  const spans = choosing ? causewaySpans(run) : []
  for (const span of spans) {
    const target = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${span.to}"]`)
    target?.classList.add('causeway-landing')
    if (target) target.title = message(language, 'causeway.target')
  }
  if (selection) {
    for (const index of selection.water)
      root
        .querySelector(`[data-side="a"] [data-cell="${index}"]`)
        ?.classList.add('causeway-preview')
    root
      .querySelector(`[data-side="a"] [data-cell="${selection.to}"]`)
      ?.classList.add('causeway-selected')
  }
  const select = root.querySelector<HTMLButtonElement>('[data-control="bridge-plan"]')
  if (select) {
    select.setAttribute('aria-pressed', String(choosing))
    select.textContent = choosing
      ? message(language, 'causeway.cancel')
      : message(language, 'causeway.choose')
  }
  const build = root.querySelector<HTMLButtonElement>('[data-control="bridge-build"]')
  if (build) build.disabled = !selection
  const hint = root.querySelector('.causeway-hint')
  if (hint && choosing)
    hint.textContent = selection
      ? run.game.cells[selection.to]?.visibility === 'revealed'
        ? message(language, 'causeway.safeLanding')
        : message(language, 'causeway.preview')
      : spans.length
        ? message(language, 'causeway.ready')
        : message(language, 'causeway.noSpan')
}

/** Illustrations use the same water and plank styling as the actual board. */
export function causewayGuide(language: Language): string {
  const headings = [
    message(language, 'causeway.help-place-title'),
    message(language, 'causeway.help-mine-title'),
    message(language, 'causeway.help-carry-title'),
    message(language, 'causeway.help-return-title'),
  ]
  const text = [
    message(language, 'causeway.help-place'),
    message(language, 'causeway.help-mine'),
    message(language, 'causeway.help-carry'),
    message(language, 'causeway.help-return'),
  ]
  return `<div class="pressure-help causeway-help">${headings.map((title, i) => `<section><div class="causeway-diagram" aria-hidden="true"><span>●</span><i class="causeway-plank-picture">${i === 2 ? '4' : '2'}</i><span>${i === 1 ? '?' : '●'}</span></div><div><h3>${i + 1}. ${title}</h3><p>${text[i]}</p></div></section>`).join('')}<footer><p>${message(language, 'causeway.reset-note')}</p><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="bridge-reset">${message(language, 'causeway.reset')}</button></footer></div>`
}

/** A short board-attached lesson teaches placement and then ordinary exploration across the plank. */
export function mountCausewayLesson(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  dismiss: () => void,
): (() => void) | null {
  if (!run.causeway || run.floor > 2 || run.phase !== 'exploring' || run.causeway.placements > 1)
    return null
  const panel = document.createElement('section')
  panel.className = 'campaign-lesson causeway-lesson'
  panel.innerHTML = `<strong>${message(language, 'causeway.help')}</strong><p>${run.floor === 2 ? message(language, 'causeway.help-carry') : run.causeway.placements ? message(language, 'causeway.lesson-cross') : message(language, 'causeway.lesson-place')}</p>`
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = message(language, 'campaign.lesson-skip')
  button.addEventListener('click', dismiss)
  panel.append(button)
  return mountAnchoredLesson(root, panel, `[data-side="a"] [data-cell="${run.player}"]`)
}

/** Shared typed dialogue keeps names/places, voices and reveal-skip behavior consistent with earlier scenes. */
export function causewayLines(language: Language, scene: CampaignSceneId): readonly SignalLine[] {
  const lines =
    scene === 'causeway-entry'
      ? [message(language, 'causeway.entry-1'), message(language, 'causeway.entry-2')]
      : scene === 'causeway-lengths'
        ? [message(language, 'causeway.second-1'), message(language, 'causeway.second-2')]
        : scene === 'causeway-crossing'
          ? [message(language, 'causeway.third-1'), message(language, 'causeway.third-2')]
          : [message(language, 'causeway.end-1'), message(language, 'causeway.end-2')]
  return lines.map((text, i) => ({ speaker: i === 0 ? 'nia' : 'player', text }))
}
