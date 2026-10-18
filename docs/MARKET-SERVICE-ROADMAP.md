# DSH Community Bench as a market reference and service layer

Status: proposal for discussion · 2026-10-18
Scope: what this project must become if its purpose is to serve DSH markets
(third-party catalogs today, a possible official market later) rather than to be
one more leaderboard.

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
          "id": "memory",
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
