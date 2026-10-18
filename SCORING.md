# Scoring · dsh-score v1.1 (SOE / GOE)

> The evidence is **public**, **reproducible**, and **deliberately conservative**.
> A public score that cannot be reproduced is just another popularity metric.
>
> **v1.1 reliability update (2026-10-18).** Prior-only rows are **E0 / unrated**.
> The 0–60 composite is **legacy discovery only**; it is not a quality claim and
> does not receive a quality rank. The authoritative model is
> [docs/SOE-GOE.md](docs/SOE-GOE.md); implementation is
> [`scripts/reliability.mjs`](scripts/reliability.mjs).
>
> **Hard gates:** an unreviewed task pack or a run without a **full** sandbox
> (the current `bwrap-fs` mode is partial) is capped at **E2 provisional**. E5 additionally requires an independent audit in
> `data/audits/index.json`. The current 24-task pilot pack is unreviewed, so it
> cannot produce E3+.

## 1. What is published

Each row carries four separate things:

| Field | Meaning |
|---|---|
| `evidenceGrade` | `E0` unrated · `E1` screened · `E2` provisional · `E3` measured · `E4` replicated · `E5` audited |
| `soe` | Strength of Evidence vector: design, execution, precision, independence, directness (0–4) |
| `goe` | Grade of Evidence: grade, certainty, direction, reasons, downgrades |
| `discovery.score` | legacy 0–60 metadata ranking; **not** quality; kept for compatibility |

A row with no paired result is `E0`, `unrated: true`, `goe.positive: false`.
`top3`, `featured` and quality badges are only populated by **positive E3+**
rows. `rank` is `null` for E0/E1/E2.

The legacy formulas below are kept so the historical discovery number remains
reproducible. They do **not** define quality, and the measured composite is
deprecated.

```
legacy_discovery(p, s) =
  measured(p) ? 0.55·Bench(p,s) + 0.30·Prior(p) + 0.10·Coverage(p,s) + 0.05·Community(p,s)
              : 60 · Prior(p)/100
```

- `Prior` is a 0–100 metadata score (discovery only).
- `Bench` is a legacy 0–100 mapping of the Newcombe lower bound of lift.
- `Coverage` is the fraction of tasks in `s` with enough paired samples.
- `Community` is a capped demand signal from contribution receipts.

**The 60-point compression is a presentation convention for the legacy
discovery number.** It does not turn metadata into outcome evidence.

## 2. Prior (0–100)

```
Prior = weighted mean of observed dimensions
      = Σ(wᵢ · valueᵢ) / Σ(wᵢ)   for dimensions with evidence
```

| Component | Input | Mapping |
|---|---|---|
| Maintenance | last push, anchored to that row's `observedAt` | ≤7d 100 · ≤30d 88 · ≤90d 70 · ≤180d 45 · ≤365d 20 · older 5 |
| Adoption | observed installs/npm7d/stars; npm7d requires an npm identity | weights 18/14/4 renormalized over observed channels, cap 100 |
| Verification | independent certifier (`certifiedBy`/`verificationSource`) | `certified` 100 · `doctor` 35 · bare string / self / operator-only 0 |
| Documentation | coarse docs field | `full` 90 · `basic` 65 · absent **null** (excluded; 0/42 rows have docs) |

Status caps: `frozen` ≤ 50; `archived`/`retired` ≤ 30.

**Missing is not zero.** A dimension with no observation is excluded and the
weights are renormalized; a download count without an npm package identity is
not counted. This changes the discovery order versus the old zero-imputation
formula, which is intentional.

**Why these weights?** Maintenance and adoption each get 30% because both matter and both can be gamed alone. Verification gets 25% only when it names an independent certifier; a bare `certified`/`doctor` string is 0. Documentation is 15% but is currently unimplemented and excluded. These are **legacy discovery weights**, not quality weights.

**Why three adoption signals?** Install counts are channel-biased (1024Store counts only its own wrapper), npm includes CI/mirrors, stars are attention rather than use. Using all three with small weights is harder to game than any one alone. The registry records each raw value and its observation date.

## 3. Bench (0–100)

> **Legacy section.** The `bench`/composite math below is kept for reproducing
> the historical discovery number. It is **deprecated** and is not used for a
> quality slot. Quality gating is `evidenceGrade` (E3+) + positive Newcombe lower
> bound + SOE/GOE; see [docs/SOE-GOE.md](docs/SOE-GOE.md).

A bench task `t` has a fixed prompt, fixture, model, harness, budget and checks. For each plugin and task, the runner produces paired arms:

```
with    = runs with the plugin installed
without = runs with the same base profile, no plugin
```

A task enters the score only when **both arms have at least 3 results** (`minSamples = 3`).

```
p1 = passes(with) / n1
p0 = passes(without) / n0
lift = p1 − p0
se = sqrt(p1(1−p1)/n1 + p0(1−p0)/n0)
lcb = clamp(lift − 1.96·se, −1, 1)
taskScore = 100 · (lcb + 1) / 2
```

`Bench(p,s)` is the task-weighted average of `taskScore` over qualifying tasks in surface `s`.

- A plugin with no qualifying task gets `bench: null`, `tier: "prior"`.
- A plugin whose with-arm is worse gets a low `taskScore`; the registry does not hide negative results.
- Model, harness and plugin version are part of the result identity. Results with different tuples are not merged; only the latest comparable set is ranked.
- `Coverage` = qualifying tasks / tasks in the surface. A plugin that only ran one easy task gets low coverage, not a high score.

