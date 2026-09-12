import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { DialoguePart, DialogueTerm } from '../types/dialogue-terms.js'

/** Localized vocabulary is reusable content, independent of a particular scene or presenter. */
export function dialogueTerms(language: Language): readonly DialogueTerm[] {
  return [
    ...[
      message(language, 'signal.nia'),
      message(language, 'signal.lumi'),
      message(language, 'rail.toma'),
      message(language, 'signal.guardian'),
    ].map((text) => ({ text, kind: 'person' as const })),
    ...[
      message(language, 'story.camp'),
      message(language, 'recollection.camp'),
      message(language, 'story.north-road'),
      message(language, 'story.quarry-yard'),
      message(language, 'story.tower-landing'),
      message(language, 'story.lift'),
      message(language, 'story.quarry-passage'),
      message(language, 'story.quarry-machine'),
      message(language, 'story.atlas-reedbank'),
      message(language, 'dialogue.places'),
    ]
      .flatMap((text) => text.split('|'))
      .map((text) => ({ text, kind: 'place' as const })),
    ...message(language, 'dialogue.items')
      .split('|')
      .map((text) => ({ text, kind: 'item' as const })),
    ...message(language, 'dialogue.warnings')
      .split('|')
      .map((text) => ({ text, kind: 'warning' as const })),
  ].sort((a, b) => b.text.length - a.text.length)
}

/** Longest literal matches win; Latin names must not match inside unrelated words. */
export function dialogueParts(
  text: string,
  terms: readonly DialogueTerm[],
): readonly DialoguePart[] {
  const parts: DialoguePart[] = []
  let plain = ''
  for (let index = 0; index < text.length;) {
    const term = terms.find(
      (entry) =>
        entry.text.length > 0 &&
        text.slice(index, index + entry.text.length).toLocaleLowerCase() ===
          entry.text.toLocaleLowerCase() &&
        (!/^[A-Za-z]/.test(entry.text) || !/[A-Za-z]/.test(text[index - 1] ?? '')) &&
        (!/[A-Za-z]$/.test(entry.text) || !/[A-Za-z]/.test(text[index + entry.text.length] ?? '')),
    )
    if (term) {
      if (plain) parts.push({ text: plain, kind: null })
      plain = ''
      parts.push({ text: text.slice(index, index + term.text.length), kind: term.kind })
      index += term.text.length
    } else plain += text[index++]!
  }
  if (plain) parts.push({ text: plain, kind: null })
  return parts
}

/** Paint a visible prefix with DOM text nodes, never interpreting dialogue as HTML. */
export function paintDialogue(
  target: HTMLElement,
  parts: readonly DialoguePart[],
  length = Infinity,
): void {
  const fragment = document.createDocumentFragment()
  for (const part of parts) {
    if (length <= 0) break
    const text = part.text.slice(0, length)
    length -= text.length
    if (part.kind) {
      const span = document.createElement('span')
      span.className = `dialogue-term dialogue-term-${part.kind}`
      span.dataset['dialogueKind'] = part.kind
      span.textContent = text
      fragment.append(span)
    } else fragment.append(document.createTextNode(text))
  }
  target.replaceChildren(fragment)
}
