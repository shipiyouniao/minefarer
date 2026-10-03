import { message } from '../i18n.js'
import { keelcrabRouteHint } from './keelcrab-view.js'
import { icon } from '../icons.js'
import { aboardRiverBoat, riverRoutes, riverSoundingCells } from '../game/pressure.js'
import { pressureFloorName } from './pressure-copy.js'
import { sharedStyles } from './shared-styles.js'
import { spriteImage } from './dungeon-sprites.js'
import { mountAnchoredLesson } from './anchored-lesson.js'
import type { Expedition, ExpeditionAction } from '../types/variants.js'
import type { Language } from '../types/localization.js'

/** Fit naval charts even after settlement removes the dock; release measurements on disposal. */
export function mountRiverDock(root: HTMLElement): (() => void) | null {
  const dock = root.querySelector<HTMLElement>('.action-dock:has(.river-controls)')
  const app = root.closest<HTMLElement>('#app')
  const chart = root.querySelector<HTMLElement>('.convoy-board, .keelcrab-board')
  if (!app || (!dock && !chart)) return null
  const previous = app.style.getPropertyValue('--dock-space')
  const host = root.closest<HTMLElement>('.ruleset-host')
  if (chart)
    chart.style.setProperty(
      '--naval-rows',
      String(Math.max(1, chart.querySelectorAll('.board-row').length)),
    )
  /** Font loading, translation and resizing can all change the fixed dock's height. */
  const measure = (): void => {
    if (dock)
      app.style.setProperty('--dock-space', `${Math.ceil(dock.getBoundingClientRect().height)}px`)
    if (chart) {
      // Ignore the scroll position so choosing an order cannot make the board grow as it scrolls.
      const top = chart.getBoundingClientRect().top + (host?.scrollTop ?? 0)
      chart.style.setProperty(
        '--naval-height',
        `${Math.max(240, (dock?.getBoundingClientRect().top ?? host?.getBoundingClientRect().bottom ?? window.innerHeight) - top - 24)}px`,
      )
    }
  }
  measure()
  const observer = new ResizeObserver(measure)
  if (dock) observer.observe(dock)
  if (host && chart) observer.observe(host)
  window.addEventListener('resize', measure)
  return () => {
    observer.disconnect()
    window.removeEventListener('resize', measure)
    if (previous) app.style.setProperty('--dock-space', previous)
    else app.style.removeProperty('--dock-space')
  }
}

/** One contextual instruction follows the real boat state, without duplicating quest prose. */
export function pressureHint(language: Language, run: Expedition): string {
  if (run.encounter?.kind === 'keelcrab') return message(language, 'keelcrab.choose')
  const river = run.pressure
  if (!river) return ''
  if (!aboardRiverBoat(run)) return message(language, 'pressure.board')
  return message(language, 'pressure.sounding')
}

/** Explain a rejected click from public reach and marks, never from covered mine values. */
export function riverRejectionHint(
  language: Language,
  run: Expedition,
  action: ExpeditionAction,
): string {
  if (action.type === 'reveal' && run.pressure?.water.includes(action.index)) {
    if (!aboardRiverBoat(run)) return message(language, 'pressure.board-first')
    if (!riverSoundingCells(run).has(action.index))
      return message(language, 'pressure.out-of-range')
    if (run.game.cells[action.index]?.visibility === 'flagged')
      return message(language, 'pressure.flagged')
  }
  return message(language, 'pressure.blocked')
}

/** Reuse the board's actual fills in the legend and illustrated guide. */
function riverSurveyLegend(language: Language): string {
  return `<div class="river-survey-legend"><span><i class="river-swatch available" aria-hidden="true"></i>${message(language, 'pressure.surveyable')}</span><span><i class="river-swatch revealed" aria-hidden="true"></i>${message(language, 'pressure.surveyed')}</span><span><i class="river-swatch distant" aria-hidden="true"></i>${message(language, 'pressure.distant')}</span></div>`
}

/** Keep stage identity and progress by the board; sailing controls use the shared bottom dock. */
export function pressureObjective(language: Language, run: Expedition): string {
  if (run.encounter?.kind === 'keelcrab')
    return `<section class="pressure-objective"><strong>${message(language, 'keelcrab.title')}</strong><span>${message(language, 'keelcrab.choose')}</span></section>`
  const river = run.pressure
  if (!river) return ''

  return `<section class="pressure-objective"><strong>${run.departure.recollection ? message(language, 'recollection.river') : pressureFloorName(language, run.floor)}</strong><span>${message(language, 'pressure.objective')}</span><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help" aria-haspopup="dialog">${icon('help')}${message(language, 'pressure.help')}</button></section>`
}

