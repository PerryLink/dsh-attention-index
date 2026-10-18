/**
 * Public-evidence recommendation (P2.6, pure).
 *
 * Given a brief, return the public positive measured leader if one exists.
 * Otherwise return `unrated` with unnumbered candidates. This function does not
 * read sessions, does not score plugins and does not reorder by a private model.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { BRIEFS } from './match-brief.mjs'

/**
 * @param {{brief:string, registry:object, limit?:number}} input
 * @returns {object}
 */
export function recommend({ brief, registry, limit = 3 }) {
  if (!Object.hasOwn(BRIEFS, brief)) return { status: 'unknown-brief', brief, recommendation: null, candidates: [] }
  const spec = BRIEFS[brief]
  if (!Number.isInteger(limit) || limit < 1) return { status: 'bad-limit', brief, recommendation: null, candidates: [] }
  const surface = registry?.surfaces?.find(item => item.id === spec.surface)
  if (surface === undefined) return { status: 'unknown-surface', brief, surface: spec.surface, recommendation: null, candidates: [] }

  const measured = (surface.leaderboard ?? [])
    .filter(row => row.tier === 'measured' && row.unrated !== true && row.goe?.positive === true && /^E[3-5]$/.test(row.evidenceGrade))
    .sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999))
  if (measured.length > 0) {
    return {
      status: 'measured',
      brief,
      surface: spec.surface,
      recommendation: measured[0],
      alternatives: measured.slice(1, limit),
      candidates: [],
      note: 'Selected from the public positive measured rank. No local scoring.',
    }
  }

  return {
    status: 'unrated',
    brief,
    surface: spec.surface,
    recommendation: null,
    alternatives: [],
    candidates: (surface.leaderboard ?? []).filter(row => row.unrated === true).slice(0, limit),
    note: 'No positive measured row exists for this brief. Candidates are unrated and unnumbered; do not treat them as a quality rank.',
  }
}

function main() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }
  const brief = get('--brief')
  if (brief === undefined) throw new Error('--brief is required')
  const registry = JSON.parse(readFileSync(get('--registry') ?? 'data/registry.json', 'utf8'))
  console.log(JSON.stringify(recommend({ brief, registry }), null, 2))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (error) { console.error(`recommend: ${error.message}`); process.exit(1) }
}
