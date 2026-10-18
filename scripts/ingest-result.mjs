/**
 * Ingest one signed bench result.
 *
 * Ingest is deliberately strict: signature, runner key, task status, fixture
 * hash, check consistency, sandbox metadata, run id and duplicates are checked.
 * It never edits, fills or "repairs" a result.
 *
 * Usage:
 *   node scripts/ingest-result.mjs --result data/results/<run>.json \
 *     --runners data/runners.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hashDir } from './bench-run.mjs'
import { loadPublicKeys, verifyResult } from './verify-result.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const TASK_ID = /^[a-z0-9][a-z0-9-]{2,63}$/

/**
 * Validate without writing. Used by ingest and by the publish aggregation.
 * @param {object} result
 * @param {{publicKeys:object, tasks:object[], fixturesDir:string}} options
 * @returns {Promise<{ok:boolean, reason:string}>}
 */
export async function validateResult(result, options) {
  const verdict = verifyResult(result, options.publicKeys)
  if (!verdict.valid) return { ok: false, reason: verdict.reason }
  if (typeof result.runId !== 'string' || !RUN_ID.test(result.runId)) return { ok: false, reason: 'bad-run-id' }
  if (typeof result.taskId !== 'string' || !TASK_ID.test(result.taskId)) return { ok: false, reason: 'bad-task-id' }
  const task = (options.tasks ?? []).find(item => item.id === result.taskId)
  if (task === undefined) return { ok: false, reason: 'unknown-task' }
  if (task.status === 'draft') return { ok: false, reason: 'draft-task' }
  if (typeof result.plugin?.id !== 'string' || result.plugin.id.length === 0) return { ok: false, reason: 'missing-plugin' }
  if (typeof result.plugin?.version !== 'string' || result.plugin.version.length === 0) return { ok: false, reason: 'missing-plugin-version' }
  if (result.arm !== 'with' && result.arm !== 'without') return { ok: false, reason: 'bad-arm' }
  if (result.runner?.id !== result.runner?.keyId) return { ok: false, reason: 'runner-id-key-mismatch' }

  const checks = result.outcome?.checks
  if (!Array.isArray(checks) || checks.length === 0) return { ok: false, reason: 'missing-outcome' }
  if (checks.some(check => typeof check.pass !== 'boolean')) return { ok: false, reason: 'bad-check' }
  const recomputed = checks.every(check => check.pass === true)
  if (result.outcome.pass !== recomputed) return { ok: false, reason: 'pass-check-mismatch' }

  const sandbox = result.sandbox
  const strength = result.sandboxStrength
  if (sandbox === 'none') {
    if (result.environmentBound !== false || strength !== 'none') return { ok: false, reason: 'sandbox-inconsistent' }
  } else if (sandbox === 'bwrap-fs') {
    if (result.environmentBound !== true || strength !== 'fs') return { ok: false, reason: 'sandbox-inconsistent' }
    if (result.environment?.sandbox !== 'bwrap-fs' || result.environment?.sandboxStrength !== 'fs') return { ok: false, reason: 'sandbox-inconsistent' }
  } else if (sandbox === 'bwrap-net') {
    if (result.environmentBound !== true || strength !== 'network') return { ok: false, reason: 'sandbox-inconsistent' }
    if (result.environment?.sandbox !== 'bwrap-net' || result.environment?.sandboxStrength !== 'network') return { ok: false, reason: 'sandbox-inconsistent' }
  } else {
    return { ok: false, reason: 'unknown-sandbox' }
  }

  const fixtureDir = join(options.fixturesDir, result.taskId)
  if (!existsSync(fixtureDir)) return { ok: false, reason: 'missing-fixture' }
  const actual = await hashDir(fixtureDir)
  if (typeof result.environment?.fixtureHash !== 'string' || actual !== result.environment.fixtureHash) {
    return { ok: false, reason: 'fixture-hash-mismatch' }
  }
  return { ok: true, reason: 'valid' }
}

/**
 * Validate and write. Refuses duplicates and never overwrites an existing file.
 * @param {object} result
 * @param {object} options - `{ publicKeys, tasks, fixturesDir, outDir }`.
 * @returns {Promise<{ok:boolean, reason:string, path?:string}>}
 */
export async function ingestResult(result, options) {
  const validation = await validateResult(result, options)
  if (!validation.ok) return validation

  mkdirSync(options.outDir, { recursive: true })
  for (const name of readdirSync(options.outDir)) {
    if (!name.endsWith('.json')) continue
    let existing
    try { existing = JSON.parse(readFileSync(join(options.outDir, name), 'utf8')) } catch { continue }
    if (existing.runId === result.runId) return { ok: false, reason: 'duplicate-run-id' }
    if (existing.taskId === result.taskId
      && existing.plugin?.id === result.plugin?.id
      && existing.plugin?.version === result.plugin?.version
      && existing.arm === result.arm
      && existing.sessionHash === result.sessionHash) {
      return { ok: false, reason: 'duplicate-session' }
    }
  }
  const path = join(options.outDir, `${result.runId}.json`)
  try {
    writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    return { ok: false, reason: error?.code === 'EEXIST' ? 'duplicate-file' : 'write-failed' }
  }
  return { ok: true, reason: 'accepted', path }
}

async function main() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }
  const resultPath = get('--result')
  if (resultPath === undefined) throw new Error('--result is required')
  const result = JSON.parse(readFileSync(resultPath, 'utf8'))
  const tasksFile = JSON.parse(readFileSync(join(ROOT, 'data/tasks.json'), 'utf8'))
  const verdict = await ingestResult(result, {
    publicKeys: loadPublicKeys(resolve(ROOT, get('--runners') ?? 'data/runners.json')),
    tasks: tasksFile.tasks,
    fixturesDir: join(ROOT, 'fixtures'),
    outDir: resolve(ROOT, get('--out') ?? 'data/results'),
  })
  console.log(JSON.stringify(verdict, null, 2))
  if (!verdict.ok) process.exit(1)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`ingest-result: ${error.message}`); process.exit(1) })
}
