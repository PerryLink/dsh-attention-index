# dsh-score as a market reference and service layer

Status: proposal for discussion · 2026-10-18
Scope: what this project must become if its purpose is to serve DSH markets
(third-party catalogs today, a possible official market later) rather than to be
one more leaderboard.

> **Naming:** `dsh-score` is the brand. This repository is the public evidence
> layer; it is currently `dsh-attention-index` and will be renamed
> `dsh-score-index` (see `docs/MIGRATION-dsh-score-index.md`). The local
> inspector is the separate `dsh-score` plugin; the in-app consumer is
> `dsh-community-bench`.

---

## 1. Thesis

The project is directionally right but mis-packaged.

It currently looks like **a leaderboard with a Settings tab**. The stated purpose —
"a reference and service for DSH markets" — requires a different product:

> **A neutral evidence and signal layer for DSH plugin markets.**
> It does not rank plugins *for* a market. It publishes version-bound,
> reproducible evidence and a small set of machine-readable signals that any
> market can merge, attribute, or ignore.

Three consequences follow:

1. **The score is not the asset.** The asset is the evidence graph: canonical
   plugin identity + version + environment + task + outcome + provenance.
2. **The plugin tab is not the product.** It is a reference consumer that proves
   the signals can be rendered. Distribution happens through market formats.
3. **The moat is neutrality and reproducibility**, not UI or coverage. A market
   can copy a score; it cannot easily copy an independent, auditable evidence
   process — and it should not have to own one.

The closest analogues are **OpenSSF Scorecard** (a signal, an API, a spec and a
badge consumed by many platforms) and **MLPerf** (audited, versioned benchmark
results that vendors cite but do not control). The target is
"Scorecard + MLPerf for DSH plugins", not "an app store ranking".

Existing markets already carry popularity and even grades: 1024Store has
rankings, dshfind publishes scores/grades, and every catalog has downloads,
stars and freshness. **Another metadata score would be redundant.** The only
differentiated asset is paired, task-conditioned outcome evidence with a
reproducible environment — which is exactly the part that is currently at zero.

---

## 1.5 Naming and project disposition (final)

- **Brand:** `dsh-score`.
- **Public evidence layer:** this repository; rename to `dsh-score-index`
  (pending; see `docs/MIGRATION-dsh-score-index.md`).
- **Local/on-demand inspector:** the separate `dsh-score` plugin (npm); it is not
  a second public ranking.
- **In-app consumer:** `dsh-community-bench` (maintenance mode).
- **Investment:** this repository 80–90%; `dsh-score` 5–10% (bug/security only);
  `dsh-community-bench` 5–10% (consumer only). If only one repository survives,
  keep this one and archive/deprecate the other two.
- **Avoid** `dsh-bench`, `dsh-attention`, `dsh-evidence`: the npm names are taken
  by unrelated projects.

## 2. What already exists

### 2.1 In DSH itself

DSH already ships the market plumbing. This is the single most important fact
for the roadmap, and it changes what we should build.

| Surface | Where | What it supports | What it does not |
|---|---|---|---|
| **Web Discover** | `deepseek-harness/packages/boot/plugin-market`, `packages/client/ui-plugin-market`, format in `packages/util/plugin-market-index` | Format 1 indexes; multiple configured sources (one selected at a time); arbitrary `metadata.categories`, `metadata.labels`, `metadata.sortKeys`; per-version `engines.dsh`; install targets; read-only `plugin_market` tool that returns `sortKeys` | No default source; experimental (behind a bundle); no ratings field; Discover cards do not display sort values; no overlay of one source onto another |
| **Desktop Community Market** | `anywhere-labs/dsh-desktop`, `dsh-community-market/docs/catalog-provider-contract.md` (v1) | Strict provider contract; one selected source; standard `/v1/plugins`; categories, capabilities, compatibility, provenance; reviewed adapters | No default/preferred/fallback source; `sort` is limited to `relevance`, `updated`, `name`, `downloads`; provider scores are explicitly **provider-owned claims**, never an endorsement or verification |
| **Official index generator** | `deepseek-harness/apps/plugin-market-generator` | Turns a list of npm names / Git repos into a valid format-1 index with versions, `engines.dsh`, localized display fields, icons | Workspace-private today; emits no quality metadata; no decoration hook |
| **Official on-demand bundles** | `packages/boot/plugin-manager`, `ON_DEMAND_BUNDLES` | Curated official/optional bundles, offline metadata, exact release pins | Official membership is a DSH-team decision; not a quality ranking |

Two design decisions in the official surfaces matter more than any feature:

- **No default source.** The ecosystem is deliberately decentralized. A single
  community ranking will not be adopted as *the* official ranking.
- **Provider claims are attributed, not endorsed.** A quality signal can be
  displayed by a market, but it remains a third-party claim. This is exactly the
  slot a neutral bench should occupy.

Bottom line: the official **mechanism** exists; an official **market/index** does
not. Web Discover is experimental and has no default source; the Desktop
Community Market is a third-party app with its own neutral contract. Plan for a
multi-market world, not for one central ranking.

### 2.2 In this project

| Asset | State |
|---|---|
| `data/plugins.json` | 42 plugins, 15 surfaces, metadata only; no versions, no `engines.dsh`, no install targets |
| `data/tasks.json` | 15 draft tasks; not yet runnable for most surfaces |
| `data/results/` | **0** paired bench results |
| `data/contributions/` | **0** receipts |
| `scripts/score.mjs` | Deterministic prior/measured/contribution scoring; prior capped at 60; measured outranks prior |
| `scripts/aggregate.mjs` | Deterministic registry, site data, badges, `LEADERBOARD.md`, `--check` |
| `scripts/bench-run.mjs` | Paired runner; refuses draft tasks; smoke fixture; no sandbox |
| `schemas/` | Bench pack, bench result, contribution |
| `site/` | Static leaderboard; no versioned API, no signing, no SLA |
| `dsh-community-bench` | Read-only Settings tab; snapshot + live registry; no local scoring |
| `integrations/dsh-recommend/` | Additive sidecar feed; correct "do not merge scores" pattern |

The project has good *scoring* hygiene and no *evidence*. That is the central
imbalance.

---

## 3. The integration reality

A market does not automatically consume an API. The official surfaces are
single-source selectors, not overlay engines.

| Consumer | How it could use us | What it takes | Realistic near-term? |
|---|---|---|---|
| **Web Discover** | Add our format-1 index as a configured source; sort/filter by our declared keys/labels | Generate a decorated format-1 index; user adds the URL | **Yes** — no core change; best first integration |
| **Web Discover as a merged overlay** | Show our score beside another market's rows | Core/UI change or a provider that embeds our data | No |
| **Desktop Community Market** | Publish a catalog source whose summaries/categories carry our signal | Build a v1 provider page; scores are display text; no custom sort | Possible, but competes with 1024Store/dshfind for the single selected slot |
| **Desktop Community Market, native** | A `quality` sort key and a structured signal object | Contract revision + review + tests | Standards ask, not a build |
| **1024Store / dshfind / dsh-catalog** | Embed our signals in their own provider data | Their cooperation; a feed + merge tool | Partnership, not unilateral |
| **Agents** | `plugin_market` tool already returns `sortKeys`; an agent can read our score from a configured index | Same as Web Discover | Yes |
| **Custom market UIs** | Call a versioned signals API at runtime | API + SLA + docs | Later |

**Conclusion:** the primary integration is **build-time merge into a market's own
format**, plus **one reference market that demonstrates the result**. There is no
universal runtime overlay to build, and no central ranking to win.

The **decorator is the product**; the reference index is the demo. A market keeps
its own coverage, identity and curation; the decorator adds signals to that
market's existing index without taking it over. This is also what keeps the
project neutral: we supply a layer, not a competing catalog.

There are **two channels, not one**:

- **Format-1 reference index** for Web Discover: it natively carries
  `categories`, `labels` and arbitrary `sortKeys`, so a user who adds it sees an
  evidence-ordered list and can filter by surface. This is the only official
  surface that can carry a ranking today.
- **Sidecar feed / badge** for markets whose contract cannot carry a custom sort:
  Desktop Community Market v1 (only `relevance`, `updated`, `name`, `downloads`;
  unknown fields rejected), 1024Store and dshfind (provider-owned APIs). These
  markets can show a badge/label or a "measured only" catalog source, but they
  cannot accept an injected ranking. Do not pretend otherwise.

The in-app tab and a CLI install guard are **reference consumers**; they
demonstrate the contract but are not the distribution.

---

## 4. Target architecture

```
Markets / catalogs / agents
  Web Discover · Desktop Market · 1024Store · dshfind · dsh-catalog · custom UIs
        ▲
        │  signals (JSON, index decoration, SDK)
┌───────┴─────────────────────────────────────────────────────┐
│ Signals layer                                               │
│ per plugin × version × surface × environment                │
│ tier, quality vector, confidence, coverage, evidence links  │
└───────▲─────────────────────────────────────────────────────┘
        │ deterministic derivation
┌───────┴─────────────────────────────────────────────────────┐
│ Evidence layer                                              │
│ paired results · receipts · attestations · revocations      │
│ task packs · environment manifests · runner identities      │
└───────▲─────────────────────────────────────────────────────┘
        │ produced by
┌───────┴─────────────────────────────────────────────────────┐
│ Measurement layer                                           │
│ sandboxed runners · task lifecycle · statistics · audit     │
└─────────────────────────────────────────────────────────────┘

Cross-cutting: identity · contracts/spec · governance · operations · funding
```

### 4.1 Signals

A single number is easy to misread and legally risky. Publish a **small vector
with a default composite**:

