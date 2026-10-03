import type { Camp } from '../types/variants.js'
import type { CampaignSave } from '../types/campaign.js'

/** Licenses are idempotent story rewards; currency is settled separately on first clear. */
export function grantRescuer(camp: Camp): Camp {
  return camp.storyProfessions?.includes('rescuer')
    ? camp
    : { ...camp, storyProfessions: ['rescuer'] }
}

/** Returning the convoy earns a permanent workshop license, once per save. */
export function grantPilotBell(camp: Camp): Camp {
  return camp.storyEquipment?.includes('pilot-bell')
    ? camp
    : { ...camp, storyEquipment: ['pilot-bell'] }
}

/** Completed side stories retain their reward even when the player already dismissed the ending. */
export function storyRewardCamp(camp: Camp, campaign: CampaignSave | undefined): Camp {
  const rewarded = campaign?.stages.some((stage) => stage.id === 'quarry-rescue' && stage.cleared)
    ? grantRescuer(camp)
    : camp
  return campaign?.stages.some((stage) => stage.id === 'wreck-harbor' && stage.cleared)
    ? grantPilotBell(rewarded)
    : rewarded
}
