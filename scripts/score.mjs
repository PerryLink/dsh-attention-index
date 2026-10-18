/**
 * Pure scoring for the public DSH Community Bench.
 *
 * One registry entry is computed from three evidence classes:
 *   1. prior    — public repository/adoption/verification evidence (capped);
 *   2. bench    — paired with/without task results (the only efficacy evidence);
 *   3. community— contribution receipts, used as a small demand signal and for
 *                 the contributor leaderboard, never as a substitute for a bench.
 *
 * No clock, no randomness, no I/O. The caller supplies `today` and data.
 *
 * @module dsh-attention-index/score
 */

export const SCORING_VERSION = 'v1'
export const PRIOR_CAP = 60
export const MIN_SAMPLES = 3
export const WEIGHTS = Object.freeze({
  measured: { bench: 0.55, prior: 0.30, coverage: 0.10, community: 0.05 },
  prior: { prior: 1 },
})

const DAY_MS = 86_400_000

/** Clamp a number into an inclusive range. */
export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}

/** Days between two ISO dates; invalid input counts as very old. */
export function daysBetween(iso, today) {
  const then = Date.parse(`${iso}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(then) || !Number.isFinite(now)) return 999
  return Math.max(0, Math.floor((now - then) / DAY_MS))
}

/** Maintenance sub-score. */
export function maintenanceScore(lastPush, today) {
  const days = daysBetween(lastPush ?? '2000-01-01', today)
  if (days <= 7) return 100
  if (days <= 30) return 88
  if (days <= 90) return 70
  if (days <= 180) return 45
  if (days <= 365) return 20
  return 5
}

/** Adoption sub-score; all three public signals are used with small weights. */
export function adoptionScore(evidence) {
  const installs = Number.isFinite(evidence.installs) ? evidence.installs : 0
  const npm = Number.isFinite(evidence.npm7d) ? evidence.npm7d : 0
  const stars = Number.isFinite(evidence.stars) ? evidence.stars : 0
  return clamp(
    18 * Math.log10(installs + 1) + 14 * Math.log10(npm + 1) + 4 * Math.log10(stars + 1),
    0,
    100,
  )
}

/** Verification sub-score; self-checks count much less than a certification. */
export function verificationScore(verification) {
  if (verification === 'certified') return 100
  if (verification === 'doctor') return 35
  return 0
}

/** Documentation sub-score from the coarse `docs` field. */
export function documentationScore(docs) {
  if (docs === 'full') return 90
  if (docs === 'basic') return 65
  return 50
}

/**
 * Transparent prior for one plugin. The cap is the point: without a paired
 * bench, a plugin cannot outrank one that has outcome evidence.
 *
 * @param {object} plugin - plugin row.
 * @param {string} today - `YYYY-MM-DD`.
 * @returns {{score:number, confidence:number, dimensions:object}}
 */
export function priorOf(plugin, today) {
  const evidence = plugin.evidence ?? {}
  const maintenance = maintenanceScore(evidence.lastPush, today)
  const adoption = adoptionScore(evidence)
  const verification = verificationScore(evidence.verification)
  const documentation = documentationScore(evidence.docs)
  let score = 0.30 * maintenance + 0.30 * adoption + 0.25 * verification + 0.15 * documentation
  // The raw prior keeps its full ordering; the 60-point public cap is applied
  // only to the final score of a prior-only plugin (below), so high-prior rows
  // do not collapse into a 60-point tie.
  if (plugin.status === 'frozen') score = Math.min(score, 50)
  if (plugin.status === 'archived' || plugin.status === 'retired') score = Math.min(score, 30)
  const confidence = clamp(
    0.2
    + 0.2 * (Number.isFinite(evidence.installs) ? 1 : 0)
    + 0.2 * (Number.isFinite(evidence.npm7d) ? 1 : 0)
    + 0.2 * (Number.isFinite(evidence.stars) ? 1 : 0)
    + 0.2 * (evidence.verification === 'certified' ? 1 : 0),
    0,
    1,
  )
  return {
    score: round(clamp(score, 0, 100), 1),
    confidence: round(confidence, 2),
    dimensions: {
      maintenance: round(maintenance, 1),
      adoption: round(adoption, 1),
      verification: round(verification, 1),
      documentation: round(documentation, 1),
    },
  }
}

/**
 * Lower bound of a difference of two proportions, normal approximation.
 * Conservative enough for small samples; the registry also requires a minimum
 * sample count before using it.
 *
 * @param {number} p1 - with-plugin success rate.
 * @param {number} n1 - with-plugin samples.
 * @param {number} p0 - without-plugin success rate.
 * @param {number} n0 - without-plugin samples.
 * @returns {number} lower bound in [-1, 1].
 */
export function liftLowerBound(p1, n1, p0, n0) {
  if (!(n1 > 0) || !(n0 > 0)) return -1
  const lift = p1 - p0
  const variance = (p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0
  const se = Math.sqrt(Math.max(0, variance))
  return clamp(lift - 1.96 * se, -1, 1)
}

/**
 * Aggregate paired bench results.
 *
 * A task enters the score only when both arms have at least `minSamples`
 * results. A plugin with no qualifying task gets `benchScore: null` and stays
 * prior-only — it is never scored as if it had lost.
 *
 * @param {object[]} results - result rows.
 * @param {object[]} tasks - task rows.
 * @param {object} [options] - `{ minSamples }`.
 * @returns {object} bench aggregate.
 */
export function aggregateBench(results, tasks, options = {}) {
  const minSamples = Number.isInteger(options.minSamples) ? options.minSamples : MIN_SAMPLES
  const byPluginTask = new Map()
  for (const result of results) {
    if (result?.schema !== 'dsh-attention/bench-result/v1') continue
    if (typeof result.plugin?.id !== 'string' || typeof result.taskId !== 'string') continue
    if (result.arm !== 'with' && result.arm !== 'without') continue
    if (typeof result.outcome?.pass !== 'boolean') continue
    const key = `${result.plugin.id}\u0000${result.taskId}`
    const entry = byPluginTask.get(key) ?? { pluginId: result.plugin.id, taskId: result.taskId, with: [], without: [] }
    entry[result.arm].push(result)
    byPluginTask.set(key, entry)
  }
  const taskById = new Map(tasks.map(task => [task.id, task]))
  const perPlugin = new Map()
  for (const entry of byPluginTask.values()) {
    const task = taskById.get(entry.taskId)
    if (task === undefined) continue
    if (entry.with.length < minSamples || entry.without.length < minSamples) continue
    const p1 = mean(entry.with.map(row => row.outcome.pass ? 1 : 0))
    const p0 = mean(entry.without.map(row => row.outcome.pass ? 1 : 0))
    const lcb = liftLowerBound(p1, entry.with.length, p0, entry.without.length)
    const row = {
      taskId: entry.taskId,
      surface: task.surface,
      weight: Number.isFinite(task.weight) ? task.weight : 1,
      withRuns: entry.with.length,
      withoutRuns: entry.without.length,
      withSuccess: round(p1, 3),
      withoutSuccess: round(p0, 3),
      lift: round(p1 - p0, 3),
      liftLowerBound: round(lcb, 3),
      score: round(((lcb + 1) / 2) * 100, 1),
      runners: unique(entry.with.map(row => row.runner?.id).filter(Boolean)).length,
      runs: entry.with.length + entry.without.length,
    }
    const aggregate = perPlugin.get(entry.pluginId) ?? { tasks: [], runners: new Set(), runs: 0 }
    aggregate.tasks.push(row)
    for (const value of entry.with.map(item => item.runner?.id).filter(Boolean)) aggregate.runners.add(value)
    aggregate.runs += row.runs
    perPlugin.set(entry.pluginId, aggregate)
  }
  const output = new Map()
  for (const [pluginId, aggregate] of perPlugin) {
    const totalWeight = aggregate.tasks.reduce((sum, task) => sum + task.weight, 0)
    const benchScore = totalWeight > 0
      ? aggregate.tasks.reduce((sum, task) => sum + task.score * task.weight, 0) / totalWeight
      : null
    const surface = aggregate.tasks[0]?.surface
    const surfaceTasks = tasks.filter(task => task.surface === surface).length
    const coverage = surfaceTasks > 0 ? aggregate.tasks.length / surfaceTasks : 0
    output.set(pluginId, {
      benchScore: benchScore === null ? null : round(benchScore, 1),
      coverage: round(coverage, 3),
      coverageScore: round(coverage * 100, 1),
      runners: aggregate.runners.size,
      runs: aggregate.runs,
      tasks: aggregate.tasks.sort((left, right) => left.taskId.localeCompare(right.taskId)),
    })
  }
  return output
}

/**
 * Aggregate contribution receipts.
 *
 * Contributions never enter the plugin's score as if they were a bench. They
 * produce (a) a demand signal for the plugin, (b) contributor reputation, and
 * (c) nominations for under-evaluated plugins.
 *
 * @param {object[]} contributions - contribution rows.
 * @returns {object} `{ contributors, pluginSignals, nominationCounts, total }`.
 */
export function aggregateContributions(contributions) {
  const seenSession = new Set()
  const seenText = new Set()
  const contributors = new Map()
  const pluginSignals = new Map()
  const nominationCounts = new Map()
  let total = 0
  for (const contribution of contributions) {
    if (contribution?.schema !== 'dsh-attention/contribution/v1') continue
    if (typeof contribution.contributor !== 'string' || contribution.contributor.length === 0) continue
    if (typeof contribution.sessionHash !== 'string' || seenSession.has(contribution.sessionHash)) continue
    if (typeof contribution.textHash === 'string' && seenText.has(contribution.textHash)) continue
    seenSession.add(contribution.sessionHash)
    if (typeof contribution.textHash === 'string') seenText.add(contribution.textHash)
    const quality = clamp(Number(contribution.quality) || 0, 0, 100)
    const price = clamp(Number(contribution.price) || 0, 0, 60)
    const verification = contribution.verification === 'replicated' ? 2 : contribution.verification === 'replay' ? 1.5 : 1
    const contributor = contributors.get(contribution.contributor) ?? {
      contributor: contribution.contributor,
      credits: 0,
      count: 0,
      qualitySum: 0,
      surfaces: new Set(),
      verified: false,
      lastAt: '',
    }
    contributor.credits += price
    contributor.count += 1
    contributor.qualitySum += quality
    if (typeof contribution.surface === 'string') contributor.surfaces.add(contribution.surface)
    if (verification > 1) contributor.verified = true
    if (typeof contribution.createdAt === 'string' && contribution.createdAt > contributor.lastAt) contributor.lastAt = contribution.createdAt
    contributors.set(contribution.contributor, contributor)
    total += 1
    for (const pluginId of Array.isArray(contribution.plugins) ? contribution.plugins : []) {
      if (typeof pluginId !== 'string') continue
      const signal = pluginSignals.get(pluginId) ?? { credits: 0, qualityWeighted: 0, count: 0, contributors: new Set() }
      signal.credits += price
      signal.qualityWeighted += (quality / 100) * verification
      signal.count += 1
      signal.contributors.add(contribution.contributor)
      pluginSignals.set(pluginId, signal)
    }
    if (typeof contribution.nomination === 'string' && contribution.nomination.length > 0) {
      nominationCounts.set(contribution.nomination, (nominationCounts.get(contribution.nomination) ?? 0) + 1)
    }
  }
  return {
    contributors: [...contributors.values()].map(value => ({
      contributor: value.contributor,
      credits: value.credits,
      count: value.count,
      avgQuality: value.count > 0 ? round(value.qualitySum / value.count, 1) : 0,
      surfaces: [...value.surfaces].sort(),
      verified: value.verified,
      lastAt: value.lastAt,
    })).sort((left, right) => right.credits - left.credits || right.avgQuality - left.avgQuality || left.contributor.localeCompare(right.contributor)),
    pluginSignals: new Map([...pluginSignals].map(([pluginId, value]) => [pluginId, {
      ...value,
      contributors: value.contributors.size,
      communityScore: round(clamp(10 * Math.sqrt(value.qualityWeighted), 0, 100), 1),
    }])),
    nominationCounts,
    total,
  }
}

/**
 * Build the full public registry.
 *
 * @param {object} input - `{ plugins, surfaces, tasks, results, contributions, today, generatedAt }`.
 * @returns {object} registry.
 */
export function buildRegistry(input) {
  const { plugins, surfaces, tasks, results = [], contributions = [], today, generatedAt } = input
  const bench = aggregateBench(results, tasks)
  const contribution = aggregateContributions(contributions)
  const entries = plugins.map((plugin) => scorePlugin(plugin, bench.get(plugin.id), contribution.pluginSignals.get(plugin.id), today))
  const bySurface = new Map(surfaces.map(surface => [surface.id, []]))
  for (const entry of entries) {
    const list = bySurface.get(entry.surface)
    if (list !== undefined) list.push(entry)
  }
  const surfaceRows = surfaces.map((surface) => {
    const rows = bySurface.get(surface.id) ?? []
    rows.sort(compareEntries)
    rows.forEach((row, index) => { row.rank = index + 1 })
    const measured = rows.filter(row => row.tier === 'measured')
    const top = (measured.length > 0 ? measured : rows).slice(0, 3)
    const tasksForSurface = tasks.filter(task => task.surface === surface.id)
    return {
      id: surface.id,
      label: surface.label,
      zh: surface.zh ?? surface.label,
      tasks: tasksForSurface.map(task => task.id),
      leaderboard: rows.map(publicEntry),
      top3: top.map(publicEntry),
      featured: top[0] === undefined ? null : publicEntry(top[0]),
      measured: measured.length,
      note: measured.length === 0
        ? 'Prior-only: no paired with/without bench result meets the minimum sample count yet.'
        : `${measured.length} plugin(s) have paired bench evidence; confidence and sample counts are shown per row.`,
    }
  })
  const overall = [...entries].sort(compareEntries).map((entry, index) => ({ ...publicEntry(entry), rank: index + 1 }))
  const measuredPlugins = entries.filter(entry => entry.tier === 'measured')
  const newAndPromising = entries
    .filter(entry => entry.status === 'active' && entry.tier === 'prior' && (entry.evidence.installs ?? 0) <= 10 && (entry.evidence.npm7d ?? 0) <= 2000 && (entry.evidence.stars ?? 0) <= 50 && entry.prior >= 50 && daysBetween(entry.evidence.lastPush, today) <= 30)
    .sort((left, right) => right.prior - left.prior || left.pluginId.localeCompare(right.pluginId))
    .slice(0, 5)
    .map(publicEntry)
  const mostNominated = [...contribution.nominationCounts.entries()]
    .map(([pluginId, count]) => {
      const entry = entries.find(candidate => candidate.pluginId === pluginId)
      return entry === undefined ? null : { ...publicEntry(entry), nominations: count }
    })
    .filter(value => value !== null)
    .filter(value => value.tier === 'prior' || value.coverage < 0.5)
    .sort((left, right) => right.nominations - left.nominations || right.score - left.score)
    .slice(0, 5)
  const mostReplicated = measuredPlugins
    .filter(entry => entry.runners >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(publicEntry)
  return {
    schema: 'dsh-attention/registry/v1',
    generatedAt,
    scoring: {
      version: SCORING_VERSION,
      weights: WEIGHTS,
      priorCap: PRIOR_CAP,
      minSamples: MIN_SAMPLES,
      formula: 'measured: 0.55*bench + 0.30*prior + 0.10*coverage + 0.05*community; prior-only: min(prior, 60)',
      note: 'A plugin with no qualifying paired bench is prior-only and cannot outrank a measured plugin. Contributions do not substitute for a bench.',
    },
    source: {
      plugins: plugins.length,
      tasks: tasks.length,
      surfaces: surfaces.length,
      benchResults: results.length,
      contributions: contributions.length,
    },
    stats: {
      plugins: entries.length,
      surfaces: surfaces.length,
      tasks: tasks.length,
      measuredPlugins: measuredPlugins.length,
      contributors: contribution.contributors.length,
      contributions: contribution.total,
      benchResults: results.length,
    },
    surfaces: surfaceRows,
    overall: overall.slice(0, 50),
    attention: {
      newAndPromising,
      mostNominated,
      mostReplicated,
      featuredBySurface: surfaceRows.map(surface => ({ surface: surface.id, ...(surface.featured ?? {}) })).filter(row => row.pluginId !== undefined),
    },
    contributors: contribution.contributors.slice(0, 20).map((row, index) => ({
      ...row,
      rank: index + 1,
      badge: row.credits >= 300 ? 'gold' : row.credits >= 150 ? 'silver' : row.credits >= 50 ? 'bronze' : 'participant',
    })),
    nominations: [...contribution.nominationCounts.entries()]
      .map(([pluginId, count]) => ({ pluginId, count }))
      .sort((left, right) => right.count - left.count || left.pluginId.localeCompare(right.pluginId)),
  }
}

/** Compare two scored entries: measured first, then score, confidence, prior, id. */
export function compareEntries(left, right) {
  const tier = (right.tier === 'measured' ? 1 : 0) - (left.tier === 'measured' ? 1 : 0)
  if (tier !== 0) return tier
  if (right.score !== left.score) return right.score - left.score
  if (right.confidence !== left.confidence) return right.confidence - left.confidence
  if (right.prior !== left.prior) return right.prior - left.prior
  return left.pluginId.localeCompare(right.pluginId)
}

/** Score one plugin. */
export function scorePlugin(plugin, bench, contribution, today) {
  const prior = priorOf(plugin, today)
  const measured = bench?.benchScore !== null && bench?.benchScore !== undefined
  const community = contribution?.communityScore ?? 0
  const coverageScore = bench?.coverageScore ?? 0
  const score = measured
    ? 0.55 * bench.benchScore + 0.30 * prior.score + 0.10 * coverageScore + 0.05 * community
    : PRIOR_CAP * (prior.score / 100)
  const confidence = measured
    ? clamp(0.4 + 0.3 * bench.coverage + 0.2 * Math.min(1, bench.runners / 2) + 0.1 * Math.min(1, bench.runs / 30), 0, 1)
    : prior.confidence
  return {
    pluginId: plugin.id,
    name: plugin.name,
    author: plugin.author,
    surface: plugin.surface,
    summary: plugin.summary,
    status: plugin.status,
    license: plugin.license,
    repo: plugin.repo,
    npm: plugin.npm ?? null,
    score: round(clamp(score, 0, 100), 1),
    scoreScale: measured ? 100 : PRIOR_CAP,
    prior: prior.score,
    priorDimensions: prior.dimensions,
    bench: measured ? bench.benchScore : null,
    coverage: bench?.coverage ?? 0,
    coverageScore,
    community,
    confidence: round(confidence, 2),
    tier: measured ? 'measured' : 'prior',
    runners: bench?.runners ?? 0,
    runs: bench?.runs ?? 0,
    benchTasks: bench?.tasks ?? [],
    evidence: {
      installs: plugin.evidence?.installs ?? null,
      npm7d: plugin.evidence?.npm7d ?? null,
      stars: plugin.evidence?.stars ?? null,
      lastPush: plugin.evidence?.lastPush ?? null,
      verification: plugin.evidence?.verification ?? 'none',
      observedAt: plugin.evidence?.observedAt ?? today,
      repo: plugin.repo,
    },
    rank: 0,
  }
}

/** Public projection of an entry (drops internal fields but keeps evidence). */
export function publicEntry(entry) {
  return {
    pluginId: entry.pluginId,
    name: entry.name,
    author: entry.author,
    surface: entry.surface,
    summary: entry.summary,
    status: entry.status,
    license: entry.license,
    repo: entry.repo,
    npm: entry.npm,
    score: entry.score,
    scoreScale: entry.scoreScale,
    prior: entry.prior,
    priorDimensions: entry.priorDimensions,
    bench: entry.bench,
    coverage: entry.coverage,
    coverageScore: entry.coverageScore,
    community: entry.community,
    confidence: entry.confidence,
    tier: entry.tier,
    runners: entry.runners,
    runs: entry.runs,
    benchTasks: entry.benchTasks,
    evidence: entry.evidence,
    rank: entry.rank,
  }
}

/** Arithmetic mean. */
function mean(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Unique values. */
function unique(values) {
  return [...new Set(values)]
}

/** Round to a fixed number of decimals. */
export function round(value, decimals = 3) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
