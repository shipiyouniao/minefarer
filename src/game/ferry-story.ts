import type { Expedition } from '../types/variants.js'
import type { CampaignStageProgress, CampaignSceneId } from '../types/campaign.js'
export const FERRY_SCENES: readonly CampaignSceneId[] = [
  'ferry-entry',
  'ferry-banks',
  'ferry-gate',
  'ferry-end',
]
/** The ending survives settlement; failed or abandoned runs never present success. */
export function pendingFerryScene(
  run: Expedition | null,
  progress: CampaignStageProgress,
): CampaignSceneId | null {
  if (progress.id !== 'reed-channels') return null
  if (!run) return progress.cleared && !progress.scenes.includes('ferry-end') ? 'ferry-end' : null
  if (run.phase === 'lost' || run.phase === 'retreated') return null
  const scenes = FERRY_SCENES.slice(0, run.phase === 'won' ? 4 : run.floor)
  return scenes.find((scene) => !progress.scenes.includes(scene)) ?? null
}
