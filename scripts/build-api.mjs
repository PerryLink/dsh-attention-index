/**
 * Build the versioned static API from the committed registry.
 *
 * This is a mirror, not a second source of truth: `data/registry.json` remains
 * canonical. The API object adds `apiVersion` and a content hash so a consumer
 * can pin a snapshot. The hash covers the API object without `etag`.
 *
 * Usage:
 *   node scripts/build-api.mjs
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(ROOT, 'data/registry.json'), 'utf8'))
const base = { ...registry, apiVersion: 'v1' }
const etag = `sha256:${createHash('sha256').update(JSON.stringify(base)).digest('hex')}`
const api = { ...base, etag }
const index = {
  schema: 'dsh-score/api-index/v1',
  apiVersion: 'v1',
  generatedAt: registry.generatedAt,
  registry: 'registry.json',
  sha256: 'registry.sha256',
  signature: 'registry.sig',
  etag,
  note: 'Static, cacheable snapshot. registry.sha256 is the canonical-object etag; registry.sig.sha256 is the file digest.',
}
for (const dir of [join(ROOT, 'api/v1'), join(ROOT, 'site/api/v1')]) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'registry.json'), `${JSON.stringify(api, null, 2)}\n`)
  writeFileSync(join(dir, 'registry.sha256'), `${etag}\n`)
  writeFileSync(join(dir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
}
console.log(`wrote api/v1 · ${api.stats.plugins} plugins · ${etag}`)
