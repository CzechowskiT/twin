# Candidate Export Preview Bundle — 2026-06-18

**Branch:** `product/candidate-export-preview-bundle-2026-06-18`  
**Routes:** `/dashboard/trust/export-preview` (primary), `/profile/trust/export-preview` (alias)  
**Extends:** Control Center #179

## Purpose

Candidate-facing **export preview bundle** — deterministic demo-only JSON download for `demo-candidate-001`. Preview/read-only only: **no DB mutation, delete, revoke, email, outreach, or live ATS**.

## Download approach

**Frontend-only client download** via `Blob` + `saveBlobAsFile()` — no `GET /api/candidate/export-preview` route.

**Why:** A server route risks accidental coupling to live export pipelines or auth/session data leakage on pilot. The bundle is fully deterministic from demo seed modules; client-side generation guarantees `backend_write: false` and zero network side effects.

## Page sections (8)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-export-preview-header` |
| 2 | Bundle preview — metadata summary | `candidate-export-preview-bundle-preview` |
| 3 | JSON panel — full preview JSON | `candidate-export-preview-json-panel` |
| 4 | Download — active demo JSON button | `candidate-export-preview-download` |
| 5 | Audit timeline — deterministic events | `candidate-export-preview-audit-timeline` |
| 6 | Included / excluded — bundle scope | `candidate-export-preview-included-excluded` |
| 7 | Export boundary — no legal claim | `candidate-export-preview-boundary` |
| 8 | Links back — trust center, control center, profile | header nav |

## Export JSON (`twin-demo-candidate-001-export-preview.json`)

Required top-level keys:

- `export_metadata` — `backend_write: false`, `demo_only: true`, `legal_claim: false`
- `profile_summary`
- `preferences`
- `applications_matches_visibility`
- `trust_control_consent_snapshots`
- `communication_preferences`
- `system_of_record_links`
- `decision_memory_refs`
- `audit_preview_events`
- `safety_boundaries`

Deterministic, no PII, no real emails.

## Control Center integration

`/dashboard/trust/controls` export section upgraded with `ExportPreviewPanel` — active **Download preview JSON** button (compact mode + link to full page).

## Link integration

- **Trust Center** — link to export preview page
- **Control Center** — embedded download panel
- **Candidate dashboard SOR hub** — `candidate_export_preview` registry entry
- **`/demo` journey** — `candidate_export_preview` step
- **Executive product proof** — demo link

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "email sent", "deleted successfully", "automatic outreach", "automatic application", "AI decided", "AI decides".

Use: "demo-only", "preview only", "no backend write", "human decision required", "not legal advice".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send; no real delete/revoke/live export.

## Tests

```bash
cd frontend
npm run test:candidate-export-preview
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-export-preview-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-export-preview-browser
```

## Constants

- `frontend/src/lib/candidate-export-preview.ts`
- `frontend/src/lib/candidate-export-preview-demo-data.ts`
- `frontend/src/components/candidate/export-preview-panel.tsx`