| Signal | Meaning | Scale |
|---|---|---|
| `quality` | task-conditioned lift over the no-plugin baseline | 0–100 |
| `coverage` | fraction of the surface's tasks with sufficient evidence | 0–1 |
| `confidence` | evidence completeness, not probability of being "good" and not a CI level | 0–1 |
| `reliability` | pass-rate stability across runs | 0–1 |
| `cost` | model/tool cost per successful task | USD or tokens |
| `latency` | wall-clock per task | seconds |
| `compatibility` | tested DSH range / environment | range |
| `maintenance` | freshness / release cadence | 0–100 |
| `safety` | permissions/risk findings (separate, never folded into quality) | findings |

The default composite is a **ranking policy**, not a truth claim. Markets may
choose different weights; the spec documents the default so orderings remain
comparable.

**Version binding is mandatory.** A signal is keyed by at least:

```
(plugin id, plugin version, surface, task-pack version,
 model id + version, DSH version, OS, runner id)
```

A score measured on `1.1.0` must not be shown as the score of `1.2.0`. A prior
signal may be version-agnostic, but it must be labelled `prior` and `provisional`.

### 4.2 Evidence

- **Paired bench**: same task/model/harness, `with` vs `without`, paired seeds,
  ≥5 runs per arm initially (≥3 is underpowered), CI on the lift.
- **Task bank, not three tasks**: 3 tasks is a pilot, not a surface claim. Target
  10–20 tasks per surface, sampled from a versioned bank, with a private holdout
  and quarterly rotation.
- **Aggregate, then claim**: report a surface-level CI from a hierarchical or
  paired-bootstrap model; do not claim per-task significance from a handful of
  runs.
- **Environment manifest**: model, DSH commit/version, OS, task pack hash,
  runner image digest, network policy, budget.
- **Attestation**: result JSON + logs hash + runner signature; reproducible
  command; artifact hashes.
- **Receipts**: session-derived, hashes/metrics only, no raw text; replay or
  signed verification.
- **Revocations**: append-only, with reason and evidence; never silent deletion.
- **Negative results are published**: pre-register the task/hypothesis; no
  cherry-picking; a plugin that loses is a valid result.
- **Ceiling effects**: report baseline `p0` and `p1`, not only the lift; a plugin
  cannot show a large lift on a task the baseline already passes.

### 4.3 Contracts

| Artifact | Purpose |
|---|---|
| `signals.schema.json` | Canonical signal feed for any market |
| `identity.schema.json` | npm name / repo / bundle id / aliases |
| `registry.schema.json` (versioned) | Existing registry, with `$id`, migration policy |
| `market-decoration.spec.md` | How to add categories/labels/sortKeys to a format-1 index |
| `desktop-signal-proposal.md` | Optional `quality` field + `quality` sort for the Desktop contract |
| `conformance/` | Tests a market/index must pass to claim compatibility |

All schemas use JSON Schema 2020-12, carry a version, and are published at stable
URLs. Unknown fields are ignored by readers but preserved by our tooling.

### 4.4 Identity

The join key across markets is not the npm name, the repo, or the display name.
Provide a canonical registry:

```json
{
  "id": "dsh-memento",
  "npm": "dsh-memento",
  "repo": "https://github.com/PerryLink/dsh-memento",
  "bundle": "dsh-memento",
  "aliases": ["perrylink/dsh-memento"],
  "surfaces": ["memory"],
  "status": "active"
}
```

Resolution rules: exact npm name → exact repo → bundle id → alias; never fuzzy
name matching for scoring. Deduplicate forks and monorepo subpackages; keep
`sameAs` links instead of merging silently.

---

## 5. Gap analysis

Grouped by what blocks which audience. "Market pilot" = one market can consume
us; "multi-market" = several can; "official" = an official market can cite us.

| # | Gap | Current state | Blocks | Priority |
|---|---|---|---|---|
| G1 | **No measured evidence** | 0 results; all prior-only | Any claim of being a quality signal | P0 |
| G2 | **No version/environment binding** | One row per plugin; no `engines.dsh`, no version history | A market installing a specific version cannot use the score | P0 |
| G3 | **No market-format artifact** | No format-1 index, no Desktop catalog, no signals feed | Any integration | P0 |
| G4 | **Weak statistics** | 3 runs/arm; no CI in UI; no holdouts; no judge calibration | Credibility; replication | P0/P1 |
| G5 | **No sandbox** | Runner executes plugin code with host access | Safe publication of any measured result | P0 |
| G6 | **No identity layer** | `owner/repo` ids; npm often null; no aliases | Cross-market joins; dedupe | P1 |
| G7 | **No ingestion/attestation** | PR-only, unauthenticated, no quarantine | Scale; anti-fabrication | P1 |
| G8 | **No signing/integrity** | Static JSON; no content hash, no signature | Trust; supply-chain | P0/P1 |
| G9 | **No SLA/API** | GitHub Pages/raw; no versioned endpoints, status, rate limits | A market can depend on it | P1 |
| G10 | **No governance independence** | Single maintainer; no reviewers, appeals, transparency log | Official adoption; liability | P1 |
| G11 | **No integration kit** | Sidecar README only; no decorator, SDK, conformance | Low-friction adoption | P0 |
| G12 | **No coverage strategy** | 42 plugins, 15 surfaces, no sampling/rotation | Relevance; rich-get-richer | P1 |
| G13 | **Prior-only rows look ranked** | Top-3 per surface even with 0 measured | Misleading attention; trust | P0 |
| G14 | **Privacy/legal unclear** | Receipts, ranking liability, data license not settled | Official/enterprise use | P1/P2 |

Two gaps deserve emphasis:

- **G1 + G5 are the gate.** Without measured evidence there is no differentiated
  product; without a sandbox there must be no measured evidence. Fixing the
  sandbox is a prerequisite, not a nice-to-have.
- **G3 + G11 are the distribution gate.** A perfect score that no market can
  consume is a hobby. A decorator and a reference index are small, high-leverage
  work.

### 5.1 Stop-ship findings (fix before any pilot)

A code/security audit found that the current measured tier is not merely
unexercised; it is **forgeable**, the runner has **no execution boundary**, and
the public artifacts already contain **neutrality and injection risks**. Until
these are fixed, the only honest state is `0 measured`.

| Finding | Evidence | Consequence |
|---|---|---|
| **Measured is forgeable** | `aggregateBench` keys only `plugin.id + taskId`; no signature check, no dedupe. Six hand-written JSON files (same run repeated 3× per arm, 3/3 pass vs 0/3 fail) produce `benchScore: 100`, `tier: measured`, and a score above 60. | A fabricated result outranks every honest prior-only plugin. This violates the project's core promise. |
| **No execution boundary** | `bench-run` forwards `process.env`, runs plugin code in the DSH host process, has no network/CPU/memory limits, does not kill descendants, and `--allow-commands` runs host `/bin/sh` from pack data. DSH plugins are host Node modules; DSH's own `SAFETY.md` says sandboxing is not a guarantee. | A malicious plugin can read `~/.ssh`, exfiltrate the model key, or persist after the run. No measured result can be trusted or reproduced. |
| **Statistics manufacture winners** | n=3/arm has 0% power; the Wald LCB collapses at p=1, so 3/3 vs 0/3 → 100; 3/3 vs 3/3 → 50 (not "no effect"); a null plugin has P(score≥50)=14.1%, P(=100)=1.56%; with 42 null plugins, P(at least one 100)=48%. No multiplicity control. | The leaderboard is a noise generator, not evidence. |
| **Result identity is not implemented** | `aggregateBench` groups by `plugin.id + taskId` only, ignoring version/model/harness; the registry drops the tuple; a mixed-model probe (+1.0 and −1.0) becomes 21.7. | A score cannot be attributed to a version or environment. |
| **Evidence is unverified** | Signature is optional at generation but required by the schema; aggregation checks neither; `runner.id` is free text; contribution `verification` is self-declared. | Fabricated/unsigned results and fake `replicated` counts enter the registry. |
| **Consumer/site XSS** | The plugin fetches an unsigned, mutable `raw.githubusercontent.com/.../main/...` registry on mount with no schema/size/URL checks, then renders `href: row.repo`; React 18 warns but does not block `javascript:`. The site has a stored-XSS path via receipt `surface` and unsanitized repo hrefs. | A compromised repo/account can execute script in the DSH Web GUI origin. Fix before accepting receipts or publishing live scores. |
| **Neutrality is already broken** | 16/42 plugins are operator-owned (38%); 6/15 featured slots are operator-owned; 4 of the top 5 overall are operator-owned; the only `certified` entry is the operator's own plugin with no certifier; 20/42 rows have `npm7d` while `npm` is null; all 26 non-operator plugins score 0 on the 25%-weighted verification dimension. | A neutral market or official reviewer will read this as a family benchmark, not a reference layer. |
| **Primary payload has no schema** | No `registry`/`plugins`/`tasks` schema; CI only calls `JSON.parse`; bench-pack and bench-result schemas disagree; `task.weight` is used but forbidden; `check.kind` is not required. | Schema drift is invisible; a malformed registry can publish. |
| **Scores drift without new evidence** | Same inputs, `--today` +31 days: hindsight 38.3→35.1, memento 29.3→23.9; no history file. | No audit trail; a market cannot explain a change. |
| **Catalog join is fragile** | 30/42 ids are lowercased vs GitHub `fullName` case; 23/42 have no npm name; the join is case/host-blind; no alias map; no `unrated` state. | A 97-package market shows ~55% blanks and can collide GitHub/Gitee paths. |

The fix order is: **freeze measured → executable tasks → identity/attestation →
sandbox → schema/CI → data audit/COI → consumer security → history/join**.
Publishing a "measured" score before that would violate the project's own
no-fabricated-data rule and permanently damage credibility with every market.

---

## 6. Roadmap

