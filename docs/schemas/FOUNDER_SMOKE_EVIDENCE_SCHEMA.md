# Founder smoke evidence schema (v1)

> **Status:** CURRENT  
> **Used by:** `frontend/scripts/lib/smoke-evidence-validator.ts`, merge orchestrator, founder smoke guards

Structured evidence for Wave B/C browser smoke. **No fake PASS** — validator rejects placeholder tester/date/SHA and PASS claims with FAIL/PENDING slices.

## Format

YAML frontmatter block at top of runbook doc, or standalone JSON file under `reports/smoke-evidence/`.

```yaml
---
schema_version: 1
tester: "Founder name"
date: "2026-07-13"
environment: preview-449
deploy_sha: "905a660c7d627b389dedc6a41a6346997b0398b3"
slices:
  - id: C1_activation
    pr: "449"
    result: PASS
  - id: C2_talent_pool
    pr: "450"
    result: PENDING
console_errors: none
founder_smoke_pass: false
---
```

## Slice IDs

| ID | Module | PR |
|----|--------|-----|
| B1_career_compass | Career Compass | prod |
| B2_trust_center | Trust Center | prod |
| B3_referrals | Referrals | #448 |
| C1_activation | Recruiter activation | #449 |
| C2_talent_pool | Talent pool | #450 |
| C2_trust_review | Trust review queue | #450 |

## PASS rules

1. `tester` must be a real person (not `agent`, `cursor`, `tbd`)
2. `date` must be ISO `YYYY-MM-DD`
3. `deploy_sha` from `/api/public-health` `git_commit`
4. All required slices `PASS` or `SKIP` — none `FAIL` or `PENDING`
5. `FOUNDER_SMOKE: PASS` line only after validator passes
6. Merge orchestrator reads docs — blocks merge without valid evidence

## Hard bans

- Agent cannot record PASS without founder credentials
- Preflight orchestration does not produce evidence
- CI smoke SUCCESS ≠ founder browser smoke PASS
