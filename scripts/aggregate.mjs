/**
 * Build the public registry, static-site data, badge SVGs and Markdown
 * leaderboard from the committed data files.
 *
 * Usage:
 *   node scripts/aggregate.mjs
 *   node scripts/aggregate.mjs --today 2026-10-18
 *   node scripts/aggregate.mjs --check        # fail when generated files drift
 *
 * The script performs no network access. Everything it publishes is derived
 * from `data/` and is reproducible with the same inputs and `--today`.
 *
 * @module dsh-attention-index/aggregate
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildRegistry } from './score.mjs'
import { loadPublicKeys, verifyResult } from './verify-result.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BADGE_BASE = process.env.BENCH_BADGE_BASE ?? 'https://perrylink.github.io/dsh-attention-index/badges/'

/** Read and parse one JSON file. */
function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
}

/** Read every `.json` in one directory, sorted by name. */
function readDir(path) {
  const dir = join(ROOT, path)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => ({ name, value: JSON.parse(readFileSync(join(dir, name), 'utf8')) }))
}

/** Stable filesystem-safe slug for a plugin id. */
function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

/** Escape XML text. */
function xml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Approximate text width for the badge. */
function textWidth(value) {
  return Math.max(30, Math.round(String(value).length * 6.2))
}

/**
 * Render one shields-style flat badge.
 * @param {string} label - left side.
 * @param {string} message - right side.
 * @param {string} color - right-side fill.
 * @returns {string} SVG.
 */
function badgeSvg(label, message, color) {
  const left = textWidth(label) + 10
  const right = textWidth(message) + 10
  const width = left + right
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${xml(label)}: ${xml(message)}">
  <title>${xml(label)}: ${xml(message)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)"><rect width="${left}" height="20" fill="#555"/><rect x="${left}" width="${right}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${left / 2}" y="15">${xml(label)}</text>
    <text x="${left + right / 2}" y="15">${xml(message)}</text>
  </g>
</svg>
`
}

/** Badge color by tier. */
function tierColor(tier) {
  return tier === 'measured' ? '#2f855a' : '#6b7280'
}

/** Badge color by contributor badge. */
function contributorColor(badge) {
  if (badge === 'gold') return '#b7791f'
  if (badge === 'silver') return '#718096'
  if (badge === 'bronze') return '#9c4221'
  return '#4a5568'
}

/** Build the Markdown leaderboard. */
function renderMarkdown(registry) {
  const lines = [
    '# dsh-score',
    '',
    `Generated: ${registry.generatedAt} · reliability \`${registry.scoring.reliabilityVersion}\` · ${registry.stats.measuredPlugins}/${registry.stats.plugins} measured · ${registry.stats.unratedPlugins} unrated`,
    '',
    '> Prior-only rows are **E0 / unrated**: metadata is not outcome evidence. No quality rank or #1 is published while every row is E0.',
    '',
    '## Evidence by capability surface',
    '',
  ]
  for (const surface of registry.surfaces) {
    lines.push(`### ${surface.zh} / ${surface.label}`, '')
    lines.push('| # | Plugin | GOE | Tier | Prior | Bench | Coverage | Evidence completeness |')
    lines.push('|---:|---|---|---|---:|---:|---:|---:|')
    for (const row of surface.leaderboard.slice(0, 10)) {
      lines.push(`| ${row.rank ?? '—'} | [${row.name}](${row.repo}) | ${row.evidenceGrade}${row.unrated ? ' unrated' : ''} | ${row.unrated ? 'unrated' : row.evidenceGrade === 'E2' ? 'provisional' : row.tier} | ${row.prior} | ${row.bench ?? '—'} | ${Math.round(row.coverage * 100)}% | ${row.confidence} |`)
    }
    lines.push('', `_${surface.note}_`, '')
  }
  lines.push('## Contributors', '')
  if (registry.contributors.length === 0) {
    lines.push('No contribution receipts yet. See CONTRIBUTING.md.', '')
  } else {
    lines.push('| # | Contributor | Credits | Contributions | Avg quality | Badge |')
    lines.push('|---:|---|---:|---:|---:|---|')
    for (const row of registry.contributors) {
      lines.push(`| ${row.rank} | ${row.contributor} | ${row.credits} | ${row.count} | ${row.avgQuality} | ${row.badge} |`)
    }
    lines.push('')
  }
  lines.push('## Attention allocation', '')
  lines.push('- **Featured**: the top measured plugin per surface; prior-only only when no measured result exists.')
  lines.push('- **New & promising**: active, low-adoption, recently pushed, prior-only plugins.')
  lines.push('- **Most nominated**: under-evaluated plugins nominated by contribution receipts.')
  lines.push('- **Most replicated**: measured plugins with at least two independent runners.')
  lines.push('')
  return lines.join('\n')
}

