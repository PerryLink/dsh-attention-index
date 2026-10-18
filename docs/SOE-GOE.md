# SOE / GOE reliability model

Status: implemented in `scripts/reliability.mjs` (v1). Brand: `dsh-score`.

This document defines how a claim about a plugin becomes **reliable enough to
publish**. It separates two questions that the old score conflated:

- **SOE — Strength of Evidence:** how strong is the evidence *for this claim*?
- **GOE — Grade of Evidence:** what is the overall grade *after* bias,
  consistency, directness, precision and publication-bias checks?

The public artifact is a grade + a small evidence vector, not a 0–100 "quality"
number.

## 1. SOE: five dimensions, 0–4

| Dimension | 0 | 2 | 4 |
|---|---|---|---|
| **Design** | no paired result | 3–4 tasks | ≥8 tasks + holdout + pre-registration |
| **Execution** | no result / unsigned | signed result | signed + environment manifest + dedupe + sandbox |
| **Precision** | unknown / n<3 | n≥5/arm | n≥30/arm + narrow CI + power ≥80% for declared MDE |
| **Independence** | self-run / operator-only | one independent runner | ≥2 independent runners + independent certification/audit |
| **Directness** | different version/model/surface | adjacent environment | exact version + exact surface + exact DSH/model |

`SOE` is the minimum of the five dimensions for gating, and the full vector is
published. A high average cannot compensate for a zero.

## 2. GOE: ordinal grades

| Grade | Name | Gate | Quality slot? |
|---|---|---|---|
| **E0** | unrated | metadata only; no paired result | **No**; discovery list only |
| **E1** | screened | executable task, hashed fixture, environment manifest; no paired result | No |
| **E2** | provisional | paired result but <5 tasks, <5 runs/arm, single runner, or CI includes 0 | No; labelled pilot |
| **E3** | measured | ≥5 tasks, ≥5 runs/arm, ≥1 independent runner, positive lower bound | Yes, if positive |
| **E4** | replicated | E3 + ≥2 independent runners/keys, consistent sign, holdout | Yes |
| **E5** | audited | E4 + independent audit, pre-registration, all results published, no COI | Yes |

**Certainty** is separate: `very-low`, `low`, `moderate`, `high`. It is derived
from the SOE floor, not from the p-value.

**Direction** is separate from grade: `positive`, `no-detectable-difference`,
`negative`, `underpowered`, `stale`, `revoked`. A negative E3 is published as
"tested, no detectable benefit"; it is not hidden and not featured.

## 3. Upgrade rules

A claim upgrades only when the evidence supports it:

1. **E0 → E1**: an executable task with hashed fixture and environment manifest.
2. **E1 → E2**: a paired with/without result, signed, deduped.
3. **E2 → E3**: ≥5 reviewed tasks, ≥5 runs/arm, ≥1 independent runner,
   positive multiplicity-adjusted lower bound, no open dispute.
4. **E3 → E4**: ≥2 independent runners with different keys, consistent direction,
   holdout passed.
5. **E4 → E5**: independent audit attestation (`data/audits/index.json`),
   pre-registration, all-results publication, COI register clean.

## 4. Downgrade rules

Any of these demotes one grade or blocks a quality slot:

- self-run or operator-owned runner;
- an unreviewed pilot task pack (hard cap at E2);
- a partial sandbox such as `bwrap-fs` with shared network (hard cap at E2);
- self-asserted `certified` / `docs` without certifier or URL;
- missing adoption channels treated as zero;
- cross-version or cross-model borrowing;
- single runner presented as replication;
- CI width > 0.30 on the lift;
- stale beyond the tier TTL (measured 90d, replicated 180d);
- open dispute or unresolved revocation;
- no pre-registration or selective publication;
- task/version mismatch or fixture hash mismatch.

A surface with no E3+ positive row publishes **no quality #1**. It may publish a
separate, unnumbered discovery list labelled "no outcome evidence".

## 5. Why prior-only is E0

The prior mixes maintenance, adoption, verification and documentation. It is
useful for *visibility* and *freshness*, but:

- it is not task-conditioned;
- verification in the current data is an operator flag (16/16 operator rows,
  0/26 external);
- maintenance is an observation-date artifact;
- documentation is a constant default;
- missing data is cohort-structured.

Therefore prior-only rows are **E0 / unrated**. The legacy `score` field is kept
only as `discovery.score` for compatibility; it is not a quality claim and is not
ranked.

## 6. Statistical rules

- Use **Newcombe/Wilson** intervals for a difference of proportions, not Wald.
- A 3/3 vs 0/3 sweep must not become 100; with Newcombe its lower bound is
  ≈0.205.
- Minimum evidence for E3: ≥5 reviewed tasks, ≥5 runs/arm, ≥1 independent
  runner; E4 needs ≥2 independent keys. Target 10–20 tasks and ≥10 runs/arm.
- Control multiplicity (FDR) across plugins within a surface.
- Pre-register tasks and sample sizes; publish all results, including negative.
- Report baseline `p0`, `p1`, `n`, lift, CI and between-task heterogeneity.
- A null maps to "no detectable difference", never to "average quality".

## 7. What the public artifact contains

Each registry row carries:

```json
{
  "evidenceGrade": "E0",
  "unrated": true,
  "soe": { "design": 0, "execution": 0, "precision": 0, "independence": 0, "directness": 0, "notes": ["no-paired-result"] },
  "goe": { "grade": "E0", "certainty": "very-low", "positive": false, "reasons": ["no-outcome-evidence"], "downgrades": ["operator-owned"] },
  "operatorOwned": false,
  "missing": { "installs": false, "npm7d": false, "stars": true, "docs": true, "npmName": true },
  "discovery": { "score": 38.3, "scale": 60, "label": "legacy discovery — not a quality score" }
}
```

A measured row replaces `E0` with E2–E5 and carries the task/CI/runner fields.
`rank` is `null` for E0/E1; only positive E3+ rows get a quality rank.

## 8. P0–P3

- **P0** (at the time): implement E0/GOE/SOE; mark all 42 rows unrated; stop prior `#1`
  and top badges; Newcombe; missing data and operator flags; no quality slot.
- **P1**: executable tasks, sandbox, signed results, first measured pilot;
  E2/E3 with CI and independent runners.
- **P2**: replication, holdouts, FDR, `bench-index`, market decorator,
  recommendation tool; E4.
- **P3**: independent audit, pre-registration, all-results publication,
  governance/SLA; E5 and official-market reference.

No grade is upgraded without the evidence; no missing value is treated as zero.
