/**
 * Deterministic trajectory → public contribution receipt.
 *
 * The receipt contains hashes and aggregate metrics, never raw session text.
 * It is the user-facing half of the contribution loop: a user creates one,
 * opens a PR to `data/contributions/`, and the public registry aggregates it
 * into contributor reputation and a nomination.
 *
 * @module dsh-attention-index/contribution
 */

import { createHash } from 'node:crypto'

/** Secret-like patterns; only the count leaves the machine. */
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*['"]?[A-Za-z0-9_./+=-]{12,}/gi,
]

/** Clamp into an inclusive range. */
function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}

/** Round to a fixed number of decimals. */
function round(value, decimals = 3) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Extract visible text from a user/assistant message. */
function textOf(message) {
  if (message === null || typeof message !== 'object') return ''
  if (typeof message.content === 'string') return message.content
  if (!Array.isArray(message.content)) return ''
  return message.content.filter(block => block?.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n')
}

/** Count secret-like strings. */
export function countSecretHits(text) {
  let hits = 0
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0
    const matches = text.match(pattern)
    if (matches !== null) hits += matches.length
  }
  return hits
}

/**
 * Fold a session event array into the quality counters.
 * @param {object[]} events - committed session events.
 * @returns {object} counters and user text.
 */
export function foldSession(events) {
  const state = {
    text: '',
    userMessages: 0,
    turns: 0,
    steps: 0,
    completedTurns: 0,
    abortedTurns: 0,
    errorTurns: 0,
    maxTokenTurns: 0,
    interruptedTurns: 0,
    toolCalls: 0,
    toolErrors: 0,
    retries: 0,
    tokens: 0,
    missingResults: 0,
    lastReason: '',
  }
  const openCalls = new Set()
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    if (event.type === 'user/message') {
      const sourceKind = event.data?.source?.kind
      if (typeof sourceKind === 'string' && sourceKind !== 'user' && sourceKind !== 'user-steering') continue
      const text = textOf(event.data?.message ?? event.data).trim()
      if (text.length > 0) {
        state.text = state.text.length === 0 ? text : `${state.text}\n${text}`
        state.text = state.text.slice(-8000)
        state.userMessages += 1
      }
    } else if (event.type === 'turn/start') {
      state.turns += 1
    } else if (event.type === 'step/end') {
      state.steps += 1
    } else if (event.type === 'turn/end') {
      const reason = event.data?.reason?.kind ?? 'unknown'
      state.lastReason = reason
      if (reason === 'completed') state.completedTurns += 1
      else if (reason === 'aborted') state.abortedTurns += 1
      else if (reason === 'error') state.errorTurns += 1
      else if (reason === 'max-tokens') state.maxTokenTurns += 1
      else if (reason === 'interrupted') state.interruptedTurns += 1
      if (openCalls.size > 0) {
        state.missingResults += openCalls.size
        openCalls.clear()
      }
    } else if (event.type === 'tool/call') {
      state.toolCalls += 1
      if (typeof event.data?.callId === 'string') openCalls.add(event.data.callId)
    } else if (event.type === 'tool/result') {
      const callId = event.data?.message?.toolCallId ?? event.data?.callId
      if (typeof callId === 'string') openCalls.delete(callId)
      if (event.data?.error !== undefined || event.data?.message?.isError === true) state.toolErrors += 1
    } else if (event.type === 'assistant/message') {
      const usage = event.data?.usage
      const total = Number.isFinite(usage?.totalTokens)
        ? usage.totalTokens
        : (Number.isFinite(usage?.inputTokens) ? usage.inputTokens : 0) + (Number.isFinite(usage?.outputTokens) ? usage.outputTokens : 0)
      if (Number.isFinite(total) && total > 0) state.tokens += Math.round(total)
    } else if (event.type === 'assistant/attempt') {
      state.retries += 1
    }
  }
  if (openCalls.size > 0) state.missingResults += openCalls.size
  return state
}

/**
 * Score one trajectory. This is the same deterministic formula the public
 * registry documents; it is not a model judgment.
 *
 * @param {object} state - folded counters.
 * @param {object} [options] - `{ rating, demand, verification }`.
 * @returns {object} quality receipt.
 */
