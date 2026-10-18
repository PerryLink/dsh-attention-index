/** Verify the release signature on the versioned API snapshot. */
import { createHash, createPublicKey, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function verifyApi() {
  const bytes = readFileSync(join(ROOT, 'api/v1/registry.json'))
  const sig = JSON.parse(readFileSync(join(ROOT, 'api/v1/registry.sig'), 'utf8'))
  const keys = JSON.parse(readFileSync(join(ROOT, 'data/release-keys.json'), 'utf8'))
  const entry = (keys.keys ?? []).find(key => key.id === sig.keyId)
  if (entry === undefined) return { valid: false, reason: 'unknown-key' }
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  if (digest !== sig.sha256) return { valid: false, reason: 'digest-mismatch' }
  const ok = verify(null, bytes, createPublicKey(entry.publicKey), Buffer.from(sig.signature, 'base64'))
  return { valid: ok, reason: ok ? 'ok' : 'bad-signature', keyId: sig.keyId }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = verifyApi()
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exit(1)
}
