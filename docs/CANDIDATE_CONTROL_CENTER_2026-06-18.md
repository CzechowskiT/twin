# Candidate Control Center — 2026-06-18

**Branch:** `product/post-trust-candidate-control-and-export-2026-06-18`  
**Routes:** `/dashboard/trust/controls` (primary), `/profile/trust/controls` (alias)

## Purpose

Candidate-facing **control center** — visibility controls, export preview (disabled), correction request preview, consent review, communication preferences, application/match transparency, revoke/delete planned (disabled), audit timeline, and control boundary. **Pilot/sample only** for `demo-candidate-001` with `demo-role-001` context; invalid IDs render meaningful not-found (not Next 404 shell).

Extends Trust Center (#176/#178). Demo/read-only only — **no backend writes**.

## Page sections (10)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | Pilot sample |
| 2 | Visibility controls — preview-only visibility settings | Pilot sample |
| 3 | Export preview — bundle sections, disabled download | Demo-only (read-only) |
| 4 | Correction request preview — draft corrections, submit disabled | Demo-only |
| 5 | Consent review — purposes with status badges; link to `/consent/gdpr` | Pilot sample |
| 6 | Communication preferences — channel status, no live edits | Demo-only |
| 7 | Application & match transparency — shared vs withheld for demo-role-001 | Pilot sample |
| 8 | Revoke & delete planned — disabled revoke/delete buttons | Demo-only (read-only) |
| 9 | Audit timeline — deterministic events; `backend_write: false` on all | Pilot sample |
| 10 | Control boundary — no live export, delete, revoke, or outreach | Live copy |

## Routes

- `/dashboard/trust/controls` (primary)
- `/profile/trust/controls` (alias)

## Data boundary

- **Demo:** `frontend/src/lib/candidate-control-center-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateControlCenter()` returns demo record for signed-in pilot context only.

## Link integration

- **Trust Center** — link from `/dashboard/trust` to control center.
- **Candidate dashboard SOR hub** — `candidate_control_center` registry entry.
- **Candidate workspace subnav** — control center link.
- **`/demo` journey** — `candidate_control_center` step → `/dashboard/trust/controls`.
- **Executive product proof** — demo link to candidate control center.
- **Safe routes (no 404):** `/dashboard/trust`, `/dashboard`, `/dashboard/jobs`, `/dashboard/matches`, `/profile`, `/consent/gdpr`.

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "email sent", "deleted successfully", "automatic outreach", "automatic application", "AI decided", "AI decides".

Use: "pilot signal", "human decision required", "not legal advice", "not live", "demo-only", "no backend write".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send; no real delete/export/revoke.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:candidate-control-center
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-control-center-browser
```

## Constants

- `frontend/src/lib/candidate-control-center.ts`
- `frontend/src/lib/candidate-control-center-demo-data.ts`
