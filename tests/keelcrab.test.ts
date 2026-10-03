import assert from 'node:assert/strict'
import test from 'node:test'
import { createExpedition, actExpedition } from '../src/game/expedition.js'
import { enterKeelcrab, keelcrabPaths, keelcrabPlan } from '../src/game/keelcrab-battle.js'
import { riverRoutes, riverSoundingCells } from '../src/game/pressure.js'
import { CURRENT_DEPARTURE } from './helpers.js'
import { solveKeelcrab, surveyKeelcrab } from './keelcrab-helpers.js'
import { advanceMilestones, milestoneProgress } from '../src/game/milestones.js'
import { recollectionUnlocks } from '../src/game/recollection.js'
import type { Camp } from '../src/types/variants.js'
import { enterEncounter } from '../src/game/encounter-roster.js'

const DEPARTURE = { ...CURRENT_DEPARTURE, campaign: 'wreck-harbor-v3' as const, seed: 0 }

test('distant gray water supports reversible notes without extending surveys or advancing combat', () => {
  const run = enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })
  const area = riverSoundingCells(run)
  const index = run.pressure!.water.find(
    (i) => !area.has(i) && run.game.cells[i]!.visibility === 'hidden',
  )!
  assert.ok(Number.isInteger(index))
  assert.ok(keelcrabPlan(run, { type: 'flag', index }).allowed)
  let noted = actExpedition(run, { type: 'flag', index })
  assert.equal(noted.game.cells[index]!.visibility, 'flagged')
  noted = actExpedition(noted, { type: 'mark-safe', index })
  assert.equal(noted.game.cells[index]!.visibility, 'hidden')
  assert.ok(noted.game.safeMarks.includes(index))
  noted = actExpedition(noted, { type: 'mark-safe', index })
  assert.ok(!noted.game.safeMarks.includes(index))
  assert.deepEqual(noted.encounter, run.encounter)
  assert.deepEqual(noted.pressure, run.pressure)
  assert.equal(noted.player, run.player)
  assert.equal(noted.health, run.health)
  assert.equal(noted.scans, run.scans)
  assert.equal(noted.probes, run.probes)
  for (const type of ['reveal', 'probe', 'sonar'] as const) {
    assert.equal(keelcrabPlan(noted, { type, index }).allowed, false)
    assert.equal(actExpedition(noted, { type, index }), noted)
  }
  for (const invalid of [-1, NaN, run.game.cells.length, run.walls[0]!])
    assert.equal(actExpedition(run, { type: 'flag', index: invalid }), run)
})

test('covered combat routes require real deductions; soundings freeze the turn and voyages remove marked mines', () => {
  const initial = enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })
  assert.ok(
    initial.pressure!.water.filter((i) => initial.game.cells[i]!.visibility === 'hidden').length >
      80,
  )
  for (const route of riverRoutes(initial)) {
    assert.ok(route.unknown.length > 0)
    assert.equal(actExpedition(initial, { type: 'sail', index: route.launch }), initial)
  }
  const surveyed = surveyKeelcrab(initial)
  assert.ok(surveyed.actions.some((a) => a.type === 'flag'))
  assert.ok(surveyed.actions.some((a) => a.type === 'reveal'))
  assert.equal(surveyed.run.encounter!.turn, initial.encounter!.turn)
  assert.equal(surveyed.run.health, initial.health)
  assert.equal(surveyed.run.player, initial.player)
  const route = riverRoutes(surveyed.run).find(
    (r) => !r.path.some((i) => initial.encounter!.intent.targets.includes(i)),
  )!
  const flagged = route.path.filter((i) => surveyed.run.game.cells[i]!.visibility === 'flagged')
  assert.equal(flagged.length, 1)
  assert.ok(surveyed.run.game.cells[flagged[0]!]!.mine)
  const sailed = actExpedition(surveyed.run, { type: 'sail', index: route.launch })
  assert.equal(sailed.game.cells[flagged[0]!]!.mine, false)
  assert.equal(sailed.game.config.mines, initial.game.config.mines - 1)
  assert.equal(sailed.encounter!.turn, initial.encounter!.turn + 1)
  let spam = initial
  for (const i of riverRoutes(initial)[0]!.unknown)
    spam = actExpedition(spam, { type: 'flag', index: i })
  assert.equal(actExpedition(spam, { type: 'sail', index: riverRoutes(initial)[0]!.launch }), spam)
})

test('selected Recollection pool enters the naval encounter and one-use relics remain bounded', () => {
  let run = enterEncounter({
    ...createExpedition({
      ...CURRENT_DEPARTURE,
      seed: 0,
      recollection: { floors: ['ordinary'], bosses: ['keelcrab'] },
    }),
    floor: 3,
    relics: ['duelist-edge', 'shelter-cloak'],
  })
  assert.equal(run.encounter?.kind, 'keelcrab')
  let shots = 0
  for (const action of solveKeelcrab(run)!) {
    const before = run
    run = actExpedition(run, action)
    if (run.encounter!.health < before.encounter!.health) {
      assert.equal(
        run.encounter!.lastDamage,
        shots === 0 ? 9 : Math.min(5, before.encounter!.health),
      )
      shots++
    }
  }
  assert.ok(shots > 1)
  assert.equal(run.floorTriggers.filter((r) => r === 'duelist-edge').length, 1)
  assert.equal(run.floorTriggers.filter((r) => r === 'shelter-cloak').length, 1)
})