### P0 gate — freeze and truth (week 0)

Before building anything:

- **Freeze `measured`.** Keep `0 measured`; label every prior row `provisional`.
- **Strip rank from 0-measured surfaces.** No `#1` badge, no `rank: 1` in feeds;
  show `provisional / no outcome evidence` instead. A rank-1 badge without a tier
  is the fastest way to launder a prior into a recommendation.
- **Audit the data.** Remove or substantiate `certified`; drop `npm7d`/installs
  where the source is missing; label operator-owned rows; publish a COI register.
- **Neutrality reset.** Verification is 0 unless ≥2 independent certifiers; seed
  at least 60% external plugins from 1024Store / dsh-market / dshfind / awesome,
  **not** from `dsh-catalog` or `dsh-kit` (both are family artifacts); PerryLink
  share ≤25%; the first measured result comes from an external runner. A family
  benchmark cannot become a market reference.
- **Fix the consumer/site XSS.** https-only repo allowlist, URL-scheme validation,
  escaped receipt fields, CSP; never render an arbitrary `href`.
- **Sign and validate the registry.** Verify in the consumer; add schema, size and
  URL checks; pin a last-known-good snapshot.
- **Add a China-reachable mirror/CDN** for `registry.json` and the index;
  `raw.githubusercontent.com` is unreliable for much of the audience.
- **Publish "what the score does not mean"** and link it from every surface.

Acceptance: no `measured` row; no self-certified badge; no unverifiable adoption
input in the score; XSS tests pass; a tampered/oversized/invalid registry is
rejected; the tab works from the mirror.

### P0 — "one market can use it" (4–6 weeks)

| Deliverable | Detail | Acceptance |
|---|---|---|
| **P0.0 Evidence correctness** | Executable checks + fixtures for 3 pilot tasks; group results by `(plugin id, plugin version, model, harness, taskId)`; require and verify signature; add `registry`/`plugins`/`tasks` schemas; fix `task.weight`; case-insensitive repo join + alias map; `unrated` state | No mixed-environment row can aggregate; unsigned result cannot enter `measured`; schema validation runs in CI; a 97-package join has zero unmapped entries (or an explicit `unrated`) |
| **P0.1 Version-bound signals v1** | `signals.json` + schema; per plugin × version × surface; tier, vector, confidence, coverage, evidence; `provisional` flag | Schema validates; a market can render score + tier + evidence link for 10 plugins |
| **P0.2 Market decorator** | CLI that takes a format-1 index + signals and adds categories (surfaces), labels (`measured`, `prior`, `replicated`, `provisional`), sort keys (`community-score`, `coverage`, `confidence`), orders plugins by tier/score, optionally annotates descriptions. **This is the product; the reference index is only a demo of it.** | Output validates as format 1; Discover shows the index, sorts by score, filters by surface |
| **P0.3 Reference index** | Generate a base index with the official generator for the installable subset; decorate; publish at a stable URL; document "enable Custom plugin markets, then add this source" | A fresh DSH profile can enable the experimental market, add the URL, and see the ordered list |
| **P0.4 Integrity + freshness** | `contentHash`, `sourceCommit`, `methodologyVersion`; dated immutable copies; CI validates schemas and freshness | `--check` fails on drift; stale > 7 days fails CI; hash verifies |
| **P0.5 Sandboxed runner** | Container/bubblewrap; no host FS; network allowlist (model API only); ephemeral key; CPU/mem/time limits; postinstall disabled; artifact hashes | A malicious fixture cannot read host files, exfiltrate, or escape; documented threat model |
| **P0.6 First measured pilot** | 3 surfaces × 3–5 plugins; 5 runs/arm; deterministic checks; publish results with 95% CIs and environment manifests | ≥15 measured plugin-surface rows; no result without env manifest; reviewer sign-off |
| **P0.7 Provisional labeling** | Surfaces with 0 measured stop presenting a ranked #1 as quality; show "provisional / no outcome evidence" | UI and API both expose `provisional`; no market can mistake prior for measured |
| **P0.8 Integrator guide** | 3 recipes: format-1 decoration, Desktop catalog fields, direct signals API; one-page quick start | An external developer can integrate in <1 day |

**Recommendation gate:** none of P0.1–P0.8 is sufficient to ship a recommender.
It additionally requires: no prior ranks, a `briefs[]` model, `bench-index/v1` +
`recommendation/v1` v0, Newcombe intervals + gates, version/environment binding,
and executable tasks. See §15.9.

### P1 — "multiple markets can use it" (2–3 months)

| Deliverable | Detail | Acceptance |
|---|---|---|
| **P1.1 Identity registry** | Canonical id, npm/repo/bundle/aliases, `sameAs`; resolution API | ≥95% of registry entries resolve to one canonical id; duplicates reported |
| **P1.2 Public API v1** | `/v1/signals.json`, `/v1/registry.json`, `/v1/plugins/{id}`, `/v1/surfaces/{id}`, `/v1/index.json`, `/v1/history/{id}`, `/v1/status.json`; ETag, CORS, pagination, OpenAPI | Two independent consumers; 99.9% read availability; p95 < 300 ms |
| **P1.3 Signed snapshots** | SHA-256 + minisign/Sigstore; public key; verification docs | A consumer can verify a snapshot offline |
| **P1.4 Ingestion + attestation** | Submit results/receipts with signature, env manifest, logs hash; quarantine; reviewer queue; appeals | No unreviewed result reaches `measured`; every result traceable |
| **P1.5 Statistics upgrade** | Paired bootstrap/hierarchical model; sequential testing; holdout tasks; judge calibration; multiplicity control | CIs reported; holdout set exists; judge κ ≥ 0.7 on calibration set |
| **P1.6 Desktop signal proposal** | Optional `quality` object + `quality` sort in the Desktop contract; attribution and disclaimer rules; fixtures | Proposal accepted for review, or a documented "not now" with reasons |
| **P1.7 Publisher console** | Claim listing, submit evidence, view history, file a dispute, respond; static pages + GitHub auth | An author can complete the loop without emailing the maintainer |
| **P1.8 Governance** | 3–5 reviewers, charter, COI/recusal, RFC process, appeals SLA, transparency log, data license | Public membership; first appeal resolved; quarterly report |
| **P1.9 Coverage** | Task packs for 5 more surfaces; automated prior extraction; nomination → bench queue; rotation | ≥30% measured coverage on top 5 surfaces; ≥3 independent runners per measured surface |
| **P1.10 Multi-model** | Per-model and per-harness views; no cross-model blending | A user can see "works for model X" separately |
| **P1.11 `recommend_plugin` tool** | Explicit surface/task → public signals → top-k with tier/CI/evidence/install target; abstains when no measured | The agent can answer "what plugin for this surface?" without local scoring |

### P2 — "official-grade reference" (6–12 months)

| Deliverable | Detail | Acceptance |
|---|---|---|
| **P2.1 Standards proposal** | `signals`/`quality` extension to one or both market contracts; conformance suite; RFC | A market ships the field or explains why not |
| **P2.2 Certification/audit** | "Bench Verified" mark; independent audit; reproducibility check; revocation | First audited batch; mark displayed with methodology link |
| **P2.3 Federation** | Mirrors (GitHub/Gitee/GitCode), CDN, signed snapshots, cross-market identity | A mirror outage does not break consumers |
| **P2.4 Operations** | Status page, incident response, backups, rate limits, abuse handling | 99.9% SLA; incidents published |
| **P2.5 Sustainability** | Fiscal sponsor, compute sponsors, public budget, optional paid audits (no rank influence) | ≥1 year of funded compute; funding disclosed |
| **P2.6 Legal** | Data license (CC BY 4.0), ranking policy, author response, trademark, privacy | Counsel-reviewed public policy |
| **P2.7 Official partnership** | Joint pilot; optional source listing (not default); shared methodology review | Official market cites the signals with attribution, or a clear "no" with a fallback plan |
| **P2.8 Session matcher + dock** | Local `sessionProjections` matcher; confidence/abstention; opt-in composer dock; offline signed snapshot | Matcher evaluated offline; no telemetry; wrong-surface rate below an agreed threshold |

---

## 7. What not to build

- **A general-purpose market.** It duplicates Discover/1024Store/dshfind, creates a
  conflict of interest, and makes neutrality harder to defend.
- **A local or per-user score.** It fragments community attention and contradicts
  the project's premise.
- **Paid ranking or sponsored slots in the registry.** Non-negotiable.
- **A single universal "best plugin" score.** Use a vector + a documented default
  policy.
- **An LLM-judge-only leaderboard.** Deterministic checks first; judges only with
  calibration, audit and a confidence penalty.
- **Install-count or star-based ranking.** Channel-biased and gameable.
- **A custom market format.** Adopt the official formats; propose extensions.
- **Accounts, telemetry, or dark-pattern growth loops.** GitHub identity and public
  data are enough.
- **Unversioned scores or unsandboxed bench runs.** These are correctness and
  safety bugs, not trade-offs.

### 7.1 What about the in-app tab itself?

The tab is a **reference consumer**, not the roadmap. Keeping it useful is cheap;
growing it into the product is a distraction.

Worth adding (P1/P2, after the data exists):

- Per-version/per-environment evidence detail, not just one number.
- The author's public response and a "dispute this result" link.
- A "copy this market index URL" / "add to Discover" action.
- A prefilled "request a bench run" GitHub issue.
- An "installed plugins" view with the same signals.
- A freshness/status line and a clear `provisional` badge.

Not worth adding: local scoring, accounts, telemetry, a second ranking, or a
general plugin browser. Those either contradict the premise or duplicate the
market.

---

## 8. Governance, funding, legal

### 8.1 Separation of powers

