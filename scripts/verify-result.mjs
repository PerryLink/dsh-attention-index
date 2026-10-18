/**
 * Verify a signed bench result against a public runner key.
 *
 * The signature covers the canonical JSON of the result with `signature`
 * removed. A result is only `verified` when:
 *   - the schema is `dsh-attention/bench-result/v1`;
 *   - `runner.keyId` resolves to a known Ed25519 public key;
 *   - the signature is valid;
 *   - the environment manifest is present and has a fixture hash.
 *
 * Verification is not a judgement about whether the task is good; it only
 * proves the runner signed these bytes. Task review and sandbox strength are
 * separate gates.
 */
import { createPublicKey, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { canonicalJson } from './bench-run.mjs'

/** Remove the signature field and return canonical bytes. */
export function signedPayload(result) {
  const { signature, ...rest } = result
  return Buffer.from(canonicalJson(rest))
}

/**
 * @param {object} result - bench result.
 * @param {Record<string,string>} publicKeys - keyId -> PEM.
 * @returns {{valid:boolean, reason:string, keyId:string|null}}
 */
export function verifyResult(result, publicKeys) {
  const keyId = result?.runner?.keyId
  if (result?.schema !== 'dsh-attention/bench-result/v1') return { valid: false, reason: 'schema', keyId: keyId ?? null }
  if (typeof keyId !== 'string' || keyId.length === 0) return { valid: false, reason: 'missing-key-id', keyId: null }
  if (typeof result.signature !== 'string') return { valid: false, reason: 'unsigned', keyId }
  if (!result.environment || typeof result.environment.fixtureHash !== 'string') {
    return { valid: false, reason: 'missing-environment', keyId }
  }
  const pem = publicKeys?.[keyId]
  if (typeof pem !== 'string') return { valid: false, reason: 'unknown-key', keyId }
  try {
    const key = createPublicKey(pem)
    const ok = verify(null, signedPayload(result), key, Buffer.from(result.signature, 'base64'))
    return { valid: ok, reason: ok ? 'ok' : 'bad-signature', keyId }
  } catch {
    return { valid: false, reason: 'bad-key', keyId }
  }
}

/** Load `{ runners: [{ id, publicKey }] }` into a key map. */
export function loadPublicKeys(path) {
  const file = JSON.parse(readFileSync(path, 'utf8'))
  const map = {}
  for (const runner of file.runners ?? []) {
    if (typeof runner.id === 'string' && typeof runner.publicKey === 'string') map[runner.id] = runner.publicKey
  }
  return map
}

function main() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }
  const resultPath = get('--result')
  const runnersPath = get('--runners') ?? 'data/runners.json'
  if (resultPath === undefined) throw new Error('--result is required')
  const result = JSON.parse(readFileSync(resultPath, 'utf8'))
  const verdict = verifyResult(result, loadPublicKeys(runnersPath))
  console.log(JSON.stringify(verdict, null, 2))
  if (!verdict.valid) process.exit(1)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (error) { console.error(`verify-result: ${error.message}`); process.exit(1) }
}
