/**
 * Identity resolution for dsh-score.
 *
 * A plugin may be named by a PerryLink id, a GitHub URL, `owner/repo`, an npm
 * package, or a bundle alias. The registry keeps one canonical id: the GitHub
 * `owner/repo` when it can be derived, otherwise the existing id. Aliases are
 * resolved, never guessed.
 */

/** Extract `owner/repo` from a GitHub URL or `github:owner/repo`. */
export function githubFullName(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  const prefixed = /^github:([^/]+\/[^/#?]+)$/i.exec(text)
  if (prefixed !== null) return normalizeFullName(prefixed[1])
  const url = /^https?:\/\/(?:www\.)?github\.com\/([^/]+\/[^/#?]+)/i.exec(text)
  if (url !== null) return normalizeFullName(url[1])
  const bare = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)$/i.exec(text)
  if (bare !== null && !text.includes('://')) return normalizeFullName(text)
  return null
}

/** Lowercase owner/repo without a trailing `.git`. */
export function normalizeFullName(value) {
  const text = String(value).replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '')
  const [owner, repo, ...rest] = text.split('/')
  if (owner === undefined || repo === undefined || rest.length > 0) return null
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`
}

/** Canonical id for one plugin row. */
export function canonicalId(plugin) {
  return githubFullName(plugin?.repo) ?? githubFullName(plugin?.id) ?? String(plugin?.id ?? '').toLowerCase()
}

/**
 * Build an alias map. Ambiguous aliases resolve to `null`; callers must treat
 * that as unresolved rather than picking one.
 *
 * @param {object[]} plugins
 * @returns {Map<string,string|null>}
 */
export function identityIndex(plugins) {
  const index = new Map()
  const add = (alias, id) => {
    if (typeof alias !== 'string' || alias.length === 0) return
    const key = alias.toLowerCase()
    if (!index.has(key)) index.set(key, id)
    else if (index.get(key) !== id) index.set(key, null)
  }
  for (const plugin of plugins ?? []) {
    const id = canonicalId(plugin)
    if (id === '') continue
    add(id, id)
    add(plugin.id, id)
    add(plugin.npm, id)
    add(plugin.repo, id)
    add(githubFullName(plugin.repo), id)
    for (const alias of plugin.aliases ?? []) add(alias, id)
  }
  return index
}

/** Resolve one alias; `undefined` means unknown, `null` means ambiguous. */
export function resolveId(index, value) {
  if (typeof value !== 'string') return undefined
  const full = githubFullName(value)
  if (full !== null && index.has(full)) return index.get(full)
  const key = value.trim().toLowerCase()
  return index.has(key) ? index.get(key) : undefined
}