- **Measurement** owns tasks, fixtures, runners, results.
- **Scoring** is a deterministic function with a version and a reproducible diff.
- **Allocation** is a fixed policy derived from signals; no hand-picked winners.
- **Appeals** are independent of the reviewer who approved the result.

### 8.2 Minimum governance for official use

| Element | Minimum |
|---|---|
| Reviewers | 3–5 public members, 1-year terms, COI disclosure, recusal |
| Change process | Public RFC for methodology; 14-day comment; version bump; reproducible comparison |
| Appeals | Author right of reply; evidence challenge; 14-day SLA; public outcome |
| Transparency | Quarterly report: funding, disputes, revocations, coverage, incidents |
| Data license | CC BY 4.0 for data; Apache-2.0 for code; trademark policy |
| Funding | Compute sponsors and grants; disclosed; no influence on scores; optional paid audits with public results |

**Cost reality (year 1):** task authoring $18k–54k; runner/review operations
$20k; compute $0.25k–2.5k; infrastructure $1k–3k; audit/legal $5k–10k; total
roughly **$45k–90k**. Compute is not the bottleneck; credible evaluation labor
is. Fund task authoring and runner independence, not GPUs.

### 8.3 Liability posture

- The score is an **opinion based on published evidence**, not a certification of
  safety or fitness.
- Every row links to its evidence and to the author's response.
- Ranking policy and correction policy are public.
- No claim of "official" status without written agreement.

---

## 9. Official-market engagement

Do **not** ask to be the official ranking, the default source, or an exclusive
provider. The official design explicitly avoids defaults and endorsements.

**Offer — four artifacts:**

1. A short **"DSH Plugin Evidence Standard v1"**: tiers, schemas, reproducibility,
   dispute process, neutrality covenant. Not a ranking proposal.
2. A **data package**: 3 surfaces × 5 plugins, raw logs, signed results,
   reproduction commands, including one null or negative result.
3. A **reference implementation**: this repo, the in-app tab, the badge endpoint,
   a standard catalog source, and an install guard.
4. An **independent audit**: a statistician/methodologist reviews the design and
   the first results; the report is public.

**Ask — five items:**

1. A docs link as "community measurement", not "official ranking".
2. Access to release candidates for compatibility testing.
3. A non-voting liaison.
4. Optional consumption of `signals.json` / `registry.json` in any official
   directory.
5. Endorse the vocabulary (`prior` / `measured` / `replicated`), not the scores.

**No** exclusivity, **no** "official" label, **no** veto.

**Fallback if the official market builds in-house:** become the independent
benchmark and cross-market identity/signal utility that the official market can
cite, the way MLPerf results are cited without the vendor owning the benchmark.
That is still a valuable, defensible role. Trigger the fallback if the official
team announces its own scoring/ranking or declines two meetings; stop chasing.

---

## 10. Success metrics

| Metric | 6 months | 12 months |
|---|---|---|
| Measured coverage, top 5 surfaces | ≥30% | ≥60% |
| External (non-operator) plugin share | ≥60% | ≥75% |
| Operator-owned share of ranked rows | ≤25% | ≤15% |
| Measured rows from independent runners | 100% | 100% |
| Independent runners per measured surface | ≥3 | ≥5 |
| Market integrations (embed or cite) | ≥2 | ≥4 |
| Measured rows refreshed within 30 days | 100% | 100% |
| Disputes resolved within 14 days | 100% | 100% |
| Public reviewers | 3 | 5 |
| Funded compute (months) | 6 | 12 |
| Paid ranking incidents | 0 | 0 |
| Fabricated-result incidents | 0 | 0 |

Do not use stars, page views, or badge downloads as primary metrics. They reward
promotion, not evidence.

---

## 11. Immediate next two weeks

1. **Freeze and reset**: keep `0 measured`; label every prior row `provisional`;
   remove or substantiate `certified`; drop unverifiable `npm7d`/installs; label
   operator-owned rows; seed at least 60% external plugins; publish the COI
   register; fix the consumer/site XSS; add a China-reachable mirror.
2. **Fix evidence correctness**: make 3 tasks executable (checks + fixtures);
   group by version/model/harness; require signature verification; add the missing
   schemas; fix the case-insensitive join. Without this, a pilot would publish a
   wrong number.
3. **Freeze methodology v1.1**: version binding, `provisional`, CI, minimum
   evidence (≥8 tasks, ≥3 runs/arm, environment manifest, independent runner).
4. **Ship `signals.json` + schema + decorator**; generate a 10-plugin reference
   index; validate it; add it to Discover; capture the result.
5. **Sandbox the runner** and run one surface pilot (5 plugins × 5 runs); publish
   results with CIs, or publish "pilot failed" with the reason.
6. **Converge `dsh-score`**: publish one prior spec and a conformance fixture;
   `dsh-score` becomes the local inspector, not a second public ranking.
7. **Write the one-page official brief** and open a public discussion/RFC.
8. **Recruit** two reviewers (one external) and one compute sponsor; publish the
   funding policy.
9. **Scoring reset**: label the prior as a discovery prior; fix the dead docs
   term, verification bias and missing-data-as-zero; remove cross-surface
   `overall`; no `#1` for prior-only rows.
10. **Recommender design**: specify `recommend_plugin(surface)` now, but do not
    ship auto-matching until 3–5 surfaces have measured results.

If only one item can be done, do **P0.0 (evidence correctness) + P0.5
(sandbox) + P0.6 (one real pilot)**. Everything else is packaging around
evidence that does not yet exist.

---

## 12. Open questions

1. Should `quality` be a single composite or a vector with no default? (Proposed:
   vector + documented default, so markets can choose.)
2. Who owns the task packs — the project, a consortium, or surface-specific
   maintainers?
3. Is a per-surface score comparable across surfaces? (Proposed: no; never compare
   memory to Office.)
4. How should self-run vs independent-run results be displayed without
   double-counting?
5. What is the minimum legal entity/fiscal sponsor needed before accepting
   sponsorship?
6. Will the official market accept an attributed third-party signal at all? The
   answer determines whether the project is a supplier or an independent
   benchmark.

---

## 13. Which repository should you invest in?

Short answer: **`dsh-attention-index`**. Converge `dsh-score` into a local prior
inspector; keep `dsh-community-bench` thin.

| | `dsh-score` | `dsh-attention-index` | `dsh-community-bench` |
|---|---|---|---|
| **What it is** | Local/on-demand five-dimension scorer (install, maintenance, docs, security, compliance) with tools, JSON, badges, storage | Public registry/scoring/site with prior/measured tiers, attention slots, badges | In-app Settings tab that renders the public registry |
| **Strength** | Mature code, evidence links, `no-evidence` states, JSON/badge API, good author UX | The only public, deterministic, market-facing artifact; attention allocation | Visibility; zero local scoring; a clean reference consumer |
| **Limit for the market goal** | Local, per-user, no public versioned artifact, no paired outcome evidence; its five dimensions overlap the index's prior | 0 measured; correctness/security/neutrality bugs; no signals/index/identity/API | Thin consumer; no data of its own; UI only |
| **Role** | Author-side inspector / prior implementation | **Public evidence + signals layer** | Reference consumer / demo |
| **Investment** | **20%**: converge on one prior spec; add install/security evidence; never a second public ranking | **70%**: correctness, sandbox, pilot, signals, decorator, identity, governance | **10%**: XSS/freshness/evidence detail; do not grow |

### 13.1 Why not `dsh-score` as the main layer?

- It computes **locally** with the user's `gh`/`npm` credentials. Two users can get
  different results, and a market cannot consume it at scale.
- It has **no paired outcome evidence**. Its five dimensions are priors — install,
  maintenance, documentation, security, compliance — not "does this plugin improve
  task outcomes?".
- It has **no version/cohort binding**, signed snapshot, or public registry. Its
  leaderboard is a local batch artifact.
- It **overlaps** the index's prior dimensions. Two public numbers for the same
  plugin (`dsh-score` 84/100 vs index 38.3/60) is a credibility problem, not a
  feature. A market cannot know which one to trust.

### 13.2 Why not `dsh-community-bench`?

It is a consumer. Improving it without fixing the data is polishing the dashboard.
Keep it read-only, add evidence detail/status/author response after the data
exists, and use it as the reference implementation of the display contract.

### 13.3 Convergence design

1. Define one **`dsh-plugin-prior/v1`** spec: dimensions, evidence links,
   `no-evidence`, weights, versioning. Make `dsh-score` and `dsh-attention-index`
   two implementations of it; add a conformance fixture that asserts identical
   outputs for the same inputs.
2. `dsh-score` becomes the **local/author-side inspector**. It may display the
   public measured signal by fetching a signed snapshot, but it never computes
   `measured` locally.
3. `dsh-attention-index` becomes the **public aggregator**. It publishes prior +
   measured + signals; it does not keep a second static formula.
4. Deprecate the duplicate formula in the index (or map it explicitly). Keep the
   0–60 public cap as a **presentation policy**, not a second score.
5. `dsh-community-bench` renders the public snapshot; no local scoring.

If you only have one month, put it into the index — correctness, sandbox, one
real pilot — not into new `dsh-score` features.

## 14. Is the scoring reasonable?

Short answer: **the direction is reasonable; the current formula is not
market-grade.** It is a discovery prior dressed as a quality score, and the
measured composite has semantic bugs.

### 14.1 What the audit found

Read-only probes against the 42-plugin dataset (`data/plugins.json`,
`data/registry.json`, `scripts/score.mjs`):

