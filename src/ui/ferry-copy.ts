import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { CampaignSceneId } from '../types/campaign.js'
import type { SignalLine } from '../types/signal-story.js'
/** Each reach has a distinct purpose in the ferry investigation. */
export function ferryFloorName(language: Language, floor: number): string {
  return floor === 1
    ? message(language, 'ferry.floor-1')
    : floor === 2
      ? message(language, 'ferry.floor-2')
      : message(language, 'ferry.floor-3')
}
/** Dialogue describes observations made here, not another return-to-camp errand. */
export function ferryLines(language: Language, scene: CampaignSceneId): readonly SignalLine[] {
  const lines =
    scene === 'ferry-entry'
      ? [
          message(language, 'ferry.entry-1'),
          message(language, 'ferry.entry-2'),
          message(language, 'ferry.entry-3'),
        ]
      : scene === 'ferry-banks'
        ? [
            message(language, 'ferry.banks-1'),
            message(language, 'ferry.banks-2'),
            message(language, 'ferry.banks-3'),
          ]
        : scene === 'ferry-gate'
          ? [
              message(language, 'ferry.gate-1'),
              message(language, 'ferry.gate-2'),
              message(language, 'ferry.gate-3'),
            ]
          : [
              message(language, 'ferry.end-1'),
              message(language, 'ferry.end-2'),
              message(language, 'ferry.end-3'),
            ]
  return lines.map((text, index) => ({ speaker: index === 1 ? 'player' : 'nia', text }))
}
