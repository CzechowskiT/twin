# Company billing plan & usage readiness MVP

**Date:** 2026-06-11  
**Route:** `/company/billing`  
**API:** `GET /api/v1/company/plan-usage`

## Purpose

Honest employer billing readiness — plan label, usage counters, integration status. **Billing NOT LIVE** — no Stripe checkout or invoices.

## Verification

```bash
cd backend && python3 -m pytest tests/test_company_billing_readiness.py -q
cd frontend && npm run test:company-billing-plan-usage-readiness
cd frontend && npm run build
```

Launch stance: **NO-GO** unchanged.
