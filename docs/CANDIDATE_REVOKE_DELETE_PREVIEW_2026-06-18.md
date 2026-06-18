# Candidate Revoke & Delete Request Preview — 2026-06-18

**Branch:** `product/candidate-revoke-delete-preview-2026-06-18`  
**Routes:** `/dashboard/trust/revoke-delete` (primary), `/profile/trust/revoke-delete` (alias)  
**Extends:** Trust Center #176, Control Center #179, Export Preview #180, Corrections #181, Portability #182, Domain Kernel

## Purpose

Candidate-facing **revoke & delete request preview** — deterministic demo-only draft for `demo-candidate-001` / `demo-role-001`. Preview/read-only only: **no DB mutation, submit, ticket, email, live revoke, account removal, or outreach**.

## Approach

**Frontend-only preview** — draft request rendered from demo seed modules; submit button permanently disabled on pilot.

**Why:** Revoke and delete touch consent, profile visibility, and integrations. A live submit path risks accidental writes before human review and cooling-off gates exist. Demo seed from Control Center + trust modules guarantees `backend_write: false` and `request_type: revoke_delete_preview`.

## Page sections (9)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-revoke-delete-header` |
| 2 | Request type selector — five disabled preview options | `candidate-revoke-delete-request-type-selector` |
| 3 | Impact preview — four impact areas | `candidate-revoke-delete-impact-preview` |
| 4 | Included & excluded scope — dual-column checklist | `candidate-revoke-delete-included-excluded-scope` |
| 5 | Draft request — `revoke_delete_preview`, submit disabled | `candidate-revoke-delete-draft` |
| 6 | Audit timeline — `backend_write: false` events | `candidate-revoke-delete-audit-timeline` |
| 7 | Linked modules — SOR links | `candidate-revoke-delete-linked-modules` |
| 8 | Planned workflow — future pipeline steps | `candidate-revoke-delete-planned-workflow` |
| 9 | Boundary panel — no submit/ticket/email/live revoke | `candidate-revoke-delete-boundary` |

## Control Center integration

`/dashboard/trust/controls` revoke & delete planned section upgraded with `RevokeDeletePanel` — disabled submit + link to full page.

## Link integration

- **Trust Center** — link to revoke/delete page  
- **Export Preview** — link to revoke/delete page  
- **Correction Request** — link to revoke/delete page  
- **Data Portability** — link to revoke/delete page  
- **Control Center** — embedded revoke/delete panel  
- **Candidate dashboard SOR hub** — `candidate_revoke_delete` registry entry  
- **`/demo` journey** — `candidate_revoke_delete` step  
- **Executive product proof** — revoke/delete link tile  

## Tests

```bash
cd frontend
npm run test:candidate-revoke-delete
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:candidate-revoke-delete-browser
```

## Bans (enforced)

- No Phase 3B, shell/gate/layout/fallback edits  
- No backend writes, tickets, email, outreach, live delete, live revoke  
- No real submission or legal/GDPR compliance claims  
- Forbidden copy: account deleted, access revoked, deleted successfully, GDPR compliant  
