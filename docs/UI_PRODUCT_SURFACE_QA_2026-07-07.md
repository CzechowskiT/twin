# UI Product Surface QA — 2026-07-07

**Canonical stance:** P0 CLOSED | Gate E PASS 20/20 | Gate F PENDING | **Launch NO-GO**

This record captures merge evidence, deploy alignment, and visual QA status after PRs **#401**, **#402**, and **#403**. It does **not** declare Gate F YES or Launch GO.

## Merge evidence

| PR | Title | Merge SHA |
|----|-------|-----------|
| [#401](https://github.com/CzechowskiT/twin/pull/401) | docs: prepare gate f founder final decision | `45a39761c8ea62668db71a5d286974ab2c652860` |
| [#402](https://github.com/CzechowskiT/twin/pull/402) | fix: restore demo cta and normalize partner logos | `2c0b6c2e3e7f2f7f12b6b28989256d0defb8b482` |
| [#403](https://github.com/CzechowskiT/twin/pull/403) | feat: simplify pilot product surface visibility | `a9b4e23c3f2a075546e362c66c4f65481159c630` |

**Scaffold HEAD after merges:** `a9b4e23c3f2a075546e362c66c4f65481159c630`

## Deploy alignment

| Signal | SHA / value |
|--------|-------------|
| `GET https://twin-sooty.vercel.app/api/public-health` → `frontend_commit` | `31afa587739dd4bf9840f5e1ad56dff9d466ba56` |
| Expected frontend (post-merge) | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| **Alignment** | **PENDING** — production frontend lags merged scaffold; re-check after Vercel deploy |

**QA pending deploy:** founder browser confirm on production after `frontend_commit` matches scaffold HEAD (or latest merge SHA).

## Header DEMO CTA (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| DEMO CTA on account rail before Login/Register | **PASS** (`site-header-bar.tsx`, `homepage-nav.test.ts`) | **PENDING deploy** |
| `/demo` not duplicated in central persona nav | **PASS** (`marketingNavLinks` filters `/demo`) | **PENDING deploy** |
| Mobile drawer includes DEMO without central duplicate | **PASS** (mobile `renderHeaderDemoCta`) | **PENDING deploy** — overflow requires founder viewport check |

**Overall header DEMO:** **PARTIAL** (code PASS, prod visual PENDING deploy)

## Partner logos (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| Walmart, Goldman Sachs, Wells Fargo, American Express in marquee set | **PASS** (`company-logo-marquee.tsx`) | **PENDING deploy** |
| Card min dimensions / readable logo height band | **PASS** (`globals.css`, `partner-logo-styles.ts`, marquee tests) | **PENDING deploy** |
| Responsive marquee (reduced-motion safe) | **PASS** (`performance-safe-moving-logo-marquee.test.ts`) | **PENDING deploy** |

**Overall partner logos:** **PARTIAL** (code PASS, prod visual PENDING deploy)

## Product surface visibility (#403)

Controlled-pilot primary limits: candidate **≤8**, recruiter **≤5**, company **≤4**.

| Persona | Route / hub | Static guard | Production visual |
|---------|-------------|--------------|-------------------|
| Candidate | `/dashboard` hub — primary live cards, collapsed roadmap, auto-apply not primary, billing not live checkout | **PASS** (`product-surface-visibility-guard.test.ts`) | **PENDING deploy** |
| Recruiter | `/recruiter` — ≤5 primary; calendar / ATS / integrations not primary live | **PASS** | **PENDING deploy** |
| Company | `/company/dashboard` — ≤4 primary; billing / integrations not primary live | **PASS** | **PENDING deploy** |

**Overall product surface:** **PARTIAL** (guards PASS, hub UI on prod **PENDING deploy**)

## Visual follow-ups (post-deploy)

1. Founder confirm homepage header: DEMO pill on right rail, no duplicate in center nav, mobile drawer at 375px width.
2. Founder confirm partner marquee: four named logos readable, no clipping on tablet/desktop.
3. Founder confirm `/dashboard`, `/recruiter`, `/company/dashboard` hub grids match primary/roadmap split and badges.
4. Re-fetch `public-health` and update this doc’s deploy table when aligned.

## Founder decisions still required

Documented in `docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md` (blank choices):

- **S9** — `ecdsa` PYSEC-2026-1325 disposition
- **P6** — authenticated prod smoke disposition
- **Gate F** — YES | NO | PENDING (harness/evidence only; not Launch GO)

## Gate F readiness note

Evidence package for founder review is merged (#401). UI slices (#402, #403) are merged with static guards green; **production visual sign-off remains blocked on deploy alignment** unless founder accepts code-level evidence for Gate F prep only.

**No Gate F YES decided here. No Launch GO claimed here.**
