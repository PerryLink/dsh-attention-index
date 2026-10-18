# dsh-score P0–P3 plan and task status

Brand: `dsh-score` · public layer: this repository (rename to `dsh-score-index`
pending) · local inspector: `dsh-score` plugin · consumer: `dsh-community-bench`.

The rule for every phase: **no grade without evidence; no missing value as zero;
no quality #1 from prior-only rows.**

## P0 — truth before any recommendation (implemented in this repo)

| # | Task | Status | Acceptance |
|---|---|---|---|
| P0.1 | SOE/GOE model (`scripts/reliability.mjs`) | done | every row has `evidenceGrade`, `soe`, `goe`, `unrated` |
| P0.2 | Prior-only rows are E0/unrated | done | 42/42 `E0`; `stats.gradeCounts.E0 = 42` |
| P0.3 | No prior `#1`, featured or top badge | done | `top3 = []`, `featured = null`, no `*-top.svg`; stale badges removed |
| P0.4 | Newcombe lift interval | done | 3/3 vs 0/3 lower bound ≈0.205, not 1.0; test updated |
| P0.5 | Missing data is not zero | done | missing dimensions excluded and weights renormalized; `missing` flags published |
| P0.6 | Operator flag + independent verification | done | `operatorOwned` published; verification counts only with `certifiedBy`/`verificationSource` |
| P0.7 | Badge/artifact truth | done | unrated badge; `--check` fails on extra badge files; prior top badges deleted |
| P0.8 | Formula string and rank namespace | done | `60*prior/100`; `rank` null for unrated; `overall = []` |
| P0.9 | Site/consumer display | done | site and tab show GOE/unrated, no prior #1; tab 0.2.0 rebuilt |
| P0.10 | Pin Pages `--today`; content hash/signature | partial | Pages uses `--check --today 2026-10-18`; `source.inputHash` added; signature pending |
| P0.11 | Schema validation for registry/plugins/tasks | partial | invariant script + CI added; JSON Schema pending |

P0 is a **truth fix**, not a measurement. It does not create measured evidence.

## P1 — first credible measured evidence

| # | Task | Status | Depends on |
|---|---|---|---|
| P1.1 | 3–5 briefs × ≥8 executable tasks with fixtures/checks | done (pilot) | 24 offline tasks, 3 briefs × 8; `reviewed:false` caps E2 |
| P1.2 | Sandboxed runner (no host FS/env, egress allowlist, cgroups) | partial | env scrub + temp home + fixture hash + `--sandbox` refusal; no bwrap backend or egress control yet |
| P1.3 | Signed results + environment manifest + dedupe | done | `runner-keygen.mjs`, `verify-result.mjs`, `ingest-result.mjs`; tests |
| P1.4 | Newcombe/paired bootstrap at task level; FDR; holdout | partial | Newcombe + task cap in place; FDR/bootstrap/holdout pending |
| P1.5 | First measured pilot; E2/E3 grades | done (E2 pilot) | 31 signed results, 1 E2 provisional null; E3+ still blocked by task review + sandbox |
| P1.6 | `signals.json` + format-1 decorator + reference index | done | `integrations/market/signals.json` + API; not a third-party market claim |
| P1.7 | `bench_recommend` explicit-surface tool (no session read) | done (pure) | `scripts/recommend.mjs`; Host tool wiring is P2 |
| P1.8 | Publish `dsh-community-bench` 0.2.0 | done | npm `latest`, with provenance |

**Exit criteria:** ≥3 briefs with ≥5 tasks/arm, ≥2 independent runners for one
surface, all results signed; no fabricated data; E2/E3 visible with CI. The code
is ready; the measured result is still blocked by the key/sandbox gate.

## P2 — multi-market and session-aware

| # | Task | Status | Depends on |
|---|---|---|---|
| P2.1 | Identity graph (npm/repo/bundle/aliases, `unrated`) | done (module) | `scripts/identity.mjs` + tests; alias data can grow |
| P2.2 | Versioned API + signed snapshots + history | partial | `api/v1` + etag/sha; history and signatures pending |
| P2.3 | Ingestion + attestation + moderation | done | signature, fixture hash, duplicate checks; moderation is manual |
| P2.4 | Market decorator/sidecar pilot (dsh-catalog/1024Store/dshfind) | partial | signals sidecar ready; no partner installed |
| P2.5 | Local session→brief matcher + opt-in chip | done (module) | `scripts/match-brief.mjs` + tests; no session storage read |
| P2.6 | Explicit-surface recommendation + governance | done (module) | `scripts/recommend.mjs`; COI/appeal process still human |

## P3 — reference-grade / official

| # | Task | Status | Depends on |
|---|---|---|---|
| P3.1 | Independent audit of method and first results | pending | self-review published (`data/audits/index.json`, `independent:false`); no independent auditor, so no E5 |
| P3.2 | Pre-registration + all-results publication | done (unreviewed) | `data/preregistration.json`, hash-checked; independent review still false |
| P3.3 | Federation/mirrors, 99.9% SLA, status page | partial | Gitee/GitCode sync + SLA target; no hosted 99.9% claim |
| P3.4 | E5 audited grade + conformance suite | partial | E5 audit gate, checklist, conformance; no E5 row |
| P3.5 | Official-market partnership (attribution, no default/exclusive) | pending | requirements drafted in `docs/OFFICIAL-MARKET.md`; no signed partner |

## Current honest state

- 42 plugins, 15 surfaces, **39 tasks** (24 executable pilot + 15 draft),
  **31 signed results**, **1 E2 measured** (provisional null), **41 E0**,
  **0 positive**, **0 contributions**.
- No quality #1 exists; the only measured row is E2/provisional and has
  `rank: null`.
- The legacy `score` remains as `discovery.score` for compatibility; it is not a
  quality claim.
- P1–P3 **code/artifacts are implemented where they do not require an external
  signer**; actual measured results, independent audit and market partnership
  remain external gates and are not marked done.

## Publication status (2026-10-18)

| Channel | Status |
|---|---|
| GitHub `dsh-attention-index` | pushed `d8628b5`; P0 registry + P1–P3 pilot/API/signals live; CI and Pages green |
| GitHub Pages | live at <https://perrylink.github.io/dsh-attention-index/>; title `dsh-score`; 42 E0 unrated; prior top badges return 404 |
| GitHub `perrylink` / `dsh-kit` / `dsh-score` | pushed brand/docs commits |
| GitHub release | `dsh-community-bench v0.2.0` published |
| npm | `dsh-community-bench@0.2.0` live, `latest`, with provenance |
| Gitee / GitCode | fresh mirror sync triggered for `d8628b5`; previous GitCode run failed on 4 unrelated divergent mirrors (`dsh-claude-move`, `dsh-memento`, `dsh-plugin-kit`, `dsh-plugin-portal`) |
| P1–P3 artifacts | 24 pilot tasks, signed ingest, `api/v1`, market signals, matcher/recommender, audit gate, conformance suite; **0 measured** |
| Repo rename `dsh-score-index` | **not executed**; migration runbook ready, URLs intentionally kept stable until the redirect/mirror/patch release is coordinated |
