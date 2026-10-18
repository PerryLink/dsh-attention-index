import test from 'node:test'
import assert from 'node:assert/strict'
import { benjaminiHochberg, pairedBootstrap } from '../scripts/stats.mjs'

test('BH rejects a clear signal and controls the largest q', () => {
  const result = benjaminiHochberg([0.001, 0.02, 0.5, 0.9])
  assert.equal(result.rejected[0], true)
  assert.equal(result.rejected[3], false)
  assert.ok(result.qValues[0] <= 0.05)
  assert.ok(result.qValues[3] >= 0.9)
})

test('paired bootstrap is deterministic and reports a positive interval', () => {
  const first = pairedBootstrap([0.2, 0.3, 0.25, 0.4, 0.35], { iterations: 500, seed: 7 })
  const second = pairedBootstrap([0.2, 0.3, 0.25, 0.4, 0.35], { iterations: 500, seed: 7 })
  assert.deepEqual(first, second)
  assert.ok(first.lower > 0)
  assert.ok(first.mean > 0)
  assert.ok(first.pValue < 0.05)
})

test('paired bootstrap on a null effect includes zero', () => {
  const result = pairedBootstrap([0, 0, 0, 0], { iterations: 200, seed: 1 })
  assert.equal(result.mean, 0)
  assert.ok(result.lower <= 0 && result.upper >= 0)
  assert.equal(result.pValue, 1)
})
