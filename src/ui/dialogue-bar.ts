import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'

/** One bottom-edge dialogue surface for opening, campaign and regional story events. */
export function dialogueBar(
  language: Language,
  kind: 'story' | 'signal',
  player: string,
  partner: string,
): string {
  const story = kind === 'story'
  const speaker = story ? 'story-speaker-name' : 'signal-speaker'
  return `<dialog class="dialogue-bar ${kind}-dialogue" aria-labelledby="${speaker}"><div class="dialogue-cast"><span ${story ? 'data-story-speaker="player"' : 'data-signal-listener'}>${player}</span><span ${story ? 'data-story-speaker="lumi"' : 'data-signal-portrait'}>${partner}</span></div><div class="dialogue-copy"><strong class="dialogue-term-person" data-dialogue-kind="person" id="${speaker}" ${story ? 'data-story-speaker-name' : ''}></strong><p role="status" ${story ? 'data-story-dialogue-line' : 'data-signal-line'}></p><button type="button" class="dialogue-next" ${story ? 'data-story-action="dialogue"' : 'data-signal-next'}>${message(language, 'story.dialogue-next')} →</button></div></dialog>`
}

/** Scripted performances mount the same template that checkpoint-driven opening scenes render. */
export function createDialogueBar(language: Language, player: string): HTMLDialogElement {
  const template = document.createElement('template')
  template.innerHTML = dialogueBar(language, 'signal', player, '')
  const dialog = template.content.firstElementChild
  if (!(dialog instanceof HTMLDialogElement)) throw new Error('Missing dialogue surface')
  return dialog
}
