# Candidate Correction Request Workflow — 2026-06-18

**Branch:** `product/candidate-correction-request-workflow-2026-06-18`  
**Routes:** `/dashboard/trust/corrections` (primary), `/profile/trust/corrections` (alias)  
**Extends:** Trust Center #176, Control Center #179, Export Preview #180, Domain Kernel

## Purpose

Candidate-facing **correction request workflow** — deterministic demo-only draft for `demo-candidate-001` / `demo-role-001`. Preview/read-only only: **no DB mutation, submit, ticket, email, delete, revoke, or outreach**.

## Approach

**Frontend-only preview** — draft fields rendered from demo seed modules; submit button permanently disabled on pilot.

**Why:** Correction requests touch profile accuracy and recruiter-visible data. A live submit path risks accidental writes or support-ticket spam before human review gates exist. Demo seed from Control Center + Trust Center guarantees `backend_write: false`.

## Page sections (9)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-correction-request-header` |
| 2 | Correction categories — six types | `candidate-correction-request-categories` |
| 3 | Draft request — current vs proposed, submit disabled | `candidate-correction-request-draft` |
| 4 | Evidence attachments preview | `candidate-correction-request-evidence` |
| 5 | Review before sending — checklist | `candidate-correction-request-review` |
| 6 | Audit preview — `backend_write: false` events | `candidate-correction-request-audit-preview` |
| 7 | Linked modules — SOR links | `candidate-correction-request-linked-modules` |
| 8 | Planned workflow — future pipeline steps | `candidate-correction-request-planned-workflow` |
| 9 | Boundary panel — no submit/ticket/email | `candidate-correction-request-boundary` |

## Six correction categories

1. Profile field  
2. Skills & competency  
3. Experience timeline  
4. Education & credential  
5. Visibility scope  
6. Application & match data  

## Control Center integration

`/dashboard/trust/controls` correction section upgraded with `CorrectionRequestPanel` — disabled submit + link to full page.

## Link integration

- **Trust Center** — link to correction request page  
- **Export Preview** — link to correction request page  
- **Control Center** — embedded correction panel  
- **Candidate dashboard SOR hub** — `candidate_correction_request` registry entry  
- **`/demo` journey** — `candidate_correction_request` step  
- **Executive product proof** — demo link  

## Safe links (no 404)

- `/dashboard/trust`
- `/dashboard/trust/controls`
- `/dashboard/trust/export-preview`
- `/dashboard`
- `/dashboard/jobs`
- `/dashboard/matches`
- `/profile`

## Copy constraints

Never use: "submitted successfully", "ticket created", "GDPR compliant", "legally compliant", "email sent", "deleted successfully", "automatic outreach", "AI decided".

Use: "demo-only", "preview only", "no backend write", "submit disabled", "human decision required".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send; no real delete/revoke/submit.

## Tests

```bash
cd frontend
npm run test:candidate-correction-request
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-correction-request-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-correction-request-browser
```

## Domain kernel

`resolveCandidateCorrectionRequest(candidateId)` — additive resolver via `adaptCandidateCorrectionRequest`.
