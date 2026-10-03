import { readyChapterTwo } from './recollection-helpers.js'
import { campaignProgress, updateCampaign } from '../src/game/campaign-catalog.js'
import { createStoryRun } from '../src/game/story.js'
import { checkpointStory } from '../src/game/story-checkpoint.js'
import { recordStoryFacts } from '../src/game/story-quests.js'
import type { VariantRepository } from '../src/persistence/variant-repository.js'
import type { CampSession } from '../src/application/camp-session.js'

/** Supply only completed ancestors; the optional invitation, route and five floors stay unplayed. */
export function readyWreck(repository: VariantRepository): CampSession {
  const camp = readyChapterTwo(repository),
    saved = repository.expedition()!
  let campaign = saved.campaign
  for (const id of ['reed-channels', 'pressure-cove'] as const)
    campaign = updateCampaign(campaign, {
      ...campaignProgress(campaign, id),
      cleared: true,
      scenes: id === 'reed-channels' ? ['ferry-end'] : ['pressure-end'],
    })
  repository.saveExpedition({ ...saved, campaign: campaign! })
  camp.saveStory(
    recordStoryFacts(
      {
        ...camp.story,
        campId: 'reed-camp',
        accepted: [...(camp.story.accepted ?? []), 'investigate-pressure'],
        world: checkpointStory({ ...createStoryRun(10), player: 85 }),
      },
      ['ferry-channel-cleared', 'pressure-cove-cleared', 'recollection-awakened'],
    ),
  )
  return camp
}
