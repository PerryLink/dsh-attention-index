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
| P1.1 | 3–5 briefs × ≥8 executable tasks with fixtures/checks | blocked | task authoring, API key, compute |
| P1.2 | Sandboxed runner (no host FS/env, egress allowlist, cgroups) | blocked | container runtime |
| P1.3 | Signed results + environment manifest + dedupe | blocked | runner keys |
| P1.4 | Newcombe/paired bootstrap at task level; FDR; holdout | partial | method in place; no results |
| P1.5 | First measured pilot; E2/E3 grades | blocked | P1.1–P1.3 |
| P1.6 | `signals.json` + format-1 decorator + reference index | pending | version-bound results |
| P1.7 | `bench_recommend` explicit-surface tool (no session read) | pending | measured coverage |
| P1.8 | Publish `dsh-community-bench` 0.2.0 | pending | GitHub/registry deploy |

**Exit criteria:** ≥3 briefs with ≥5 tasks/arm, ≥2 independent runners for one
surface, all results signed; no fabricated data; E2/E3 visible with CI.

## P2 — multi-market and session-aware

| # | Task | Status | Depends on |
|---|---|---|---|
| P2.1 | Identity graph (npm/repo/bundle/aliases, `unrated`) | pending | P1 data |
| P2.2 | Versioned API + signed snapshots + history | pending | hosting/network |
| P2.3 | Ingestion + attestation + moderation | pending | runner keys |
| P2.4 | Market decorator/sidecar pilot (dsh-catalog/1024Store/dshfind) | pending | P1.6 |
| P2.5 | Local session→brief matcher + opt-in chip | pending | measured coverage, privacy review |
| P2.6 | Full COI/governance (external reviewers, appeals, transparency log) | pending | people |

## P3 — reference-grade / official

| # | Task | Status | Depends on |
|---|---|---|---|
| P3.1 | Independent audit of method and first results | pending | P1–P2 |
| P3.2 | Pre-registration + all-results publication | pending | process |
| P3.3 | Federation/mirrors, 99.9% SLA, status page | pending | hosting |
| P3.4 | E5 audited grade + conformance suite | pending | audit |
| P3.5 | Official-market partnership (attribution, no default/exclusive) | pending | P3.1–P3.4 |

## Current honest state

- 42 plugins, 15 surfaces, 15 draft tasks, **0 measured**, **0 contributions**.
- 42/42 rows are **E0 / unrated**. No quality #1 exists.
- The legacy `score` remains as `discovery.score` for compatibility; it is not a
  quality claim.
- P1–P3 cannot be truthfully completed without measured runs, signing keys and
  network access. They are not marked done.

## Publication status (2026-10-18)

| Channel | Status |
|---|---|
| GitHub `dsh-attention-index` | pushed `4fee04d`; P0 registry, site, docs and badges live |
| GitHub Pages | live at <https://perrylink.github.io/dsh-attention-index/>; title `dsh-score`; 42 E0 unrated; prior top badges return 404 |
| GitHub `perrylink` / `dsh-kit` / `dsh-score` | pushed brand/docs commits |
| GitHub release | `dsh-community-bench v0.2.0` published |
| npm | `dsh-community-bench@0.2.0` live, `latest`, with provenance |
| Gitee / GitCode | one-way mirror sync triggered; workflow still running at the time of this note |
| Repo rename `dsh-score-index` | **not executed**; migration runbook ready, URLs intentionally kept stable until the redirect/mirror/patch release is coordinated |