| Finding | Evidence | Consequence |
|---|---|---|
| **Documentation is dead and self-assertable** | 42/42 rows have no `docs` → default 50; removing the 15% weight changes rho 1.000 and 0 ranks. But a self-asserted `docs:"full"` is worth +6 prior (=20 adoption points ≈ 27× npm); applying it to OpenViking moves #7 (63.9) → #1 (69.9); adding certification → 94.9 prior / 56.9 public | 15% of the formula is constant, yet a free-text field can buy a `#1`. |
| **Verification is an operator flag** | 16/16 PerryLink rows have `doctor`/`certified`; 26/26 external rows are `none` (Fisher p=6e-12); removing V changes 35/42 ranks and the `#1` (mcp-panel → better-sidebar); no PerryLink plugin remains in the top 8 | A quarter of the score is an operator bonus, not a quality signal. |
| **Maintenance is an observation-date artifact** | M=100 exactly for the 16 operator rows observed 2026-10-18; the 26 external rows observed 2026-10-06 get 88; anchoring to each row's `observedAt` changes 25/42 ranks and leaves 7/8 of the new top rows external | Maintenance measures when data was observed, not repo activity. |
| **Missing data is treated as zero** | installs missing 13/42, npm7d 16/42, stars 25/42, npm name 23/42 | Plugins are penalized for unobserved data; adoption is not comparable. |
| **Scores are compressed / tied** | prior 30–69; public 18–41.4; 32 distinct values; ties at 38.3×3, 28.7×3, 28.6×3 | Decimals imply false precision; memory `#1` is 38.3 and settled by plugin id. |
| **Weights are not the main issue** | Spearman 0.94–0.995 across plausible reweights; top-3 churn 0–1/41 | Reweighting will not fix the construct; the data and measurement will. |
| **Measured-first contradicts rank and score** | A plugin with 0/3 with vs 3/3 without scores **24.6**, yet becomes `#1`, featured and overall `#1` above prior-only 38.3; `top3` then has length 1. A null 3/3 vs 3/3 scores **52.1** | A losing plugin becomes `#1`; rank and score disagree; a single measured row collapses top-3. |
| **Composite double-counts / misweights** | null (bench 50, prior 64, coverage 1) = **56.7**; prior-only 64 = 38.4; prior-only 80 = 48.0; negative measured (bench 0) = 29.2 but tier-first still ranks it above prior; ~35% of the ordering is non-task | A null measured plugin outranks a high prior; a negative measured outranks all prior; task-conditioning is a minority of the weight. |
| **Statistics are unsafe at n=3** | 3/3 vs 0/3 → 100; exact one-sided size at n=3 is 10.9%, not 5%; nominal 95% LCB coverage <90% in 22/45 grid cells (worst 46.9%); power for +20pp is 22.7%; with 42 nulls P(at least one false positive)=99.2%, P(at least one 100)=48.4% | The measured tier would publish noise, not evidence. |
| **Scores drift with the wall clock** | Same inputs, `--today` +14d: 29/42 ranks change; +31d: 22/42 change, mean prior 54.05→47.5, max 69→60; CI pins 2026-10-18 while Pages uses today; no history | Scores move without new evidence; no audit trail. |
| **Attention is near-universal and partly empty** | 14/15 surfaces have ≤3 plugins → `top3` is all rows; 41/42 plugins appear in some `top3`; `newAndPromising` empty (best 47.8, 2.2 below 50; plugin-guide misses by 2 stars); `mostNominated`/`mostReplicated` empty; `overall` #1 is from a 2-plugin surface | "Top 3/featured" is not selective; cross-surface `overall` is meaningless. |
| **Confidence is not a CI** | 0.82 for 1 task / 3 runs / 1 runner | Looks precise when evidence is minimal. |

### 14.2 Verdict

- The prior is a **discovery prior**, not a quality score. It mixes popularity,
  maintenance, verification and documentation; it is not task-conditioned; it
  penalizes missing data; verification is effectively an operator flag (16/16 vs
  0/26, Fisher p=6e-12), maintenance is an observation-date artifact, and docs is
  both unimplemented and self-assertable.
- **Effective variance:** adoption explains **87.2%** of prior variance,
  maintenance 1.6%, verification **−1.1%**, documentation 0%. OLS
  `prior ~ adoption` gives R²=0.479; adding an `is PerryLink` dummy gives
  **R²=0.774** with **+14.67 prior points** at equal adoption. The nominal
  30/30/25/15 is effectively *adoption + operator indicator + snapshot date*.
- **Measured calibration:** a null on a deterministic task scores **54.2**, only
  5.2 below a true +40pp effect at n=30 (59.4); a perfect 6-run result (**81.7**)
  beats a true +40pp effect with 200 runs (62.0) by 19.7 points; a harmful plugin
  at n=30 still scores **37.4**, above its own prior-only 33.4. The composite is
  not calibrated.
- **All 42 rows are E0.** There is no basis to say `dsh-mcp-panel` is better than
  `hindsight`: different channels, different evidence, no outcome data. The
  current rank is a policy artifact.
- The weights are largely arbitrary, but **not the main problem**: the ranking is
  robust to plausible reweighting. The construct and the data are the problem.
- The measured composite is not defensible: it double-counts prior, rewards
  coverage (which is not quality), adds demand, maps zero effect to 50, and lets
  any measured — including a negative one — outrank a prior.
- A single 0–100 "quality" number is not appropriate for a market reference.

**Latest validity audit adds:** the top 3 overall are **3/3 operator**; removing
verification makes them **0/3**, using actual `lastPush` makes them **1/3**, and
crediting external doctor passes makes them **1/3**. The only `certified` row
(`dsh-auto-review`) is #1 safety by 0.1 and drops out of the top 8 if `certified`
is treated as `doctor`. OpenSSF rho = 0.032; `dsh-plugin-doctor` rho = **−0.857**
(the same tool that grants operator verification credit). Presentation:
`scoring.formula` says `min(prior,60)` but the code is `60*prior/100`; `rank`
conflicts on 41/42 rows; `overall` #1 comes from a 2-entry MCP surface; root
`badges/` has 17 top files (6 operator, 2 stale) and `--check` does not flag
extras.

### 14.3 What to do

1. Separate **evidence grade** (E0 prior / E1 screened / E2 provisional measured /
   E3 measured / E4 replicated) from the **prior** and the **effect estimate**.
2. Make prior a **per-surface percentile** with explicit missing-data handling
   (`no-evidence`, not 0); remove the dead docs term or populate it; verification
   is 0 unless ≥2 independent certifiers; publish a sensitivity report.
3. Rank **lexicographically**: positive measured (FDR-adjusted LCB > 0) >
   provisional/underpowered (shown, not ranked) > prior-only (separate
   "unmeasured" list) > unrated. Do **not** let a negative measured plugin outrank
   a prior by tier alone. Within measured, rank by the bench/effect estimate;
   the composite is display-only.
4. No single composite. If a number is unavoidable, publish the weights, a
   sensitivity analysis, and "this is not a probability of quality".
5. Attention: top-3/featured only from **positive measured**; prior-only gets no
   `#1` badge; operator recusal; new/under-evaluated slots stay.
6. The recommender uses tier + effect + CI + coverage, not the prior score.

### 14.4 P0/P1/P2

- **P0**: freeze measured; label prior as a discovery prior; fix the dead docs
  term, verification bias and missing-data-as-zero; remove cross-surface
  `overall`; no `#1` for prior.
- **P1**: evidence grade + lexicographic ranking; per-surface percentile;
  sensitivity report; FDR/CI display; retract any "quality score" wording.
- **P2**: calibration study against independent signals; external audit;
  governance of weight/methodology changes.

## 15. Session-to-bench recommendation

The idea: an **app-level bench**, matched to the current session, recommends the
highest-scoring plugin on that bench. It is a good idea **if it is a consumer of
the public evidence, not a new local scorer**.

### 15.1 The app-level bench

"App-level bench" does **not** mean a local score computed in the app. It means:

- a **public task pack per capability surface** (memory, web, office, dev, …);
- run through DSH (headless or in-app), with a pinned environment;
- results are **public, signed, version-bound** and enter the same registry that
  markets consume;
- the app provides the **session context** and the **recommendation surface**, not
  the score.

The existing `scripts/bench-run.mjs` is already the runner; the missing pieces are
executable tasks, sandboxing, attestation and measured coverage. The recommender
is a consumer of that public bench, not a second bench.

**Units (do not conflate):**

| Unit | Definition | Used for | Never for |
|---|---|---|---|
| **Surface** | Market category id (`memory`, `mcp`, `office`, …) | Browsing, index `category`, filters | A claim, a rank, or a `#1` |
| **Brief** | Job-to-be-done, stable id `surface/job` (`memory/recall`, `office/report`) | **Session matching**, scope of a claim | Ranking across briefs |
| **Task** | One prompt + fixture + executable checks | Unit of evidence | A standalone winner |
| **Pack** | Versioned tasks/fixtures/checks for one brief | Result identity, invalidation | Matching (versions churn) |
| **Instance** | `pack × environment(model, DSH version, profile, runner image) × methodology` | Comparison universe | — |
| **Cohort** | Measured plugins inside one instance | Rank denominator (`#1 of 5`) | Matching (depends on who ran) |

The surface is a market category, not a measurement: it mixes heterogeneous jobs
(memory recall vs memory hygiene vs memory cost). Match on a **brief**; rank
inside an **instance**; publish at surface level; report rank against a **cohort**.

### 15.2 The boundary

| Layer | Runs where | What it does | What it must not do |
|---|---|---|---|
| **Match** | Local, ephemeral | Infer the capability surface / bench from the session (memory, web, office, dev, …) | Compute a score, persist raw text, upload anything |
| **Lookup** | Public | Read the public ranking for that surface/cohort from `signals.json` | Personalize the ranking |
| **Recommend** | Local UI/tool | Show top-k with tier/CI/coverage/evidence and an install link | Rank by installs/clicks, hide unmeasured plugins |

