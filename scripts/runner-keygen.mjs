/**
 * Generate an Ed25519 runner key pair.
 *
 * The private key stays outside the repository (default `~/.dsh-bench/`), mode
 * 0600. The public key is printed as a `data/runners.json` entry. A runner id is
 * a stable public label, not a person's real name.
 *
 * Usage:
 *   node scripts/runner-keygen.mjs --runner-id bench:alice-1
 */
import { generateKeyPairSync } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const get = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const runnerId = get('--runner-id') ?? 'bench:local-1'
if (!/^bench:[a-z0-9][a-z0-9._-]*$/i.test(runnerId)) {
  throw new Error('--runner-id must look like bench:<stable-label>')
}
const out = resolve(get('--out') ?? join(homedir(), '.dsh-bench', `${runnerId.replace(/[^a-z0-9._-]/gi, '_')}.pem`))
if (existsSync(out)) throw new Error(`refusing to overwrite existing key: ${out}`)
mkdirSync(dirname(out), { recursive: true, mode: 0o700 })
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' })
const publicPem = publicKey.export({ format: 'pem', type: 'spki' })
writeFileSync(out, privatePem, { mode: 0o600 })
chmodSync(out, 0o600)
console.log(`private key: ${out}`)
console.log('add this to data/runners.json:')
console.log(JSON.stringify({
  id: runnerId,
  publicKey: publicPem,
  createdAt: new Date().toISOString().slice(0, 10),
}, null, 2))
