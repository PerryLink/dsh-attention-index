import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalJson, hashDir } from '../scripts/bench-run.mjs'
import { ingestResult } from '../scripts/ingest-result.mjs'

const fixturesDir = fileURLToPath(new URL('../fixtures/', import.meta.url))

async function signedResult() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const fixtureHash = await hashDir(join(fixturesDir, 'p1-dev-add'))
  const result = {
    schema: 'dsh-attention/bench-result/v1',
    runId: 'br_ingest_1',
    taskId: 'p1-dev-add',
    plugin: { id: 'alice/demo', version: '1.0.0' },
    arm: 'with',
    outcome: { pass: true, checks: [{ id: 'test', pass: true }] },
    sessionHash: 'sha256:session',
    environment: { fixtureHash, sandbox: 'bwrap' },
    environmentBound: true,
    runner: { id: 'bench:test', keyId: 'bench:test' },
  }
  const signature = sign(null, Buffer.from(canonicalJson(result)), privateKey).toString('base64')
  return {
    result: { ...result, signature },
    privateKey,
    publicKeys: { 'bench:test': publicKey.export({ format: 'pem', type: 'spki' }) },
  }
}

test('a valid signed result is ingested once', async () => {
  const { result, publicKeys } = await signedResult()
  const outDir = mkdtempSync(join(tmpdir(), 'dsh-ingest-'))
  const options = { publicKeys, tasks: [{ id: 'p1-dev-add' }], fixturesDir, outDir }
  const first = await ingestResult(result, options)
  assert.equal(first.ok, true)
  const again = await ingestResult(result, options)
  assert.equal(again.ok, false)
  assert.ok(['duplicate-run-id', 'duplicate-session'].includes(again.reason))
})

test('fixture mismatch and bad signature are rejected', async () => {
  const { result, privateKey, publicKeys } = await signedResult()
  const outDir = mkdtempSync(join(tmpdir(), 'dsh-ingest-'))
  const mismatch = { ...result, environment: { ...result.environment, fixtureHash: 'sha256:wrong' } }
  delete mismatch.signature
  mismatch.signature = sign(null, Buffer.from(canonicalJson(mismatch)), privateKey).toString('base64')
  const bad = await ingestResult(mismatch, { publicKeys, tasks: [{ id: 'p1-dev-add' }], fixturesDir, outDir })
  assert.equal(bad.reason, 'fixture-hash-mismatch')

  const unsigned = { ...result }
  delete unsigned.signature
  const noSignature = await ingestResult(unsigned, { publicKeys, tasks: [{ id: 'p1-dev-add' }], fixturesDir, outDir })
  assert.equal(noSignature.reason, 'unsigned')
})
