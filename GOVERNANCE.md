# Governance · DSH Community Bench

The project allocates attention, so its own rules must be explicit. This is a small, public, data-first project; the governance is deliberately light but not discretionary.

## 1. Separation of powers

- **Measurement** — bench tasks, fixtures, runners, results. Evidence is signed and versioned.
- **Scoring** — a deterministic function in `scripts/score.mjs`. Changing it bumps `scoring.version` and requires a PR with a reproducible comparison.
- **Allocation** — fixed slots derived from the score (`top3`, `featured`, `newAndPromising`, `mostNominated`, `mostReplicated`). Nobody hand-picks a winner.

A maintainer may not edit a result or a score to move a plugin up. Corrections go through the same public data path.

## 2. No pay-to-rank

- There is no sponsored slot, auction, or paid placement in the registry.
- Credits are non-transferable reputation; they cannot buy score or rank.
- A future sponsorship format, if any, must be a separate, clearly labelled surface outside the registry, with a quality floor and a cap. It must never displace an organic slot.

## 3. Author conflict

- Authors may submit evidence for their own plugin, but it is labelled with the runner id and counts as `self`.
- `replicated` requires at least two independent runner ids, at least one of which is not the author.
- A maintainer who is also the author of a plugin must recuse from reviewing that plugin's result PR.
- The registry displays the author and the runner id; readers can judge the conflict.

## 4. Task and fixture changes

- A task's prompt, fixture or checks are versioned through `data/tasks.json`.
- Changing a task invalidates prior results for that task; the PR must say so.
- P2 adds holdout tasks that are not in the public task list. Holdout results may be aggregated but not published per task.
- A task that cannot be checked deterministically is either removed or clearly marked `judge-rubric` with a human/LLM rubric and a lower confidence.

## 5. Evidence and corrections

- Every row links to its public evidence: repo, observed adoption values, last push, verification level.
- A challenge must cite the exact data file and value; "I think this is wrong" is not enough.
- Corrections are merged as data changes; the registry keeps `generatedAt` but does not rewrite history. P2 adds a `data/history/` snapshot per release.
- A result can be revoked if it is found fabricated or contaminated; the revocation is recorded, not silently deleted.

## 6. Contribution credits

- Credits are reputation, not money, not a token, and not transferable.
- Caps: ≤60 credits per trajectory, ≤200 per contributor per day.
- A nomination is a prioritisation request, not a vote that changes a score.
- Sybil resistance is P1 (public keys + GitHub identity binding); until then, credits are explicitly low-trust and the contributor list shows `verification`.

## 7. Maintainers

- The initial maintainer is the repository owner. P2 adds a small reviewer group with public membership.
- A maintainer's decision that changes a score, a task, or a badge must be a PR with the data diff and a test.
- If the maintainer group cannot agree, the default is **no change**; the existing registry remains.

## 8. Data and licenses

- Code and data in this repository are Apache-2.0.
- Plugin names, descriptions and README-derived summaries remain their authors' property; the registry stores links and measured facts.
- Do not commit raw session logs, prompts containing secrets, customer data, or model outputs that are not needed for a check.

## 9. What this project is not

- It is not an official DeepSeek Harness registry.
- It is not a security audit; `verification` is a signal, not a guarantee.
- It is not a universal “best plugin” list; a score is only meaningful for its surface, model, harness and observation window.