This is the key distinction: **matching is routing, not scoring.** The score is
public and identical for everyone; the session only selects which public bench is
relevant. This keeps the original "no local scoring" constraint intact.

### 15.3 Sequencing

Do **not** launch the recommender before 3–5 surfaces have measured results.
With 0 measured it would recommend prior-only plugins — exactly the "local box"
with no value that was already rejected. The order is:

1. executable tasks + sandbox + first measured pilot;
2. public signals + ranking policy;
3. recommender (tool first, auto-match later);
4. market/index integration.

**Current-state blockers (verified):**

- `top3`/`featured` fall back to prior when `measured = 0`
  (`scripts/score.mjs:308,317`); the rank-1 SVG badge says `#1 memory · 38.3`
  without a tier, while Markdown says `38.3 · prior`; the `dsh-recommend` feed
  repeats `rank: 1, tier: prior`. A recommender on top of this **launders
  prior-only into a recommendation**. Strip `#1`/rank from 0-measured surfaces
  before shipping any recommendation.
- `plugins[].surface` is singular; `aggregateBench` takes
  `aggregate.tasks[0]?.surface`, so a multi-surface plugin gets one arbitrary
  surface and coverage can exceed 1.0. Add a `briefs[]`/multi-surface model and
  per-environment result keys before routing.
- All 15 tasks are `draft` and every check is prose-only (`id` + `description`,
  no `kind`); nothing is runnable. Fix tasks before matching.
- The composite is not task-conditioned: 35% of the ordering signal is prior
  (30% of which is adoption). Rank measured rows on `bench`, not the composite;
  keep the composite for display only.

### 15.4 Match design

- **P0: contract, no runtime.** Publish the routing vocabulary
  (`tasks.json` surfaces + `routing`), `MATCHER-SPEC.md`, conformance fixtures,
  the recommendation contract and a `signals.json` skeleton. No tool, no UI. An
  optional read-only `/bench` finder may show the matched surface, evidence
  status and a link — **no rank, no "recommended", no install**.
- **P1: measured-gated tool.** `bench_recommend { query?, surface?, limit?,
  refresh? }` with an explicit query or surface; **no implicit session read**;
  bundled snapshot first; measured/replicated gate; prior-only surfaces return
  `recommendable: false` and a labelled candidate list.
- **P2: session-aware.** A Host Remote `matchSession(sessionId)` plus an opt-in
  `conversation.session.header.utilities` chip; `pluginMarket` install/compat
  enrichment; signed snapshots before any install CTA.

**Placement constraints (verified):**

- **`plugins.tab` cannot host session matching.** It is root-scoped and has no
  session content. Matching must live in a Host command/tool or a session-scoped
  slot (`conversation.composer.dock` / `conversation.session.header.*`). The tab
  can only offer an **explicit surface picker**.
- **Discover has no per-entry bench badge or deep-link today.** Market entry
  pages are internal to `ui-plugin-market`; `plugins.detail.*` belongs to the
  Installed page. The only no-core-change Discover integration is **format-1
  decoration** (labels + sortKeys + an attributed description note). A separate
  Bench tab is the reliable human destination.
- **At 0 measured, the recommender must abstain, not rank.** P0 is a pull-only
  evidence-status surface + `/bench`, not an install recommendation. A prior-only
  "top pick" violates G13/P0.7 and the no-fabricated-data rule.
- **No install CTA before version-bound measured signals exist.** Registry rows
  carry no version, 23/42 have no npm name, every surface has one draft task, and
  the registry is unsigned. A recommendation that hands off to the standard
  install dialog before that is unsafe.
- **Features from DSH events** (P2 session-aware path only; the P1 tool takes an
  explicit query/surface and must not read the session): `user/message` text
  (filter `source.kind === 'user'`; synthetic context uses the same event type);
  `tool/call.name` (MCP tools are `mcp__<server>__<tool>`, a high-precision
  signal); `image/offload` (vision); `deliverables/presented` (Office/report);
  `subagent/*`, `team/*`, `workflow/*` (orchestration); `approval/*`,
  `permission/preset`, `sandbox/mode` (safety); `compaction/*` (cost/context);
  `schedule/change` (remote); `model/selection`,
  `working-directory/change`, `workspace/changes` (dev).
- **Two correctness traps**: under PTC the only native call is `run_code`;
  sub-calls log as `tool/ptc-dispatch` / `tool/ptc-dispatch-start`, so a matcher
  reading only `tool/call` is blind. Mid-session cwd changes live in the
  `workingDirectory` projection, not the session header.
- **Backfill** for a plugin loaded mid-session or a resumed session:
  `ctx.sessionQuery.listEvents(id)` / `readSurface(id)` (detached,
  replay-validated). Do not build on deprecated event helpers.
- **Do not put raw matcher features in a session projection.** The base profile
  mounts `session-projection-cache`, which persists every unit's state; there is
  no per-unit opt-out. Use an in-memory Host service. A projection is acceptable
  only for a text-free client label, with the persistence documented.
- **Match the current turn**; if under-determined, the last 3 user turns. Never
  the whole session: a memory task from hour 1 would dominate the rest.
- **Never use the installed plugin set to route.** That closes a self-fulfilling
  loop (benched winners route to themselves). Installed plugins are used only to
  dedupe/exclude and to compute `versionMatch`.
- **Output `topK ≤ 3` briefs** with `{ briefId, matchConfidence, matchedOn[] }`
  and `ood: true` when the job is not covered by any task in the bank. Below
  threshold → no recommendation, not a global fallback.
- **Multi-brief sessions**: one shortlist per brief. A session spanning
  memory+research gets `memory/recall` and `research/sources`, not a blended
  score. If the two are co-required and no composite brief exists, say "no bench
  for this combination".
- **Abstain reasons are explicit**: `insufficient` (raw score below threshold),
  `ambiguous` (margin too small; offer a choice), `not-applicable` (subagent or
  no human prompt yet), `dismissed`, `registry-stale` (>7 days),
  `no-measured`, `no-independent-coverage` (surface is operator-dominated),
  `unavailable` (installed/incompatible/inactive).
- **Neutrality gate**: while a surface is operator-dominated (operator share
  >25%, external share <60%, or an operator-owned `#1`), do not name a plugin;
  abstain with `no-independent-coverage` and show why.
- **User override** always wins; remember it only for the session.
- **Meaningfulness preconditions**: same instance for every compared plugin; the
  matched job is covered by the bank (`ood: false`); environment applicable;
  cohort ≥ 2.

**Privacy rules (hard):**

- **No raw text in any persisted state.** Use an in-memory Host service; do not
  put features in a `sessionProjections` unit. The base profile's
  `session-projection-cache` persists every unit, with no per-unit opt-out.
- **No arbitrary `sessionId` tool argument.** The matcher reads only the current
  session, and only aggregate features; a model must not be able to read another
  live session's text.
- **Do not write recommendation content into session-visible events or tool
  results** that `session-log-deepseek` may upload. Keep `/bench` output local;
  scope the "no upload" claim to the matcher, not to the whole session.
- **No credits, boost, or exploration in the recommendation path.** Credits are
  reputation only; they cannot buy a slot, a rank, or a boost.
- **No unkeyed hashes of text or session ids.** A SHA-256 of a prompt is
  confirmable by anyone holding a candidate text, and a stable session hash links
  a user's submissions across time. Use an ephemeral local nonce if dedupe is
  needed; never publish the hash.
- **Scope the no-upload claim honestly.** The recommender adds zero egress and
  zero persistence; the host's existing session-log upload
  (`session-log-deepseek`) is unchanged. UI copy must not imply "nothing leaves
  your device".
- **First-use disclosure + disable switch.** In-memory matching needs no consent
  gate, but it needs a clear first-use card (what is read, what is not, what is
  stored: nothing) and a persistent off switch. Any donation/export is a separate,
  per-action, previewable, revocable decision.
- **No telemetry.** Add a CI dependency check that the plugin graph never reaches
  `dsh-telemetry*`.
- **Install-handoff caveat.** DSH Desktop product analytics is default-on and
  records `plugin_install_click` (package id) and `install_plugin_result`; a
  recommendation that hands off to the standard install dialog inherits that
  collection. The recommender must add **zero events**; if "no telemetry" is
  absolute, the install handoff needs an explicit audit/suppression decision
  before any CTA.

### 15.5 Recommendation policy

**Record must carry:** `tier`, `quality` + `scale`, `lift` + `ci95` + baseline
`p0/p1`, `coverage` + `tasksRun/tasksInBrief`, `samples` + `runners`,
`confidence` (completeness, not a probability), `rank` + `cohortSize` +
`tieGroupSize` + `tiedWith`, `environment.match`, `versionMatch`,
`observedAt/expiresAt/lastEvidenceAt`, `flags`, `limitations[]`, `excluded[]` with
reasons, `unmeasuredCandidates`, `disclosures.personalized = false`, and a
`verify` link. The record is a **pure projection**: same bench-index hash + same
brief + same environment ⇒ byte-identical output. Add a golden-file test.

**False-#1 algorithm:**

1. `C` = measured plugins in the instance, exact/adjacent environment, fresh,
   non-revoked, `versionMatch ∈ {exact, carried-forward}`.
2. If `|C| < 2` → no rank (`only-measured`); a `#1` of one is not a comparison.
3. Pool tasks with a paired bootstrap; carry `lift`, `ci95`, `coverage`, `runners`.
4. Gate each row: coverage ≥ 0.5, tasksRun ≥ 5, runners ≥ 2, CI width ≤ 0.30,
   no open dispute, no draft task.
5. Eligible set `E`; if empty → unranked shortlist with per-row gate reasons.
6. Winner `w = argmax quality(E)`. For every other `e`, compute a **paired** CI on
   `(q_w − q_e)`; if its lower bound ≤ 0, `e` is tied.
