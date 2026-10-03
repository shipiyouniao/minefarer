import { message } from '../i18n.js'
import { incomingCombatDamage } from '../game/combat-build.js'
import { spriteImage } from './dungeon-sprites.js'
import { sharedStyles } from './shared-styles.js'
import type { Expedition } from '../types/variants.js'
import type { Language } from '../types/localization.js'

/** Explain the native naval turn structure without showing unrelated action-point controls. */
export function keelcrabPanel(language: Language, run: Expedition): string {
  const e = run.encounter
  if (e?.kind !== 'keelcrab') return ''
  return `<section class="keelcrab-panel"><div class="keelcrab-heading">${spriteImage('keelcrab')}<div><h3>${message(language, 'keelcrab.name')}</h3><strong>${e.health} / ${e.maxHealth}</strong><progress max="${e.maxHealth}" value="${e.health}"></progress></div></div><p>${message(language, 'keelcrab.round', { count: e.turn })} · ${e.health * 2 <= e.maxHealth ? message(language, 'keelcrab.rage') : message(language, 'keelcrab.calm')}</p><strong class="keelcrab-charge ${e.charged ? 'is-ready' : ''}">${e.charged ? message(language, 'keelcrab.ready') : message(language, 'keelcrab.empty')}</strong><p>${message(language, 'keelcrab.charge-guide')}</p><button class="secondary-button ${sharedStyles['secondary-button']}" data-control="help">${message(language, 'keelcrab.help')}</button></section>`
}

/** The same short rules are accessible from the battle and its illustrated guide. */
export function keelcrabGuide(language: Language): string {
  return `<div class="keelcrab-guide">${spriteImage('keelcrab')}<p>${message(language, 'keelcrab.known')}</p><p>${message(language, 'keelcrab.danger')}</p><p>${message(language, 'keelcrab.charge-guide')}</p><p>${message(language, 'keelcrab.rage-guide')}</p></div>`
}

/** Present consequences of the selected entire voyage without mutating combat state. */
export function keelcrabRouteHint(
  language: Language,
  run: Expedition,
  path: readonly number[],
): string {
  const e = run.encounter
  if (e?.kind !== 'keelcrab' || path.length < 2) return message(language, 'keelcrab.choose')
  const hit = path.slice(1).some((i) => e.intent.targets.includes(i))
  const shot = e.charged && path.slice(1).some((i) => e.weakCells.includes(i))
  return (
    (hit
      ? message(language, 'keelcrab.route-hit', {
          damage: incomingCombatDamage(run, e.intent.damage),
        })
      : message(language, 'keelcrab.route-safe')) +
    ' ' +
    (shot
      ? message(language, 'keelcrab.route-shot')
      : !e.charged && path.length - 1 >= 12
        ? message(language, 'keelcrab.route-load')
        : message(language, 'keelcrab.route-reposition'))
  )
}

/** Mark safe public routes, sweep footprints and countershot water with independent cues. */
export function renderKeelcrab(root: HTMLElement, run: Expedition, language: Language): void {
  const e = run.encounter
  if (e?.kind !== 'keelcrab') return
  const board = root.querySelector('[data-side="a"]')
  board?.classList.add('keelcrab-board')
  for (const index of run.walls)
    if (
      index % 17 >= 6 &&
      index % 17 <= 10 &&
      Math.floor(index / 17) >= 6 &&
      Math.floor(index / 17) <= 10
    )
      board?.querySelector(`[data-cell="${index}"]`)?.classList.add('keelcrab-island')
  for (const i of e.weakCells) {
    const cell = board?.querySelector(`[data-cell="${i}"]`)
    cell?.classList.add('keelcrab-weak')
    cell?.insertAdjacentHTML(
      'beforeend',
      '<span class="keelcrab-marker" aria-hidden="true">✦</span>',
    )
    cell?.setAttribute(
      'aria-label',
      `${cell.getAttribute('aria-label')}, ${message(language, 'keelcrab.weak')}`,
    )
  }
  const key = root.querySelector('.river-survey-key')
  if (key) key.innerHTML = `<small>${message(language, 'keelcrab.known')}</small>`
}

/** Sequence a claw sweep, the actual voyage hit and the returning harpoon after boat movement. */
export async function animateKeelcrab(
  root: HTMLElement,
  before: Expedition,
  after: Expedition,
): Promise<void> {
  const e = after.encounter
  if (
    e?.kind !== 'keelcrab' ||
    before.encounter?.kind !== 'keelcrab' ||
    e.turn === before.encounter.turn ||
    !e.resolution
  )
    return
  const board = root.querySelector<HTMLElement>('[data-side="a"]')
  if (!board) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const layer = document.createElement('div')
  layer.className = 'keelcrab-fx'
  const { targets, hit, counter } = e.resolution
  const impacts = targets
    .map(
      (i) =>
        `<rect x="${(i % 17) + 0.05}" y="${Math.floor(i / 17) + 0.05}" width=".9" height=".9" rx=".3"/>`,
    )
    .join('')
  const shot =
    counter === null
      ? ''
      : `<path class="keelcrab-harpoon" d="M${(counter % 17) + 0.5} ${Math.floor(counter / 17) + 0.5} L8.5 8.5"/>`
  layer.innerHTML = `<svg viewBox="0 0 17 17" preserveAspectRatio="none" aria-hidden="true"><g>${impacts}</g>${shot}${hit === null ? '' : `<circle cx="${(hit % 17) + 0.5}" cy="${Math.floor(hit / 17) + 0.5}" r=".55"/>`}</svg>`
  board.append(layer)
  const boss = board.querySelector<HTMLElement>('.boss-cell > img')
  const animations = [
    layer.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
      duration: reduced ? 160 : 650,
    }),
  ]
  if (boss)
    animations.push(
      boss.animate(
        reduced
          ? [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }]
          : [
              { transform: 'rotate(0deg)' },
              { transform: 'rotate(-12deg) scale(1.06)' },
              { transform: 'rotate(10deg)' },
              { transform: 'none' },
            ],
        { duration: reduced ? 160 : 650 },
      ),
    )
  if (hit !== null) {
    const player = board.querySelector('.river-passenger')
    if (player)
      animations.push(
        player.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], {
          duration: reduced ? 160 : 500,
        }),
      )
  }
  for (const animation of animations) animation.id = 'keelcrab-fx'
  await Promise.all(animations.map((animation) => animation.finished.catch(() => {})))
  layer.remove()
}