/** Build the full output set. */
export function buildOutputs({ today } = {}) {
  const pluginsFile = readJson('data/plugins.json')
  const tasksFile = readJson('data/tasks.json')
  const results = readDir('data/results').map(item => item.value)
  const publicKeys = loadPublicKeys(join(ROOT, 'data/runners.json'))
  const verifiedResults = []
  for (const result of results) {
    const verdict = verifyResult(result, publicKeys)
    if (verdict.valid) verifiedResults.push({ ...result, verified: true })
    else console.error(`skip unverified result ${result.runId ?? '?'}: ${verdict.reason}`)
  }
  const contributions = readDir('data/contributions').map(item => item.value)
  const day = today ?? new Date().toISOString().slice(0, 10)
  // Deterministic for a given --today: re-running with the same inputs produces
  // byte-identical registry, site data and badges.
  const generatedAt = `${day}T00:00:00.000Z`
  const registry = buildRegistry({
    plugins: pluginsFile.plugins,
    surfaces: tasksFile.surfaces,
    tasks: tasksFile.tasks,
    results: verifiedResults,
    contributions,
    today: today ?? pluginsFile.observedAt ?? generatedAt.slice(0, 10),
    generatedAt,
  })
  const inputHash = createHash('sha256')
    .update(JSON.stringify({ plugins: pluginsFile, tasks: tasksFile, results, contributions }))
    .digest('hex')
  registry.source.inputHash = `sha256:${inputHash}`

  const badges = new Map()
  const badgeIndex = []
  for (const surface of registry.surfaces) {
    for (const row of surface.leaderboard) {
      const base = slug(row.pluginId)
      const file = `${base}.svg`
      const positiveMeasured = row.tier === 'measured' && row.goe?.positive === true
      const message = positiveMeasured
        ? (row.rank === 1 ? `#1 ${surface.id} · ${row.evidenceGrade}` : `${row.evidenceGrade} · measured`)
        : (row.unrated ? 'E0 · unrated' : `${row.evidenceGrade} · provisional`)
      const svg = badgeSvg('dsh-score', message, tierColor(row.tier))
      badges.set(file, svg)
      if (positiveMeasured && row.rank === 1) {
        badges.set(`${base}-top.svg`, badgeSvg('dsh-score', `#1 ${surface.id} · ${row.evidenceGrade}`, '#2f855a'))
      }
      if (!badgeIndex.some(item => item.pluginId === row.pluginId)) {
        badgeIndex.push({
          pluginId: row.pluginId,
          name: row.name,
          surface: row.surface,
          rank: row.rank,
          evidenceGrade: row.evidenceGrade,
          unrated: row.unrated,
          score: row.score,
          tier: row.tier,
          svg: `badges/${file}`,
          url: `${BADGE_BASE}${file}`,
          markdown: `![dsh-score ${row.evidenceGrade}${row.unrated ? ' · unrated' : ''}](${BADGE_BASE}${file})`,
        })
      }
    }
  }
  for (const contributor of registry.contributors) {
    const file = `contributor-${slug(contributor.contributor)}.svg`
    badges.set(file, badgeSvg('dsh-score contributor', `${contributor.credits} credits · ${contributor.badge}`, contributorColor(contributor.badge)))
    contributor.svg = `badges/${file}`
  }
  badges.set('dsh-bench.svg', badgeSvg('dsh-score', `${registry.stats.measuredPlugins}/${registry.stats.plugins} measured · ${registry.stats.unratedPlugins} unrated`, '#2f855a'))

  return {
    registry,
    badges,
    badgeIndex: {
      schema: 'dsh-attention/badges/v1',
      generatedAt,
      badges: badgeIndex,
    },
    markdown: renderMarkdown(registry),
  }
}

/** Write one file, creating parent directories on demand. */
function write(path, content) {
  const target = join(ROOT, path)
  writeFileSync(target, content)
}

/** CLI entry. */
function main() {
  const todayArg = process.argv.indexOf('--today')
  const today = todayArg >= 0 ? process.argv[todayArg + 1] : undefined
  const check = process.argv.includes('--check')
  const outputs = buildOutputs({ today })
  const registryText = `${JSON.stringify(outputs.registry, null, 2)}\n`
  const badgeIndexText = `${JSON.stringify(outputs.badgeIndex, null, 2)}\n`
  const files = [
    ['data/registry.json', registryText],
    ['site/data/registry.json', registryText],
    ['badges/index.json', badgeIndexText],
    ['site/data/badges.json', badgeIndexText],
    ['LEADERBOARD.md', outputs.markdown],
    ...[...outputs.badges].map(([name, content]) => [`badges/${name}`, content]),
    ...[...outputs.badges].map(([name, content]) => [`site/badges/${name}`, content]),
  ]
  const expectedBadges = new Set(outputs.badges.keys())
  const extraBadges = []
  for (const dir of ['badges', 'site/badges']) {
    const absolute = join(ROOT, dir)
    if (!existsSync(absolute)) continue
    for (const name of readdirSync(absolute)) {
      if (name.endsWith('.svg') && !expectedBadges.has(name)) extraBadges.push(join(dir, name))
    }
  }
  if (check) {
    let drift = 0
    for (const [path, content] of files) {
      const target = join(ROOT, path)
      if (!existsSync(target) || readFileSync(target, 'utf8') !== content) {
        console.error(`drift: ${path}`)
        drift += 1
      }
    }
    for (const path of extraBadges) {
      console.error(`stale badge: ${path}`)
      drift += 1
    }
    if (drift > 0) process.exit(1)
    console.log('registry is up to date')
    return
  }
  for (const [path, content] of files) write(path, content)
  for (const path of extraBadges) unlinkSync(join(ROOT, path))
  console.log(`wrote ${files.length} files · ${outputs.registry.stats.plugins} plugins · ${outputs.registry.stats.measuredPlugins} measured · ${outputs.registry.stats.unratedPlugins} unrated · ${outputs.registry.stats.contributors} contributors`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main()