test('naval boss paths are continuous, distinct, partly covered and non-intersecting outside berths', () => {
  const run = surveyKeelcrab(enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })).run
  assert.equal(run.phase, 'boss')
  assert.equal(run.encounter?.kind, 'keelcrab')
  const paths = keelcrabPaths()
  assert.equal(paths.length, 8)
  for (const path of paths) {
    assert.ok(path.length >= 11)
    for (let i = 1; i < path.length; i++)
      assert.ok([1, 17].includes(Math.abs(path[i]! - path[i - 1]!)))
    assert.ok(path.every((i) => !run.walls.includes(i)))
    assert.equal(path.filter((i) => run.game.cells[i]!.mine).length, 1)
  }
  for (const dock of run.pressure!.docks) {
    const at = { ...run, player: dock, pressure: { ...run.pressure!, boat: dock } }
    assert.equal(riverRoutes(at).length, 2)
    assert.ok(
      riverRoutes(surveyKeelcrab(at).run).every((r) => !r.unknown.length && !r.blocked.length),
    )
  }
})

test('the entire voyage takes damage even when its destination is outside the forecast', () => {
  const run = surveyKeelcrab(enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })).run
  const route = riverRoutes(run).find((r) =>
    r.path.some((i) => run.encounter!.intent.targets.includes(i)),
  )!
  assert.ok(route)
  assert.ok(!run.encounter!.intent.targets.includes(route.destination))
  const before = JSON.stringify(run)
  assert.ok(keelcrabPlan(run, { type: 'sail', index: route.launch }).allowed)
  assert.equal(JSON.stringify(run), before)
  const sailed = actExpedition(run, { type: 'sail', index: route.launch })
  assert.equal(sailed.player, route.destination)
  assert.equal(sailed.health, run.health - 3)
  assert.ok(route.path.every((i) => sailed.travelled.includes(i)))
  for (const action of [
    { type: 'attack' },
    { type: 'end-turn' },
    { type: 'move', index: route.destination },
    { type: 'skill' },
  ] as const)
    assert.equal(actExpedition(run, action), run)
})

test('long voyages load once and a real loaded flank crossing spends the shot', () => {
  let run = surveyKeelcrab(enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })).run
  const long = riverRoutes(run).find((r) => r.path.length >= 13)!
  run = actExpedition(run, { type: 'sail', index: long.launch })
  assert.ok(run.encounter?.kind === 'keelcrab' && run.encounter.charged)
  const plan = solveKeelcrab(run)
  assert.ok(plan)
  for (const action of plan) {
    const before = run
    run = actExpedition(run, action)
    if (run.encounter!.health < before.encounter!.health) {
      assert.ok(before.encounter?.kind === 'keelcrab' && before.encounter.charged)
      assert.ok(run.encounter?.kind === 'keelcrab' && !run.encounter.charged)
      assert.notEqual(run.encounter.weakSide, before.encounter.weakSide)
      return
    }
  }
  assert.fail('Expected a genuine flank countershot')
})

test('every starting berth and difficulty has a public, damage-free victory through both phases', () => {
  for (const difficulty of ['relaxed', 'standard', 'advanced', 'expert', 'abyss'] as const) {
    for (let seed = 0; seed < 4; seed++) {
      const initial = enterKeelcrab(createExpedition({ ...CURRENT_DEPARTURE, seed, difficulty }))
      const actions = solveKeelcrab(initial)
      assert.ok(actions, `${difficulty}/${seed} needs a safe plan`)
      let run = initial
      for (const action of actions) run = actExpedition(run, action)
      assert.equal(run.encounter!.health, 0)
      assert.ok(['reward', 'won'].includes(run.phase))
      assert.ok(
        actions.filter((a) => a.type === 'sail').length <= 40,
        `Keep the naval fight bounded: ${actions.length} voyages`,
      )
    }
  }
})

test('naval victory advances shared boss and travel progress and unlocks the Recollection boss', () => {
  let run = surveyKeelcrab(enterKeelcrab({ ...createExpedition(DEPARTURE), floor: 5 })).run
  let camp: Camp = { supplies: 0, upgrades: [], completed: 0 }
  for (const action of solveKeelcrab(run)!) {
    const before = run
    run = actExpedition(run, action)
    camp = advanceMilestones(camp, before, run)
  }
  assert.equal(run.phase, 'won')
  assert.equal(milestoneProgress(camp).bosses, 1)
  assert.ok(milestoneProgress(camp).travel > 0)
  assert.ok(
    recollectionUnlocks({ version: 4, camp, journal: null, records: [] }).bosses.includes(
      'keelcrab',
    ),
  )
})
