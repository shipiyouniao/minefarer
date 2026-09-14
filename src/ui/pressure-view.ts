import { message } from '../i18n.js'
import { icon } from '../icons.js'
import { aboardRiverBoat, downstreamCell, riverMooringReady } from '../game/pressure.js'
import { pressureFloorName } from './pressure-copy.js'
import { sharedStyles } from './shared-styles.js'
import { spriteImage } from './dungeon-sprites.js'
import { mountAnchoredLesson } from './anchored-lesson.js'
import type { Expedition } from '../types/variants.js'
import type { Language } from '../types/localization.js'

/** One contextual instruction follows the real boat state, without duplicating quest prose. */
export function pressureHint(language: Language, run: Expedition): string {
  const river = run.pressure
  if (!river) return ''
  if (river.moorings.every((entry) => entry.secured)) return message(language, 'pressure.exit')
  if (!aboardRiverBoat(run)) return message(language, 'pressure.board')
  if (!river.anchored) return message(language, 'pressure.sailing')
  if (river.moorings.some((entry) => riverMooringReady(run, entry.index)))
    return message(language, 'pressure.secure-hint')

  return message(language, 'pressure.sounding')
}

/** Keep stage identity and progress by the board; sailing controls use the shared bottom dock. */
export function pressureObjective(language: Language, run: Expedition): string {
  const river = run.pressure
  if (!river) return ''

  return `<section class="pressure-objective"><strong>${run.departure.recollection ? message(language, 'recollection.river') : pressureFloorName(language, run.floor)}</strong><span>${message(language, 'pressure.progress', { count: river.moorings.filter((entry) => entry.secured).length, total: river.moorings.length })}</span><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help" aria-haspopup="dialog">${icon('help')}${message(language, 'pressure.help')}</button></section>`
}

/** Large labeled image buttons remain accessible by mouse, keyboard and touch. */
export function riverControls(language: Language, run: Expedition): string {
  const river = run.pressure
  if (!river) return ''
  const aboard = aboardRiverBoat(run)
  const target = downstreamCell(run, run.player)
  const canDrift =
    aboard &&
    !river.anchored &&
    target !== null &&
    river.water.includes(target) &&
    run.game.cells[target]?.visibility === 'revealed' &&
    !run.game.cells[target]?.mine

  return `<div class="river-controls"><p class="pressure-hint" role="status">${pressureHint(language, run)}</p><button class="river-control" data-control="moor" aria-pressed="${river.anchored}" ${aboard ? '' : 'disabled'}>${spriteImage('tide-anchor')}<span>${river.anchored ? message(language, 'pressure.raise') : message(language, 'pressure.lower')}</span></button><button class="river-control" data-control="end-turn" ${canDrift ? '' : 'disabled'}>${spriteImage('river-boat')}<span>${message(language, 'pressure.wait')}</span></button><button class="river-control" data-control="haul" ${aboard && river.line.length > 1 ? '' : 'disabled'}>${spriteImage('river-dock')}<span>${message(language, 'pressure.haul')}</span></button></div>`
}

/** Teach actual boat actions with the same sprites used on the board. */
export function pressureGuide(language: Language): string {
  const headings = [
    message(language, 'pressure.guide-board'),
    message(language, 'pressure.guide-sail'),
    message(language, 'pressure.guide-moor'),
    message(language, 'pressure.haul'),
  ]
  const notes = [
    message(language, 'pressure.board'),
    message(language, 'pressure.ride'),
    message(language, 'pressure.land'),
    message(language, 'pressure.haul-hint'),
  ]

  return `<div class="pressure-help">${headings.map((heading, step) => `<section><div class="pressure-help-picture" aria-hidden="true">${crossingDiagram(step)}</div><div><h3>${step + 1}. ${heading}</h3><p>${notes[step]}</p></div></section>`).join('')}</div>`
}

