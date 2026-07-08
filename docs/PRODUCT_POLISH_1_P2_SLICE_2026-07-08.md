# Product Polish 1.0 — P2 slice (2026-07-08)

**Scope:** frontend/UI only. Builds on P0/P1 (`docs/PRODUCT_POLISH_1_P0_SLICE_2026-07-08.md`, `docs/PRODUCT_POLISH_1_P1_SLICE_2026-07-08.md`). No backend/API/auth/DB/env.

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

---

## Implemented (P2)

| # | Area | Change |
|---|------|--------|
| 1 | Calendar | Google = LIVE, Microsoft = Coming soon (forced), ICS/WebCal = Preview; unified `productPolish.calendar*` copy on connection panel. |
| 2 | Billing | `PremiumPreviewSurface` for candidate + company; waitlist/contact CTAs only when checkout not configured. |
| 3 | Badges | `preview` tier on `WorkspaceStatusBadge`; `IntegrationRowStatusBadge` + `WorkspacePilotPageHeader` for submodule pages. |
| 4 | Investor | Single primary deck CTA in hero; duplicate preview module grid hidden; status rows use `WorkspaceStatusBadge`. |
| 5 | Recruiter | Analytics, talent pool, talent radar, integrations — shared pilot headers, fewer inline chips. |
| 6 | Company | Integrations, billing, hiring cockpit/command center — unified badges and preview billing surface. |
| 7 | Candidate | Calendar page live badge; billing preview badge + surface. |
| 8 | Marketing | Coming-soon pages use `WorkspaceStatusBadge` (coming soon). |
| 9 | ATS | Import readiness header — single pilot badge. |
| 10 | Guard | `frontend/scripts/product-polish-p2-guard.test.ts` + `npm run test:product-polish-p2-guard`. |

**Flags:** `frontend/src/lib/product-polish-p2.ts`

---

## Deferred (P3+)

- Verified testimonials and partner reference wall.
- Investor invite-only login (`needs_setup` flow).
- Full inline badge migration on every demo journey workspace (20+ surfaces).
- Microsoft calendar OAuth UX when product tier flips to live.

---

## UX impact

- **Calendar:** Honest provider tiers without mixed naming; Microsoft no longer implies live sync.
- **Billing:** One Premium Preview story — no Stripe docs link or checkout impression on limited launch.
- **Workspaces:** Pilot submodule pages read calmer (one badge, consistent headers).
- **Investor:** Less preview noise; deck CTA is obvious above the fold.

---

## Stance footer

P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO** — NOT Launch GO, NOT Gate F YES.