export function scoreContribution(state, options = {}) {
  const turns = Math.max(0, state.turns)
  const completed = Math.max(0, state.completedTurns)
  const aborted = Math.max(0, state.abortedTurns)
  const error = Math.max(0, state.errorTurns)
  const maxTokens = Math.max(0, state.maxTokenTurns)
  const interrupted = Math.max(0, state.interruptedTurns)
  const toolCalls = Math.max(0, state.toolCalls)
  const completion = clamp(
    (completed + 0.25 * (turns - completed - aborted - error - maxTokens - interrupted)) / Math.max(1, turns),
    0,
    1,
  )
  const reliability = clamp(1 - state.toolErrors / Math.max(1, toolCalls), 0, 1)
  const efficiency = clamp(1 - state.retries / Math.max(1, toolCalls + 1), 0, 1)
  const reproducibility = clamp(1 - state.missingResults / Math.max(1, toolCalls) - (state.lastReason === 'interrupted' ? 0.2 : 0), 0, 1)
  const secretHits = countSecretHits(state.text)
  const safety = clamp(1 - secretHits / 3, 0, 1)
  const signal = typeof options.rating === 'number' && options.rating >= 1 && options.rating <= 5
    ? clamp((options.rating - 1) / 4, 0, 1)
    : 0.5
  const dimensions = {
    completion: round(completion),
    reliability: round(reliability),
    efficiency: round(efficiency),
    reproducibility: round(reproducibility),
    safety: round(safety),
    signal: round(signal),
  }
  const quality = round(clamp(100 * (
    0.35 * completion + 0.20 * reliability + 0.15 * efficiency
    + 0.10 * reproducibility + 0.10 * safety + 0.10 * signal
  ), 0, 100), 1)
  const eligible = (turns >= 2 || state.steps >= 4) && toolCalls >= 1 && state.userMessages >= 1 && state.text.trim().length >= 20
  const demand = clamp(typeof options.demand === 'number' ? options.demand : 1.25, 1, 1.5)
  const verification = options.verification === 'replicated' ? 2 : options.verification === 'replay' ? 1.5 : 1
  const price = eligible
    ? Math.min(60, Math.round((2 + 48 * Math.pow(quality / 100, 1.5)) * demand * verification))
    : 0
  return {
    eligible,
    quality,
    grade: quality >= 90 ? 'A' : quality >= 75 ? 'B' : quality >= 60 ? 'C' : quality >= 40 ? 'D' : 'F',
    price,
    dimensions,
    metrics: {
      turns,
      steps: Math.max(0, state.steps),
      toolCalls,
      toolErrors: Math.max(0, state.toolErrors),
      tokens: Math.max(0, state.tokens),
    },
    secretHits,
  }
}

/**
 * Build a public contribution receipt.
 *
 * @param {object[]} events - session events.
 * @param {object} options - `{ contributor, surface, plugins, rating, nomination, verification, createdAt }`.
 * @returns {object} contribution.
 */
export function buildContribution(events, options) {
  const folded = foldSession(events)
  const score = scoreContribution(folded, options)
  const sessionHash = `sha256:${createHash('sha256').update(JSON.stringify(events)).digest('hex')}`
  const textHash = createHash('sha256').update(folded.text).digest('hex').slice(0, 32)
  const contribution = {
    schema: 'dsh-attention/contribution/v1',
    contributionId: `ctr_${createHash('sha256').update(`${sessionHash}\n${options.contributor}`).digest('hex').slice(0, 16)}`,
    contributor: String(options.contributor ?? 'local'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    surface: String(options.surface ?? 'general'),
    plugins: Array.isArray(options.plugins) ? options.plugins.filter(value => typeof value === 'string' && value.length > 0) : [],
    quality: score.quality,
    price: score.price,
    verification: options.verification === 'replay' || options.verification === 'replicated' ? options.verification : 'self',
    sessionHash,
    textHash,
    metrics: score.metrics,
    ...(typeof options.nomination === 'string' && options.nomination.length > 0 ? { nomination: options.nomination } : {}),
  }
  return {
    contribution,
    eligible: score.eligible,
    ineligibleReason: score.eligible ? null : 'A trajectory needs at least 2 turns (or 4 steps), 1 tool call, 1 user message and 20 characters of user text.',
    grade: score.grade,
    dimensions: score.dimensions,
    secretHits: score.secretHits,
  }
}