/** Large labeled image buttons remain accessible by mouse, keyboard and touch. */
export function riverControls(language: Language, run: Expedition): string {
  const river = run.pressure
  if (!river) return ''
  const aboard = aboardRiverBoat(run)
  const routes = riverRoutes(run)
  return `<div class="river-controls"><p class="pressure-hint" role="status">${pressureHint(language, run)}</p><div class="river-route-options">${routes.map((route) => `<button class="river-control" data-control="river-plan:${route.launch}" aria-pressed="false">${route.launch < run.player - 1 ? '↑' : route.launch > run.player + 1 ? '↓' : route.launch < run.player ? '←' : '→'} <span>${message(language, 'pressure.berth', { id: String.fromCharCode(65 + river.docks.indexOf(route.destination)) })}</span></button>`).join('')}</div><div class="river-departure"><button class="river-control" data-control="sail" disabled>${spriteImage('river-boat')}<span>${message(language, 'pressure.depart')}</span></button><button class="river-control" data-control="haul" ${aboard && river.line.length > 1 ? '' : 'disabled'}>${spriteImage('river-dock')}<span>${message(language, 'pressure.haul')}</span></button></div></div>`
}

/** Teach actual boat actions with the same sprites used on the board. */
export function pressureGuide(language: Language): string {
  const headings = [
    message(language, 'pressure.guide-board'),
    message(language, 'pressure.guide-sail'),
    message(language, 'pressure.guide-stop'),
    message(language, 'pressure.haul'),
  ]
  const notes = [
    message(language, 'pressure.board'),
    message(language, 'pressure.survey-guide') + ' ' + message(language, 'pressure.ride'),
    message(language, 'pressure.land'),
    message(language, 'pressure.haul-hint'),
  ]

  return `<div class="pressure-help">${headings.map((heading, step) => `<section><div class="pressure-help-picture" aria-hidden="true">${crossingDiagram(step)}</div><div><h3>${step + 1}. ${heading}</h3>${step === 1 ? riverSurveyLegend(language) : ''}<p>${notes[step]}</p></div></section>`).join('')}</div>`
}

/** Currents are public geometry; covered numbers and flags remain owned by BoardView. */
export function renderPressure(root: HTMLElement, run: Expedition, language: Language): void {
  const river = run.pressure
  if (!river) return
  const board = root.querySelector<HTMLElement>('[data-side="a"]')
  board?.classList.add('river-board')
  const sounding = riverSoundingCells(run)
  const aboard = aboardRiverBoat(run)
  root.querySelector('.river-survey-key')?.remove()
  board
    ?.closest('.board-viewport')
    ?.insertAdjacentHTML(
      'beforebegin',
      `<div class="river-survey-key">${riverSurveyLegend(language)}<small>${aboard ? message(language, 'pressure.survey-note') : message(language, 'pressure.board-first')}</small></div>`,
    )

  for (const index of river.water) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) continue
    cell.classList.add('pressure-water')
    const hidden = run.game.cells[index]?.visibility === 'hidden'
    const available =
      hidden &&
      (run.phase === 'exploring' || (run.encounter?.kind === 'keelcrab' && run.phase === 'boss')) &&
      sounding.has(index)
    cell.classList.toggle('river-surveyable', available)
    cell.classList.toggle('river-out-of-range', hidden && !available)
    if (river.currents[index]) {
      cell.classList.add('river-channel')
      cell.dataset['flow'] = river.currents[index]!
      cell.insertAdjacentHTML('beforeend', '<span class="river-current" aria-hidden="true"></span>')
    }
    cell.setAttribute(
      'aria-label',
      `${cell.getAttribute('aria-label')}, ${message(language, 'pressure.water')}, ${!river.currents[index] ? '' : river.currents[index] === 'north' ? message(language, 'pressure.north') : river.currents[index] === 'south' ? message(language, 'pressure.south') : river.currents[index] === 'east' ? message(language, 'pressure.east') : message(language, 'pressure.west')}`,
    )
    if (hidden)
      cell.setAttribute(
        'aria-label',
        `${cell.getAttribute('aria-label')}, ${available ? message(language, 'pressure.surveyable') : message(language, 'pressure.distant')}`,
      )
    if (river.docks.includes(index)) {
      cell.classList.add('river-landing')
      cell.insertAdjacentHTML('afterbegin', spriteImage('river-dock', 'river-dock-sprite'))
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="river-berth-label">${String.fromCharCode(65 + river.docks.indexOf(index))}</span>`,
      )
      cell.setAttribute(
        'aria-label',
        `${cell.getAttribute('aria-label')}, ${message(language, 'pressure.berth', { id: String.fromCharCode(65 + river.docks.indexOf(index)) })}`,
      )
    }
    if (index === river.boat && !aboardRiverBoat(run)) {
      cell.classList.add('river-boat-cell')
      cell.insertAdjacentHTML('beforeend', spriteImage('river-boat', 'river-empty-boat'))
      cell.setAttribute('aria-label', message(language, 'pressure.raft'))
    }
  }
  if (board && river.line.length > 1) {
    const width = run.game.config.width
    const points = river.line
      .map((index) => `${(index % width) + 0.5},${Math.floor(index / width) + 0.72}`)
      .join(' ')
    board.insertAdjacentHTML(
      'beforeend',
      `<svg class="river-rope" viewBox="0 0 ${width} ${run.game.config.height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/></svg>`,
    )
  }
}

