# P2 integration contract

Status: modules and static artifacts implemented; no third-party market is
integrated yet. Nothing here computes a per-user score or reads raw sessions.

## Identity

`scripts/identity.mjs` resolves GitHub URLs, `owner/repo`, `github:` prefixes and
npm names to one canonical `owner/repo`. Unknown is `undefined`; ambiguous is
`null`. A consumer must not guess.

## Versioned API

`scripts/build-api.mjs` writes:

- `api/v1/registry.json` — the public registry plus `apiVersion` and `etag`.
- `api/v1/registry.sha256` — the canonical-object etag (hash of the API object without `etag`). It is **not** the file digest; `registry.sig.sha256` carries the file digest.
- `api/v1/registry.sig` — Ed25519 signature by `release:main` (operator attestation, not an independent audit).
- `api/v1/index.json` — endpoint metadata.
- `site/api/v1/*` — the Pages copy.

The hash covers the API object without `etag`. A consumer can pin the hash and
detect drift. There is no history endpoint yet; git history is the history.

## Ingestion

`scripts/ingest-result.mjs` accepts only a signed result whose runner key is in
`data/runners.json`, whose fixture hash matches `fixtures/<taskId>`, and whose
`runId`/session is not a duplicate. Rejections are explicit; the result is not
edited.

```sh
node scripts/verify-result.mjs --result data/results/<run>.json
node scripts/ingest-result.mjs --result data/results/<run>.json
```

## Market signals

`scripts/build-signals.mjs` writes `integrations/market/signals.json` (and the
Pages copy). It is a **decoration**, not a ranking input:

- `evidenceGrade`, `unrated`, `goe`, `operatorOwned`, `missing`;
- `versionBound` (false until a result is bound to the plugin version);
- the legacy discovery score, clearly labelled;
- no local score and no default ordering.

A market must keep its own default ranking, show `E0 / unrated` honestly, and may
not use sponsorship to change a grade. See `docs/OFFICIAL-MARKET.md`.

## Session → brief

`scripts/match-brief.mjs` maps a short user-visible summary and already-visible
tool names to `memory`, `web` or `dev`. Weak or tied input abstains. It does not
read session storage and does not rank plugins.

## Recommendation

`scripts/recommend.mjs` returns:

- `status: "measured"` only for a **positive E3+** public row;
- `status: "unrated"` with unnumbered candidates when no measured row exists;
- `status: "unknown-brief"` otherwise.

The caller must render `unrated` as "no outcome evidence", never as a low score
or a hidden #1.

## Not done

- No market plugin has been installed or given a contract.
- No session chip is enabled; the matcher is a library/CLI.
- No signed snapshot history; only the current static snapshot.
- No FDR/holdout layer yet; those are P1.4.
