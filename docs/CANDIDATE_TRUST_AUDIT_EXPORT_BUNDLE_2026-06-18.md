# Candidate Trust Audit Export Bundle — 2026-06-18

**Branch:** `product/candidate-trust-audit-export-bundle-2026-06-18`  
**Routes:** `/dashboard/trust/audit-export` (primary), `/profile/trust/audit-export` (alias)  
**Extends:** Full candidate trust hexad + Domain Kernel

## Purpose

Candidate-facing **trust audit export bundle** — deterministic demo-only JSON download aggregating audit events from all six trust workflows for `demo-candidate-001`. Preview/read-only only: **no DB mutation, delete, revoke, email, outreach, tickets, or live ATS**.

## Download approach

**Frontend-only client download** via `Blob` + `saveBlobAsFile()` — no `GET /api/candidate/trust-audit-export` route.

**Why:** A server route risks accidental coupling to live audit pipelines or auth/session data leakage on pilot. The bundle is fully deterministic from demo seed modules; client-side generation guarantees `backend_write: false`, `generated_locally: true`, and zero network side effects.

## Page sections (8)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-trust-audit-export-header` |
| 2 | Export summary — metadata flags | `candidate-trust-audit-export-summary` |
| 3 | Timeline coverage — six trust workflows | `candidate-trust-audit-export-timeline-coverage` |
| 4 | JSON panel — full preview JSON | `candidate-trust-audit-export-json-panel` |
| 5 | Download — active demo JSON button | `candidate-trust-audit-export-download` |
| 6 | Included / excluded scope | `candidate-trust-audit-export-included-excluded-scope` |
| 7 | Linked modules — SOR + workspace links | `candidate-trust-audit-export-linked-modules` |
| 8 | Audit export boundary — no legal claim | `candidate-trust-audit-export-boundary` |

## Export JSON (`twin-demo-candidate-001-trust-audit-export-preview.json`)

Required top-level keys:

- `export_metadata` — `trust_audit_preview: true`, `backend_write: false`, `demo_only: true`, `legal_claim: false`, `generated_locally: true`
- `trust_center_events`
- `control_center_events`
- `export_preview_events`
- `correction_request_events`
- `portability_request_events`
- `revoke_delete_events`
- `system_of_record_links`
- `evidence_references`
- `included_scope`
- `excluded_scope`
- `safety_boundaries`

Deterministic, no PII, no real emails.

## Control Center integration

`/dashboard/trust/controls` trust audit export section with `TrustAuditExportPanel` — active **Download audit JSON** button (compact mode + link to full page).

## Link integration

- **All six trust workflows** — header links to audit export page
- **Control Center** — embedded download panel
- **Candidate dashboard SOR hub** — `candidate_trust_audit_export` registry entry
- **`/demo` journey** — `candidate_trust_audit_export` step
- **Executive product proof** — demo link
- **Domain kernel** — `resolveCandidateTrustAuditExport`

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "email sent", "deleted successfully", "automatic outreach", "automatic application", "AI decided", "AI decides".

Use: "demo-only", "preview only", "no backend write", "generated locally", "human decision required", "not legal advice".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send; no real delete/revoke/live export; no tickets.

## Tests

```bash
cd frontend
npm run test:candidate-trust-audit-export
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-trust-audit-export-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-trust-audit-export-browser
```
