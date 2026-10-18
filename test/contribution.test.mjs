import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContribution, foldSession, scoreContribution } from '../scripts/contribution.mjs'

function events(text = 'Please remember the staging database address for the next session.') {
  return [
    { type: 'user/message', seq: 1, time: 1, data: { role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } } },
    { type: 'turn/start', seq: 2, time: 2, data: { turn: 1 } },
    { type: 'step/end', seq: 3, time: 3, data: { turn: 1, step: 1 } },
    { type: 'tool/call', seq: 4, time: 4, data: { turn: 1, step: 1, callId: 'c1', name: 'memory_write', arguments: '{}' } },
    { type: 'tool/result', seq: 5, time: 5, data: { turn: 1, step: 1, message: { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] } } },
    { type: 'step/end', seq: 6, time: 6, data: { turn: 1, step: 2 } },
    { type: 'assistant/message', seq: 7, time: 7, data: { turn: 1, step: 2, message: { role: 'assistant', content: [{ type: 'text', text: 'remembered' }] }, usage: { inputTokens: 1000, outputTokens: 300, totalTokens: 1300 }, stream: [] } },
    { type: 'step/end', seq: 8, time: 8, data: { turn: 1, step: 3 } },
    { type: 'step/end', seq: 9, time: 9, data: { turn: 1, step: 4 } },
    { type: 'turn/end', seq: 10, time: 10, data: { turn: 1, reason: { kind: 'completed' } } },
  ]
}

test('folds a complete session and emits a payable receipt', () => {
  const folded = foldSession(events())
  assert.equal(folded.userMessages, 1)
  assert.equal(folded.turns, 1)
  assert.equal(folded.steps, 4)
  assert.equal(folded.toolCalls, 1)
  assert.equal(folded.tokens, 1300)
  const built = buildContribution(events(), { contributor: 'github:tester', surface: 'memory', plugins: ['alice/memory'], rating: 5, createdAt: '2026-10-18T00:00:00Z' })
  assert.equal(built.eligible, true)
  assert.ok(built.contribution.price > 0)
  assert.equal(built.contribution.verification, 'self')
  assert.equal(built.contribution.plugins[0], 'alice/memory')
  assert.equal(built.contribution.metrics.steps, 4)
})

test('receipt is deterministic and never contains raw text', () => {
  const options = { contributor: 'github:tester', surface: 'memory', createdAt: '2026-10-18T00:00:00Z' }
  const first = buildContribution(events('secret staging database host db.staging.internal'), options)
  const second = buildContribution(events('secret staging database host db.staging.internal'), options)
  assert.equal(first.contribution.sessionHash, second.contribution.sessionHash)
  assert.equal(first.contribution.contributionId, second.contribution.contributionId)
  assert.equal(JSON.stringify(first.contribution).includes('db.staging.internal'), false)
})

test('secrets lower safety and are only counted', () => {
  const built = buildContribution(events('my key is sk-abcdefghijklmnop1234567890'), { contributor: 'github:tester', surface: 'safety' })
  assert.equal(built.secretHits > 0, true)
  assert.ok(built.dimensions.safety < 1)
})

test('ineligible sessions are reported, not priced', () => {
  const folded = foldSession([{ type: 'user/message', seq: 1, time: 1, data: { role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } } }])
  const score = scoreContribution(folded, {})
  assert.equal(score.eligible, false)
  assert.equal(score.price, 0)
})
