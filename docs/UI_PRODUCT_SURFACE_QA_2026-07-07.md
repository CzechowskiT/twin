# UI Product Surface QA — 2026-07-07

**Canonical stance:** P0 CLOSED | Gate E PASS 20/20 | Gate F PENDING | **Launch NO-GO**

Merge evidence, deploy alignment, and **production visual QA** after PRs **#401–#404**. Does **not** declare Gate F YES or Launch GO.

## Merge evidence

| PR | Title | Merge SHA |
|----|-------|-----------|
| [#401](https://github.com/CzechowskiT/twin/pull/401) | docs: prepare gate f founder final decision | `45a39761c8ea62668db71a5d286974ab2c652860` |
| [#402](https://github.com/CzechowskiT/twin/pull/402) | fix: restore demo cta and normalize partner logos | `2c0b6c2e3e7f2f7f12b6b28989256d0defb8b482` |
| [#403](https://github.com/CzechowskiT/twin/pull/403) | feat: simplify pilot product surface visibility | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| [#404](https://github.com/CzechowskiT/twin/pull/404) | docs: UI product surface QA record + guard | `11495f6cdd5a133e71f270886f532a03341eff6f` |

**UI deploy reference (Vercel + Railway):** `a9b4e23c3f2a075546e362c66c4f65481159c630`

## Deploy alignment

Polled `GET https://twin-sooty.vercel.app/api/public-health` on **2026-07-07** (aligned on first poll; no deploy wait required).

| Signal | SHA / value |
|--------|-------------|
| `status` | `ok` |
| `db_ok` | `true` |
| `frontend_commit` | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| `api_commit` / `git_commit` | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| Repo scaffold HEAD (incl. QA doc #404+) | `d5d1995b` (docs delta after UI slice) |
| **Alignment** | **ALIGNED** — production frontend matches #402/#403 merge SHA |

## Production visual QA summary

Browser evidence: Playwright against `https://twin-sooty.vercel.app` (`PLAYWRIGHT_ALLOW_PROD_SMOKE=1`, 2026-07-07).

| Area | Result | Notes |
|------|--------|-------|
| Header DEMO CTA | **PARTIAL** | Demo visible, `/demo`, before Login/Register in header link order; desktop/tablet/mobile without horizontal overflow; **residual:** one `/demo` still in central persona cluster (Explore panel) while logo-rail pill also present |
| Partner logos on `/` | **PASS** | Walmart, Goldman Sachs, Wells Fargo, American Express readable in marketing marquee; smooth animation on visible tab |
| Candidate hub `/dashboard` | **PARTIAL** | Static guards **PASS**; prod visit unauthenticated (auth shell only) — roadmap/auto-apply/billing not visually confirmed |
| Recruiter hub `/recruiter` | **PARTIAL** | Static guards **PASS**; auth shell only — calendar/ATS/work queue not visually confirmed logged-in |
| Company hub `/company/dashboard` | **PARTIAL** | Static guards **PASS**; auth shell only — billing/integrations/delegated apply not visually confirmed |

**Screenshots:**

- `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-header-desktop.png`
- `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-header-mobile.png`
- `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-partner-marquee-desktop.png`

## Header DEMO CTA (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| DEMO CTA before Login/Register | **PASS** | **PASS** (Playwright prod) |
| `/demo` not duplicated in flat central persona nav | **PASS** (`marketingNavLinks`) | **PARTIAL** — Explore panel adds one center `/demo` |
| Mobile drawer includes DEMO | **PASS** | **PASS** (375px, no overflow) |
| Link to `/demo` | **PASS** | **PASS** |

**Overall header DEMO:** **PARTIAL**

## Partner logos (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| Walmart, Goldman Sachs, Wells Fargo, American Express | **PASS** | **PASS** |
| Readable size / not clipped (homepage marquee) | **PASS** | **PASS** |
| Marquee motion / reduced-motion path | **PASS** | **PASS** (prod tests 11, 16) |

**Overall partner logos:** **PASS**

## Product surface visibility (#403)

Controlled-pilot primary limits: candidate **≤8**, recruiter **≤5**, company **≤4**.

| Persona | Route / hub | Static guard | Production visual |
|---------|-------------|--------------|-------------------|
| Candidate | `/dashboard` — ≤8 primary, roadmap collapsed, auto-apply not primary, billing not live checkout | **PASS** | **PARTIAL** (auth gate) |
| Recruiter | `/recruiter` — ≤5 primary; calendar/ATS not primary live; work queue hidden | **PASS** | **PARTIAL** (auth gate) |
| Company | `/company/dashboard` — ≤4 primary; billing/integrations not primary live | **PASS** | **PARTIAL** (auth gate) |

**Overall product surface:** **PARTIAL**

## Visual follow-ups

1. Remove or relabel Explore-panel `/demo` so marketing chrome has a single intentional Demo entry (policy: logo pill + account rail).
2. Authenticated prod pass on `/dashboard`, `/recruiter`, `/company/dashboard` with founder demo account (`docs/DEMO_LOGIN_FOR_FOUNDER.md`) — **P6**.
3. Optional: `/login` safe-marquee SVG height band (Playwright test 13); homepage marketing marquee OK.

## Founder decisions still required

`docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md`:

- **S9** — `ecdsa` PYSEC-2026-1325 disposition
- **P6** — authenticated prod smoke disposition
- **Gate F** — YES | NO | PENDING (not Launch GO)

## Gate F readiness note

#402/#403 are live at `a9b4e23…` with homepage/logo prod smoke complete; hub grids await authenticated P6.

**No Gate F YES decided here. No Launch GO claimed here.**