7. `T = {w} ∪ tied`. If `|T| > 1` → `tie-group`; order inside `T` by coverage,
   then confidence, then plugin id (deterministic).
8. If `|T| == 1`, require a multiplicity-adjusted margin (max-statistic bootstrap
   or Bonferroni over `|E|−1`); otherwise still `tie-group`.
9. Render at most 3 tie-group + 2 next + 3 prior rows, plus cohort size and
   unmeasured count.
10. If the winner's lift CI includes 0 → label "indistinguishable from no
    plugin", regardless of rank.

**States:** `measured` (positive gate), `tie-group`, `only-measured`,
`provisional` (gate failed), `no-outcome-evidence` (prior-only shortlist),
`unrated` (not in the bench), `stale`, `revoked`. Never present a prior-only
plugin as "the best". Never hide unmeasured plugins. No paid placement, no
install-count ranking, no operator self-promotion.

**COI rule:** every row carries `operatorOwned: true|false`; an operator-owned
plugin is excluded from the primary slot, and a surface is not recommendable
until external share ≥60% and operator share ≤25%. Current data: 16/42
operator-owned (38%), operator-owned `#1` in 5/15 surfaces, 15/41 top-3 slots
(~37%).

**Ranking rules (hard):**

- Tier is a **partial order**: measured-valid > measured-provisional > prior-only
  > unrated. Never blend 0–60 and 0–100 in one sort or column.
- Order measured by **task-conditioned quality (`bench`)**, not the composite;
  adoption/community never affect measured order.
- A **single winner** requires cohort ≥ 2, coverage ≥ 0.5 with ≥ 5 tasks, ≥ 2
  independent runners, CI width ≤ 0.30, and a multiplicity-adjusted margin
  LCB > 0. Anything less is a tie group or a shortlist.
- **Ties**: a paired CI on the quality difference; if its lower bound ≤ 0, the
  two are tied. Order inside a tie by coverage → confidence → id, never by point
  estimate.
- **Environment**: `exact` usable; `adjacent` provisional and labelled;
  `mismatch` no claim for this user (show "measured on X" separately).
- **Version**: `exact` is the only unqualified state; `carried-forward` only for
  a patch bump with a verified no-runtime-surface-change diff, labelled
  provisional; `newer`/`older` show the score for the measured version, never as
  the installed version's score, and cannot be a `#1`.
- **Freshness**: measured 90d, replicated 180d, prior 30d, pack 180d; expired
  rows demote to prior-only with `stale: true`, never a measured winner.
- **No-effect must be visible**: if the lift CI includes 0, label
  "indistinguishable from no plugin" and show lift/CI/p0/p1; do not let the
  0–100 mapping's 50 read as "mediocre".
- **Display budget**: ≤ 3 tie-group + 2 next + 3 prior rows, always with cohort
  size and `unmeasuredCandidates`.

**0-measured behavior (today):**

| State | Claim | Rank? | Prior rows? | Line |
|---|---|---|---|---|
| 0 measured, prior exists, neutrality gate passes | `no-outcome-evidence` | **no** | max 3, labelled | "No paired bench for this job yet. Prior evidence only — not an outcome claim." |
| 0 measured, operator-dominated surface | `no-independent-coverage` | no | no | "No independent coverage for this surface yet." |
| 0 measured, no prior | `no-evidence` | no | no | "Nothing known for this capability." |
| no brief matched / below τ | none | no | no | "This session doesn't match a benched job." |

Do **not** abstain entirely when prior exists: an empty answer sends users back
to stars and install counts. The labelled prior shortlist is bounded: it answers
"what exists for this job", refuses to answer "which is best", and carries no
rank. Prior order must **exclude adoption** (`orderBasis: verification,
maintenance, documentation`); otherwise it is an install-count ranking in
disguise.

### 15.6 Integration options

| Option | Intrusiveness | Best for | Verdict |
|---|---|---|---|
| **`/bench` finder** | Low | Surface + evidence status + link; **no rank** | P0, optional |
| **Agent tool `bench_recommend`** | Low | Explicit `query`/`surface`; the model calls it | **P1** |
| **Settings/Plugins tab** | Low | Explicit surface picker; root scope, no session | P1 |
| **Discover format-1 decoration** | Low | Labels/sortKeys + attributed description note; no per-entry badge | P1 |
| **Composer dock / session chip** | Medium | Session-aware suggestion, on click | P2, opt-in |
| **CLI install guard** | Low | Show evidence before install | P2 |

The tool is the least intrusive and most DSH-native; start there **after**
measured evidence exists. The dock is a later, opt-in convenience, not the
product. Discover cannot show a per-entry bench badge or deep-link today; a
separate Bench tab is the reliable human destination.

### 15.7 How it combines with the market layer

- `signals.json` is the single source: the market decorator uses it for
  categories/labels/sortKeys; the recommender uses it for the surface lookup.
- The **surface taxonomy is shared**: a session match selects the same surface id
  that a market filters by.
- The recommendation record can carry the **install target** and the **market
  index URL**, so the existing install flow is reused.
- The public bench and the market index are two views of the same evidence:
  market = browse by category; recommender = match by session.

**Format-1 is a lossy view.** It cannot carry CI, n, cohort or the environment
tuple. Therefore:

- Encode uncertainty in **labels**: `measured`, `replicated`, `provisional`,
  `low-coverage`, `wide-ci`, `stale`, `prior-only`, `no-outcome-evidence`, `tie`.
- **Omit `sortKeys` for unmeasured rows** so the format's "missing value sorts
  last" rule enforces tier order.
- `metadata.category` is one id per plugin, so a multi-brief plugin is lossy in a
  format-1 index. Document it; use labels for the additional briefs.
- The **app-level recommendation is authoritative**; the market index is a browse
  view, not the full evidence record.

### 15.8 Repo ownership

- `dsh-attention-index`: owns the **routing vocabulary, policy, version-bound
  signals, format-1 decoration, schemas and conformance fixtures**. It never reads
  sessions or queries; it never logs recommendations.
- `dsh-community-bench`: owns the **local matcher, feed reader, recommendation
  record, `bench_recommend` tool, tab and (P2) session chip**. It never computes
  prior/bench/score or reorders candidates by its own weights.
- `dsh-score`: local prior inspector; **no matching code**, not a data source for
  the recommender.
- `dsh-recommend` (external): consume the sidecar feed; keep its global ranking;
  do not merge scores.

**Do not create `dsh-bench-recommend`.** Extend `dsh-community-bench` with a host
half (`index.js` is currently an empty host stub). One plugin, one snapshot, one
privacy review. Split later only if a headless/no-client consumer or a second app
needs the matcher; then extract a **`dsh-bench-match` library**, not a second
end-user plugin.

### 15.9 P0/P1/P2

**P0 — contract and public data; no recommender (2–3 weeks).**

- `routing` in `tasks.json` surfaces + schema: `terms[{id,text,strength}]`,
  `negativeTerms[]`, `examples[]`; every surface ≥6 terms, ≥2 negative, ≥1
  example.
- `signals.json` skeleton with `version` + `environment` **inside each surface
  signal**; `recommendation-policy` (`requireMeasured: true`, `maxCandidates: 3`,
  `maxStalenessDays`).
- `MATCHER-SPEC.md`, `RECOMMENDATION-CONTRACT.md`,
  `fixtures/routing/conformance.json` (≥20 EN/ZH/ambiguous/no-match cases).
- No tool, no UI, no session read. An optional read-only `/bench` finder may show
  the surface, evidence status and a link — no rank, no "recommended", no install.
- Acceptance: the current registry yields `recommendable: false` for all 15
  surfaces; no public artifact contains session data; no "best"/"recommended"
  label; no install CTA.

**P1 — measured-gated recommender v1 (4–8 weeks after ≥1 measured surface).**

- Host `src/feed.js` (bundled/live/signed, cache, fallback), `src/match.js`
  (spec), `src/recommend.js` (hard floor), `bench_recommend` tool (explicit
  `query`/`surface`; no implicit session read; no install).
- Router evaluated on D1 (180–300 synthetic) + D1-adv (60 adversarial) with
  conformal abstention (α = 0.1); top-1 ≥ 0.85, abstention ≤ 20%, injection
  invariance 100%, determinism 100%.
- Display public order byte-for-byte; no local weights; no credits/boost; no
  telemetry.
- Acceptance: prior-only surface `recommendable: false`; measured surface top row
  = public top; stale/malformed feed → `unavailable`; egress test allows only GET
  to the feed host; no raw query/session text in output; no `sessionId` arg.

**P2 — session-aware and market-integrated (3–6 months).**

- Host Remote `matchSession(sessionId)` + opt-in
  `conversation.session.header.utilities` chip; no background scan; clears on
  session switch; opt-in default off.
- `pluginMarket` install/compat enrichment; install target = measured version; no
  CTA when the default version ≠ measured; signed snapshot before any CTA.
- D2 consented corpus (30–100) + D3 private holdout; formative user study;
  simulated exposure audit.
- Acceptance: chip only on click; network/logs contain no session text; signature
  verified; chip hidden until ≥3 measured surfaces. Install CTA only from a signed
  snapshot and a version-bound measured signal; document that the standard install
  dialog inherits Desktop's default-on install analytics, and the recommender adds
  zero events.

### 15.10 Failure modes