/** Put the hull under the single existing character within one moving stacking context. */
export function renderRiverPassenger(player: HTMLElement, run: Expedition): void {
  if (!aboardRiverBoat(run)) return
  player.classList.add('river-passenger')
  player.insertAdjacentHTML('afterbegin', spriteImage('river-boat', 'river-hull'))
}

/** Anchor the first crossing's live hints to the scene, outside tile stacking contexts. */
export function mountRiverLesson(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  dismiss: () => void,
): (() => void) | null {
  const river = run.pressure
  if (!river || run.floor !== 1 || run.phase !== 'exploring' || river.line.length > 1) return null
  const panel = document.createElement('section')
  panel.className = 'campaign-lesson river-lesson'
  panel.setAttribute('aria-live', 'polite')
  const aboard = aboardRiverBoat(run)
  panel.dataset['riverLesson'] = aboard ? 'survey' : 'board'
  panel.innerHTML = `<strong>${aboard ? message(language, 'pressure.survey-title') : message(language, 'pressure.help')}</strong><p>${aboard ? message(language, 'pressure.survey-lesson') : pressureHint(language, run)}</p>`
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = message(language, 'campaign.lesson-skip')
  button.addEventListener('click', dismiss)
  panel.append(button)

  return mountAnchoredLesson(root, panel, `[data-side="a"] [data-cell="${river.boat}"]`)
}

