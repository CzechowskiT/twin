# Placement verification evidence — 2026-06-21 safe working slice

Evidence-only frontend batch for placement verification across personas. **Not** legal verification, **not** employer-confirmed, **not** billing or ATS writeback.

See also: [PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md) (architecture intent).

---

## Shipped surfaces (demo / preview)

| Persona | Route | Purpose |
|---------|-------|---------|
| Candidate | `/dashboard/placement-verification` | Internal placement evidence preview |
| Candidate (alias) | `/profile/placement-verification` | Same preview under profile alias |
| Recruiter | `/recruiter/placement-verification` | Human review checklist — no outreach |
| Company | `/company/placement-verification` | Attestation preview checklist — disabled actions |
| Board | `/board/placement-verification` | Cross-persona evidence matrix monitor |
| Investor | `/investor/placement` | Append-only event illustration (existing) |

---

## Domain model (`frontend/src/lib/placement-verification.ts`)

- `placement_id`, `candidate_id`, `role_context_id`, `company_slug`, `application_id`, `match_id`
- `placement_status` — six-state allowlist
- `verification_stage` — seven-stage allowlist
- `evidence_items`, `risk_flags`, `economics_preview` (no-op only)
- `audit_references`, `source` badge (`demo` / `live` / `partial`)

---

## Copy guardrails (this slice)

**Allowed:** internal placement evidence, demo placement proof, evidence-ready, verification-ready, no external confirmation, no payment initiated, human review required, not legal verification.

**Forbidden:** employer confirmed, invoice sent, payment captured, revenue recognized, legally verified, launch ready, email sent, ATS synced, contract signed, candidate notified, etc.

Enforced by `npm run test:trust-language-guard` and slice-specific static tests.

---

## Integration links

Cross-surface entry points wired in slice 5:

- Candidate trust overview → placement preview
- Recruiter daily cockpit → recruiter checklist
- Company hiring command center → company checklist
- Board persistence monitor + production persistence status → board evidence monitor
- Operational cross-links panel → board monitor
- Investor placement page → persona evidence routes

---

## Tests

```bash
cd frontend
npm run test:placement-verification-domain
npm run test:candidate-placement-verification-preview
npm run test:placement-events-live-timeline
npm run test:placement-events-ui-integration
npm run test:recruiter-company-placement-verification
npm run test:board-placement-evidence-monitor
npm run test:placement-verification-integration
npm run test:trust-language-guard
npm run test:i18n-coverage
```

## Live events timeline (2026-06-21 batch)

`PlacementEventsTimeline` — read-only append-only monitor on all placement-verification routes:

- Loader: `frontend/src/lib/placement-events-live.ts` — live/demo/partial via `fetchSafePersistenceList`
- Component: `frontend/src/components/shared/placement-events-timeline.tsx`
- Lazy-loaded (`dynamic`, `ssr: false`) on persona workspaces after PR #251
- Source badge: `safePersistence.liveApi` / `demoFallback` / `liveOperatingState.partialFallback`
- No write buttons, no polling

## Operating evidence center (2026-06-23)

`PlacementVerificationEvidencePanel` on all five placement-verification routes — see [PLACEMENT_VERIFICATION_OPERATING_EVIDENCE_2026-06-23.md](./PLACEMENT_VERIFICATION_OPERATING_EVIDENCE_2026-06-23.md).

```bash
npm run test:placement-verification-evidence
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:placement-verification-evidence-browser
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 npm run verify:prod-placement-verification-evidence
```

Optional browser smoke (prod):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:board-placement-evidence-monitor-browser
```

---

## Explicitly out of scope (hard bans)

- Phase 3B / multitab / stress / headless verification batches
- Email send, ATS writeback, payments, Stripe, invoices
- Employer confirmation flows, delete/revoke fulfillment
- Alembic migrations or backend auth changes for this slice

---

## Next backend slice (not this batch)

When moving beyond demo: append-only `placement_events`, authenticated verification APIs, Celery retention milestones — per architecture doc. Frontend surfaces remain preview until live API contracts land.

**Update 2026-06-21:** Production foundation for `placement_events` is now operationally verified — Alembic head `068_placement_events_foundation` confirmed via read-only admin endpoint; authenticated persistence smoke **PASS** (11/0/1). See `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-21.md`. Launch **NO-GO**, P0 **OPEN**, Phase 3B **HARD BLOCKED** unchanged.

**Update 2026-06-23:** Dedicated placement-events auth smoke **PASS** (6/0/1) via `npm run verify:prod-placement-events-auth` — authenticated POST PASS, GET 200, `placement_id` filter 200, unauth 401/403, token not logged. Alembic 068 **CONFIRMED** (unchanged). Prior JWT exposed in chat — **do not record**; fresh token for future runs. See `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-23.md`.
