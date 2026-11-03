# Customer-usable readiness — definition

**Hard LIVE PASS ≠ CUSTOMER_USABLE_PASS.**

| Term | Meaning |
|------|---------|
| Hard LIVE PASS | API/route smoke on aligned SHA; CORE_PILOT technical existence (143/0/0) |
| CUSTOMER_USABLE_PASS | Real pilot user completes a production workflow on real tenant data: writable, persistent, enabled primary CTA, no SAMPLE/preview-as-truth |

## Forbidden as CUSTOMER_USABLE evidence
- HTTP 200 alone
- Preview / sample / demo fixtures as truth
- Disabled primary submit
- Client-only demo mutations
- Prepare-only apply without send
- Coming soon / NOT LIVE banners on the primary CTA

## Minimal journey (declared)

**Recruiter inbox → accept/decline** (`recruiter_inbox_accept_decline`)

Evidence (thin): `scripts/customer-usable-minimal-journey-smoke.py`.

## Expanded multi-role journey (B2B bar)

**Company role → CSV/manual import → inbox → decision → company visibility → audit → feedback**
(`company_recruiter_candidate_pipeline`)

Evidence: `scripts/customer-usable-multirole-journey-smoke.py` on two synthetic tenants with isolation checks.

## Evidence tiers (do not conflate)

| Tier | Meaning |
|------|---------|
| `production_smoked_synthetic` | Writable path smoked on prod with synthetic tenants |
| `real_customer_validated` | Founder-approved real org completed the path |
| `real_pilot_data` | KPI may leave `NO_REAL_PILOT_DATA` |

## Machine contract

See `docs/CUSTOMER_USABLE_READINESS.json` and `frontend/src/lib/customer-usable-readiness.ts`.