/** Currents are public geometry; covered numbers and flags remain owned by BoardView. */
export function renderPressure(root: HTMLElement, run: Expedition, language: Language): void {
  const river = run.pressure
  if (!river) return
  const board = root.querySelector<HTMLElement>('[data-side="a"]')
  board?.classList.add('river-board')

  for (const index of river.water) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) continue
    cell.classList.add('pressure-water')
    cell.dataset['flow'] = river.currents[index]!
    cell.insertAdjacentHTML('beforeend', '<span class="river-current" aria-hidden="true"></span>')
    cell.setAttribute(
      'aria-label',
      `${cell.getAttribute('aria-label')}, ${message(language, 'pressure.water')}, ${river.currents[index] === 'north' ? message(language, 'pressure.north') : river.currents[index] === 'south' ? message(language, 'pressure.south') : river.currents[index] === 'east' ? message(language, 'pressure.east') : message(language, 'pressure.west')}`,
    )
    if (river.docks.includes(index)) {
      cell.classList.add('river-landing')
      cell.insertAdjacentHTML('afterbegin', spriteImage('river-dock', 'river-dock-sprite'))
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
  for (const mooring of river.moorings) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${mooring.index}"]`)
    if (!cell) continue
    cell.classList.remove('wall-cell')
    cell.classList.add('river-mooring')
    cell.classList.toggle('river-secured', mooring.secured)
    cell.setAttribute(
      'aria-disabled',
      String(mooring.secured && !river.water.includes(mooring.index)),
    )
    cell.setAttribute(
      'aria-label',
      mooring.secured
        ? message(language, 'pressure.secured')
        : message(language, 'pressure.secure-hint'),
    )
    cell.innerHTML =
      spriteImage('river-dock') +
      spriteImage('tide-anchor', 'river-mooring-anchor') +
      (run.game.cells[mooring.index]?.visibility === 'revealed'
        ? `<span class="landmark-clue">${run.game.cells[mooring.index]?.adjacent || ''}</span>`
        : '')
  }
}

/** Put the hull under the single existing character within one moving stacking context. */
export function renderRiverPassenger(player: HTMLElement, run: Expedition): void {
  if (!aboardRiverBoat(run)) return
  player.classList.add('river-passenger')
  player.classList.toggle('river-anchored', run.pressure!.anchored)
  player.insertAdjacentHTML('afterbegin', spriteImage('river-boat', 'river-hull'))
  if (run.pressure!.anchored)
    player.insertAdjacentHTML('beforeend', spriteImage('tide-anchor', 'river-dropped-anchor'))
}

/** Anchor the first crossing's live hints to the scene, outside tile stacking contexts. */
export function mountRiverLesson(
  root: HTMLElement,
  run: Expedition,
  language: Language,
): (() => void) | null {
  const river = run.pressure
  if (
    !river ||
    run.floor !== 1 ||
    aboardRiverBoat(run) ||
    run.phase !== 'exploring' ||
    river.moorings.some((entry) => entry.secured)
  )
    return null
  const panel = document.createElement('section')
  panel.className = 'campaign-lesson river-lesson'
  panel.setAttribute('aria-live', 'polite')
  panel.innerHTML = `<strong>${message(language, 'pressure.help')}</strong><p>${pressureHint(language, run)}</p>`

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
        ? [...after.pressure.voyage, after.player]
        : [before.player, after.player]
    const target =
      !aboardRiverBoat(before) && aboardRiverBoat(after)
        ? (player?.querySelector<HTMLElement>(':scope > .dungeon-sprite') ?? null)
        : player
    const animation = animateRiverRoute(root, target, path)
    if (animation) animations.push(animation)
    if (aboardRiverBoat(before) && !aboardRiverBoat(after)) {
      const hull = root.querySelector<HTMLElement>('.river-empty-boat')
      const sailed = animateRiverRoute(root, hull, after.pressure.voyage)
      if (sailed) animations.push(sailed)
    }
  }
  if (before.pressure.anchored !== after.pressure.anchored) {
    const anchor =
      root.querySelector<HTMLElement>('.river-dropped-anchor') ??
      root.querySelector<HTMLElement>('[data-control="moor"] img')
    if (anchor) {
      const animation = anchor.animate(
        [
          { transform: 'translateY(-18px) scale(.6)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 420, easing: 'ease-out' },
      )
      animation.id = 'river-anchor'
      animations.push(animation)
    }
  }
  const secured = after.pressure.moorings.find(
    (entry) =>
      entry.secured && !before.pressure!.moorings.find((old) => old.index === entry.index)?.secured,
  )
  if (secured) {
    const target = root.querySelector<HTMLElement>(
      `[data-cell="${secured.index}"] .river-mooring-anchor`,
    )
    if (target) {
      const animation = target.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }, { transform: 'scale(1)' }],
        { duration: 500 },
      )
      animation.id = 'river-secure'
      animations.push(animation)
    }
  }

  await Promise.allSettled(animations.map((animation) => animation.finished))
}

/** Shared generated art identifies the world doorway, preparation page and physical boat. */
export function raftImage(): string {
  return spriteImage('river-boat')
}

/** Small diagrams distinguish surveying, following a current, mooring and retracing a rope. */
function crossingDiagram(step: number): string {
  return `<div class="river-diagram river-diagram-${step}"><span class="river-diagram-number">1</span><span class="river-diagram-flag">${icon('flag')}</span><span class="river-diagram-route">${icon('arrow')}</span><span class="river-diagram-boat">${spriteImage('river-boat')}${spriteImage('player', 'river-diagram-player')}</span><span class="river-diagram-device">${spriteImage(step === 2 || step === 3 ? 'river-dock' : 'tide-anchor')}</span></div>`
}
