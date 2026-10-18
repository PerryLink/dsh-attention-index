# P1 measured-evidence runbook

Status: **pipeline implemented; real measured results not yet run.** The pilot
task pack is `p1-pilot-1`, 24 offline tasks across `memory`, `web`, `dev`
(3 briefs × 8).
Every task is `status: "pilot"` and `reviewed: false`, so any result is capped at
**E2 provisional** by the SOE/GOE layer. That is deliberate.

## Prerequisites

1. **Bench-scoped model key.** Do not use a personal key. The runner scrubs the
   ambient environment and only forwards `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`.
2. **A real sandbox.** The `--sandbox` backend is not implemented yet; the
   runner refuses it. A plain process without a sandbox is not E3 evidence.
3. **A throwaway DSH home.** The runner creates one under `/tmp`; never point
   `DSH_HOME` at the user's real `~/.dsh`.
4. **A runner key.** Generate it outside the repo:

   ```sh
   node scripts/runner-keygen.mjs --runner-id bench:alice-1
   # copy the printed public entry into data/runners.json
   ```

5. **A candidate plugin pinned by version.** The `with` arm installs it only in
   the throwaway profile.

## Dry-run first

```sh
node scripts/bench-run.mjs \
  --task p1-dev-add --plugin alice/demo --version 1.0.0 \
  --arm with --spec dsh-demo@1.0.0 --repeat 2 --dry-run
```

The dry-run prints the install and task commands but does not call the model.

## Paired run

```sh
# without arm
node scripts/bench-run.mjs --task p1-dev-add \
  --plugin alice/demo --version 1.0.0 --arm without --repeat 5 \
  --sandbox --signing-key ~/.dsh-bench/bench_alice-1.pem \
  --key-id bench:alice-1 --runner bench:alice-1 --allow-commands

# with arm
node scripts/bench-run.mjs --task p1-dev-add \
  --plugin alice/demo --version 1.0.0 --arm with --spec dsh-demo@1.0.0 \
  --repeat 5 --sandbox --signing-key ~/.dsh-bench/bench_alice-1.pem \
  --key-id bench:alice-1 --runner bench:alice-1 --allow-commands
```

Five tasks × five runs/arm is the minimum for an E3 *attempt*; because the task
pack is unreviewed it still caps at E2. Review is a separate gate.

## Verify and ingest

```sh
node scripts/verify-result.mjs --result data/results/<run>.json --runners data/runners.json
node scripts/ingest-result.mjs --result data/results/<run>.json --runners data/runners.json
```

Ingest refuses unsigned, unknown-key, missing-environment and duplicate results.
It never repairs or fills a result.

## Cost and safety

- 24 tasks × 2 arms × 5 runs = 240 model calls per plugin at the minimum; budget
  accordingly. Start with one task and `--repeat 2` to validate plumbing.
- The sandbox is required because a plugin is arbitrary code. Without `bwrap`,
  stop; do not substitute `--allow-commands` on the host.
- The runner does not publish tokens, session text or raw file contents; it
  publishes hashes, outcomes, checks and metrics.
- A failed or negative result is published, not hidden. It is not a quality #1.

## What this cannot do

- It cannot turn an unreviewed pilot task into E3. Task review and
  pre-registration are separate, human-owned steps.
- It cannot make a self-run result independent. `runners >= 2` with different
  keys is required for E4; `operatorOwned` is always disclosed.
- It cannot produce a result without a model key and a sandbox. In that case the
  honest output is `0 measured`, not a synthetic number.
