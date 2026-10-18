import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateReliability } from '../scripts/reliability.mjs'

function base(overrides = {}) {
  return {
    pluginId: 'alice/memory',
    author: 'alice',
    tier: 'prior',
    npm: 'alice-memory',
    evidence: { installs: 100, npm7d: 1000, stars: 10, docs: 'full' },
    benchTasks: [],
    runners: 0,
    signatureVerified: false,
    environmentBound: false,
    versionMatch: 'unknown',
    holdout: false,
    taskReviewed: false,
    ...overrides,
  }
}

test('prior-only is E0 unrated, never a quality claim', () => {
  const result = evaluateReliability(base())
  assert.equal(result.evidenceGrade, 'E0')
  assert.equal(result.unrated, true)
  assert.equal(result.goe.positive, false)
  assert.equal(result.goe.certainty, 'very-low')
})

test('3/3 vs 0/3 with one unsigned runner stays E2 provisional', () => {
  const result = evaluateReliability(base({
    tier: 'measured',
    benchTasks: [{ withRuns: 3, withoutRuns: 3, liftLowerBound: 0.205 }],
    runners: 1,
  }))
  assert.equal(result.evidenceGrade, 'E2')
  assert.equal(result.goe.positive, false)
  assert.ok(result.goe.downgrades.includes('single-or-self-run'))
})

test('8 tasks, 10 runs/arm, 2 signed independent runners, exact env is E4 positive', () => {
  const benchTasks = Array.from({ length: 8 }, (_, index) => ({
    taskId: `task-${index}`,
    withRuns: 10,
    withoutRuns: 10,
    liftLowerBound: 0.2,
  }))
  const result = evaluateReliability(base({
    tier: 'measured',
    benchTasks,
    runners: 2,
    signatureVerified: true,
    environmentBound: true,
    versionMatch: 'exact',
    holdout: true,
    taskReviewed: true,
  }))
  assert.equal(result.evidenceGrade, 'E4')
  assert.equal(result.goe.positive, true)
  assert.equal(result.goe.certainty, 'moderate')
})

test('an unreviewed pilot task pack caps at E2', () => {
  const benchTasks = Array.from({ length: 8 }, (_, index) => ({
    taskId: `task-${index}`,
    withRuns: 10,
    withoutRuns: 10,
    liftLowerBound: 0.2,
  }))
  const result = evaluateReliability(base({
    tier: 'measured',
    benchTasks,
    runners: 2,
    signatureVerified: true,
    environmentBound: true,
    versionMatch: 'exact',
    holdout: true,
    taskReviewed: false,
  }))
  assert.equal(result.evidenceGrade, 'E2')
  assert.equal(result.goe.positive, false)
  assert.ok(result.goe.downgrades.includes('task-unreviewed'))
})


test('E5 requires an explicit independent audit flag', () => {
  const benchTasks = Array.from({ length: 8 }, (_, index) => ({
    taskId: `task-${index}`,
    withRuns: 10,
    withoutRuns: 10,
    liftLowerBound: 0.2,
  }))
  const strong = {
    tier: 'measured',
    benchTasks,
    runners: 3,
    signatureVerified: true,
    environmentBound: true,
    versionMatch: 'exact',
    holdout: true,
    taskReviewed: true,
  }
  assert.equal(evaluateReliability(base({ ...strong, audited: false })).evidenceGrade, 'E4')
  assert.equal(evaluateReliability(base({ ...strong, audited: true })).evidenceGrade, 'E5')
})


test('a strong result without a sandbox is capped at E2', () => {
  const benchTasks = Array.from({ length: 8 }, (_, index) => ({
    taskId: `task-${index}`,
    withRuns: 10,
    withoutRuns: 10,
    liftLowerBound: 0.2,
  }))
  const result = evaluateReliability(base({
    tier: 'measured',
    benchTasks,
    runners: 2,
    signatureVerified: true,
    environmentBound: false,
    versionMatch: 'exact',
    holdout: true,
    taskReviewed: true,
    audited: true,
  }))
  assert.equal(result.evidenceGrade, 'E2')
  assert.ok(result.goe.downgrades.includes('sandbox-missing'))
})

test('operator-owned and missing channels are downgrades', () => {
  const result = evaluateReliability(base({
    pluginId: 'perrylink/dsh-auto-review',
    author: 'PerryLink',
    evidence: { installs: null, npm7d: null, stars: null },
  }))
  assert.equal(result.operatorOwned, true)
  assert.equal(result.missing.installs, true)
  assert.ok(result.goe.downgrades.includes('operator-owned'))
  assert.ok(result.goe.downgrades.includes('missing-adoption-channels'))
})
