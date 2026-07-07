# UI Product Surface QA — 2026-07-07

**Canonical stance:** P0 CLOSED | Gate E PASS 20/20 | Gate F PENDING | **Launch NO-GO**

This record captures merge evidence, deploy alignment, and **founder/MCP browser visual QA** after PRs **#401**, **#402**, and **#403**. It does **not** declare Gate F YES or Launch GO.

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
| `GET https://twin-sooty.vercel.app/api/public-health` → `status` / `db_ok` | `ok` / `true` (2026-07-07 founder QA) |
| `frontend_commit` (Vercel) | `d5d1995b86ad36cd779ee8d653783c0a6071cb1a` |
| `api_commit` / `git_commit` (Railway) | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| UI slice scaffold HEAD (#402/#403) | `a9b4e23c3f2a075546e362c66c4f65481159c630` |
| Scaffold HEAD (incl. QA doc [#404](https://github.com/CzechowskiT/twin/pull/404)) | `11495f6cdd5a133e71f270886f532a03341eff6f` |
| **Alignment** | **ALIGNED** — `frontend_commit` is a descendant of `a9b4e23c` (includes #402/#403); API matches #403 merge SHA |

**QA pending deploy:** **cleared** — prod browser visual QA completed 2026-07-07 (MCP cursor-ide-browser on https://twin-sooty.vercel.app).

## Production visual QA summary (2026-07-07)

| Surface | Verdict | Notes |
|---------|---------|-------|
| Header DEMO (#402) | **PARTIAL** | See section below |
| Partner logos (#402) | **PARTIAL** | See section below |
| Candidate hub `/dashboard` (#403) | **PASS** | Authenticated founder session |
| Recruiter hub `/recruiter` (#403) | **PARTIAL** | Primary grid PASS; worklist pilot still above hub |
| Company hub `/company/dashboard` (#403) | **PASS** | Authenticated founder session |

### Screenshots

| File | Viewport / route |
|------|------------------|
| `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-header-desktop.png` | Homepage header — desktop ~1280px |
| `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-header-mobile.png` | Homepage header — mobile 375px (prior capture; MCP refresh attempted) |
| `docs/screenshots/ui-product-surface-qa-2026-07-07/homepage-partner-marquee-desktop.png` | Partner marquee region — desktop scroll |

Hub grids verified via MCP accessibility snapshot (authenticated); full-page hub screenshots timed out on prod (heavy dashboard shell).

## Header DEMO CTA (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| DEMO CTA visible (logged-out marketing) | **PASS** | **PASS** — gold pill visible desktop + 375px |
| Placement vs #402 “account rail before Login/Register” | **PASS** (code: left cluster in `site-header-bar.tsx`) | **PARTIAL** — **actual prod placement: left rail next to `TWIN.` logo**, before center nav; Log in / Register remain on right (`ml-auto`). Documented delta from #402 copy (“right rail”). |
| `/demo` not duplicated in central persona nav | **PASS** | **PASS** — no center-nav Demo duplicate |
| Click DEMO → `/demo` | **PASS** | **PASS** — navigates to founder-led demo walkthrough |
| No header overflow (desktop / 375px) | **PASS** | **PASS** — no horizontal scroll observed |
| Mobile drawer includes Demo + Login/Register | **PASS** | **PASS** — Menu opens; Demo also inline in header row at 375px |

**Overall header DEMO:** **PARTIAL** (functional PASS; placement is left-rail not account-rail per #402 wording)

## Partner logos (#402)

| Check | Static / code | Production visual |
|-------|---------------|-------------------|
| Walmart, Goldman Sachs, Wells Fargo, American Express in marquee set | **PASS** | **PASS** (set in `company-logo-marquee.tsx`) |
| Readable logo height / card band | **PASS** | **PARTIAL** — Goldman Sachs & Wells Fargo confirmed readable in viewport; marquee scrolls; all four not in one static frame |
| Consistent card size, not clipped | **PASS** | **PASS** — uniform white cards, no clip on desktop |
| Responsive marquee (reduced-motion safe) | **PASS** | **PASS** — animation observed on prod |

**Overall partner logos:** **PARTIAL** (marquee works; founder feedback: logos may still read **too large** — follow-up UI polish, not blocking deploy alignment)

## Product surface visibility (#403)

Controlled-pilot primary limits: candidate **≤8**, recruiter **≤5**, company **≤4**.

| Persona | Route / hub | Static guard | Production visual |
|---------|-------------|--------------|-------------------|
| Candidate | `/dashboard` — ≤8 primary LIVE, roadmap collapsed, auto-apply not primary, billing not live checkout | **PASS** | **PASS** — 8 LIVE modules (Command panel, Offers, Matches, Profile & CV, CV workspace, Applications, Calendar, Identity verification); “Show pilot & roadmap” collapsed; Auto-apply paused in copy; Plan & billing in side nav only |
| Recruiter | `/recruiter` — ≤5 primary; calendar / ATS / integrations not primary live; work queue hidden | **PASS** | **PARTIAL** — 5 LIVE primary (Hub, Inbox, Pipeline, Jobs, Search); calendar not LIVE in hub; Integrations **Pilot** under collapsed roadmap; **Recruiter daily operating cockpit / worklist pilot still visible above hub grid** |
| Company | `/company/dashboard` — ≤4 primary; billing / integrations not primary live; delegated apply not visible | **PASS** | **PASS** — 4 primary cards (3 LIVE + Talent Pool Pilot); “Show pilot & roadmap” collapsed; billing/integrations not primary LIVE; no delegated apply |

**Overall product surface:** **PARTIAL** (candidate + company PASS; recruiter worklist visibility gap)

## Visual follow-ups (post-deploy)

**Founder/MCP prod check (2026-07-07):** `public-health` aligned; homepage + hub routes exercised in browser.

1. ~~Founder confirm homepage header: DEMO pill, no duplicate, mobile drawer at 375px.~~ **Done** — PARTIAL on placement (left rail).
2. ~~Founder confirm partner marquee: four named logos readable.~~ **Done** — PARTIAL (2/4 in single frame; marquee OK).
3. ~~Founder confirm `/dashboard`, `/recruiter`, `/company/dashboard` hub grids.~~ **Done** — see summary table.
4. ~~Re-fetch `public-health` and update deploy table.~~ **Done**.

**Remaining UI polish (not in this deploy SHA scope):**

- Move DEMO to account right rail if #402 copy is canonical (currently left of logo).
- Reduce partner logo visual weight if still “too large” per founder feedback.
- Hide or demote recruiter **daily operating cockpit / worklist** block if “work queue hidden” is strict.
- TWIN logo accent dot / micro-brand tweaks if scheduled separately.

## Founder decisions still required

Documented in `docs/GATE_F_FOUNDER_FINAL_DECISION_2026-07-07.md` (blank choices):

- **S9** — `ecdsa` PYSEC-2026-1325 disposition
- **P6** — authenticated prod smoke disposition
- **Gate F** — YES | NO | PENDING (harness/evidence only; not Launch GO)

## Gate F readiness note

Evidence package for founder review is merged (#401). UI slices (#402, #403) are on prod (`frontend_commit` ≥ `a9b4e23c`). **Production visual sign-off is complete for this QA pass** with PARTIAL items documented above; recruiter worklist visibility and header DEMO placement are the main UI follow-ups before calling surfaces fully PASS.

**No Gate F YES decided here. No Launch GO claimed here.**
