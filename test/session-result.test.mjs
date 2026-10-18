import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSessionResult } from '../scripts/bench-run.mjs'

test('session log is the answer source, not stdout', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-session-'))
  const dir = join(home, 'sessions', 'project', 's1')
  mkdirSync(dir, { recursive: true })
  const events = [
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'real answer' }] }, usage: { totalTokens: 12 } } },
    { type: 'tool/result', data: { message: { isError: true } } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
  ]
  writeFileSync(join(dir, 'session.jsonl'), `${events.map(event => JSON.stringify(event)).join('\n')}\n`)
  const result = await readSessionResult(home)
  assert.equal(result.text, 'real answer')
  assert.equal(result.tokens, 12)
  assert.equal(result.toolErrors, 1)
  assert.equal(result.turnEnded, true)
})
