import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalId, githubFullName, identityIndex, resolveId } from '../scripts/identity.mjs'

test('GitHub URL, owner/repo and github: prefix canonicalize', () => {
  assert.equal(githubFullName('https://github.com/PerryLink/dsh-score'), 'perrylink/dsh-score')
  assert.equal(githubFullName('github:PerryLink/dsh-memento.git'), 'perrylink/dsh-memento')
  assert.equal(githubFullName('PerryLink/dsh-kit'), 'perrylink/dsh-kit')
  assert.equal(githubFullName('dsh-kit'), null)
})

test('canonical id prefers the repository full name', () => {
  assert.equal(canonicalId({ id: 'perrylink/dsh-memento', repo: 'https://github.com/PerryLink/dsh-memento' }), 'perrylink/dsh-memento')
  assert.equal(canonicalId({ id: 'perrylink/dsh-memento', repo: null }), 'perrylink/dsh-memento')
})

test('aliases resolve and ambiguity is explicit', () => {
  const index = identityIndex([
    { id: 'perrylink/dsh-memento', repo: 'https://github.com/PerryLink/dsh-memento', npm: 'dsh-memento' },
    { id: 'alice/memory', repo: 'https://github.com/alice/memory', npm: 'alice-memory' },
  ])
  assert.equal(resolveId(index, 'dsh-memento'), 'perrylink/dsh-memento')
  assert.equal(resolveId(index, 'https://github.com/PerryLink/dsh-memento'), 'perrylink/dsh-memento')
  assert.equal(resolveId(index, 'nope'), undefined)
})
