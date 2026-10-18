# DSH Community Bench

**Public, reproducible, task-conditioned scores for DeepSeek Harness plugins — and an explicit rule for who gets community attention.**

> Status: **v0.1 · prior-only**. 42 candidate plugins, 15 capability surfaces, **0 paired bench results**, **0 public contributions**.
> Every row without a paired with/without bench is labelled `prior`; it cannot outrank a measured plugin.
> This is deliberate: the repository does not fake outcome evidence while the bench network is being built.

- **Leaderboard site:** `site/index.html` (static; deploy `site/` to GitHub Pages)
- **Public registry:** [`data/registry.json`](data/registry.json)
- **Badges:** [`badges/index.json`](badges/index.json)
- **`dsh-recommend` sidecar:** [`integrations/dsh-recommend/bench-feed.json`](integrations/dsh-recommend/bench-feed.json)
- **Scoring:** [SCORING.md](SCORING.md)
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

This repository makes the score **public and identical for everyone**, per capability surface, with three evidence tiers:

| Tier | Evidence | Behaviour |
|---|---|---|
| `prior` | public repo/adoption/verification evidence | score compressed to 0–60; cannot outrank `measured` |
| `measured` | paired `with` / `without` bench results, ≥3 runs per arm | full 0–100 score, with lift lower bound and sample counts |
| `replicated` | `measured` + ≥2 independent runner ids | enters Most replicated; highest confidence |

The score decides attention: top 3 per surface, Featured, New & promising, Most nominated, Most replicated. There is **no paid ranking** and no sponsored slot in the registry.

## What the registry contains

`data/registry.json` is the single machine-readable artifact. It contains:

- `surfaces[]` — one leaderboard per capability surface (memory, cost, vision, web, browser, office, orchestration, safety, MCP, remote, dev, voice, research, UI, desktop).
- `overall[]` — the same entries ordered globally.
- `attention` — `featuredBySurface`, `newAndPromising`, `mostNominated`, `mostReplicated`.
- `contributors[]` — public contributor reputation from trajectory receipts.
- `scoring` — formula, weights, prior cap, minimum samples; everything needed to reproduce the numbers.
- `source` / `stats` — input counts and measured coverage.

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

For each capability surface:

- **Top 3** — measured first; prior-only only when the surface has no measured plugin.
- **Featured** — the first row of the top 3.
- **New & promising** — active, low adoption, recent, prior-only; gives new plugins a bounded, labelled slot.
- **Most nominated** — under-evaluated plugins nominated by contribution receipts.
- **Most replicated** — measured plugins with ≥2 independent runners.

The allocation is a fixed set of slots, computed from the same registry. It cannot be bought, and a plugin author cannot certify their own plugin into `measured`/`replicated`.

## Current limitations

- **No measured results yet.** The bench runner is implemented, but no public run has been committed; this is why every row is `prior`.
- The seed plugin list and evidence are a snapshot from `dsh-plugin-guide` (2026-10-06) and the GitHub API (2026-10-18), not a live crawler.
- Bench tasks are draft prompts/checks; fixtures for image/Office tasks are not committed yet.
- Contributions are open-loop: the contributor quality score is self-reported unless replayed; `verification` is recorded, but public-key verification is a P1 item.
- The static site is dependency-free and intentionally simple; no accounts, no server, no database.

## Roadmap

- **P1** — commit real paired bench results for 3–5 high-value surfaces; add task fixtures; add contribution schema and replay verification; publish badge endpoint URLs.
- **P2** — independent runner network; per-task holdouts; `dsh-recommend`/catalog consumption of `registry.json`; in-app Community Bench tab that reads the public registry.
- **P3** — contributor nominations commission bench runs; public governance of task/fixture changes; cross-harness result format.

## License

Apache-2.0 for the code and data in this repository. Plugin names and README content remain their authors' property; the registry stores links and measured facts, not copied source.
