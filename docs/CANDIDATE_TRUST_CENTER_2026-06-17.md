# Candidate Trust Center — 2026-06-17

**Branch:** `product/candidate-trust-center-2026-06-17`  
**Routes:** `/dashboard/trust` (primary), `/profile/trust` (alias)

## Purpose

Candidate-facing **trust center** — transparency into what TWIN knows, data sources, applications/offers/matches visibility, consent & data use, communication preferences, human decisioning, candidate controls (demo/disabled), trust timeline, and trust boundary. **Pilot/sample only** for `demo-candidate-001` with `demo-role-001` context; invalid IDs render meaningful not-found (not Next 404 shell).

## Page sections (10)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | Pilot sample |
| 2 | What TWIN knows — summary and itemized workspace data | Pilot sample |
| 3 | Data sources — profile/CV, application, match signal, identity KYC | Pilot sample |
| 4 | Applications, offers & matches visibility — shared vs not shared columns | Pilot sample |
| 5 | Consent & data use — purposes with status badges; link to `/consent/gdpr` | Pilot sample |
| 6 | Communication preferences — email, in-app, calendar hold, recruiter contact | Demo-only |
| 7 | Human decisioning — recruiter review, no automated verdicts | Live copy |
| 8 | Candidate controls — disabled export/delete/revoke + safe links | Demo-only (read-only) |
| 9 | Trust timeline — deterministic events; `outbound_sent: false` on all | Pilot sample |
| 10 | Trust boundary — no auto-apply, no automated outreach | Live copy |

## Routes

- `/dashboard/trust` (primary)
- `/profile/trust` (alias)

## Data boundary

- **Demo:** `frontend/src/lib/candidate-trust-center-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateTrustCenter()` returns demo record for signed-in pilot context only.

## Link integration

- **Candidate dashboard SOR hub** — `candidate_trust` registry entry.
- **Candidate workspace subnav** — trust center link.
- **`/demo` journey** — `candidate_trust_center` step → `/dashboard/trust`.
- **Executive product proof** — demo link to candidate trust center; milestone `ms-4` → done.
- **Safe routes (no 404):** `/dashboard`, `/dashboard/jobs`, `/dashboard/matches`, `/profile`, `/dashboard/applications`, `/dashboard/evidence`, `/dashboard/identity`, `/dashboard/cv`, `/dashboard/plan`.

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "email sent", "automatic outreach", "automatic application", "AI decided", "AI decides".

Use: "pilot signal", "human decision required", "not legal advice", "not live", "demo-only", "no outbound sent".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.
- No Domain Kernel, overnight queue, or Phase 3B changes.

## Tests

```bash
cd frontend
npm run test:candidate-trust-center
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-trust-center-browser
```

## Constants

- `frontend/src/lib/candidate-trust-center.ts`
- `frontend/src/lib/candidate-trust-center-demo-data.ts`
