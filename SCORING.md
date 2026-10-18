# Scoring · DSH Community Bench v1

> The score is **public**, **task-conditioned**, **reproducible**, and **deliberately conservative**.
> A public score that cannot be reproduced is just another popularity metric.

## 1. What is being scored

For each plugin `p` and capability surface `s` (memory, vision, Office, browser, …):

```
registry_score(p, s) =
  measured(p) ? 0.55·Bench(p,s) + 0.30·Prior(p) + 0.10·Coverage(p,s) + 0.05·Community(p,s)
              : 60 · Prior(p)/100
```

- `Prior` is a 0–100 public-evidence score.
- `Bench` is a 0–100 mapping of the **95% lower bound of lift** on paired tasks.
- `Coverage` is the fraction of tasks in `s` with enough paired samples.
- `Community` is a capped demand signal from contribution receipts.

**The 60-point cap for prior-only is not a cosmetic choice.** It encodes the rule that a plugin without a paired outcome result cannot outrank one with one. The raw `prior` is kept separately (0–100) so ties are not collapsed; the public `score` is compressed to 0–60 and the registry reports `scoreScale: 60`.

## 2. Prior (0–100)

```
Prior = 0.30·Maintenance + 0.30·Adoption + 0.25·Verification + 0.15·Documentation
```

| Component | Input | Mapping |
|---|---|---|
| Maintenance | last push | ≤7d 100 · ≤30d 88 · ≤90d 70 · ≤180d 45 · ≤365d 20 · older 5 |
| Adoption | installs, npm7d, stars | `18·log10(installs+1) + 14·log10(npm7d+1) + 4·log10(stars+1)`, cap 100 |
| Verification | registry / self-check | `certified` 100 · `doctor` 35 · `none` 0 |
| Documentation | coarse docs field | `full` 90 · `basic` 65 · default 50 |

Status caps: `frozen` ≤ 50; `archived`/`retired` ≤ 30.

**Why these weights?** Maintenance and adoption each get 30% because both matter and both can be gamed alone. Verification gets 25% because an independent certification is the strongest static signal. Documentation is 15% because it is easy to produce but still predictive of usability.

**Why three adoption signals?** Install counts are channel-biased (1024Store counts only its own wrapper), npm includes CI/mirrors, stars are attention rather than use. Using all three with small weights is harder to game than any one alone. The registry records each raw value and its observation date.

## 3. Bench (0–100)

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

For each surface, rows are ordered by:

1. `measured` before `prior` (hard rule);
2. `score` descending;
3. `confidence` descending;
4. `prior` descending;
5. plugin id for stability.

The registry then publishes:

- `top3` — first three rows under the rule above;
- `featured` — first row;
- `newAndPromising` — active, prior-only, low adoption (`installs ≤ 10`, `npm7d ≤ 2000`, `stars ≤ 50`), recent (≤30 days), `prior ≥ 50`;
- `mostNominated` — nomination counts from contributions, restricted to prior-only or coverage < 50%;
- `mostReplicated` — measured with `runners ≥ 2`.

These are **fixed slots**, not an auction. There is no sponsored slot in the registry. A plugin cannot buy a rank.

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

The command reads only `data/plugins.json`, `data/tasks.json`, `data/results/*.json` and `data/contributions/*.json`; it writes `data/registry.json`, the site data, badges and `LEADERBOARD.md`. With the same inputs and `--today`, the scoring fields are identical. `generatedAt` is the only wall-clock field.

`node scripts/aggregate.mjs --check` fails when the committed generated files differ from a fresh run (generatedAt excluded from the check by design only when you pass the same `--today`; the CI uses a build, not a commit check).

## 9. Versioning

- `scoring.version` is `v1`. Any weight, cap, threshold or formula change bumps it.
- A registry row records the evidence dates; a score is only meaningful with its observation window.
- Bench results are keyed by `(plugin, version, task, model, harness)`; a plugin version bump starts a new evidence set.
- The task set is versioned through `data/tasks.json`; changing a prompt or check invalidates old results for that task and must be recorded in the PR.

## 10. Open problems

1. **Task quality** — a bench is only as good as its tasks; drafts need fixtures, holdouts and review.
2. **Model confounds** — the same plugin can help a weak model and be redundant for a strong one; results are per model.
3. **Privacy** — contribution receipts carry hashes and metrics, not raw sessions; replay verification must not require publishing private content.
4. **Sybil** — public keys and GitHub identity binding are P1; contributor caps are a stopgap.
5. **Goodhart** — once a surface has a leaderboard, authors optimise for it; holdouts and task rotation are required.
6. **Governance** — who approves a task, a result or a correction? See [GOVERNANCE.md](GOVERNANCE.md).
