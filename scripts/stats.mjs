/**
 * Multiplicity and paired-bootstrap helpers (P1.4).
 *
 * These are pure functions used by the analysis pipeline. The first pilot has
 * no positive results, so they are not yet used to promote a quality slot; they
 * are here so the next pilot has a reproducible method instead of ad-hoc p-values.
 */

/** Deterministic 32-bit PRNG (mulberry32). */
export function mulberry32(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6D2B79F5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Benjamini-Hochberg step-up. Returns q-values and rejections at `alpha`.
 * @param {number[]} pValues
 * @param {number} alpha
 */
export function benjaminiHochberg(pValues, alpha = 0.05) {
  const m = pValues.length
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p)
  const qValues = new Array(m).fill(1)
  let previous = 1
  for (let rank = m; rank >= 1; rank -= 1) {
    const item = order[rank - 1]
    const q = Math.min(previous, (item.p * m) / rank)
    qValues[item.index] = q
    previous = q
  }
  return { qValues, rejected: qValues.map(q => q <= alpha) }
}

/**
 * Paired percentile bootstrap for a mean difference.
 * @param {number[]} differences - per-pair effect (with - without).
 * @param {{iterations?:number, seed?:number, alpha?:number}} [options]
 */
export function pairedBootstrap(differences, options = {}) {
  const values = differences.filter(value => Number.isFinite(value))
  if (values.length === 0) return { mean: 0, lower: 0, upper: 0, pValue: 1, iterations: 0 }
  const iterations = options.iterations ?? 4000
  const alpha = options.alpha ?? 0.05
  const random = mulberry32(options.seed ?? 1)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const samples = []
  for (let i = 0; i < iterations; i += 1) {
    let sum = 0
    for (let j = 0; j < values.length; j += 1) sum += values[Math.floor(random() * values.length)]
    samples.push(sum / values.length)
  }
  samples.sort((a, b) => a - b)
  const lower = samples[Math.floor((alpha / 2) * iterations)]
  const upper = samples[Math.floor((1 - alpha / 2) * iterations) - 1] ?? samples[samples.length - 1]
  const atOrBelow = samples.filter(value => value <= 0).length / iterations
  const atOrAbove = samples.filter(value => value >= 0).length / iterations
  const pValue = Math.min(1, 2 * Math.min(atOrBelow, atOrAbove))
  return { mean, lower, upper, pValue, iterations }
}
