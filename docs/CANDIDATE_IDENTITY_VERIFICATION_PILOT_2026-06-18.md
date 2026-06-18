# Candidate Identity Verification Pilot — 2026-06-18

**Branch:** `product/identity-verification-pilot-visibility-fix-2026-06-18`  
**Routes:** `/dashboard/trust/identity-verification` (primary), `/profile/trust/identity-verification` (alias)  
**Extends:** Trust Center, Control Center, Domain Kernel, legacy `/dashboard/identity` warning card

## Purpose

Candidate-facing **identity verification pilot** — deterministic demo-only preview for `demo-candidate-001` / `demo-role-001`. Preview/read-only only: **no KYC, document upload, provider API, or backend writes**.

## Scope A — Warning card visibility fix

Legacy route `/dashboard/identity` pilot-unavailable card:

- High-contrast copy on navy (`text-[var(--foreground)]` on amber tint)
- Split title/body i18n (`dashboard.identityPilotNotice` / `dashboard.identityNotConfigured`)
- PL: capitalized **Nadal** in body; no `line-clamp` / `truncate` / `overflow-hidden`

## Scope B — Page sections (8)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-identity-verification-header` |
| 2 | Current status — readable pilot warning | `candidate-identity-verification-current-status` |
| 3 | Future flow preview — disabled steps | `candidate-identity-verification-future-flow` |
| 4 | Data shared preview | `candidate-identity-verification-data-shared` |
| 5 | Disabled actions | `candidate-identity-verification-disabled-actions` |
| 6 | Audit timeline — `backend_write: false` events | `candidate-identity-verification-audit-timeline` |
| 7 | Linked trust modules — SOR links | `candidate-identity-verification-linked-modules` |
| 8 | Boundary panel — no KYC/upload/API | `candidate-identity-verification-boundary` |

## Integration

- **Trust Center** — link to identity verification page
- **Control Center** — embedded `IdentityVerificationPanel`
- **Export Preview** — link to identity verification page
- **Subnav** — trust identity verification link
- **SOR hub** — `candidate_identity_verification` registry entry
- **`/demo` journey** — `candidate_identity_verification` step
- **Executive product proof** — demo link
- **Domain kernel** — `resolveCandidateIdentityVerification`

## Safe links (no 404)

- `/dashboard/trust`
- `/dashboard/trust/controls`
- `/dashboard/trust/export-preview`
- `/dashboard/trust/corrections`
- `/dashboard/trust/audit-export`
- `/dashboard`
- `/dashboard/jobs`
- `/dashboard/matches`
- `/profile`
- `/dashboard/identity` (legacy)

## Copy constraints

Never use: "verified successfully", "KYC passed", "GDPR compliant", "legally compliant", "email sent", "automatic outreach", "AI decided".

Use: "demo-only", "preview only", "no backend write", "start disabled", "human decision required".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no real KYC, document upload, or provider API.

## Tests

```bash
cd frontend
npm run test:candidate-identity-verification
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-identity-verification-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-identity-verification-browser
```
