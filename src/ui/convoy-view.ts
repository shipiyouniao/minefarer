import { planConvoy } from '../game/convoy.js'
import { message } from '../i18n.js'
import { spriteImage } from './dungeon-sprites.js'
import { sharedStyles } from './shared-styles.js'
import { mountAnchoredLesson } from './anchored-lesson.js'
import type { Expedition } from '../types/variants.js'
import type { ConvoyFloor, ConvoyPlan } from '../types/convoy.js'
import type { Language } from '../types/localization.js'

/** Use one public letter at the dock, in plan buttons, and in each boat's destination. */
function portName(language: Language, convoy: ConvoyFloor, index: number): string {
  return message(language, 'pressure.berth', {
    id: String.fromCharCode(65 + convoy.ports.indexOf(index)),
  })
}

/** A compact stage heading keeps the detailed timing rules in the illustrated help. */
export function convoyObjective(language: Language, run: Expedition): string {
  const titles = [
    message(language, 'convoy.title-1'),
    message(language, 'convoy.title-2'),
    message(language, 'convoy.title-3'),
    message(language, 'convoy.title-4'),
  ]
  const fleet = run.convoy!
  return `<section class="pressure-objective"><strong>${titles[run.floor - 1]}</strong><span>${message(language, 'convoy.progress', { count: fleet.boats.filter((boat) => boat.arrived).length, total: fleet.boats.length })}</span><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help">${message(language, 'convoy.help')}</button></section>`
}

/** Each boat can hold or choose one connected reach; selection alone is presentation state. */
export function convoyControls(language: Language, run: Expedition): string {
  const convoy = run.convoy!
  const names = [
    message(language, 'convoy.blue'),
    message(language, 'convoy.orange'),
    message(language, 'convoy.green'),
    message(language, 'convoy.purple'),
  ]
  return `<div class="river-controls convoy-controls${convoy.boats.length > 2 ? ' convoy-fleet' : ''}"><p class="pressure-hint" role="status">${message(language, 'convoy.choose')}</p><div class="convoy-orders">${convoy.boats.map((boat, i) => `<section class="convoy-order" data-boat-order="${i}"><button class="convoy-choose" data-control="convoy-pick:${i}">${spriteImage('river-boat')}<strong>${names[i]}</strong><span class="convoy-order-summary"></span></button><small>${message(language, 'convoy.goal', { port: String.fromCharCode(65 + convoy.ports.indexOf(boat.destination)) })}${boat.pace === 2 ? ` · ${message(language, 'convoy.slow')}` : ''}</small><div class="convoy-options">${boat.arrived ? `<strong>${message(language, 'convoy.delivered')}</strong>` : [0, ...convoy.reaches.filter((reach) => reach.from === boat.position).map((reach) => reach.to)].map((to) => `<button class="river-control" aria-pressed="false" data-control="convoy-${String.fromCharCode(97 + i)}:${to}">${to === 0 ? message(language, 'convoy.hold') : portName(language, convoy, to)}</button>`).join('')}</div></section>`).join('')}</div><div class="convoy-actions"><button class="river-control" data-control="convoy-undo" ${convoy.round === 0 ? 'disabled' : ''}>${message(language, 'convoy.undo')}</button><button class="river-control convoy-launch" data-control="convoy" disabled>${message(language, 'convoy.sail')}</button><button class="river-control" data-control="convoy-reset" ${convoy.round === 0 ? 'disabled' : ''}>${message(language, 'convoy.reset')}</button></div></div>`
}

/** Explain rejected forecasts without suggesting that players must lose health to learn the puzzle. */
export function convoyHint(language: Language, plan: ConvoyPlan): string {
  return plan.reason === 'collision'
    ? message(language, 'convoy.collision')
    : plan.reason === 'ready'
      ? message(language, 'convoy.ready')
      : plan.reason === 'route'
        ? message(language, 'convoy.route')
        : message(language, 'convoy.choose')
}

