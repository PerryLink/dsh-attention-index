/**
 * Export a join feed for `dsh-recommend` (and any catalog that keys plugins by
 * GitHub `owner/repo`). The global popularity ranking stays theirs; this feed
 * adds a task-conditioned Community Bench sidecar without replacing it.
 *
 * Usage: node scripts/export-recommend.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
const badges = JSON.parse(readFileSync(join(ROOT, 'badges/index.json'), 'utf8'))
const badgeByPlugin = new Map((badges.badges ?? []).map(badge => [badge.pluginId, badge]))

/** GitHub owner/repo from a repo URL. */
function fullNameOf(url) {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '')
    return path.split('/').slice(0, 2).join('/')
  } catch {
    return undefined
  }
}

const byFullName = {}
const bySurface = {}
for (const surface of registry.surfaces) {
  bySurface[surface.id] = {
    label: surface.label,
    zh: surface.zh,
    top3: surface.top3.map(row => ({
      pluginId: row.pluginId,
      fullName: fullNameOf(row.repo),
      rank: row.rank,
      score: row.score,
      scoreScale: row.scoreScale,
      tier: row.tier,
      prior: row.prior,
      bench: row.bench,
      coverage: row.coverage,
      confidence: row.confidence,
    })),
  }
  for (const row of surface.leaderboard) {
    const fullName = fullNameOf(row.repo)
    if (fullName === undefined) continue
    const badge = badgeByPlugin.get(row.pluginId)
    byFullName[fullName] = {
      pluginId: row.pluginId,
      surface: surface.id,
      surfaceLabel: surface.label,
      rank: row.rank,
      score: row.score,
      scoreScale: row.scoreScale,
      tier: row.tier,
      prior: row.prior,
      bench: row.bench,
      coverage: row.coverage,
      confidence: row.confidence,
      badge: badge?.markdown ?? null,
      registry: 'data/registry.json',
    }
  }
}

const feed = {
  schema: 'dsh-attention/recommend-feed/v1',
  generatedAt: registry.generatedAt,
  scoringVersion: registry.scoring.version,
  source: 'data/registry.json',
  note: 'Sidecar only: join by GitHub fullName. Do not replace the host ranking score; show the Community Bench score and tier beside it.',
  byFullName,
  bySurface,
}

const out = join(ROOT, 'integrations/dsh-recommend/bench-feed.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(feed, null, 2)}\n`)
console.log(`wrote ${out} · ${Object.keys(byFullName).length} repos · ${Object.keys(bySurface).length} surfaces`)
