/**
 * P0 invariants for the public dsh-score artifacts.
 *
 * These are the rules the old artifact violated:
 *   - prior-only rows are E0 and never carry a quality rank;
 *   - top3/featured/overall contain only positive measured rows;
 *   - unrated rows have no top badge and no `#1` claim;
 *   - the documented prior-only formula is the implemented one.
 *
 * Read-only. Exits 1 on the first violation.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
const badges = JSON.parse(readFileSync(join(ROOT, 'badges/index.json'), 'utf8'))
const failures = []

function fail(message) {
  failures.push(message)
}

if (registry.schema !== 'dsh-attention/registry/v1') fail(`unexpected schema ${registry.schema}`)
if (typeof registry.stats?.unratedPlugins !== 'number') fail('stats.unratedPlugins missing')
if (!registry.scoring?.reliabilityVersion) fail('scoring.reliabilityVersion missing')
if (/min\(prior/.test(registry.scoring?.formula ?? '')) fail('scoring.formula still says min(prior,60)')
if ((registry.scoring?.priorOnlyFormula ?? '') !== '60*prior/100') fail('scoring.priorOnlyFormula must be 60*prior/100')
if ((registry.overall ?? []).some(row => row.tier !== 'measured')) fail('overall contains a non-measured row')

for (const surface of registry.surfaces ?? []) {
  if (!Array.isArray(surface.top3)) fail(`${surface.id}: top3 is not an array`)
  if (surface.top3.some(row => row.tier !== 'measured' || row.goe?.positive !== true)) {
    fail(`${surface.id}: top3 contains a non-positive or non-measured row`)
  }
  if (surface.featured !== null && surface.featured?.goe?.positive !== true) {
    fail(`${surface.id}: featured is not positive measured`)
  }
  for (const row of surface.leaderboard ?? []) {
    if (row.unrated === true && row.rank !== null) fail(`${row.pluginId}: unrated row has rank ${row.rank}`)
    if (row.evidenceGrade === 'E0' && row.tier !== 'prior') fail(`${row.pluginId}: E0 row is not prior`)
    if (row.tier === 'measured' && row.goe?.positive === true && typeof row.evidenceGrade !== 'string') {
      fail(`${row.pluginId}: positive measured row has no evidenceGrade`)
    }
  }
}

for (const badge of badges.badges ?? []) {
  if (badge.unrated === true && badge.rank !== null) fail(`${badge.pluginId}: unrated badge has rank ${badge.rank}`)
}
for (const file of readdirSync(join(ROOT, 'badges'))) {
  if (file.endsWith('-top.svg')) fail(`stale top badge: badges/${file}`)
}

if (failures.length > 0) {
  console.error(`invariants failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`invariants ok · ${registry.stats.plugins} rows · ${registry.stats.unratedPlugins} unrated · 0 quality #1`)