/** Render the measured actors and forecast; disconnect geometry observers on every replacement. */
export function mountConvoy(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  choices: readonly number[],
  selected: number,
): () => void {
  const convoy = run.convoy!
  const board = root.querySelector<HTMLElement>('[data-side="a"]')!
  board.classList.add('convoy-board')
  const trees =
    run.floor <= 2
      ? [32, 42, 61, 73, 121, 133, 152, 162]
      : run.floor === 3
        ? [
            18,
            32,
            (run.game.config.height - 2) * run.game.config.width + 1,
            (run.game.config.height - 2) * run.game.config.width + 15,
          ]
        : []
  for (const index of trees)
    if (run.walls.includes(index))
      board
        .querySelector(`[data-cell="${index}"]`)
        ?.insertAdjacentHTML(
          'beforeend',
          `<img class="convoy-tree" src="${import.meta.env.BASE_URL}assets/story/tree.png" alt="" draggable="false">`,
        )
  const plan = planConvoy(convoy, choices)
  for (const index of new Set(convoy.reaches.flatMap((reach) => reach.path)))
    board.querySelector(`[data-cell="${index}"]`)?.classList.add('convoy-water')
  for (const index of convoy.ports) {
    const cell = board.querySelector<HTMLElement>(`[data-cell="${index}"]`)!
    const goal = convoy.boats.findIndex((boat) => boat.destination === index)
    cell.classList.add('convoy-port')
    cell.innerHTML = `${spriteImage('river-dock')}<span class="river-berth-label">${String.fromCharCode(65 + convoy.ports.indexOf(index))}</span>${goal < 0 ? '' : `<span class="convoy-goal convoy-color-${goal}">${String.fromCharCode(65 + goal)} ⚑</span>`}`
    cell.setAttribute('aria-label', portName(language, convoy, index))
  }
  const actors = convoy.boats.map((boat, i) => {
    const actor = document.createElement('div')
    actor.className = `convoy-boat convoy-color-${i}${boat.arrived ? ' has-arrived' : ''}`
    actor.dataset['convoyBoat'] = String(i)
    actor.setAttribute('aria-hidden', 'true')
    actor.innerHTML = `${spriteImage('river-boat')}<span>${String.fromCharCode(65 + i)}${boat.arrived ? ' ✓' : ''}</span>`
    board.append(actor)
    return actor
  })
  /** Recalculate after responsive grid or zoom changes, using actual tile geometry. */
  const measure = (): void =>
    actors.forEach((actor, i) => {
      const cell = board.querySelector<HTMLElement>(`[data-cell="${convoy.boats[i]!.position}"]`)!
      actor.style.left = `${cell.offsetLeft}px`
      actor.style.top = `${cell.offsetTop}px`
      actor.style.width = `${cell.offsetWidth}px`
      actor.style.height = `${cell.offsetHeight}px`
    })
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(board)
  const width = run.game.config.width,
    height = run.game.config.height
  const lines = plan.voyages
    .map(
      (voyage, i) =>
        `<polyline class="convoy-path-${i}" points="${voyage.path.map((cell) => `${(cell % width) + 0.5},${Math.floor(cell / width) + 0.5}`).join(' ')}"/>`,
    )
    .join('')
  const collision =
    plan.collision === null
      ? ''
      : `<circle class="convoy-collision" cx="${(plan.collision % width) + 0.5}" cy="${Math.floor(plan.collision / width) + 0.5}" r=".45"/>`
  board.insertAdjacentHTML(
    'beforeend',
    `<svg class="convoy-paths" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${lines}${collision}</svg>`,
  )
  for (const [i, choice] of choices.entries()) {
    root
      .querySelector(`[data-control="convoy-${String.fromCharCode(97 + i)}:${choice}"]`)
      ?.setAttribute('aria-pressed', 'true')
    root
      .querySelector(`[data-control="convoy-pick:${i}"]`)
      ?.setAttribute('aria-pressed', String(selected === i))
    const card = root.querySelector<HTMLElement>(`[data-boat-order="${i}"]`)
    card?.classList.toggle('is-selected', selected === i)
    const summary = card?.querySelector('.convoy-order-summary')
    if (summary)
      summary.textContent = convoy.boats[i]!.arrived
        ? '✓'
        : choice
          ? `→ ${String.fromCharCode(65 + convoy.ports.indexOf(choice))}`
          : '—'
  }
  const hint = root.querySelector('.convoy-controls .pressure-hint')
  if (hint) hint.textContent = convoyHint(language, plan)
  const button = root.querySelector<HTMLButtonElement>('[data-control="convoy"]')
  if (button) button.disabled = !plan.allowed
  return () => observer.disconnect()
}