| Failure | Mitigation |
|---|---|
| Wrong surface → wrong plugin | Confidence + abstention + user override; explain the match |
| Recommending prior-only as "best" | `no-measured` state; separate labelled list |
| Nagging / notification fatigue | Opt-in dock; dismiss per session; no repeated prompts |
| Gatekeeping / rich-get-richer | Measured-positive only; diversity slots; no install-count ranking |
| Local-scoring creep | The matcher only emits a surface id; the score is read from the public snapshot |
| Privacy leak | No raw text in projection state; no upload; no telemetry; local-only evaluation |
| Gaming the matcher | Match on session/task features, not plugin descriptions; measured evidence controls ranking |
| Stale recommendation | `expiresAt`/`stale` flags; signed snapshot; offline fallback labelled |
| **Reusing the old `/home/yy/attention-bench` ranker** | It computes `organic = match^0.65 × credit^0.55 × confidence × exploration` and sorts locally; it persists 4,000 chars of user text through a projection; it accepts an arbitrary `sessionId`; credits can boost. **Do not reuse it.** The router emits a surface/brief id only; no local score; no text in a projection; no `sessionId`; no boost. |
| Tool-name steering | A plugin registers `memory_*` / `search_*` tools to bias routing. Ignore plugin-registered tool names; allowlist built-in tools only; drop tool hints if necessary. |
| Recommendation content uploaded | Tool results containing the route/score join the session log that `session-log-deepseek` uploads. Write no recommendation content to the log; keep `/bench` output local; scope the claim. |
| Credits buy attention | Remove `boost`/sponsor/credit balances from the recommendation path; credits are reputation only. |

### 15.11 P0 UI contract (0 measured)

- **Existing Settings tab first; no new Plugins tab yet.** Extend the current
  Community Bench tab with evidence status and prior-only candidates. A
  Plugins-page Bench tab is P1, when there are measured recommendations to show.
- **`/bench [surface]`**: a host command (text), an explicit surface or a
  15-surface chooser; never guesses; no session inference.
- **Drop or demote the prior-only `#` rank.** The tab renders `#1/#2/#3` on cards;
  the `Top 3` string is defined but unused. P0: no `#` rank for prior-only rows
  (or an explained "attention rank" only in details), and a `Candidates` header.
- **Evidence-status banner**: `0 of 42 plugins measured · 15 surfaces · 15 draft
  tasks`; "We don't recommend a plugin without outcome evidence."
- **CTAs**: Request a run / Nominate / Contribute / How it works; no install.
- **State copy**:
  - no measured: "No measured results yet."
  - no task: "No bench task for this surface yet."
  - insufficient: "Evidence is insufficient."
  - stale: "Evidence is stale (over 30 days)."
  - unavailable: "Bench unavailable; no recommendation."
  - operator-owned only: "No independent candidate yet."
  - already covered: "You already have a plugin for this surface."
  - ambiguous: "Which capability?" chooser.
- **Disclosure**: "Public Community Bench data. Same scores for everyone; no
  per-user score. No account, no telemetry, no session upload. Matching runs on
  this device only when you ask."
- **Forbidden in P0**: `Recommended`, `Best`, `#1`, `Top pick`; an install button;
  any paid/sponsored slot.

## 16. Decisions to make

The research leaves six choices. Recommended answers:

1. **Brief as the public claim unit, surface as browse category.** Yes. A surface
   mixes heterogeneous jobs (memory recall vs memory hygiene vs memory cost); a
   brief (`surface/job`) is the smallest unit that can be matched and claimed.
   Keep surface for market categories/filters; never rank across briefs.
2. **Registry ordering: tier → quality, not composite.** Change it. The composite
   is ~35% non-task (30% prior, 5% community); a "task-conditioned" ranking on it
   is popularity-weighted. If the registry cannot change immediately, make the
   recommendation order by quality and state that recommendation rank ≠
   leaderboard rank — but that divergence is confusing; prefer changing the
   registry.
3. **Exclude adoption from prior-shortlist ordering.** Yes. Adoption is
   popularity, not capability. Show it as context, not order;
   `orderBasis: verification, maintenance, documentation`.
4. **Accept `provisional` as the normal state for the first year.** Yes. A ±10pp
   claim needs roughly 2,000 runs/plugin-brief; do not chase that everywhere.
   Target 3–5 briefs with credible measured results; leave the rest labelled
   `no-outcome-evidence`. Ten credible measured plugins beat 97 noisy ones.
5. **Router: local-only, on-demand Host service.** Yes. No background scan, no
   projection for raw features (the base profile persists every projection), no
   server. `/bench` finder in P0; `bench_recommend` with an explicit
   `query`/`surface` in P1; session-aware chip in P2. The router outputs a brief
   id, never a score.
6. **No fourth repo.** Extend `dsh-community-bench` with a host half; extract a
   `dsh-bench-match` library only if a headless or second consumer appears. One
   plugin, one snapshot, one privacy review.
7. **Placement.** Extend the existing Settings Community Bench tab in P0; add
   `/bench` as a host command in P0; add a Plugins-page Bench tab in P1 (when
   there are measured recommendations); composer dock only in P2, opt-in. Do not
   add a new tab with nothing to show.
8. **COI.** Publish `operatorOwned`; exclude operator-owned plugins from the
   primary slot; a surface is recommendable only with external share ≥60% and
   operator share ≤25%.
9. **Deep link.** No core `openMarketEntry` in P0/P1; the Bench tab is the
   destination. A generic `pluginNavigation.openMarketEntry` is a later optional
   core addition, not a dependency.
10. **Telemetry.** No install CTA until the Desktop analytics decision is made;
    if a CTA ships later, disclose or suppress the inherited
    `plugin_install_click`/`install_plugin_result`. The recommender adds zero
    events.
11. **Minimum evidence.** ≥8 tasks/surface, ≥3 runs/arm, ≥2 independent runners,
    coverage ≥0.5, evidence completeness ≥0.6, exact version match, freshness
    ≤30d. If any fails, `insufficient_evidence` with a reason code.
12. **Prior-only candidates.** Show collapsed, unnumbered, never as a
    recommendation; abstain on an operator-dominated surface. No install CTA.
13. **Surface taxonomy.** `dsh-attention-index` owns `data/surfaces.json` +
    `matcherVersion`; new surfaces go through an RFC and a version bump; no
    author-supplied routing terms.

Two consequences:

- The **public claim unit** is the brief, but the **market index** can only carry
  a surface category + labels; document the loss (see §15.7).
- The **recommender** can ship only after the P0 truth fixes; otherwise it
  launders prior into recommendation.

## Appendix A — Format-1 decoration sketch

> Excerpt only. A real entry must also carry `versions[]` with `publishTimestamp`,
> `source`, and `engines.dsh`; use the official generator for the base index and
> let the decorator add only `metadata`.

Base index (from the official generator):

```json
{
  "format": 1,
  "title": { "en": "DSH Community Bench", "zh": "DSH 社区基准" },
  "metadata": {
    "categories": { "memory": { "title": { "en": "Memory", "zh": "记忆" } } },
    "labels": {
      "measured": { "title": { "en": "Measured", "zh": "实测" } },
      "prior": { "title": { "en": "Prior only", "zh": "仅先验" } },
      "provisional": { "title": { "en": "Provisional", "zh": "暂定" } }
    },
    "sortKeys": {
      "community-score": { "title": { "en": "Community score", "zh": "社区分" }, "order": "desc" },
      "coverage": { "title": { "en": "Coverage", "zh": "覆盖" }, "order": "desc" },
      "confidence": { "title": { "en": "Confidence", "zh": "置信" }, "order": "desc" }
    }
  },
  "plugins": [
    {
      "name": "dsh-memento",
      "metadata": {
        "category": "memory",
        "labels": ["measured"],
        "sortKeys": { "community-score": 82.4, "coverage": 0.6, "confidence": 0.78 }
      }
    }
  ]
}
```

Decoration rules:

- `category` = surface id.
- `labels` = tier (`measured`/`prior`/`replicated`) + `provisional` when applicable.
- `sortKeys` = the signal values; never rename a plugin or change its install
  target.
- Plugin order = measured first, then score descending; ties by confidence.
- Description may append a one-line evidence note, clearly marked as a
  third-party claim; never replace the package description.
- The decorator must validate that every referenced category/label/sort key is
  declared and every plugin name exists in the base index.

## Appendix B — Signal feed sketch

```json
{
  "schema": "dsh-plugin-signals/v1",
  "generatedAt": "2026-10-18T00:00:00.000Z",
  "methodology": { "version": "v1.1", "hash": "sha256:…" },
  "source": { "registry": "data/registry.json", "commit": "…" },
  "plugins": [
    {
      "id": "dsh-memento",
      "identity": { "npm": "dsh-memento", "repo": "https://github.com/PerryLink/dsh-memento" },
      "versions": [
        { "version": "1.4.0", "engines": { "dsh": ">=0.2.0 <0.3.0" }, "compatibility": "compatible" }
      ],
      "surfaces": [
        {
          "id": "memory/recall",
          "surface": "memory",
          "version": "1.4.0",
          "engines": { "dsh": ">=0.2.0 <0.3.0" },
          "environment": {
            "model": "deepseek-flash",
            "dsh": "0.2.1-rc.2",
            "os": "linux",
            "runner": "github:perrylink-runner-1"
          },
          "tier": "measured",
          "provisional": false,
          "quality": 82.4,
          "coverage": 0.6,
          "confidence": 0.78,
          "evidence": [{ "kind": "paired-bench", "url": "…", "runner": "…", "runs": 30 }],
          "observedAt": "2026-10-17T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

## Appendix C — Reading list

- OpenSSF Scorecard: a signal + API + spec consumed by many platforms.
- MLPerf: audited, versioned benchmark results with a submission process.
- SPDX/CycloneDX: spec + tooling + multi-vendor adoption without a central
  authority.
- DSH format Agent Note: `deepseek-harness/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md`.
- DSH Desktop catalog provider contract v1:
  `anywhere-labs/dsh-desktop/dsh-community-market/docs/catalog-provider-contract.md`.
