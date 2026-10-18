/**
 * Sign the versioned API snapshot with the release key.
 *
 * This is operator attestation of the bytes, not an independent audit. It lets a
 * consumer detect a swapped snapshot; it does not turn E2 into E5.
 */
import { createHash, createPrivateKey, sign } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const keyPath = process.env.DSH_API_SIGNING_KEY ?? join(process.env.HOME ?? '', '.dsh-bench', 'release-main.pem')
const keyId = process.env.DSH_API_KEY_ID ?? 'release:main'
const registryPath = join(ROOT, 'api/v1/registry.json')
const bytes = readFileSync(registryPath)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const signature = sign(null, bytes, createPrivateKey({ key: readFileSync(keyPath, 'utf8'), format: 'pem' })).toString('base64')
const payload = {
  schema: 'dsh-score/api-signature/v1',
  keyId,
  alg: 'ed25519',
  signedFile: 'registry.json',
  sha256: `sha256:${sha256}`,
  signature,
  signedAt: JSON.parse(bytes.toString('utf8')).generatedAt,
}
for (const dir of [join(ROOT, 'api/v1'), join(ROOT, 'site/api/v1')]) {
  writeFileSync(join(dir, 'registry.sig'), `${JSON.stringify(payload, null, 2)}\n`)
}
console.log(`signed api/v1/registry.json · ${keyId} · sha256:${sha256.slice(0, 16)}…`)
