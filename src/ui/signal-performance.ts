import { sharedStyles } from './shared-styles.js'
import { createDialogueBar } from './dialogue-bar.js'
import type { RegionalPerformanceId } from '../types/recollection.js'
import { recollectionLantern } from './recollection-copy.js'
import { tomaImage } from './rail-view.js'
import { bridgeReveal } from './chapter-performance.js'
import { DialogueReveal, updateDialogueNext } from './dialogue-reveal.js'
import { signalCopy, signalLines } from './signal-copy.js'
import { message } from '../i18n.js'
import { spriteImage } from './dungeon-sprites.js'
import { professionSprite } from './profession-presentation.js'
import { playerDialogueCue } from '../audio/dialogue-voices.js'
import type { Language } from '../types/localization.js'
import type { SignalLine, SignalSceneId } from '../types/signal-story.js'
import type { CampaignSceneId } from '../types/campaign.js'
import type { Profession } from '../types/variants.js'
import type { SoundEffects } from '../types/audio.js'

/** Reuse the chibi asset for a board resident and a speaking portrait. */
export function niaImage(): string {
  return `<img class="signal-nia" src="${import.meta.env.BASE_URL}assets/story/nia.png" alt="" width="128" height="128" draggable="false">`
}

/** Own one voiced encounter performance and release every timer on navigation. */
export class SignalPerformance {
  private readonly reveal: DialogueReveal
  private readonly sounds: SoundEffects
  private dialog: HTMLDialogElement | null = null
  private animation: Animation | null = null

  /** Share the same sound activation and mute preference as the game. */
  constructor(sounds: SoundEffects) {
    this.sounds = sounds
    this.reveal = new DialogueReveal(sounds)
  }

  /** Present a reached event; skipping a typing animation never skips the next line. */
  show(
    root: HTMLElement,
    language: Language,
    scene: SignalSceneId,
    record: boolean,
    profession: Profession,
    completed: () => void,
  ): void {
    this.present(root, language, scene, signalLines(language, scene, record), profession, completed)
  }

