# Contributing to DSH Community Bench

The registry is only useful if the evidence is real, reproducible and independent. Please read the rules before opening a PR.

## 1. Add or correct a plugin

Edit `data/plugins.json`:

```json
{
  "id": "owner/repo",
  "name": "plugin-name",
  "author": "owner",
  "surface": "memory",
  "summary": "one line",
  "status": "active",
  "license": "MIT",
  "repo": "https://github.com/owner/repo",
  "npm": "package-name",
  "evidence": {
    "installs": 42,
    "npm7d": 1234,
    "stars": 10,
    "lastPush": "2026-10-18",
    "verification": "none",
    "observedAt": "2026-10-18"
  }
}
```

Rules:

- One plugin = one capability surface in v1. If a plugin genuinely serves several, open an issue first.
- `evidence` values must come from a public source; put the observation date in `observedAt`.
- `verification` is `none`, `doctor` (self-check) or `certified` (independent registry). Do not claim `certified` without a link.
- Do not submit a plugin you do not maintain without its author's knowledge; a correction PR is fine.

## 2. Submit a paired bench result

A result is **one arm** of one task. A task counts only when both arms have at least 3 results.

```sh
# dry-run first: prints the exact commands, installs nothing, calls no model
node scripts/bench-run.mjs \
  --pack fixtures/smoke-tasks.json \
  --task smoke-file \
  --plugin owner/repo \
  --spec owner/repo#<commit> \
  --version 0.1.0 \
  --arm with \
  --repeat 1 \
  --dry-run

# real run (needs dsh on PATH and a headless-profile model credential)
node scripts/bench-run.mjs \
  --pack fixtures/smoke-tasks.json \
  --task smoke-file \
  --plugin owner/repo \
  --spec owner/repo#<commit> \
  --version 0.1.0 \
  --arm with \
  --repeat 1

# the comparison arm: same task, no plugin
node scripts/bench-run.mjs \
  --pack fixtures/smoke-tasks.json \
  --task smoke-file \
  --plugin owner/repo \
  --version 0.1.0 \
  --arm without \
  --repeat 1
```

Then:

1. Check the JSON against [`schemas/bench-result.schema.json`](schemas/bench-result.schema.json).
2. Put the files in `data/results/`.
3. State the task, model, harness, plugin version, runner identity, and whether a signing key was used.
4. For `replicated`, a **different** runner must reproduce the same task/plugin/model/harness tuple.

Hard rules:

- **No self-certification for full credit.** An author-run result is `runner.id = github:<author>` and counts as `self`; it can enter `measured` but not `mostReplicated` until an independent runner reproduces it.
- **No cherry-picking.** Run the full task set for the surface, or state exactly which tasks you ran; coverage is part of the score.
- **No fabricated runs.** The runner writes a session hash; a result without a session hash is rejected.
- **No private data.** Results carry hashes and metrics, not raw prompts or files.
- **Fixtures are hashed.** If a task fixture changes, old results for that task are invalidated.

## 3. Contribute a trajectory receipt

Trajectory receipts are how users contribute real evidence and earn contributor reputation. A receipt contains **no raw session text**:

```json
{
  "schema": "dsh-attention/contribution/v1",
  "contributionId": "ctr_…",
  "contributor": "github:your-handle",
  "createdAt": "2026-10-18T00:00:00Z",
  "surface": "memory",
  "plugins": ["owner/repo"],
  "quality": 82,
  "price": 41,
  "verification": "self",
  "sessionHash": "sha256:…",
  "textHash": "…",
  "metrics": { "turns": 4, "steps": 9, "toolCalls": 7, "toolErrors": 0, "tokens": 12000 },
  "nomination": "under-evaluated/plugin"
}
```

Rules:

- `sessionHash` and `textHash` must be stable hashes; never include the source text.
- `quality` and `price` are computed by a DSH client/exporter from the deterministic trajectory scorer. If you cannot reproduce them, say so; `verification` is `self`.
- One nomination per receipt; nominations only prioritise a future bench, they do not change a plugin score.
- Duplicate `sessionHash`/`textHash` receipts are ignored.
- Do not include secrets, customer data, private code, or personal information. If in doubt, redact or do not submit.
- A `replay`/`replicated` receipt needs an independent replay attestation in the PR description.

## 4. Review checklist

- [ ] JSON validates against the schema.
- [ ] Evidence is public and dated.
- [ ] Bench results have both arms and ≥3 samples per arm.
- [ ] The runner identity is not the plugin author for a `replicated` claim.
- [ ] No raw session content, secrets, or customer data.
- [ ] The generated registry and site are rebuilt (`node scripts/aggregate.mjs`).
- [ ] `node --test test/*.test.mjs` passes.

## 5. Badges

After a merged PR, `badges/<plugin>.svg` and `badges/<plugin>-top.svg` are generated. Use:

```markdown
![DSH Bench](./badges/owner-repo.svg)
```

The badge shows the public score and tier. Do not edit generated SVGs by hand.

## 6. Conflicts of interest

If you maintain the plugin, say so in the PR. Author-run results are welcome, but they are `self` evidence; the registry will show the runner id. Maintainers may recuse themselves from reviewing their own plugin's result.

## 7. Corrections

If a score is wrong because the evidence is wrong, open a PR with the corrected source. If you believe the formula is wrong, open an issue with a reproducible counterexample; formula changes bump `scoring.version`.
