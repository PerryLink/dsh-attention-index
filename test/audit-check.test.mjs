import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAudits } from '../scripts/audit-check.mjs'

const registry = {
  surfaces: [{
    id: 'memory',
    leaderboard: [
      { pluginId: 'alice/memory', evidenceGrade: 'E5' },
      { pluginId: 'bob/memory', evidenceGrade: 'E3' },
    ],
  }],
}

test('E5 without an independent audit fails', () => {
  assert.equal(validateAudits(registry, { audits: [] }).length, 1)
})

test('a matching independent passing audit is accepted', () => {
  const failures = validateAudits(registry, {
    audits: [{
      auditor: 'Audit Lab',
      independent: true,
      result: 'pass',
      scope: 'alice/memory',
      date: '2026-10-18',
      evidenceUrl: 'https://example.test/audit',
    }],
  })
  assert.deepEqual(failures, [])
})

test('a non-independent audit cannot support E5', () => {
  const failures = validateAudits(registry, {
    audits: [{
      auditor: 'Self',
      independent: false,
      result: 'pass',
      scope: 'alice/memory',
      date: '2026-10-18',
      evidenceUrl: 'https://example.test/audit',
    }],
  })
  assert.equal(failures.length, 1)
})