/** Use the same attached coach as other stages, then retire it after a real simultaneous departure. */
export function mountConvoyLesson(
  root: HTMLElement,
  run: Expedition,
  language: Language,
  dismiss: () => void,
): (() => void) | null {
  if (!run.convoy || run.floor === 2 || run.convoy.round > 0 || run.phase !== 'exploring')
    return null
  const panel = document.createElement('section')
  panel.className = 'campaign-lesson convoy-lesson'
  panel.innerHTML = `<strong>${message(language, 'convoy.help')}</strong><p>${run.floor === 1 ? message(language, 'convoy.lesson') : run.floor === 3 ? message(language, 'convoy.lesson-3') : message(language, 'convoy.lesson-4')}</p>`
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = message(language, 'campaign.lesson-skip')
  button.addEventListener('click', dismiss)
  panel.append(button)
  return mountAnchoredLesson(root, panel, `[data-cell="${run.convoy.boats[0]!.position}"]`)
}

/** Illustrate movement, occupied bays and unequal speeds using the actual boat asset. */
export function convoyGuide(language: Language): string {
  return `<div class="convoy-guide"><div class="convoy-example" aria-hidden="true"><span class="convoy-color-0">A ${spriteImage('river-boat')} →</span><span>◉</span><span class="convoy-color-1">← ${spriteImage('river-boat')} B</span></div>${[message(language, 'convoy.guide-route'), message(language, 'convoy.guide-collision'), message(language, 'convoy.guide-bay'), message(language, 'convoy.guide-speed'), message(language, 'convoy.lesson-3'), message(language, 'convoy.lesson-4')].map((text, i) => `<section><strong>${i + 1}</strong><p>${text}</p></section>`).join('')}</div>`
}

/** Move every actor on the same clock, retaining different speeds and holds from the simulation. */
export async function animateConvoy(
  root: HTMLElement,
  before: Expedition,
  after: Expedition,
): Promise<void> {
  if (!before.convoy || !after.convoy || after.convoy.round === before.convoy.round) return
  const board = root.querySelector<HTMLElement>('[data-side="a"]')
  if (!board || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const voyages = after.convoy.voyages
  const ticks = Math.max(...voyages.map((voyage) => (voyage.path.length - 1) * voyage.pace))
  const animations = voyages.flatMap((voyage, i) => {
    const actor = board.querySelector<HTMLElement>(`[data-convoy-boat="${i}"]`)
    if (!actor || voyage.path.length < 2) return []
    const last = board.querySelector<HTMLElement>(`[data-cell="${voyage.path.at(-1)}"]`)!
    const frames = voyage.path.map((at, step) => {
      const cell = board.querySelector<HTMLElement>(`[data-cell="${at}"]`)!
      return {
        transform: `translate(${cell.offsetLeft - last.offsetLeft}px,${cell.offsetTop - last.offsetTop}px)`,
        offset: (step * voyage.pace) / ticks,
      }
    })
    if (frames.at(-1)!.offset < 1) frames.push({ ...frames.at(-1)!, offset: 1 })
    const animation = actor.animate(frames, {
      duration: Math.min(2200, ticks * 190),
      easing: 'linear',
    })
    animation.id = 'convoy-voyage'
    return [animation]
  })
  await Promise.all(animations.map((animation) => animation.finished.catch(() => {})))
}
