# Offer Readiness Center — 2026-06-24

**Batch:** Candidate Offer Readiness Center  
**Base:** `cursor/phase1-monorepo-scaffold` @ aad8fff  
**Mode:** read-only readiness preview — **not** guaranteed offer, legal approval, contract ready, salary guaranteed, or automatic acceptance

## Purpose

Give candidates a **readiness center** before any offer conversation: nine-section checklist, estimated compensation comparison, read-only questions, human decision boundary, and operating evidence — without offer send, contract, payment, or ATS writes.

## Surfaces

| Persona | Route |
|---------|-------|
| Candidate | `/dashboard/offer-readiness` |
| Candidate (alias) | `/profile/offer-readiness` |
| Recruiter | `/recruiter/offer-readiness` |
| Company | `/company/offer-readiness` |
| Board | `/board/offer-readiness` |

## Sections (candidate)

| Section | Component | Marker |
|---------|-----------|--------|
| A Summary | `OfferReadinessPanel` | `candidate-offer-readiness-summary` |
| B Checklist (9) | `OfferReadinessChecklist` | `candidate-offer-readiness-checklist` |
| C Comparison | `OfferComparisonPreview` | `candidate-offer-readiness-comparison` |
| D Questions | `CandidateOfferQuestionsPanel` | `candidate-offer-readiness-questions` |
| E Human boundary | inline Card | `candidate-offer-readiness-boundary` |
| F Cross-links | nav | `candidate-offer-readiness-cross-links` |

Cross-links: trust overview, control center, placement verification, calendar readiness, decision memory.

## Shared components

| Component | Path |
|-----------|------|
| `OfferReadinessPanel` | `frontend/src/components/shared/offer-readiness-status-badge.tsx` |
| `OfferReadinessChecklist` | `frontend/src/components/shared/offer-readiness-checklist.tsx` |
| `OfferComparisonPreview` | `frontend/src/components/shared/offer-comparison-preview.tsx` |
| `CandidateOfferQuestionsPanel` | `frontend/src/components/shared/candidate-offer-questions-panel.tsx` |
| `OfferReadinessStatusBadge` | `frontend/src/components/shared/offer-readiness-status-badge.tsx` |
| `OfferReadinessEvidencePanel` | `frontend/src/components/shared/offer-readiness-evidence-panel.tsx` |

## Domain / resolvers

| Artifact | Path |
|----------|------|
| Core domain | `frontend/src/lib/offer-readiness.ts` |
| Evidence bundle | `frontend/src/lib/offer-readiness-evidence.ts` |
| Candidate workspace | `frontend/src/lib/candidate-offer-readiness.ts` |
| Recruiter/company | `frontend/src/lib/recruiter-company-offer-readiness.ts` |
| Board monitor | `frontend/src/lib/board-offer-readiness-monitor.ts` |

**Demo IDs:** `demo-candidate-001` · `demo-role-001`  
**Fallback:** GET/read-only demo resolver — no live offer API in this batch.

## Copy guardrails

**Allowed:** readiness preview, demo/estimated, human review required, read-only, blocked writes.

**Forbidden:** guaranteed offer, legal approval granted, contract ready, salary guaranteed, automatic acceptance, offer sent, payment captured.

## Tests

```bash
cd frontend
npm run test:offer-readiness
npm run test:trust-language-guard
npm run test:i18n-coverage
npm run build
npx tsc --noEmit
```

**Browser smoke (local):**

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:offer-readiness-browser
```

**Production verify (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run verify:prod-offer-readiness
```

Uses `prod-smoke-commit-gate` (`prod_frontend_commit`, `repo_head`, `docs_only_drift`).

## Launch stance

- **Launch:** NO-GO  
- **P0:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Hard bans (this batch)

No LightweightRouteShell, PersonaWorkspaceGate, WorkspaceLayout, Phase 3B, stress, Microsoft/email/ATS writes, payments/contracts/payroll/e-signature, Celery, migrations, tokens in logs, heavy animations, polling.
