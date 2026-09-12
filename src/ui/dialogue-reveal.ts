import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { SoundCue, SoundEffects } from '../types/audio.js'

/** Reveal graphemes without moving the paragraph or repeatedly announcing partial words. */
export class DialogueReveal {
  private timer: ReturnType<typeof setTimeout> | null = null
  private output: HTMLElement | null = null
  private paragraph: HTMLElement | null = null
  private text = ''
  private completed: (() => void) | null = null
  private readonly sounds: SoundEffects

  /** Share activation and mute settings with the owning scene. */
  constructor(sounds: SoundEffects) {
    this.sounds = sounds
  }

  /** Reserve the complete line's geometry while the visual copy types above it. */
  start(
    paragraph: HTMLElement,
    text: string,
    cue: SoundCue,
    language: string,
    completed?: () => void,
  ): void {
    this.cancel()
    paragraph.setAttribute('aria-label', text)
    paragraph.setAttribute('aria-atomic', 'true')
    if (!text || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paragraph.textContent = text
      completed?.()

      return
    }

    this.paragraph = paragraph
    paragraph.dataset['dialogueTyping'] = 'true'
    paragraph.addEventListener('click', this.finishLine)
    this.text = text
    this.completed = completed ?? null

    const wrapper = document.createElement('span')

    wrapper.className = 'tw:relative tw:block'
    wrapper.setAttribute('aria-hidden', 'true')

    const reserve = document.createElement('span')

    reserve.className = 'tw:invisible'
    reserve.textContent = text

    const output = document.createElement('span')

    output.className = 'tw:absolute tw:inset-0'
    output.dataset['dialogueText'] = ''
    wrapper.append(reserve, output)
    paragraph.replaceChildren(wrapper)
    this.output = output

    const letters = [
      ...new Intl.Segmenter(language, { granularity: 'grapheme' }).segment(text),
    ].map((part) => part.segment)
    let index = 0
    /** Reveal the next character and schedule its voice cue only while this paragraph is current. */
    const tick = (): void => {
      if (document.hidden) {
        this.finish()
        return
      }

      const letter = letters[index++]
      if (letter === undefined) {
        this.timer = null
        this.output = null

        return
      }

      output.textContent += letter
      if (/[\p{L}\p{N}]/u.test(letter)) this.sounds.play(cue)

      if (index === letters.length) {
        this.finish()
        return
      }

      this.timer = setTimeout(tick, /[，。！？、,.!?;:]/u.test(letter) ? 95 : 28)
    }

    this.timer = setTimeout(tick, 28)
  }

  /** A pointer tap reveals only this line; advancing the story remains an explicit button action. */
  private readonly finishLine = (): void => {
    this.sounds.unlock()
    this.finish()
  }

  /** First advance completes the current line silently; the next advance changes beats. */
  finish(): boolean {
    if (!this.output) return false

    this.output.textContent = this.text

    const completed = this.completed

    this.cancel()
    completed?.()

    return true
  }

  /** Replacing, rewinding or closing a scene invalidates its next character and sound. */
  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer)

    if (this.paragraph) {
      this.paragraph.removeEventListener('click', this.finishLine)
      delete this.paragraph.dataset['dialogueTyping']
    }
    this.paragraph = null
    this.timer = null
    this.output = null
    this.completed = null
  }
}

/** Both story presenters expose the same distinction between finishing text and advancing a beat. */
export function updateDialogueNext(button: HTMLElement, language: Language, typing: boolean): void {
  button.textContent = `${typing ? message(language, 'story.dialogue-read') : message(language, 'story.dialogue-next')} →`
}
