import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateBench,
  aggregateContributions,
  buildRegistry,
  liftInterval,
  liftLowerBound,
  priorOf,
  scorePlugin,
} from '../scripts/score.mjs'

const today = '2026-10-18'
const surfaces = [
  { id: 'memory', label: 'Memory', zh: '记忆' },
  { id: 'web', label: 'Web', zh: '联网' },
]
const tasks = [
  { id: 'memory-recall', surface: 'memory', prompt: 'recall', checks: [], model: 'deepseek-flash', harness: '0.2.1-rc.2' },
  { id: 'web-current', surface: 'web', prompt: 'search', checks: [], model: 'deepseek-flash', harness: '0.2.1-rc.2' },
]
const plugins = [
  {
    id: 'alice/memory', name: 'memory', author: 'alice', surface: 'memory', summary: '', status: 'active', license: 'MIT', repo: 'https://github.com/alice/memory', npm: 'alice-memory',
    evidence: { installs: 100, npm7d: 10000, stars: 50, lastPush: '2026-10-15', verification: 'certified', observedAt: today },
  },
  {
    id: 'bob/web', name: 'web', author: 'bob', surface: 'web', summary: '', status: 'active', license: 'MIT', repo: 'https://github.com/bob/web', npm: 'bob-web',
    evidence: { installs: 1, npm7d: 10, stars: 1, lastPush: '2026-10-15', verification: 'none', observedAt: today },
  },
]

function result(taskId, arm, pass, runner = 'runner-a') {
  return {
    schema: 'dsh-attention/bench-result/v1',
    runId: `${taskId}-${arm}-${Math.random()}`,
    taskId,
    plugin: { id: 'alice/memory', version: '1.0.0' },
    arm,
    model: 'deepseek-flash',
    harness: '0.2.1-rc.2',
    startedAt: '2026-10-18T00:00:00Z',
    outcome: { pass, checks: [] },
    metrics: { tokens: 1000, durationMs: 1000, toolErrors: 0 },
    sessionHash: `sha256:${'a'.repeat(64)}`,
    runner: { id: runner },
  }
}

test('prior keeps ordering and is capped only in the final prior-only score', () => {
  const prior = priorOf(plugins[0], today)
  assert.ok(prior.score > 0)
  const scored = scorePlugin(plugins[0], undefined, undefined, today)
  assert.equal(scored.tier, 'prior')
  assert.ok(scored.score <= 60)
  assert.equal(scored.scoreScale, 60)
})

test('Newcombe lift interval does not reward a 3/3 vs 0/3 sweep with 100', () => {
  const interval = liftInterval(1, 3, 0, 3)
  assert.ok(interval.lower > 0.1 && interval.lower < 0.4, `lower=${interval.lower}`)
  assert.ok(interval.upper > interval.lower)
  assert.ok(liftLowerBound(1, 3, 1, 3) < 0)
})

test('a task needs both arms and the minimum samples', () => {
  const insufficient = aggregateBench([
    result('memory-recall', 'with', true),
    result('memory-recall', 'without', false),
  ], tasks, { minSamples: 3 })
  assert.equal(insufficient.has('alice/memory'), false)

  const rows = []
  for (let index = 0; index < 3; index += 1) {
    rows.push(result('memory-recall', 'with', true))
    rows.push(result('memory-recall', 'without', false))
  }
  const bench = aggregateBench(rows, tasks, { minSamples: 3 })
  const entry = bench.get('alice/memory')
  assert.ok(entry.benchScore < 100, `benchScore=${entry.benchScore}`)
  assert.ok(entry.benchScore > 0)
  assert.equal(entry.coverage, 1)
})

test('measured provisional is reported but does not occupy a quality slot', () => {
  const rows = []
  for (let index = 0; index < 3; index += 1) {
    rows.push(result('memory-recall', 'with', true))
    rows.push(result('memory-recall', 'without', false))
  }
  const registry = buildRegistry({
    plugins,
    surfaces,
    tasks,
    results: rows,
    contributions: [],
    today,
    generatedAt: '2026-10-18T00:00:00Z',
  })
  const memory = registry.surfaces.find(surface => surface.id === 'memory')
  assert.equal(memory.measured, 1)
  assert.equal(memory.positive, 0)
  assert.equal(memory.top3.length, 0)
  assert.equal(memory.featured, null)
  const row = memory.leaderboard.find(entry => entry.pluginId === 'alice/memory')
  assert.equal(row.tier, 'measured')
  assert.equal(row.evidenceGrade, 'E2')
  assert.equal(row.goe.positive, false)
  assert.ok(row.bench < 100)
  assert.equal(row.scoreScale, 100)
})

test('contributions dedupe and produce contributor credits and nominations', () => {
  const base = {
    schema: 'dsh-attention/contribution/v1',
    contributor: 'github:alice',
    createdAt: '2026-10-18T00:00:00Z',
    surface: 'memory',
    plugins: ['alice/memory'],
    quality: 80,
    price: 30,
    verification: 'self',
    sessionHash: 'sha256:one',
    textHash: 'text-one',
  }
  const summary = aggregateContributions([
    base,
    { ...base, sessionHash: 'sha256:one' },
    { ...base, sessionHash: 'sha256:two', textHash: 'text-two', nomination: 'bob/web', quality: 90, price: 40, verification: 'replay' },
  ])
  assert.equal(summary.total, 2)
  assert.equal(summary.contributors.length, 1)
  assert.equal(summary.contributors[0].credits, 70)
  assert.equal(summary.contributors[0].avgQuality, 85)
  assert.equal(summary.nominationCounts.get('bob/web'), 1)
  assert.ok(summary.pluginSignals.get('alice/memory').communityScore > 0)
})
