import test from 'node:test'
import assert from 'node:assert/strict'
import { matchBrief } from '../scripts/match-brief.mjs'

test('memory, web and dev summaries match their brief', () => {
  assert.equal(matchBrief({ text: 'Do you remember the convention from the earlier session?' }).surface, 'memory')
  assert.equal(matchBrief({ text: 'Search the web for the latest release and cite the URL.' }).surface, 'web')
  assert.equal(matchBrief({ text: 'Fix the bug in this plugin repo and run the test.' }).surface, 'dev')
})

test('tool names can decide a short summary', () => {
  assert.equal(matchBrief({ text: 'look this up', tools: ['web_search'] }).surface, 'web')
  assert.equal(matchBrief({ text: 'change this', tools: ['edit', 'bash'] }).surface, 'dev')
})

test('weak and ambiguous inputs abstain', () => {
  assert.equal(matchBrief({ text: 'hello' }).abstain, true)
  assert.equal(matchBrief({ text: 'search and test this web code' }).reason, 'ambiguous')
})
