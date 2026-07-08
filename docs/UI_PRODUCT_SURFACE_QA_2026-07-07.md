# UI Product Surface QA — 2026-07-07

**Canonical stance:** P0 CLOSED | Gate E PASS 20/20 | Gate F PENDING | **Launch NO-GO**

This record captures merge evidence, deploy alignment, and visual QA status after PRs **#401**, **#402**, and **#403**. It does **not** declare Gate F YES or Launch GO.

## Merge evidence

| PR | Title | Merge SHA |
|----|-------|-----------|
| [#401](https://github.com/CzechowskiT/twin/pull/401) | docs: prepare gate f founder final decision | `45a39761c8ea62668db71a5d286974ab2c652860` |
| [#402](https://github.com/CzechowskiT/twin/pull/402) | fix: restore demo cta and normalize partner logos | `2c0b6c2e3e7f2f7f12b6b28989256d0defb8b482` |
| [#403](https://github.com/CzechowskiT/twin/pull/403) | feat: simplify pilot product surface visibility | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| [#404](https://github.com/CzechowskiT/twin/pull/404) | docs: UI product surface QA record + guard | `11495f6cdd5a133e71f270886f532a03341eff6f` |

**Scaffold HEAD after merges:** `11495f6cdd5a133e71f270886f532a03341eff6f` (docs-only delta over `a9b4e23c`)

## Deploy alignment

| Signal | SHA / value |
|--------|-------------|
| `GET https://twin-sooty.vercel.app/api/public-health` → `frontend_commit` | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| `api_commit` / `git_commit` (Railway) | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| UI slice scaffold HEAD (#403) | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| Scaffold HEAD (incl. QA doc [#404](https://github.com/CzechowskiT/twin/pull/404)) | `11495f6cdd5a133e71f270886f532a03341eff6f` |
| **Alignment** | **ALIGNED** — Vercel frontend matches #402/#403 merge SHA (2026-07-07, post-#404 merge) |

**QA pending deploy:** cleared for UI slice SHAs; founder browser confirm still required for layout/viewport evidence (see visual follow-ups).

## Header DEMO CTA (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| DEMO CTA on account rail before Login/Register | **PASS** (`site-header-bar.tsx`, `homepage-nav.test.ts`) | **PARTIAL** — deploy aligned; HTML curl shows DEMO strings; rail/layout not verified in browser |
| `/demo` not duplicated in central persona nav | **PASS** (`marketingNavLinks` filters `/demo`) | **PARTIAL** — needs founder viewport (MCP browser unavailable in agent run) |
| Mobile drawer includes DEMO without central duplicate | **PASS** (mobile `renderHeaderDemoCta`) | **PARTIAL** — 375px drawer not exercised |

**Overall header DEMO:** **PARTIAL** (code PASS; prod deploy aligned; browser visual **PENDING** founder/MCP)

## Partner logos (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| Walmart, Goldman Sachs, Wells Fargo, American Express in marquee set | **PASS** (`company-logo-marquee.tsx`) | **PARTIAL** — logos client-rendered; curl found no alt text on first paint |
| Card min dimensions / readable logo height band | **PASS** (`globals.css`, `partner-logo-styles.ts`, marquee tests) | **PARTIAL** — needs founder viewport |
| Responsive marquee (reduced-motion safe) | **PASS** (`performance-safe-moving-logo-marquee.test.ts`) | **PARTIAL** — needs founder viewport |

**Overall partner logos:** **PARTIAL** (code PASS; deploy aligned; marquee not verified in browser)

## Product surface visibility (#403)

Controlled-pilot primary limits: candidate **≤8**, recruiter **≤5**, company **≤4**.

| Persona | Route / hub | Static guard | Production visual |
|---------|-------------|--------------|-------------------|
| Candidate | `/dashboard` hub — primary live cards, collapsed roadmap, auto-apply not primary, billing not live checkout | **PASS** (`product-surface-visibility-guard.test.ts`) | **PARTIAL** — route shells load (HTTP 200); hub grid needs auth/browser |
| Recruiter | `/recruiter` — ≤5 primary; calendar / ATS / integrations not primary live | **PASS** | **PARTIAL** — route shells load (HTTP 200); hub grid needs auth/browser |
| Company | `/company/dashboard` — ≤4 primary; billing / integrations not primary live | **PASS** | **PARTIAL** — route shells load (HTTP 200); hub grid needs auth/browser |

**Overall product surface:** **PARTIAL** (guards PASS; prod shells only without authenticated hub render)

## Visual follow-ups (post-deploy)

**Automated prod check (2026-07-07):** `public-health` aligned; homepage curl shows DEMO copy; hub routes return 200 with loading shells — no Playwright/MCP browser in this run.

1. Founder confirm homepage header: DEMO pill on right rail, no duplicate in center nav, mobile drawer at 375px width.
2. Founder confirm partner marquee: four named logos readable, no clipping on tablet/desktop.
3. Founder confirm `/dashboard`, `/recruiter`, `/company/dashboard` hub grids match primary/roadmap split and badges.
4. ~~Re-fetch `public-health` and update this doc’s deploy table when aligned.~~ **Done** — see Deploy alignment.

## Founder decisions still required

Documented in `docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md` (blank choices):

- **S9** — `ecdsa` PYSEC-2026-1325 disposition
- **P6** — authenticated prod smoke disposition
- **Gate F** — YES | NO | PENDING (harness/evidence only; not Launch GO)

## Gate F readiness note

Evidence package for founder review is merged (#401). UI slices (#402, #403) are merged with static guards green; **production visual sign-off is no longer blocked on deploy alignment** for #402/#403 SHAs; founder viewport/hub auth checks remain before Gate F YES.

**No Gate F YES decided here. No Launch GO claimed here.**
