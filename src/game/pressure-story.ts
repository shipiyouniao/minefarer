import type { Expedition } from '../types/variants.js'
import type { CampaignStageProgress, CampaignSceneId } from '../types/campaign.js'
export const PRESSURE_SCENES: readonly CampaignSceneId[] = [
  'pressure-entry',
  'pressure-basin',
  'pressure-boat',
  'pressure-end',
]
/** Recovered endings are independent of the retired exploration journal. */
export function pendingPressureScene(
  run: Expedition | null,
  progress: CampaignStageProgress,
): CampaignSceneId | null {
  if (progress.id !== 'pressure-cove') return null
  if (!run)
    return progress.cleared && !progress.scenes.includes('pressure-end') ? 'pressure-end' : null
  if (run.phase === 'lost' || run.phase === 'retreated') return null
  return (
    PRESSURE_SCENES.slice(0, run.phase === 'won' ? 4 : run.floor).find(
      (id) => !progress.scenes.includes(id),
    ) ?? null
  )
}
