/**
 * Enforce the E5 audit contract.
 *
 * A registry row may be E5 only when `data/audits/index.json` contains an
 * independent, passing attestation whose scope matches the plugin and version.
 * The script does not grant an audit; it only rejects an unsupported claim.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @returns {string[]} failures */
export function validateAudits(registry, auditFile) {
  const failures = []
  const audits = Array.isArray(auditFile?.audits) ? auditFile.audits : []
  for (const surface of registry.surfaces ?? []) {
    for (const row of surface.leaderboard ?? []) {
      if (row.evidenceGrade !== 'E5') continue
      const matches = audits.filter(audit => {
        if (audit.independent !== true) return false
        if (audit.result !== 'pass' && audit.result !== 'pass-with-findings') return false
        const scope = String(audit.scope ?? '')
        return scope.includes(row.pluginId) || scope.includes(surface.id)
      })
      if (matches.length === 0) failures.push(`${row.pluginId}: E5 without an independent passing audit`)
      for (const audit of matches) {
        if (typeof audit.auditor !== 'string' || audit.auditor.length === 0) failures.push(`${row.pluginId}: audit has no auditor`)
        if (typeof audit.evidenceUrl !== 'string' || !/^https?:\/\//.test(audit.evidenceUrl)) failures.push(`${row.pluginId}: audit has no public evidence URL`)
      }
    }
  }
  return failures
}

function main() {
  const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
  const audits = JSON.parse(readFileSync(join(ROOT, 'data/audits/index.json'), 'utf8'))
  const failures = validateAudits(registry, audits)
  if (failures.length > 0) {
    console.error(`audit-check failed (${failures.length}):`)
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
  console.log(`audit-check ok · ${audits.audits?.length ?? 0} audit(s) · 0 unsupported E5`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (error) { console.error(`audit-check: ${error.message}`); process.exit(1) }
}
