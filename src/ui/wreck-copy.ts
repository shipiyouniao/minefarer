import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { CampaignSceneId } from '../types/campaign.js'
import type { SignalLine } from '../types/signal-story.js'

/** The optional rescue has an invitation, four playable steps, a reveal and a concrete return. */
export function wreckLines(language: Language, scene: CampaignSceneId): readonly SignalLine[] {
  const lines =
    scene === 'wreck-rumor'
      ? [
          message(language, 'keelcrab.lead-1'),
          message(language, 'keelcrab.lead-2'),
          message(language, 'keelcrab.lead-3'),
        ]
      : scene === 'wreck-entry'
        ? [message(language, 'convoy.entry-1'), message(language, 'convoy.entry-2')]
        : scene === 'wreck-narrows'
          ? [message(language, 'convoy.second-1'), message(language, 'convoy.second-2')]
          : scene === 'wreck-junction'
            ? [message(language, 'convoy.third-1'), message(language, 'convoy.third-2')]
            : scene === 'wreck-crossing'
              ? [message(language, 'convoy.fourth-1'), message(language, 'convoy.fourth-2')]
              : scene === 'wreck-sheltered'
                ? [message(language, 'convoy.rescued-1'), message(language, 'convoy.rescued-2')]
                : scene === 'wreck-crab'
                  ? [
                      message(language, 'keelcrab.scene'),
                      message(language, 'keelcrab.entry'),
                      message(language, 'keelcrab.known'),
                      message(language, 'keelcrab.charge-guide'),
                    ]
                  : [
                      message(language, 'keelcrab.end-1'),
                      message(language, 'keelcrab.end-2'),
                      message(language, 'convoy.ending'),
                    ]
  return lines.map((text, i) => ({ speaker: i === 1 ? 'player' : 'nia', text }))
}
