# Service-level targets (P3, draft)

This is a **target**, not a current guarantee. At v0.1 the registry is a static
GitHub Pages artifact; there is no on-call, no paid SLA and no 99.9% claim.

## Targets after P3 hosting lands

| Property | Target |
|---|---|
| Public registry availability | 99.9% monthly, excluding scheduled maintenance |
| Registry freshness | committed data reflected within 5 minutes of a merge |
| Badge availability | 99.9%; immutable per generated artifact |
| Correction window | a factual correction is published within 2 business days |
| Security report acknowledgement | 1 business day |
| Incident notice | public status note within 30 minutes of detection |
| Mirror freshness (Gitee/GitCode) | within 24 hours of GitHub |
| Data durability | git history + off-site mirror; RPO 1 day, RTO 4 hours |

## Status and history

- `site/status.json` is generated from the last deploy and data timestamps.
- `api/v1/registry.sha256` pins each snapshot; consumers can detect drift.
- A correction is a new commit with a public reason; historical registry
  snapshots remain in git and are not rewritten.

## What is not promised

- A plugin's future quality or the correctness of its own claims.
- That every plugin is measured; **unrated is a valid, published state**.
- That a measured result generalises to another model, harness or surface.
- A ranking position; no one can buy or reserve a slot.
- That mirrors are authoritative; GitHub is the source of truth.

## Incident rules

1. Stop advertising a grade if its signature, fixture or environment cannot be
   verified.
2. Publish the affected rows as `under-review`/`revoked`; do not silently delete.
3. Notify maintainers and the auditor; preserve artifacts.
4. Re-run only after the root cause is fixed; a re-run is a new result, not a
   replacement.
