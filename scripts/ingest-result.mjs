/**
 * Ingest one signed bench result.
 *
 * Ingest is deliberately strict: it verifies the Ed25519 signature, the runner
 * key, the task id, the environment manifest, the fixture hash and duplicates.
 * It never edits, fills or "repairs" a result. A rejected result stays out of
 * `data/results/` and therefore out of the registry.
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

/**
 * @param {object} result
 * @param {object} options - `{ publicKeys, tasks, fixturesDir, outDir }`.
 * @returns {Promise<{ok:boolean, reason:string, path?:string}>}
 */
export async function ingestResult(result, options) {
  const verdict = verifyResult(result, options.publicKeys)
  if (!verdict.valid) return { ok: false, reason: verdict.reason }
  const task = (options.tasks ?? []).find(item => item.id === result.taskId)
  if (task === undefined) return { ok: false, reason: 'unknown-task' }
  if (result.plugin?.id === undefined || result.plugin?.version === undefined) return { ok: false, reason: 'missing-plugin' }
  if (result.arm !== 'with' && result.arm !== 'without') return { ok: false, reason: 'bad-arm' }
  if (!Array.isArray(result.outcome?.checks) || typeof result.outcome?.pass !== 'boolean') {
    return { ok: false, reason: 'missing-outcome' }
  }

  const fixtureDir = join(options.fixturesDir, result.taskId)
  if (existsSync(fixtureDir)) {
    const actual = await hashDir(fixtureDir)
    if (actual !== result.environment.fixtureHash) return { ok: false, reason: 'fixture-hash-mismatch' }
  }

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
  const path = join(options.outDir, `${String(result.runId).replace(/[^a-z0-9._-]/gi, '_')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
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
