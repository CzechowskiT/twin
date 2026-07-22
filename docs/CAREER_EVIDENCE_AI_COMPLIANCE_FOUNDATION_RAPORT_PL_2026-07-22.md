# Career Evidence Graph & AI Compliance Foundation — raport PL

**Data:** 2026-07-22  
**Branch:** `feat/career-evidence-ai-compliance`  
**Verdict:** **PHASE_A_ENGINEERING_PARTIAL_AWAITING_SMOKE**

## Stance (immutable)

Launch **NO-GO** · Gate F **PENDING** · Pilot **BLOCKED_BY_FOUNDER** · enrollment OFF · no legal AI Act certification claims.

## Co zbudowano

- Alembic **092** + ORM: claims, evidence objects, links, disputes, AI registry/prompts/runs/explanations/reviews/prohibited uses
- Service `ai_compliance.py` + API `/platform/ai-compliance/*`
- UI: `/dashboard/evidence/claims` (+ board/recruiter/company evidence shells)
- Hard LIVE: **28 PENDING_SMOKE** + **5 HELD_POLICY** (external verify, protected-attr monitoring, autonomous employment, AI Act certified, Wave 6 DSR)

## Hard bans

- Brak autonomous hire/reject
- Brak protected-attribute inference
- Prohibited-use registry blocks provider calls
- Smoke wymaga `exclude_from_product_metrics`

## Smoke

Authenticated prod smoke AI compliance **pending** — zero LIVE promotions w tej sesji.
