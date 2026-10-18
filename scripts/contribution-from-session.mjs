/**
 * Create a public contribution receipt from a DSH session log.
 *
 * Usage:
 *   node scripts/contribution-from-session.mjs \
 *     --session ~/.dsh/sessions/.../session.v4.jsonl.zstd \
 *     --contributor github:your-handle \
 *     --surface memory \
 *     --plugins perrylink/dsh-memento \
 *     --rating 4 \
 *     --nomination some/under-evaluated-plugin
 *
 * The output contains hashes and metrics, not the session text. Review it
 * before opening a PR; do not submit private data even in hashed form if the
 * source itself is sensitive.
 *
 * @module dsh-attention-index/contribution-from-session
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decompress } from 'fzstd'
import { buildContribution } from './contribution.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Parse `--key value` and boolean flags. */
function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    if (key === 'allow-ineligible' || key === 'help') { args[key] = true; continue }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${key}`)
    args[key] = value
    index += 1
  }
  return args
}

/** Read a session log, transparently decompressing zstd. */
async function readSession(path) {
  const bytes = await readFile(path)
  const isZstd = path.endsWith('.zstd') || (bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd)
  const text = isZstd ? Buffer.from(decompress(bytes)).toString('utf8') : bytes.toString('utf8')
  const events = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    try { events.push(JSON.parse(trimmed)) } catch { /* skip non-event diagnostics */ }
  }
  return events
}

/** Main. */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help === true || typeof args.session !== 'string') {
    console.log(`Usage: node scripts/contribution-from-session.mjs --session <path> --contributor <id> --surface <id> [--plugins a,b] [--rating 1-5] [--nomination plugin] [--verification self|replay|replicated] [--out path]`)
    process.exit(args.help === true ? 0 : 1)
  }
  const events = await readSession(resolve(args.session))
  const rating = args.rating === undefined ? undefined : Number(args.rating)
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new Error('--rating must be an integer 1–5')
  const plugins = typeof args.plugins === 'string' ? args.plugins.split(',').map(value => value.trim()).filter(Boolean) : []
  const built = buildContribution(events, {
    contributor: args.contributor ?? 'local',
    surface: args.surface ?? 'general',
    plugins,
    rating,
    nomination: args.nomination,
    verification: args.verification,
    createdAt: args['created-at'],
  })
  if (!built.eligible && args['allow-ineligible'] !== true) {
    console.error(`not eligible: ${built.ineligibleReason}`)
    console.error(`quality ${built.contribution.quality}, price 0; use --allow-ineligible to write a zero-credit receipt`)
    process.exit(1)
  }
  const out = args.out === undefined
    ? join(ROOT, 'data', 'contributions', `${built.contribution.contributionId}.json`)
    : resolve(args.out)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, `${JSON.stringify(built.contribution, null, 2)}\n`)
  console.log(`wrote ${out}`)
  console.log(`contributor ${built.contribution.contributor} · surface ${built.contribution.surface} · quality ${built.contribution.quality} (${built.grade}) · price ${built.contribution.price} · ${basename(out)}`)
  console.log('The receipt contains hashes and metrics only. Review it, then open a PR to data/contributions/.')
}

main().catch((error) => {
  console.error(`contribution: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
