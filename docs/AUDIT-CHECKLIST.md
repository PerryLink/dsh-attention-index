# E5 independent audit checklist

E5 is the **audited** grade. It is not a marketing label and it is not awarded by
the operator. An E5 row requires a named independent auditor and a public
attestation. With `data/audits/index.json` empty, **no row can be E5**.

## Independence

- The auditor is not the plugin author, the benchmark operator, or a paid
  contractor whose fee depends on a positive result.
- The auditor has no undisclosed financial interest in the plugin or the market.
- The auditor can publish a dissenting note without approval.
- At least one auditor is outside the maintainer's organisation.

## Scope

- Task pack id and hash (`data/preregistration.json`).
- Model and harness versions, including the exact DSH build.
- Runner ids and public keys; sandbox type and kernel/container version.
- Plugin version and artifact hash.
- All included and excluded surfaces; no silent selection.
- The analysis plan: Newcombe interval, FDR, minimum tasks/runs, holdout.

## Evidence

- All raw signed results are published, including failures and negative results.
- Fixture and session hashes are reproducible; no private session text is
  required.
- The auditor re-runs a random sample of at least 20% of tasks (minimum 3) and
  reports agreement.
- The auditor checks that missing data was not imputed as zero and that
  operator-owned rows are labelled.
- The auditor checks that a prior-only row cannot receive a quality rank.

## Attestation

Add one entry to `data/audits/index.json`:

```json
{
  "id": "audit-2026-001",
  "auditor": "Named person or organisation",
  "independent": true,
  "scope": "p1-pilot-1 / memory / plugin@version",
  "date": "YYYY-MM-DD",
  "method": "reproduction + code review + result audit",
  "evidenceUrl": "https://...",
  "result": "pass | pass-with-findings | fail",
  "findings": [],
  "signature": "optional detached signature"
}
```

`scripts/audit-check.mjs` rejects an E5 claim without a matching, independent,
signed attestation. A failed audit is published as a finding, not deleted.

## What the operator cannot do

- Self-audit and call it E5.
- Mark `audited: true` in a registry row without an audit entry.
- Use an audit to override a negative or null result.
- Hide a finding because it affects a partner or a sponsor.