## 4. Community (0–100, weight 0.05)

Contributions are **trajectory receipts**, not plugin benchmarks:

```json
{
  "surface": "memory",
  "plugins": ["perrylink/dsh-memento"],
  "quality": 82,
  "price": 41,
  "verification": "replay",
  "sessionHash": "sha256:…",
  "textHash": "…",
  "nomination": "some/under-evaluated-plugin"
}
```

They produce:

1. **Contributor reputation** — credits, average quality, badge.
2. **A small demand signal** for a plugin: `Community = min(100, 10·sqrt(Σ quality/100 · verificationMultiplier))`, weight 0.05.
3. **Nominations** — under-evaluated plugins can be prioritised for a bench run.

Contributions **never** replace a paired bench. A session with a plugin installed is not evidence that the plugin caused the outcome; only the paired arm can separate the plugin from the model.

Verification multipliers: `self` 1×, `replay` 1.5×, `replicated` 2×. Deduplication is by `sessionHash` and `textHash`; duplicate receipts are ignored.

## 5. Confidence

- Prior: `0.2 + 0.2·has(installs) + 0.2·has(npm7d) + 0.2·has(stars) + 0.2·certified`, cap 1.
- Measured: `0.4 + 0.3·coverage + 0.2·min(1, runners/2) + 0.1·min(1, runs/30)`, cap 1.

Confidence is shown as a percentage and used as a tie-breaker. It is **not** a probability that the plugin is “good”.

## 6. Attention allocation

Ordering for the **discovery list** (not a quality rank):

1. `measured` before `prior` (legacy order, kept for compatibility);
2. `discovery.score` descending;
3. `confidence` descending;
4. `prior` descending;
5. plugin id for stability.

The **quality slots** are different:

- `top3` — only **positive E3+** rows, at most three; a surface with no positive
  measured row publishes `top3: []`.
- `featured` — first positive E3+ row, or `null`.
- `newAndPromising` — not published while its criteria (active, low adoption,
  recent, `prior ≥ 50`) are unreachable; a labelled "new arrivals" list is the
  intended replacement.
- `mostNominated` — nomination counts from contributions; used to schedule bench
  runs, never to score.
- `mostReplicated` — E4+ with ≥2 independent runners.

`rank` is `null` for E0/E1/E2. A surface with fewer than 3 entrants does not
publish a `#1`. Ties share a rank/joint badge; no plugin-id tie-break for
attention.

These are **fixed slots**, not an auction. There is no sponsored slot in the
registry. A plugin cannot buy a rank.

## 7. Anti-gaming

| Attack | Guard |
|---|---|
| Self-certification | Author-run results are `self`; full credit needs independent replication |
| Fake runs | Session/artifact hashes, signed results (P1), sample threshold |
| Cherry-picked tasks | Coverage term; all qualifying tasks count; holdout tasks in P2 |
| Star/install farming | Three adoption signals with small weights; raw values public |
| Contribution spam | Quality/price caps, dedupe by hashes, daily cap per contributor |
| Nomination spam | One nomination per receipt; nominations only prioritise, never score |
| Benchmark contamination | Fixtures are hashed; task holdouts; public task list is not the full set |
| Pay-to-rank | No paid slots; credits cannot buy score |

## 8. Reproducibility

```sh
node scripts/aggregate.mjs --today 2026-10-18
```

The command reads only `data/plugins.json`, `data/tasks.json`, `data/results/*.json` and `data/contributions/*.json`; it writes `data/registry.json`, the site data, badges and `LEADERBOARD.md`. With the same inputs and `--today`, every generated byte is identical: `generatedAt` is `${today}T00:00:00.000Z`, not the wall clock.

`node scripts/aggregate.mjs --check --today <date>` fails when the committed generated files differ from a fresh run. This is what CI uses: a source change that forgets to rebuild is a red build, not a silent stale leaderboard.

## 9. Versioning

- `scoring.version` is `v1` (legacy discovery formula). Any weight, cap,
  threshold or formula change bumps it.
- `scoring.reliabilityVersion` is `soe-goe/v1`; any SOE/GOE rule change bumps it.
- `evidenceGrade`, `soe` and `goe` are authoritative. `score`/`scoreScale` are
  legacy discovery fields kept for compatibility and must not be read as quality.
- A registry row records the evidence dates; a score is only meaningful with its
  observation window.
- Bench results are keyed by `(plugin, version, task, model, harness)`; a plugin
  version bump starts a new evidence set.
- The task set is versioned through `data/tasks.json`; changing a prompt or check
  invalidates old results for that task and must be recorded in the PR.

## 10. Open problems

1. **Task quality** — a bench is only as good as its tasks; drafts need fixtures, holdouts and review.
2. **Model confounds** — the same plugin can help a weak model and be redundant for a strong one; results are per model.
3. **Privacy** — contribution receipts carry hashes and metrics, not raw sessions; replay verification must not require publishing private content.
4. **Sybil** — public keys and GitHub identity binding are P1; contributor caps are a stopgap.
5. **Goodhart** — once a surface has a leaderboard, authors optimise for it; holdouts and task rotation are required.
6. **Governance** — who approves a task, a result or a correction? See [GOVERNANCE.md](GOVERNANCE.md).
