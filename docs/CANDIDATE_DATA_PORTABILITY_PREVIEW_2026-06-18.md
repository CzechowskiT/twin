# Candidate Data Portability Request Preview — 2026-06-18

**Branch:** `product/candidate-data-portability-preview-2026-06-18`  
**Routes:** `/dashboard/trust/portability` (primary), `/profile/trust/portability` (alias)  
**Extends:** Trust Center #176, Control Center #179, Export Preview #180, Corrections #181, Domain Kernel

## Purpose

Candidate-facing **data portability request preview** — deterministic demo-only draft for `demo-candidate-001` / `demo-role-001`. Preview/read-only only: **no DB mutation, submit, ticket, email, delete, revoke, or outreach**.

## Approach

**Frontend-only preview** — draft request rendered from demo seed modules; submit button permanently disabled on pilot.

**Why:** Data portability requests touch profile, trust, and export scope. A live submit path risks accidental writes or support-ticket spam before human review gates exist. Demo seed from Control Center + Export Preview guarantees `backend_write: false` and `request_type: portability_preview`.

## Page sections (9)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header — display name, role context, pilot badge, safe nav links | `candidate-data-portability-header` |
| 2 | Portability scope — four coverage areas | `candidate-data-portability-scope` |
| 3 | Included checklist | `candidate-data-portability-included-checklist` |
| 4 | Excluded checklist | `candidate-data-portability-excluded-checklist` |
| 5 | Draft request — `portability_preview`, submit disabled | `candidate-data-portability-draft` |
| 6 | Audit timeline — `backend_write: false` events | `candidate-data-portability-audit-timeline` |
| 7 | Linked modules — SOR links | `candidate-data-portability-linked-modules` |
| 8 | Planned workflow — future pipeline steps | `candidate-data-portability-planned-workflow` |
| 9 | Boundary panel — no submit/ticket/email | `candidate-data-portability-boundary` |

## Control Center integration

`/dashboard/trust/controls` data portability section upgraded with `DataPortabilityPanel` — disabled submit + link to full page.

## Link integration

- **Trust Center** — link to data portability page  
- **Export Preview** — link to data portability page  
- **Correction Request** — link to data portability page  
- **Control Center** — embedded data portability panel  
- **Candidate dashboard SOR hub** — `candidate_data_portability` registry entry  
- **`/demo` journey** — `candidate_data_portability` step  
- **Executive product proof** — portability link tile  

## Tests

```bash
cd frontend
npm run test:candidate-data-portability
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run test:candidate-data-portability-browser
```

## Bans (enforced)

- No Phase 3B, shell/gate/layout/fallback edits  
- No backend writes, tickets, email, outreach, delete, revoke  
- No real submission or legal/GDPR compliance claims  
