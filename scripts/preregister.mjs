/**
 * Pre-register the pilot task pack.
 *
 * Pre-registration fixes the task text, checks, model, harness, fixture hashes
 * and the analysis before results are seen. It does not make the pack reviewed
 * or independent; those are separate fields and must stay false until a named
 * reviewer signs off.
 *
 * Usage:
 *   node scripts/preregister.mjs
 *   node scripts/preregister.mjs --check
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { canonicalJson, hashDir } from './bench-run.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TASKS_PATH = join(ROOT, 'data/tasks.json')
const OUTPUT = join(ROOT, 'data/preregistration.json')

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export async function buildPreregistration() {
  const tasksFile = JSON.parse(readFileSync(TASKS_PATH, 'utf8'))
  const pack = tasksFile.pilotPack
  if (pack === undefined) throw new Error('pilotPack missing from data/tasks.json')
  const tasks = tasksFile.tasks
    .filter(task => pack.tasks.includes(task.id))
    .sort((left, right) => left.id.localeCompare(right.id))
  if (tasks.length !== pack.tasks.length) throw new Error('pilotPack references missing tasks')
  const entries = []
  for (const task of tasks) {
    const fixtureHash = await hashDir(join(ROOT, 'fixtures', task.id))
    entries.push({
      id: task.id,
      surface: task.surface,
      taskHash: `sha256:${sha256(canonicalJson(task))}`,
      fixtureHash,
    })
  }
  const taskHash = `sha256:${sha256(canonicalJson(entries))}`
  return {
    schema: 'dsh-score/preregistration/v1',
    pack: pack.id,
    createdAt: new Date().toISOString(),
    taskHash,
    tasks: entries,
    model: 'deepseek-flash',
    harness: '0.2.1-rc.2',
    primaryOutcome: 'pass',
    minTasks: 5,
    minRunsPerArm: 5,
    analysis: 'Newcombe difference interval; FDR across plugins within a surface',
    independentReview: false,
    reviewedBy: null,
    note: 'Unreviewed pilot pack. E2 provisional at most until independent review and results publication.',
  }
}

async function main() {
  const check = process.argv.includes('--check')
  const payload = await buildPreregistration()
  if (check) {
    if (!existsSync(OUTPUT)) throw new Error('data/preregistration.json missing')
    const existing = JSON.parse(readFileSync(OUTPUT, 'utf8'))
    if (existing.taskHash !== payload.taskHash) {
      throw new Error(`preregistration drift: ${existing.taskHash} != ${payload.taskHash}`)
    }
    console.log(`preregistration ok · ${existing.pack} · ${existing.taskHash}`)
    return
  }
  writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote data/preregistration.json · ${payload.pack} · ${payload.taskHash}`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`preregister: ${error.message}`); process.exit(1) })
}
