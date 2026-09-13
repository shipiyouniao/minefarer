import { pressureReadings } from '../game/pressure.js'
import { message } from '../i18n.js'
import { pressureFloorName } from './pressure-copy.js'
import type { Expedition } from '../types/variants.js'
import type { Language } from '../types/localization.js'

/** Signed observations expose only the comparison, with separate physical landing progress. */
export function pressureObjective(language: Language, run: Expedition): string {
  if (!run.pressure) return ''
  const readings = pressureReadings(run.game, run.pressure.pairs)
  return `<section class="pressure-objective"><h3>${pressureFloorName(language, run.floor)}</h3><p>${message(language, 'pressure.objective')}</p><div class="pressure-instruments">${readings.map((r, i) => `<button type="button" data-pressure-pair="${i}" aria-pressed="false">${r.id[0]} <strong>${r.difference > 0 ? '+' : ''}${r.difference}</strong> ${r.id[1]}</button>`).join('')}<span>${message(language, 'pressure.progress', { count: run.pressure.moorings.filter((i) => run.travelled.includes(i)).length, total: run.pressure.moorings.length })}</span></div><details class="pressure-rule"><summary>${message(language, 'pressure.help')}</summary><p>${message(language, 'pressure.rule')}</p><p>${message(language, 'pressure.tide')}</p></details></section>`
}

/** Hover, focus and touch share a selected footprint; no new modal or hidden counts are emitted. */
export function renderPressure(root: HTMLElement, run: Expedition, language: Language): void {
  const pressure = run.pressure
  if (!pressure) return
  const readings = pressureReadings(run.game, pressure.pairs)
  const lesson =
    run.floor === 1 &&
    run.current?.cycle === 0 &&
    run.game.cells[pressure.lessonTarget]?.visibility !== 'revealed'
  /** Repaint finite visible regions without changing game state or player hypotheses. */
  const show = (selected: number): void => {
    root
      .querySelectorAll('[data-pressure-area]')
      .forEach((e) => e.removeAttribute('data-pressure-area'))
    root
      .querySelectorAll('[data-pressure-pair]')
      .forEach((e) =>
        e.setAttribute(
          'aria-pressed',
          String(Number((e as HTMLElement).dataset['pressurePair']) === selected),
        ),
      )
    const reading = readings[selected]
    if (!reading) return
    for (const side of ['a', 'b'] as const)
      for (const index of reading[side])
        root
          .querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
          ?.setAttribute('data-pressure-area', side)
  }
  for (const button of root.querySelectorAll<HTMLElement>('[data-pressure-pair]')) {
    const selected = Number(button.dataset['pressurePair'])
    button.addEventListener('mouseenter', () => show(selected))
    button.addEventListener('focus', () => show(selected))
    button.addEventListener('mouseleave', () =>
      show(Number(root.dataset['pressureSelected'] ?? (lesson ? '0' : '-1'))),
    )
    button.addEventListener('click', () => {
      root.dataset['pressureSelected'] =
        root.dataset['pressureSelected'] === String(selected) ? '-1' : String(selected)
      show(Number(root.dataset['pressureSelected']))
    })
  }
  show(Number(root.dataset['pressureSelected'] ?? (lesson ? '0' : '-1')))
  const previous = root.dataset['pressureValues']?.split(',')
  readings.forEach((reading, index) => {
    if (previous && previous[index] !== String(reading.difference))
      root
        .querySelector(`[data-pressure-pair="${index}"] strong`)
        ?.classList.add('pressure-reading-changed')
  })
  root.dataset['pressureValues'] = readings.map((r) => r.difference).join(',')
  pressure.instruments.forEach((index, selected) => {
    if (run.power?.junctions.some((j) => j.index === index)) return
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) return
    const visible = run.game.cells[index]?.visibility === 'revealed'
    cell.innerHTML = `<img class="dungeon-sprite" src="${import.meta.env.BASE_URL}assets/story/observatory.png" alt="">${visible && run.game.cells[index]!.adjacent ? `<span class="landmark-clue">${run.game.cells[index]!.adjacent}</span>` : ''}<span class="pressure-device-name">${pressure.pairs[selected]!.id}</span>`
  })
  for (const index of pressure.moorings) {
    const cell = root.querySelector<HTMLElement>(`[data-side="a"] [data-cell="${index}"]`)
    if (!cell) continue
    if (run.game.cells[index]?.visibility === 'revealed' && run.game.cells[index]!.adjacent)
      cell.innerHTML = `<span class="landmark-clue">${run.game.cells[index]!.adjacent}</span>`
    const marker = document.createElement('span')
    marker.className = 'pressure-mooring'
    marker.textContent = run.travelled.includes(index) ? '⚓ ✓' : '⚓'
    marker.setAttribute('aria-hidden', 'true')
    cell.append(marker)
  }
  if (lesson) {
    const target = root.querySelector<HTMLElement>(
      `[data-side="a"] [data-cell="${pressure.lessonTarget}"]`,
    )
    target?.classList.add('pressure-lesson-target')
    if (target) {
      const coach = document.createElement('span')
      coach.className = 'pressure-coach'
      coach.setAttribute('role', 'note')
      coach.textContent = message(language, 'pressure.hint')
      target.append(coach)
    }
  }
}