  /** Stage scripts supply their own reached event; voice, pacing and motion stay shared. */
  present(
    root: HTMLElement,
    language: Language,
    scene: CampaignSceneId | RegionalPerformanceId,
    lines: readonly SignalLine[],
    profession: Profession,
    completed: () => void,
  ): void {
    if (this.dialog?.isConnected) return

    this.dispose()

    const t = signalCopy(language)
    const dialog = createDialogueBar(language, spriteImage(professionSprite(profession)))

    dialog.dataset['signalScene'] = scene
    root.append(dialog)
    if (scene === 'control-restored')
      dialog.querySelector('.dialogue-cast')!.insertAdjacentHTML('afterend', bridgeReveal(language))

    if (scene === 'recollection-light') {
      dialog
        .querySelector('.dialogue-cast')!
        .insertAdjacentHTML(
          'afterend',
          `<div class="recollection-ignition">${recollectionLantern()}</div>`,
        )
      this.sounds.play('power-switch')
    }

    if (scene === 'pass-open') dialog.classList.add('chapter-guardian-restored')

    if (
      scene === 'ridge-found' ||
      scene === 'ridge-camp' ||
      scene === 'waterway-found' ||
      scene === 'waterway-camp'
    ) {
      const replay = document.createElement('button')

      replay.type = 'button'
      replay.className = 'ridge-recording'
      replay.dataset['beaconReplay'] = ''
      replay.textContent = message(language, 'ridge.recording')
      replay.addEventListener('click', () => {
        this.sounds.unlock()
        this.sounds.play('beacon-signal')
      })
      dialog.querySelector('[data-signal-next]')!.before(replay)
    }

    this.dialog = dialog

    let beat = 0
    /** Present the current dialogue beat, preserving the listener and restarting only its speaker animation. */
    const paint = (): void => {
      const line = lines[beat]
      if (!line) return

      this.animation?.cancel()

      const portrait = dialog.querySelector<HTMLElement>('[data-signal-portrait]')!
      const listener = dialog.querySelector<HTMLElement>('[data-signal-listener]')!
      const portraitSpeaker =
        line.speaker === 'player'
          ? (lines.find((entry) => entry.speaker !== 'player')?.speaker ?? 'nia')
          : line.speaker
      // Keep the person being answered on screen while the player speaks.
      if (line.speaker !== 'player' || !portrait.firstElementChild)
        portrait.innerHTML =
          portraitSpeaker === 'toma'
            ? tomaImage()
            : portraitSpeaker === 'lumi'
              ? `<img src="${import.meta.env.BASE_URL}assets/story/guide.png" alt="" draggable="false">`
              : portraitSpeaker === 'guardian'
                ? spriteImage('bastion')
                : niaImage()
      // The first response has a silhouette; the face is revealed only after reconnecting the line.

      portrait.classList.toggle(
        'signal-radio',
        ((scene === 'entry' || scene === 'tower-response') && line.speaker === 'nia') ||
          ((scene === 'rail-entry' || scene === 'rail-brakes') && portraitSpeaker === 'toma'),
      )
      portrait.classList.toggle('is-speaking', line.speaker !== 'player')
      listener.classList.toggle('is-speaking', line.speaker === 'player')
      dialog.querySelector('#signal-speaker')!.textContent =
        line.speaker === 'toma' ? message(language, 'rail.toma') : t[line.speaker]

      const active = line.speaker === 'player' ? listener : portrait
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        this.animation = active.animate(
          [
            { transform: 'translateY(0) rotate(0)' },
            { transform: 'translateY(-7px) rotate(-3deg)' },
            { transform: 'translateY(0) rotate(0)' },
          ],
          { duration: 420, easing: 'ease-out' },
        )

      const cue =
        line.speaker === 'toma'
          ? 'dialogue-toma'
          : line.speaker === 'player'
            ? playerDialogueCue(profession)
            : line.speaker === 'guardian'
              ? 'dialogue-boss'
              : line.speaker === 'lumi'
                ? 'dialogue-lumi'
                : 'dialogue-nia'

      const next = dialog.querySelector<HTMLElement>('[data-signal-next]')!
      updateDialogueNext(next, language, true)
      this.reveal.start(
        dialog.querySelector<HTMLElement>('[data-signal-line]')!,
        line.text,
        cue,
        language,
        () => updateDialogueNext(next, language, false),
      )
    }

    dialog.addEventListener('cancel', (event) => event.preventDefault())
    dialog.querySelector('[data-signal-next]')!.addEventListener('click', () => {
      this.sounds.unlock()
      if (this.reveal.finish()) return

      this.sounds.play('confirm')
      if (++beat < lines.length) paint()
      else {
        this.dispose()
        if (scene === 'rail-home') this.showRescueReward(root, language, completed)
        else completed()
      }
    })
    dialog.showModal()
    if (scene === 'ridge-found' || scene === 'waterway-call' || scene === 'waterway-found')
      this.sounds.play('beacon-signal')

    paint()
  }

  /** Acknowledge the already-earned rescue reward after the final line, separately from dialogue. */
  private showRescueReward(root: HTMLElement, language: Language, completed: () => void): void {
    const dialog = document.createElement('dialog')
    dialog.className = 'rescue-reward'
    dialog.setAttribute('aria-labelledby', 'rescue-reward-title')
    dialog.innerHTML = `<span class="rail-reward-portrait">${spriteImage('rescuer')}</span><h2 id="rescue-reward-title">${message(language, 'rescuer.name')}</h2><p>${message(language, 'rail.reward')}</p><button class="primary-button ${sharedStyles['primary-button']}" type="button" data-rescue-reward-close>${message(language, 'signal.continue')}</button>`
    root.append(dialog)
    this.dialog = dialog
    /** Closing only acknowledges the presentation; the stage has already granted its rewards. */
    const close = (): void => {
      this.dispose()
      completed()
    }
    dialog.querySelector('[data-rescue-reward-close]')!.addEventListener('click', close)
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    dialog.showModal()
  }

  /** Closing the page cannot leave a detached dialog typing or retaining sound timers. */
  dispose(): void {
    this.reveal.cancel()
    this.animation?.cancel()
    this.animation = null
    this.dialog?.close()
    this.dialog?.remove()
    this.dialog = null
  }
}
