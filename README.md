# dsh-score

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-attention-index)
[![GitCode](https://img.shields.io/badge/GitCode-mirror-2f6feb)](https://gitcode.com/PerryLink/dsh-attention-index)

**Public evidence and scores for DeepSeek Harness plugins — and an explicit rule for who gets community attention.**

> **Brand / scope.** `dsh-score` is the umbrella brand. This repository is the
> **public evidence layer** (currently `dsh-attention-index`; it will be renamed
> `dsh-score-index`). The local, on-demand five-dimension inspector is the separate
> [`dsh-score`](https://github.com/PerryLink/dsh-score) plugin; the in-app consumer
> is [`dsh-community-bench`](https://github.com/PerryLink/dsh-community-bench).
>
> Status: **v0.1 · E0 / unrated**. 42 candidate plugins, 15 capability surfaces,
> **0 paired bench results**, **0 public contributions**. All 42 rows are
> `E0 / unrated`; there is **no quality #1**. The legacy discovery number is
> `60 × prior / 100` and is not a task-outcome claim.
>
> This is deliberate: the repository does not fake outcome evidence while the
> bench network is being built.

- **Leaderboard site:** `site/index.html` (static; deploy `site/` to GitHub Pages)
- **Public registry:** [`data/registry.json`](data/registry.json)
- **Badges:** [`badges/index.json`](badges/index.json)
- **`dsh-recommend` sidecar:** [`integrations/dsh-recommend/bench-feed.json`](integrations/dsh-recommend/bench-feed.json)
- **Scoring:** [SCORING.md](SCORING.md)
- **Reliability (SOE / GOE):** [docs/SOE-GOE.md](docs/SOE-GOE.md)
- **P0–P3 implementation:** [docs/P0-P3-PLAN.md](docs/P0-P3-PLAN.md)
- **Contribute:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Governance:** [GOVERNANCE.md](GOVERNANCE.md)

## Why this exists

The DSH ecosystem does not lack plugins. It lacks a **shared, task-conditioned answer to “which plugin is good for this job?”**

- Stars are not quality: a single monorepo can occupy 27 of the top 60 star slots.
- Install counts are channel-biased: 1024Store counts only installs through its own wrapper.
- npm downloads include CI and mirrors.
- Static quality scores (manifest, maintenance, security) are necessary but **task-blind**.
- Global popularity rankings are **context-blind**: the best memory plugin is not the best Office plugin.
- A local per-user score cannot allocate **community** attention: every user sees a different answer.

This repository publishes **public, identical evidence** per capability surface,
with two evidence tiers and one replication label:

| Tier / label | Evidence | Behaviour |
|---|---|---|
| `prior` | public repo/adoption/verification evidence | discovery signal; compressed to 0–60; cannot outrank `measured`; **not** a quality claim |
| `measured` | paired `with` / `without` bench results, ≥3 runs per arm | full 0–100 score, with lift lower bound and sample counts |
| `replicated` (label) | `measured` + ≥2 independent runner ids | enters Most replicated; highest confidence; not a third tier |

At v0.1 every row is `E0 / unrated`; the measured tier is deliberately empty
until the bench network produces signed, version-bound results. The registry
publishes evidence; there is **no paid ranking** and no sponsored slot.

## What the registry contains

`data/registry.json` is the single machine-readable artifact. It contains:

- `surfaces[]` — one evidence list per capability surface (memory, cost, vision, web, browser, office, orchestration, safety, MCP, remote, dev, voice, research, UI, desktop).
- `evidenceGrade`, `soe`, `goe`, `unrated` per row — the SOE/GOE reliability model.
- `overall[]` — empty while no positive measured row exists; there is no cross-surface quality rank.
- `attention` — `featuredBySurface`, `newAndPromising`, `mostNominated`, `mostReplicated`; quality slots are only positive measured.
- `contributors[]` — public contributor reputation from trajectory receipts.
- `scoring` — reliability version, legacy discovery formula, weights, prior cap, minimum samples.
- `source` / `stats` — input counts, measured coverage and `gradeCounts`.

A consumer (static site, plugin manager, catalog, `dsh-recommend`, an agent tool) can read the same file and get the same answer. The companion DSH plugin `dsh-community-bench` renders this registry as a **Settings → Plugins → Community Bench** tab; it never computes a local score.

## Quick start

```sh
# 1. Recompute the registry from committed data
node scripts/aggregate.mjs --today 2026-10-18

# 2. Preview the static site
python3 -m http.server 8765 --directory site
# open http://127.0.0.1:8765/

# 3. Run the pure scoring tests
node --test test/*.test.mjs

# 4. Dry-run the harness smoke task (no model call, no install)
node scripts/bench-run.mjs \
  --pack fixtures/smoke-tasks.json \
  --task smoke-file \
  --plugin owner/repo \
  --spec owner/repo \
  --arm with --repeat 1 --dry-run
```

A real bench run needs `dsh` on `PATH`, a throwaway `DSH_HOME`, and a model credential (`DEEPSEEK_API_KEY` in the launch environment for the headless profile). The runner never touches the real `~/.dsh`.

## Contribute a trajectory

```sh
node scripts/contribution-from-session.mjs \
  --session ~/.dsh/sessions/.../session.v4.jsonl.zstd \
  --contributor github:your-handle \
  --surface memory \
  --plugins perrylink/dsh-memento \
  --rating 4 \
  --nomination some/under-evaluated-plugin
```

The receipt carries hashes and metrics only (no session text). It is written under `data/contributions/`; review it and open a PR. The registry aggregates it into contributor reputation, a small demand signal, and at most one nomination.

## Attention allocation (not a popularity contest)

Implemented policy (P0, live):

- **Measured leaders** — only positive `E3+` rows (CI lower bound > 0).
- **Replicated** — `E4+` with ≥2 independent runners.
- **Discovery** — prior-only rows are `E0 / unrated`, in a separate, unnumbered
  list; no `#1`, no featured badge, no install CTA.
- **New arrivals** — new/under-evaluated plugins, labelled; not a quality rank.
- **Most nominated** — under-evaluated plugins nominated by receipts; used to
  schedule bench runs, never to score.

The allocation is a fixed set of slots, computed from the same registry. It cannot
be bought, and a plugin author cannot certify their own plugin into
`measured`/`replicated`.

## Current limitations

- **No measured results yet.** The bench runner is implemented, but no public run has been committed; this is why every row is `E0 / unrated`.
- The seed plugin list and evidence are a snapshot from `dsh-plugin-guide` (2026-10-06) and the GitHub API (2026-10-18), not a live crawler.
- Bench tasks are draft prompts/checks; fixtures for image/Office tasks are not committed yet.
- Contributions are open-loop: the contributor quality score is self-reported unless replayed; `verification` is recorded, but public-key verification is a P1 item.
- The static site is dependency-free and intentionally simple; no accounts, no server, no database.

## Roadmap

See [docs/P0-P3-PLAN.md](docs/P0-P3-PLAN.md) for the task-level plan and current
status. P0 (truth) is implemented; P1 (measured evidence) requires executable
tasks, a sandbox and signed results; P2/P3 require measured coverage, governance
and an independent audit.

## License

Apache-2.0 for the code and data in this repository. Plugin names and README content remain their authors' property; the registry stores links and measured facts, not copied source.
