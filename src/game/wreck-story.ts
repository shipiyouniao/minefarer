import type { CampaignSceneId, CampaignStageProgress } from '../types/campaign.js'
import type { Expedition } from '../types/variants.js'

export const WRECK_SCENES: readonly CampaignSceneId[] = [
  'wreck-entry',
  'wreck-narrows',
  'wreck-junction',
  'wreck-crossing',
  'wreck-sheltered',
  'wreck-crab',
  'wreck-end',
]

/** Story beats follow accepted rescue and battle outcomes, never preview buttons or elapsed time. */
export function pendingWreckScene(
  run: Expedition | null,
  progress: CampaignStageProgress,
): CampaignSceneId | null {
  if (progress.id !== 'wreck-harbor' || run?.phase === 'retreated' || run?.phase === 'lost')
    return null
  const scene = !run
    ? progress.cleared
      ? 'wreck-end'
      : null
    : run.phase === 'won'
      ? 'wreck-end'
      : run.floor === 5
        ? 'wreck-crab'
        : run.floor === 4 && run.phase === 'reward'
          ? 'wreck-sheltered'
          : run.floor === 4
            ? 'wreck-crossing'
            : run.floor === 3
              ? 'wreck-junction'
              : run.floor === 2
                ? 'wreck-narrows'
                : 'wreck-entry'
  return scene && !progress.scenes.includes(scene) ? scene : null
}
