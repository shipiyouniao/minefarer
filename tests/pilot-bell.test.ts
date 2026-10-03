import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedDeparture, createExpedition, equipmentCost } from '../src/game/expedition.js'
import { grantPilotBell, storyRewardCamp } from '../src/game/story-rewards.js'
import { CURRENT_DEPARTURE, MemoryStorage } from './helpers.js'
import { VariantRepository } from '../src/persistence/variant-repository.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'
import type { Camp } from '../src/types/variants.js'

test('the bell is a durable earned equipment license with bounded departure benefits', () => {
  const camp: Camp = { supplies: 0, completed: 0, upgrades: ['workshop'] }
  assert.equal(allowedDeparture(camp, 'explorer', ['pilot-bell']), false)
  const rewarded = grantPilotBell(camp)
  assert.equal(grantPilotBell(rewarded), rewarded)
  assert.equal(allowedDeparture(rewarded, 'explorer', ['pilot-bell', 'probe']), true)
  assert.equal(allowedDeparture(rewarded, 'explorer', ['pilot-bell', 'guard']), false)
  assert.equal(equipmentCost('pilot-bell'), 2)
  const base = createExpedition({ ...CURRENT_DEPARTURE, equipment: [] })
  const equipped = createExpedition({ ...CURRENT_DEPARTURE, equipment: ['pilot-bell'] })
  assert.equal(equipped.scans, base.scans + 1)
  assert.equal(equipped.shields, base.shields + 1)
  const recovered = storyRewardCamp(camp, {
    schemaVersion: 1,
    stages: [{ ...campaignProgress(undefined, 'wreck-harbor'), cleared: true }],
  })
  assert.deepEqual(recovered.storyEquipment, ['pilot-bell'])
  const storage = new MemoryStorage(),
    repo = new VariantRepository(storage)
  repo.saveExpedition({ version: 4, camp: rewarded, journal: null, records: [] })
  assert.deepEqual(new VariantRepository(storage).expedition()!.camp.storyEquipment, ['pilot-bell'])
})
