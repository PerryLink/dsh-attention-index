/**
 * Session -> brief matcher (P2.5, pure).
 *
 * The matcher only decides which public brief a session belongs to. It never
 * computes a plugin score and never reads raw session storage. The caller passes
 * a short user-visible summary and the tool names already visible in the
 * session projection. Ambiguous or weak matches abstain.
 */

import { pathToFileURL } from 'node:url'

export const BRIEFS = {
  memory: {
    surface: 'memory',
    terms: ['remember', 'recall', 'earlier', 'previous session', 'memory', 'forgot', '记忆', '记住', '上次', '之前', '回忆'],
    tools: ['memory', 'memory_search'],
  },
  web: {
    surface: 'web',
    terms: ['search', 'fetch', 'url', 'web', 'source', 'latest', '网页', '搜索', '联网', '链接', '来源'],
    tools: ['web_search', 'web_fetch', 'fetch', 'browser'],
  },
  dev: {
    surface: 'dev',
    terms: ['plugin', 'code', 'bug', 'test', 'repo', 'typescript', 'error', '插件', '开发', '报错', '测试', '仓库'],
    tools: ['read', 'edit', 'write', 'bash', 'glob', 'grep'],
  },
}

/**
 * @param {{text?:string, tools?:string[]}} session - user-visible summary + tool names.
 * @returns {{brief:string|null, surface:string|null, confidence:number, matched:string[], abstain:boolean, reason:string}}
 */
function matchesTerm(text, term) {
  const needle = term.toLowerCase()
  if (/^[\x00-\x7f]+$/.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text)
  }
  return text.includes(needle)
}

export function matchBrief(session) {
  const text = String(session?.text ?? '').toLowerCase()
  const toolList = Array.isArray(session?.tools) ? session.tools : String(session?.tools ?? '').split(',')
  const tools = new Set(toolList.map(tool => String(tool).trim().toLowerCase()).filter(Boolean))
  const scores = []
  for (const [brief, spec] of Object.entries(BRIEFS)) {
    const matched = spec.terms.filter(term => matchesTerm(text, term))
    const toolHits = spec.tools.filter(tool => tools.has(tool.toLowerCase()))
    const score = matched.length + toolHits.length * 2
    scores.push({ brief, surface: spec.surface, score, matched: [...matched, ...toolHits.map(tool => `tool:${tool}`)] })
  }
  scores.sort((left, right) => right.score - left.score || left.brief.localeCompare(right.brief))
  const top = scores[0]
  const second = scores[1]
  if (top === undefined || top.score === 0) {
    return { brief: null, surface: null, confidence: 0, matched: [], abstain: true, reason: 'no-signal' }
  }
  if (second !== undefined && second.score === top.score) {
    return { brief: null, surface: null, confidence: 0, matched: top.matched, abstain: true, reason: 'ambiguous' }
  }
  const total = scores.reduce((sum, item) => sum + item.score, 0)
  const confidence = Math.round((top.score / total) * 100) / 100
  return {
    brief: top.brief,
    surface: top.surface,
    confidence,
    matched: top.matched,
    abstain: false,
    reason: 'matched',
  }
}

function main() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }
  const text = get('--text') ?? ''
  const tools = (get('--tools') ?? '').split(',').map(value => value.trim()).filter(Boolean)
  console.log(JSON.stringify(matchBrief({ text, tools }), null, 2))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (error) { console.error(`match-brief: ${error.message}`); process.exit(1) }
}
