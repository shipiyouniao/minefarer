import assert from 'node:assert/strict'
import test from 'node:test'
import { actExpedition } from '../src/game/expedition.js'
import { planConvoy } from '../src/game/convoy.js'
import { convoyFixture, convoyOrders, solveConvoy } from './convoy-helpers.js'
import { pendingWreckScene } from '../src/game/wreck-story.js'
import { campaignProgress } from '../src/game/campaign-catalog.js'

test('both dispatch puzzles need passing bays and every reachable accepted state remains solvable', () => {
  for (const floor of [1, 2]) {
    const initial = convoyFixture(floor),
      queue = [initial],
      seen = new Set<string>()
    const solution = solveConvoy(initial)
    assert.ok(solution && solution.length >= (floor === 1 ? 4 : 5) && solution.length <= 10)
    for (let at = 0; at < queue.length; at++) {
      const run = queue[at]!
      const key = run.convoy!.boats.map((boat) => `${boat.position}/${boat.arrived}`).join(':')
      if (seen.has(key)) continue
      seen.add(key)
      assert.ok(solveConvoy(run), `${floor}: ${key}`)
      for (const action of convoyOrders(run)) {
        const next = actExpedition(run, action)
        if (next !== run && next.phase === 'exploring') queue.push(next)
      }
    }
    assert.ok(seen.size > 12)
    let run = initial
    for (const action of solution) run = actExpedition(run, action)
    assert.ok(run.convoy!.boats.every((boat) => boat.arrived))
    assert.equal(run.phase, 'reward')
    assert.equal(run.health, initial.health)
    assert.deepEqual(run.offers, [])
    assert.equal(actExpedition(initial, { type: 'move', index: initial.exit }), initial)
    assert.equal(actExpedition(initial, { type: 'skill' }), initial)
  }
})

test('forecasts account for meeting, occupied waiting berths, opposite edges and different speeds', () => {
  const initial = convoyFixture(1),
    fleet = initial.convoy!
  const before = JSON.stringify(fleet)
  const meeting = planConvoy(fleet, [97, 97])
  assert.equal(meeting.reason, 'collision')
  assert.equal(meeting.collision, 97)
  assert.equal(JSON.stringify(fleet), before)
  assert.equal(actExpedition(initial, { type: 'convoy', orders: [97, 97] }), initial)
  const parked = actExpedition(initial, { type: 'convoy', orders: [97, 0] })
  assert.equal(planConvoy(parked.convoy!, [0, 97]).reason, 'collision')
  assert.equal(planConvoy(fleet, [0, 0]).reason, 'idle')
  assert.equal(planConvoy(fleet, [999, 0]).reason, 'route')
  const crossing = {
    ...fleet,
    boats: [
      { ...fleet.boats[0]!, position: 92 },
      { ...fleet.boats[1]!, position: 97, destination: 37 },
    ],
  }
  assert.equal(planConvoy(crossing, [97, 92]).reason, 'collision')
  const second = convoyFixture(2).convoy!
  assert.equal(second.boats[1]!.pace, 2)
  const toJunctions = planConvoy(second, [95, 99])
  assert.ok(toJunctions.allowed)
  assert.equal(toJunctions.tick, 6)
})

test('stage progression reaches the crab only after four rescues and uses persistent scene IDs', () => {
  let run = convoyFixture(1)
  let progress = campaignProgress(undefined, 'wreck-harbor')
  assert.equal(pendingWreckScene(run, progress), 'wreck-entry')
  progress = { ...progress, scenes: ['wreck-entry'] }
  assert.equal(pendingWreckScene(run, progress), null)
  for (const action of solveConvoy(run)!) run = actExpedition(run, action)
  run = actExpedition(run, { type: 'descend' })
  assert.equal(run.floor, 2)
  assert.equal(pendingWreckScene(run, progress), 'wreck-narrows')
  for (const action of solveConvoy(run)!) run = actExpedition(run, action)
  run = actExpedition(run, { type: 'descend' })
  assert.equal(pendingWreckScene(run, progress), 'wreck-junction')
  for (const action of solveConvoy(run)!) run = actExpedition(run, action)
  run = actExpedition(run, { type: 'descend' })
  assert.equal(pendingWreckScene(run, progress), 'wreck-crossing')
  for (const action of solveConvoy(run)!) run = actExpedition(run, action)
  assert.equal(pendingWreckScene(run, progress), 'wreck-sheltered')
  run = actExpedition(run, { type: 'descend' })
  assert.equal(run.floor, 5)
  assert.equal(run.phase, 'boss')
  assert.equal(run.convoy, undefined)
  assert.equal(run.encounter?.kind, 'keelcrab')
  assert.equal(pendingWreckScene(run, progress), 'wreck-crab')
  assert.equal(pendingWreckScene({ ...run, phase: 'lost' }, progress), null)
})

