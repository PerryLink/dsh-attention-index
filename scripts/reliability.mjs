/**
 * SOE / GOE reliability layer for dsh-score.
 *
 * SOE (Strength of Evidence) scores one claim on five dimensions, 0–4:
 *   design, execution, precision, independence, directness.
 * GOE (Grade of Evidence) turns SOE + bias checks into an ordinal grade:
 *   E0 unrated, E1 screened, E2 provisional, E3 measured, E4 replicated,
 *   E5 audited. Certainty is separate: very-low | low | moderate | high.
 *
 * This module is pure. It does not read files, call models, or invent results.
 * Prior-only rows always grade E0: metadata is not outcome evidence.
 *
 * @module dsh-score/reliability
 */

export const RELIABILITY_VERSION = 'soe-goe/v1'

/** Ordinal evidence grades, weakest to strongest. */
export const EVIDENCE_GRADES = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5']

/** Human labels for the grades. */
export const GRADE_LABELS = {
  E0: 'unrated',
  E1: 'screened',
  E2: 'provisional',
  E3: 'measured',
  E4: 'replicated',
  E5: 'audited',
}

/** Clamp a dimension score to 0–4. */
function dim(value) {
  return Math.max(0, Math.min(4, Math.round(Number(value) || 0)))
}

/** Operator/author affiliation, used for the independence downgrade. */
export function isOperatorOwned(entry) {
  const author = String(entry?.author ?? '').toLowerCase()
  const id = String(entry?.pluginId ?? '').toLowerCase()
  return author === 'perrylink' || id.startsWith('perrylink/')
}

/** Missing metadata channels; missing is never zero. */
export function missingOf(entry) {
  const evidence = entry?.evidence ?? {}
  return {
    installs: !Number.isFinite(evidence.installs),
    npm7d: !Number.isFinite(evidence.npm7d),
    stars: !Number.isFinite(evidence.stars),
    docs: evidence.docs === undefined || evidence.docs === null,
    npmName: entry?.npm === null || entry?.npm === undefined,
  }
}

/** Count of missing adoption channels. */
function missingChannels(missing) {
  return [missing.installs, missing.npm7d, missing.stars].filter(Boolean).length
}

/** SOE for a prior-only row: no outcome design, no execution, no precision. */
function priorSoe(entry, missing, operatorOwned) {
  const notes = ['no-paired-result', 'metadata-only']
  if (operatorOwned) notes.push('operator-owned')
  if (missingChannels(missing) > 0) notes.push('missing-adoption-channels')
  if (missing.docs) notes.push('docs-unknown')
  if (missing.npmName) notes.push('npm-identity-missing')
  return {
    design: 0,
    execution: 0,
    precision: 0,
    independence: 0,
    directness: 0,
    notes,
  }
}

/** SOE for a measured row, derived from the public result fields. */
function measuredSoe(entry, missing, operatorOwned) {
  const tasks = Array.isArray(entry.benchTasks) ? entry.benchTasks : []
  const taskCount = tasks.length
  const minRuns = tasks.reduce((min, task) => {
    const runs = Math.min(Number(task.withRuns) || 0, Number(task.withoutRuns) || 0)
    return min === null ? runs : Math.min(min, runs)
  }, null) ?? 0
  const runners = Number(entry.runners) || 0
  const notes = []
  if (operatorOwned) notes.push('operator-owned')
  if (missingChannels(missing) > 0) notes.push('missing-adoption-channels')
  if (missing.docs) notes.push('docs-unknown')
  if (!entry.signatureVerified) notes.push('signature-unverified')
  if (entry.selfRun) notes.push('self-run')
  if (entry.versionMatch !== 'exact') notes.push('version-mismatch')

  return {
    design: dim(taskCount >= 8 ? 4 : taskCount >= 5 ? 3 : taskCount >= 3 ? 2 : taskCount >= 1 ? 1 : 0),
    execution: dim(entry.signatureVerified ? (entry.environmentBound ? 4 : 3) : 1),
    precision: dim(minRuns >= 30 ? 4 : minRuns >= 10 ? 3 : minRuns >= 5 ? 2 : minRuns >= 3 ? 1 : 0),
    independence: dim(entry.selfRun ? 0 : runners >= 3 ? 4 : runners >= 2 ? 3 : runners >= 1 ? 1 : 0),
    directness: dim(entry.versionMatch === 'exact' ? (entry.holdout ? 4 : 3) : entry.versionMatch === 'adjacent' ? 2 : 0),
    notes,
  }
}

/** Ordinal grade from SOE and bias checks. */
function gradeFromSoe(soe, { measured, operatorOwned, missing }) {
  if (!measured) {
    return {
      grade: 'E0',
      certainty: 'very-low',
      positive: false,
      reasons: ['no-outcome-evidence', 'metadata-only'],
      downgrades: [
        ...(operatorOwned ? ['operator-owned'] : []),
        ...(missingChannels(missing) > 0 ? ['missing-adoption-channels'] : []),
        ...(missing.docs ? ['docs-unknown'] : []),
      ],
    }
  }

  const floor = Math.min(soe.design, soe.execution, soe.precision, soe.independence, soe.directness)
  let grade = 'E2'
  if (soe.independence >= 4 && soe.design >= 4 && floor >= 3) grade = 'E5'
  else if (soe.independence >= 3 && soe.design >= 3 && floor >= 2) grade = 'E4'
  else if (soe.independence >= 2 && soe.design >= 2 && soe.precision >= 1) grade = 'E3'

  const certainty = floor >= 4 ? 'high' : floor >= 3 ? 'moderate' : floor >= 2 ? 'low' : 'very-low'
  const downgrades = []
  if (operatorOwned) downgrades.push('operator-owned')
  if (missingChannels(missing) > 0) downgrades.push('missing-adoption-channels')
  if (missing.docs) downgrades.push('docs-unknown')
  if (soe.independence < 3) downgrades.push('single-or-self-run')
  if (soe.precision < 2) downgrades.push('small-sample')
  if (soe.directness < 3) downgrades.push('version-or-environment-mismatch')

  return { grade, certainty, positive: false, reasons: ['paired-result'], downgrades }
}

/**
 * Evaluate one registry entry.
 * @param {object} entry - scored entry (tier, benchTasks, runners, evidence, ...).
 * @returns {{evidenceGrade:string, soe:object, goe:object, unrated:boolean, operatorOwned:boolean, missing:object}}
 */
export function evaluateReliability(entry) {
  const measured = entry?.tier === 'measured'
  const operatorOwned = isOperatorOwned(entry)
  const missing = missingOf(entry)
  const soe = measured ? measuredSoe(entry, missing, operatorOwned) : priorSoe(entry, missing, operatorOwned)
  const goe = gradeFromSoe(soe, { measured, operatorOwned, missing })
  const positive = measured && goe.grade !== 'E2' && Array.isArray(entry.benchTasks)
    && entry.benchTasks.some(task => Number(task.liftLowerBound) > 0)
  if (measured) goe.positive = positive
  return {
    evidenceGrade: goe.grade,
    soe,
    goe,
    unrated: !measured,
    operatorOwned,
    missing,
  }
}
