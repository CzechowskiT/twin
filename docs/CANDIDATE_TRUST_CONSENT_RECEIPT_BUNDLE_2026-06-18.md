# Candidate Trust Consent Receipt Bundle — 2026-06-18

**Branch:** `product/candidate-trust-consent-receipt-bundle-2026-06-18`  
**Routes:** `/dashboard/trust/consent-receipt` (primary), `/profile/trust/consent-receipt` (alias)  
**Extends:** Full candidate trust layer + audit export (#184)

## Purpose

Candidate-facing **trust consent receipt bundle** — deterministic demo-only JSON download aggregating consent snapshot, accepted context, audit events from all trust workflows for `demo-candidate-001`. Preview/read-only only: **no DB mutation, delete, revoke, email, outreach, tickets, or live ATS**.

## Download approach

**Frontend-only client download** via `Blob` + `saveBlobAsFile()` — no `GET /api/candidate/consent-receipt` route.

**Why:** A server route risks accidental coupling to live consent pipelines or auth/session data leakage on pilot. The bundle is fully deterministic from demo seed modules; client-side generation guarantees `backend_write: false`, `generated_locally: true`, and zero network side effects.

## Page sections (8)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-consent-receipt-header` |
| 2 | Receipt summary — metadata flags | `candidate-consent-receipt-summary` |
| 3 | Consent coverage — snapshot, context, boundaries, audit events | `candidate-consent-receipt-consent-coverage` |
| 4 | JSON panel — full preview JSON | `candidate-consent-receipt-json-panel` |
| 5 | Download — active demo JSON button | `candidate-consent-receipt-download` |
| 6 | Covered / excluded scope | `candidate-consent-receipt-covered-excluded-scope` |
| 7 | Linked modules — SOR + trust layer links | `candidate-consent-receipt-linked-modules` |
| 8 | Consent receipt boundary — no legal claim | `candidate-consent-receipt-boundary` |

## Export JSON (`twin-demo-candidate-001-consent-receipt-preview.json`)

Required top-level keys:

- `receipt_metadata` — `consent_receipt_preview: true`, `backend_write: false`, `demo_only: true`, `legal_claim: false`, `generated_locally: true`
- `consent_snapshot`
- `accepted_context`
- `acknowledged_boundaries`
- `covered_candidate_controls`
- `excluded_scope`
- `linked_trust_modules`
- `system_of_record_links`
- `audit_events`
- `evidence_references`
- `safety_boundaries`

Deterministic, no PII, no real emails.

## Control Center integration

`/dashboard/trust/controls` consent receipt section with `ConsentReceiptPanel` — active **Download consent JSON** button (compact mode + link to full page).

## Link integration

- **All trust workflows** — header links to consent receipt page (including audit export)
- **Control Center** — embedded download panel
- **Candidate dashboard SOR hub** — `candidate_consent_receipt` registry entry
- **`/demo` journey** — `candidate_consent_receipt` step
- **Executive product proof** — demo link
- **Domain kernel** — `resolveCandidateConsentReceipt`

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "email sent", "deleted successfully", "automatic outreach", "automatic application", "AI decided", "AI decides".

Use: "demo-only", "preview only", "no backend write", "generated locally", "human decision required", "not legal advice".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send; no real delete/revoke/live export; no tickets.

## Tests

```bash
cd frontend
npm run test:candidate-consent-receipt
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-consent-receipt-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-consent-receipt-browser
```
