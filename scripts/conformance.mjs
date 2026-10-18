/**
 * P3 conformance suite.
 *
 * This is the public contract test: invariants, audit contract, pre-registration
 * hash, API etag, market signal counts and the absence of stale top badges.
 * It does not claim that any plugin is good; it proves the artifacts obey the
 * reliability rules.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateAudits } from './audit-check.mjs'
import { verifyApi } from './verify-api.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function run(script, args = []) {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) failures.push(`${script} failed: ${(result.stderr || result.stdout).trim().split('\n').slice(-3).join(' | ')}`)
  return result
}

run('check-invariants.mjs')
run('audit-check.mjs')
run('preregister.mjs', ['--check'])

const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
const api = JSON.parse(readFileSync(join(ROOT, 'api/v1/registry.json'), 'utf8'))
const signals = JSON.parse(readFileSync(join(ROOT, 'integrations/market/signals.json'), 'utf8'))

const { etag, ...apiBase } = api
const expectedEtag = `sha256:${createHash('sha256').update(JSON.stringify(apiBase)).digest('hex')}`
if (etag !== expectedEtag) failures.push(`api etag mismatch: ${etag} != ${expectedEtag}`)
if (api.source?.inputHash !== registry.source?.inputHash) failures.push('api source hash does not match registry')
if (signals.stats?.unrated !== registry.stats?.unratedPlugins) failures.push('signals unrated count does not match registry')
if (signals.entries?.length !== registry.stats?.plugins) failures.push('signals entry count does not match registry')
if (signals.source?.inputHash !== registry.source?.inputHash) failures.push('signals source hash does not match registry')
if ((signals.stats?.measured ?? 0) !== registry.stats?.measuredPlugins) failures.push('signals measured count does not match registry')

const apiSignature = verifyApi()
if (!apiSignature.valid) failures.push(`api signature: ${apiSignature.reason}`)

const audits = JSON.parse(readFileSync(join(ROOT, 'data/audits/index.json'), 'utf8'))
for (const failure of validateAudits(registry, audits)) failures.push(failure)

if (failures.length > 0) {
  console.error(`conformance failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`conformance ok · ${registry.stats.plugins} rows · ${registry.stats.unratedPlugins} unrated · api ${etag.slice(0, 20)}…`)
