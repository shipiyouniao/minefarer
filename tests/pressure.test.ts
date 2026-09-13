import assert from 'node:assert/strict'
import test from 'node:test'
import { constrainPressure, pressureCells, pressureReadings } from '../src/game/pressure.js'
import { advanceCurrent } from '../src/game/floor-tide.js'
import { createExpedition } from '../src/game/expedition.js'
import { FERRY_DEPARTURE } from './ferry-helpers.js'
import type { Game } from '../src/types/game.js'
import type { PressurePair } from '../src/types/pressure.js'

const pair: PressurePair = {
  id: 'calibration',
  a: { column: 0, row: 0, size: 2 },
  b: { column: 2, row: 0, size: 2 },
}

/** Small fixed board lets assertions state every hazard without using a hidden solver. */
function board(mines: readonly number[]): Game {
  return {
    config: { width: 4, height: 4, mines: mines.length },
    seed: 0,
    firstClick: null,
    phase: 'playing',
    exploded: null,
    safeMarks: [],
    cells: Array.from({ length: 16 }, (_, index) => ({
      mine: mines.includes(index),
      adjacent: 0,
      visibility: 'hidden',
    })),
  }
}

test('paired readings expose signed differences, never hidden absolute counts', () => {
  for (const [mines, difference] of [
    [[0, 1, 4, 2], 2],
    [[0, 2, 3, 6], -2],
    [[0, 2], 0],
    [[], 0],
  ] as const) {
    assert.deepEqual(pressureReadings(board(mines), [pair]), [
      { id: 'calibration', a: [0, 1, 4, 5], b: [2, 3, 6, 7], difference },
    ])
  }
})

test('player flags and safe marks cannot alter an instrument reading', () => {
  const game = board([0, 1, 4, 2])
  const mistaken: Game = {
    ...game,
    safeMarks: [0, 1],
    cells: game.cells.map((cell, index) => ({
      ...cell,
      visibility: index >= 2 ? 'flagged' : 'revealed',
    })),
  }
  assert.deepEqual(pressureReadings(game, [pair]), pressureReadings(mistaken, [pair]))
})

test('authored footprints reject clipping, overlap and ambiguous pair IDs', () => {
  const game = board([])
  for (const area of [
    { column: -1, row: 0, size: 2 },
    { column: 3, row: 0, size: 2 },
    { column: 0, row: 3, size: 2 },
    { column: 0.5, row: 0, size: 2 },
    { column: 0, row: 0, size: 1 },
  ] as const)
    assert.throws(() => pressureCells(game.config, area as PressurePair['a']), RangeError)
  assert.throws(() => pressureReadings(game, [{ ...pair, b: pair.a }]), RangeError)
  assert.throws(() => pressureReadings(game, [pair, pair]), RangeError)
  assert.throws(() => pressureReadings(game, [{ ...pair, id: ' ' }]), RangeError)
  assert.throws(() => pressureReadings({ ...game, cells: [] }, [pair]), RangeError)
  assert.deepEqual(
    pressureCells(game.config, { column: 1, row: 1, size: 3 }),
    [5, 6, 7, 9, 10, 11, 13, 14, 15],
  )
})

test('zero remains ambiguous until a public calibration bound makes it useful', () => {
  const unknown = { min: 0, max: 4 }
  assert.deepEqual(constrainPressure(0, unknown, unknown), { a: unknown, b: unknown })
  assert.deepEqual(constrainPressure(2, unknown, { min: 0, max: 0 }), {
    a: { min: 2, max: 2 },
    b: { min: 0, max: 0 },
  })
  assert.equal(constrainPressure(-1, unknown, { min: 0, max: 0 }), null)
  assert.throws(() => constrainPressure(0.5, unknown, unknown), RangeError)
})

test('public interval propagation agrees with exhaustive possible count assignments', () => {
  for (let minA = 0; minA <= 4; minA++)
    for (let maxA = minA; maxA <= 4; maxA++)
      for (let minB = 0; minB <= 4; minB++)
        for (let maxB = minB; maxB <= 4; maxB++)
          for (let difference = -4; difference <= 4; difference++) {
            const values: number[] = []
            for (let a = minA; a <= maxA; a++)
              if (a - difference >= minB && a - difference <= maxB) values.push(a)
            const result = constrainPressure(
              difference,
              { min: minA, max: maxA },
              { min: minB, max: maxB },
            )
            assert.deepEqual(
              result,
              values.length
                ? {
                    a: { min: Math.min(...values), max: Math.max(...values) },
                    b: {
                      min: Math.min(...values) - difference,
                      max: Math.max(...values) - difference,
                    },
                  }
                : null,
            )
          }
})

test('a real tide changes readings while instrument footprints stay in world coordinates', () => {
  const before = createExpedition(FERRY_DEPARTURE)
  const instrument: PressurePair = {
    id: 'moving-bank',
    a: { column: 9, row: 1, size: 2 },
    b: { column: 1, row: 1, size: 2 },
  }
  const after = advanceCurrent(before, {
    ...before,
    power: {
      ...before.power!,
      junctions: before.power!.junctions.map((entry) => ({ ...entry, selected: 0 })),
    },
  })
  assert.equal(after.current!.cycle, 1)
  const oldReading = pressureReadings(before.game, [instrument])[0]!
  const newReading = pressureReadings(after.game, [instrument])[0]!
  assert.deepEqual(oldReading.a, newReading.a)
  assert.deepEqual(oldReading.b, newReading.b)
  assert.notEqual(oldReading.difference, newReading.difference)
})
