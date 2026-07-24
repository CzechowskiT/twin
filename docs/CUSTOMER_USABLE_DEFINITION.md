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

Evidence: `scripts/customer-usable-minimal-journey-smoke.py` (session → inbox → accept → decline → persisted reload).

## Machine contract

See `docs/CUSTOMER_USABLE_READINESS.json` and `frontend/src/lib/customer-usable-readiness.ts`.
