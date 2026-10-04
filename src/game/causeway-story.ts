import type { CampaignSceneId, CampaignStageProgress } from '../types/campaign.js'
import type { Expedition } from '../types/variants.js'

export const CAUSEWAY_SCENES: readonly CampaignSceneId[] = [
  'causeway-entry',
  'causeway-lengths',
  'causeway-crossing',
  'causeway-end',
]

/** Introductory exchanges follow reached floors; an interrupted ending resumes only after victory. */
export function pendingCausewayScene(
  run: Expedition | null,
  progress: CampaignStageProgress,
): CampaignSceneId | null {
  if (progress.id !== 'broken-causeway' || run?.phase === 'lost' || run?.phase === 'retreated')
    return null
  const scene =
    progress.cleared || run?.phase === 'won'
      ? 'causeway-end'
      : run
        ? CAUSEWAY_SCENES[run.floor - 1]
        : null
  return scene && !progress.scenes.includes(scene) ? scene : null
}
