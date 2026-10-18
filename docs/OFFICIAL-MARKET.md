# Official / reference market partnership requirements (P3, draft)

This document states the minimum terms for a market that wants to display
`dsh-score` as an official or reference evidence layer. It is a draft; no
partnership is signed, and no market is currently authorised to imply
endorsement.

## Required behaviour

- **Attribution.** Display `dsh-score` and link to the public evidence page and
  the exact snapshot/etag. Do not present the grade as the market's own score.
- **No default ranking takeover.** A market may show the grade as a label, but
  must not silently replace its own relevance/ranking with this grade. If it
  offers an evidence sort, label it as such and keep the default separate.
- **Unrated is visible.** `E0 / unrated` must render as "no outcome evidence",
  not as a low score, a zero, or a hidden row. Do not show a prior-only `#1`.
- **No paid override.** Sponsorship, ads or placement cannot change a grade, a
  quality slot or the order of measured rows. A sponsored area must be separate
  and labelled.
- **Version binding.** A grade is shown only for the plugin version it was
  measured on; otherwise show `unrated` or `stale`.
- **Correction path.** The market must accept a correction/revocation notice and
  update within 2 business days.
- **Data licence.** The market may cache the public registry; it may not
  republish private receipts, session text or runner keys.
- **No endorsement implication.** "Official" means a data contract, not a
  guarantee of quality or a commercial endorsement.

## Technical contract

- Consume `api/v1/registry.json` or `integrations/market/signals.json`.
- Pin the `etag` or `source.inputHash`; show the snapshot date.
- Treat unknown/missing `evidenceGrade` as `E0/unrated`, never as measured.
- Keep the raw fields `evidenceGrade`, `soe`, `goe`, `unrated`, `operatorOwned`
  and `missing` visible in a detail view.
- Do not compute a local score from the fields.

## Not yet available

- An official marketplace agreement.
- A signed SLA or 99.9% availability.
- An independent E5 audit for any plugin.
- A revenue-sharing or paid-placement programme.

Until those exist, any "official" claim is limited to the data contract above.
