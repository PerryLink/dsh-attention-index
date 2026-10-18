import test from 'node:test'
import assert from 'node:assert/strict'
import { recommend } from '../scripts/recommend.mjs'

const prior = { pluginId: 'alice/prior', tier: 'prior', unrated: true, evidenceGrade: 'E0', goe: { positive: false }, rank: null }
const measured = { pluginId: 'bob/measured', tier: 'measured', unrated: false, evidenceGrade: 'E3', goe: { positive: true }, rank: 1 }

test('a positive measured leader is recommended', () => {
  const registry = { surfaces: [{ id: 'memory', leaderboard: [prior, measured] }] }
  const result = recommend({ brief: 'memory', registry })
  assert.equal(result.status, 'measured')
  assert.equal(result.recommendation.pluginId, 'bob/measured')
})

test('no measured result returns unrated, unnumbered candidates', () => {
  const registry = { surfaces: [{ id: 'memory', leaderboard: [prior] }] }
  const result = recommend({ brief: 'memory', registry })
  assert.equal(result.status, 'unrated')
  assert.equal(result.recommendation, null)
  assert.equal(result.candidates[0].pluginId, 'alice/prior')
  assert.equal(result.candidates[0].rank, null)
})

test('unknown brief abstains', () => {
  assert.equal(recommend({ brief: 'nope', registry: { surfaces: [] } }).status, 'unknown-brief')
})
