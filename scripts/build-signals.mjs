/**
 * Build the market-side signal file.
 *
 * This is a decoration layer, not a marketplace index and not a ranking input.
 * It exposes the public evidence grade and the unrated flag for each identity.
 * A market must keep its own ranking; it may show this as an attributed label.
 *
 * Usage:
 *   node scripts/build-signals.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalId, identityIndex } from './identity.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
const pluginsFile = JSON.parse(readFileSync(join(ROOT, 'data/plugins.json'), 'utf8'))
const index = identityIndex(pluginsFile.plugins)
const entries = []
for (const surface of registry.surfaces) {
  for (const row of surface.leaderboard) {
    const id = canonicalId({ id: row.pluginId, repo: row.repo })
    const aliases = [row.pluginId, row.npm, row.repo].filter(value => typeof value === 'string' && value.length > 0)
    entries.push({
      id: row.pluginId,
      canonicalId: id,
      aliases,
      surface: surface.id,
      evidenceGrade: row.evidenceGrade,
      unrated: row.unrated,
      goe: row.goe,
      operatorOwned: row.operatorOwned,
      missing: row.missing,
      taskReviewed: row.taskReviewed ?? false,
      versionBound: false,
      measured: row.tier === 'measured',
      rank: row.rank,
      score: row.discovery?.score ?? row.score,
      scoreScale: row.discovery?.scale ?? row.scoreScale,
      scoreLabel: 'legacy discovery — not a quality score',
      badge: `badges/${row.pluginId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}.svg`,
    })
  }
}
const payload = {
  schema: 'dsh-score/signals/v1',
  generatedAt: registry.generatedAt,
  source: {
    registry: 'data/registry.json',
    inputHash: registry.source?.inputHash ?? null,
    reliabilityVersion: registry.scoring?.reliabilityVersion ?? null,
  },
  note: 'Decoration only: E0/unrated means no outcome evidence. A market must not use this file as its default ranking.',
  entries,
  stats: {
    entries: entries.length,
    measured: entries.filter(entry => entry.measured).length,
    unrated: entries.filter(entry => entry.unrated).length,
    grades: entries.reduce((counts, entry) => {
      counts[entry.evidenceGrade] = (counts[entry.evidenceGrade] ?? 0) + 1
      return counts
    }, {}),
  },
  identityIndexSize: index.size,
}
for (const dir of [join(ROOT, 'integrations/market'), join(ROOT, 'site/market')]) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'signals.json'), `${JSON.stringify(payload, null, 2)}\n`)
}
console.log(`wrote integrations/market/signals.json · ${entries.length} entries · ${payload.stats.unrated} unrated`)
