import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { canonicalJson } from '../scripts/bench-run.mjs'
import { verifyResult } from '../scripts/verify-result.mjs'

function signedFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const result = {
    schema: 'dsh-attention/bench-result/v1',
    runId: 'br_test_1',
    taskId: 'p1-dev-add',
    plugin: { id: 'alice/demo', version: '1.0.0' },
    arm: 'with',
    outcome: { pass: true, checks: [] },
    environment: { fixtureHash: 'sha256:fixture', sandbox: 'none' },
    environmentBound: false,
    runner: { id: 'bench:test', keyId: 'bench:test' },
  }
  const signature = sign(null, Buffer.from(canonicalJson(result)), privateKey).toString('base64')
  return {
    result: { ...result, signature },
    publicKeys: { 'bench:test': publicKey.export({ format: 'pem', type: 'spki' }) },
  }
}

test('a signed result verifies and tampering fails', () => {
  const { result, publicKeys } = signedFixture()
  assert.equal(verifyResult(result, publicKeys).valid, true)
  const tampered = { ...result, outcome: { pass: false, checks: [] } }
  assert.equal(verifyResult(tampered, publicKeys).reason, 'bad-signature')
})

test('unknown key and missing environment are rejected', () => {
  const { result, publicKeys } = signedFixture()
  assert.equal(verifyResult(result, {}).reason, 'unknown-key')
  const noEnvironment = { ...result, environment: undefined }
  assert.equal(verifyResult(noEnvironment, publicKeys).reason, 'missing-environment')
})