test('winding harbor has continuous reversible routes, no dispatch cap and recoverable fleet orders', () => {
  const initial = convoyFixture(4)
  const plan = solveConvoy(initial)!
  assert.ok(plan.length > 10)
  assert.equal(initial.convoy!.boats.length, 4)
  assert.equal(initial.game.config.width, 29)
  assert.equal(initial.game.config.height, 23)
  assert.equal(initial.convoy!.ports.length, 24)
  let bends = 0
  for (const reach of initial.convoy!.reaches) {
    assert.ok(
      initial.convoy!.reaches.some((back) => back.from === reach.to && back.to === reach.from),
    )
    for (let i = 1; i < reach.path.length; i++) {
      const a = reach.path[i - 1]!,
        b = reach.path[i]!
      assert.equal(
        Math.abs((a % 29) - (b % 29)) + Math.abs(Math.floor(a / 29) - Math.floor(b / 29)),
        1,
      )
      if (i > 1 && b - a !== a - reach.path[i - 2]!) bends++
    }
  }
  assert.ok(bends > 30, 'Long winding voyages replace the single circulation ring')
  const edges = initial.convoy!.reaches.filter((r) => r.from < r.to)
  let bridges = 0
  for (const edge of edges) {
    const reached = new Set([edge.from]),
      queue = [edge.from]
    for (const at of queue)
      for (const r of initial.convoy!.reaches) {
        if (
          r.from !== at ||
          (r.from === edge.from && r.to === edge.to) ||
          (r.from === edge.to && r.to === edge.from)
        )
          continue
        if (!reached.has(r.to)) {
          reached.add(r.to)
          queue.push(r.to)
        }
      }
    if (!reached.has(edge.to)) bridges++
  }
  assert.ok(bridges >= 12, 'Local loops cannot replace the shared narrow connecting reaches')
  const winding = initial.convoy!.reaches.find((r) => r.path.length > 20)!
  assert.ok(winding)
  const opposing = {
    ...initial.convoy!,
    boats: [
      { ...initial.convoy!.boats[0]!, position: winding.from, destination: winding.to },
      { ...initial.convoy!.boats[1]!, position: winding.to, destination: winding.from },
    ],
  }
  assert.equal(planConvoy(opposing, [winding.to, winding.from]).reason, 'collision')
  let finished = initial
  for (const action of plan) {
    const next = actExpedition(finished, action)
    assert.notEqual(next, finished)
    finished = next
  }
  assert.equal(finished.phase, 'reward')
  assert.equal(finished.health, initial.health)
  const after = actExpedition(initial, plan[0]!)
  const undo = actExpedition(after, { type: 'convoy-undo' })
  assert.deepEqual(undo.convoy!.boats, initial.convoy!.boats)
  assert.equal(undo.convoy!.round, 0)
  assert.deepEqual(undo.travelled, after.travelled)
  const repeated = actExpedition(undo, plan[0]!)
  assert.deepEqual(repeated.travelled, after.travelled)
  const reset = actExpedition(actExpedition(repeated, plan[1]!), { type: 'convoy-reset' })
  assert.deepEqual(reset.convoy!.boats, initial.convoy!.boats)
  assert.deepEqual(reset.convoy!.history, [])
  assert.ok(plan[0]!.type === 'convoy')
  assert.ok(planConvoy({ ...initial.convoy!, round: 1000 }, plan[0]!.orders).allowed)
  const third = convoyFixture(3)
  assert.equal(third.convoy!.boats.length, 3)
  assert.equal(solveConvoy(third)!.length, 6)
})
