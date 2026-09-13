import { message } from '../i18n.js'
import type { Language } from '../types/localization.js'
import type { CampaignSceneId } from '../types/campaign.js'
import type { SignalLine } from '../types/signal-story.js'
/** Each comparison reach has its own short geographical title. */
export function pressureFloorName(language: Language, floor: number): string {
  return floor === 1
    ? message(language, 'pressure.floor-1')
    : floor === 2
      ? message(language, 'pressure.floor-2')
      : message(language, 'pressure.floor-3')
}
/** New findings provide an upstream lead instead of another camp errand. */
export function pressureLines(language: Language, scene: CampaignSceneId): readonly SignalLine[] {
  const lines =
    scene === 'pressure-entry'
      ? [message(language, 'pressure.entry-1'), message(language, 'pressure.entry-2')]
      : scene === 'pressure-basin'
        ? [message(language, 'pressure.basin-1'), message(language, 'pressure.basin-2')]
        : scene === 'pressure-boat'
          ? [message(language, 'pressure.boat-1'), message(language, 'pressure.boat-2')]
          : [message(language, 'pressure.end-1'), message(language, 'pressure.end-2')]
  return lines.map((text, index) => ({ speaker: index === 0 ? 'nia' : 'player', text }))
}