/** Move a rendered layer along a committed route rather than interpolating through islands. */
function animateRiverRoute(
  root: HTMLElement,
  element: HTMLElement | null,
  path: readonly number[],
): Animation | null {
  if (!element || path.length < 2) return null
  const cells = path.map((index) =>
    root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`),
  )
  const destination = cells.at(-1)
  if (!destination || cells.some((cell) => !cell)) return null
  const origin = element.style.transform || 'translate(0, 0)'
  const frames = cells.map((cell) => ({
    transform: `${origin} translate(${cell!.offsetLeft - destination.offsetLeft}px, ${cell!.offsetTop - destination.offsetTop}px)`,
  }))
  const animation = element.animate(frames, {
    duration: Math.min(1800, Math.max(350, (path.length - 1) * 110)),
    easing: 'linear',
  })
  animation.id = 'river-voyage'

  return animation
}

/** Commit before performing; the hull and passenger share the same journey and cancel boundary. */
export async function animatePressure(
  root: HTMLElement,
  before: Expedition | null,
  after: Expedition | null,
): Promise<void> {
  if (
    !before?.pressure ||
    !after?.pressure ||
    before.floor !== after.floor ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const animations: Animation[] = []
  const player = root.querySelector<HTMLElement>('.dungeon-player')
  if (before.player !== after.player) {
    const both = aboardRiverBoat(before) && aboardRiverBoat(after)
    const path = both
      ? after.pressure.voyage
      : aboardRiverBoat(before)
        ? [before.player, after.player]
        : [before.player, after.player]
    const target =
      !aboardRiverBoat(before) && aboardRiverBoat(after)
        ? (player?.querySelector<HTMLElement>(':scope > .dungeon-sprite') ?? null)
        : player
    const animation = animateRiverRoute(root, target, path)
    if (animation) animations.push(animation)
  }

  await Promise.allSettled(animations.map((animation) => animation.finished))
}

/** Shared generated art identifies the world doorway, preparation page and physical boat. */
export function raftImage(): string {
  return spriteImage('river-boat')
}

/** Small diagrams distinguish soundings, whole voyages, berths and a safe return. */
function crossingDiagram(step: number): string {
  const cells = Array.from(
    { length: 20 },
    (_, index) =>
      `<rect x="${(index % 5) * 28 + 3}" y="${Math.floor(index / 5) * 26 + 3}" width="25" height="23" rx="3" fill="${index > 14 || index % 5 === 4 ? '#b9d6ce' : '#e2eee3'}"/>`,
  ).join('')
  const returning = step === 3
  return `<div class="river-diagram river-diagram-${step}"><svg viewBox="0 0 145 108" aria-hidden="true">${cells}<path d="M 15 93 H 127 V 15" fill="none" stroke="${returning ? '#9d794b' : '#4f8c7b'}" stroke-width="3" ${step < 2 ? 'stroke-dasharray="5 5"' : ''}/><path d="${returning ? 'M 45 88 L 39 93 L 45 98' : 'M 122 51 L 127 45 L 132 51'}" fill="none" stroke="#376455" stroke-width="3"/><text x="10" y="73" fill="#315b4b" font-size="12">A</text><text x="116" y="14" fill="#315b4b" font-size="12">B</text><text x="39" y="70" fill="#3269a8" font-size="14">1</text><text x="68" y="70" fill="#9b7748" font-size="14">⚑</text></svg><span class="river-diagram-boat" style="left:${step === 2 ? '65%' : '0%'};top:${step === 2 ? '0%' : '57%'}">${spriteImage('river-boat')}${spriteImage('player', 'river-diagram-player')}</span></div>`
}

/** Paint a selected whole voyage using visible evidence only; mobile selection never launches. */
export function renderRiverPlan(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  launch: number | null,
): void {
  const river = run.pressure
  if (!river) return
  const route = riverRoutes(run).find((entry) => entry.launch === launch)
  for (const button of root.querySelectorAll<HTMLElement>('[data-control^="river-plan:"]'))
    button.setAttribute(
      'aria-pressed',
      String(button.dataset['control'] === `river-plan:${launch}`),
    )
  const sail = root.querySelector<HTMLButtonElement>('[data-control="sail"]')
  if (sail) sail.disabled = !route || route.unknown.length > 0 || route.blocked.length > 0
  const hint = root.querySelector('.pressure-hint')
  if (hint && route)
    hint.textContent = route.blocked.length
      ? message(language, 'pressure.route-blocked')
      : route.unknown.length
        ? message(language, 'pressure.route-unknown', { count: route.unknown.length })
        : message(language, 'pressure.route-ready', {
            id: String.fromCharCode(65 + river.docks.indexOf(route.destination)),
            count: route.path.length - 1,
          })
  if (hint && run.encounter?.kind === 'keelcrab')
    hint.textContent = route?.blocked.length
      ? message(language, 'keelcrab.net')
      : route?.unknown.length
        ? message(language, 'pressure.route-unknown', { count: route.unknown.length })
        : keelcrabRouteHint(language, run, route?.path ?? [])
  for (const cell of root.querySelectorAll<HTMLElement>('[data-side="a"] [data-cell]')) {
    const index = Number(cell.dataset['cell'])
    cell.classList.toggle('river-planned', !!route?.path.includes(index))
    cell.classList.toggle('river-plan-unknown', !!route?.unknown.includes(index))
    cell.classList.toggle('river-plan-blocked', !!route?.blocked.includes(index))
    cell.classList.toggle('river-plan-stop', route?.destination === index)
  }
  root.querySelector('.river-planned-line')?.remove()
  const board = root.querySelector('[data-side="a"]')
  if (!route || !board) return
  const width = run.game.config.width
  const segments = route.path
    .slice(1)
    .map((index, i) => {
      const previous = route.path[i]!
      const uncertain = route.unknown.includes(index) || route.unknown.includes(previous)
      return `<line x1="${(previous % width) + 0.5}" y1="${Math.floor(previous / width) + 0.5}" x2="${(index % width) + 0.5}" y2="${Math.floor(index / width) + 0.5}" ${uncertain ? 'class="is-unknown"' : ''}/>`
    })
    .join('')
  board.insertAdjacentHTML(
    'beforeend',
    `<svg class="river-planned-line" viewBox="0 0 ${width} ${run.game.config.height}" preserveAspectRatio="none" aria-hidden="true">${segments}</svg>`,
  )
}
