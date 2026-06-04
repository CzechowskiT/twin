# S2 CSP burn-in window — 2026-06-01

## Window metadata (active)

- Burn-in start UTC: `2026-06-02T14:18:33Z` (**NEW** window — post `connect-src` fix deploy)
- 72h target end UTC: `2026-06-05T14:18:33Z`
- Prior window start UTC: `2026-06-02T07:06:17Z` → **RESET** (invalid; see § Burn-in reset)
- Production URL: `https://twin-sooty.vercel.app`
- CSP mode: `Content-Security-Policy-Report-Only` (RO) — **enforce absent** on all audited routes
- Narrowed CSP on prod: **LIVE** (explicit allowlists, no broad `https:` wildcards)
- `connect-src` Railway API host: **DEPLOYED** (`https://twin-production-bcd9.up.railway.app` in `frontend/next.config.ts`)
- S2 status: **IN PROGRESS** — 72h evidence window running; **NOT READY** for enforce / S2 PASS
- S2 PASS: **NO**
- Public launch: **NO-GO**
- Auto-apply ops pause (2026-06-02): founder `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` — **does not reset** this burn-in clock (CSP headers unchanged; `csp_report` clean per founder)

## Burn-in reset (2026-06-02)

**Finding (founder Railway logs, ~2026-06-01 20:52–20:53 CEST):** `connect-src` report-only violations on `/dashboard` (`document-uri`: `https://twin-sooty.vercel.app/dashboard`). `blocked-uri` host: `https://twin-production-bcd9.up.railway.app` (calendar, jobs, applications, opportunities, auto-apply, gamification, etc.). Disposition: report-only — not an outage; expected when prod sets `NEXT_PUBLIC_API_URL` and authenticated fetches hit Railway directly.

**Fix:** Add `https://twin-production-bcd9.up.railway.app` to narrowed `connect-src` in `frontend/next.config.ts` (report-only unchanged; no wildcards). **Merged and deployed** to production frontend (founder-verified post-fix).

**Clock:** Prior 72h window (`2026-06-02T07:06:17Z` → `2026-06-05T07:06:17Z`) **RESET** — invalid after `connect-src` gap. **New** 72h window started `2026-06-02T14:18:33Z` after post-fix checks (public-health, Railway API health, dashboard OK, no fresh `csp_report` violations for `twin-production-bcd9.up.railway.app`).

## Post-fix founder verification (2026-06-02)

| Check | Result |
| --- | --- |
| `GET /api/public-health` (via FE alias) | `status=ok`, `db_ok=true` — see snapshot below |
| Railway API health | OK |
| Dashboard | OK |
| Railway logs: `csp_report violation` for `twin-production-bcd9.up.railway.app` | **No fresh violations** after fix deploy |

## Header audit (read-only, no auth/cookies)

Source checks at window start (report-only; enforce absent):

- `bash scripts/audit-csp-headers.sh` (when run)
- Manual `curl -sI` for 8 routes

| Route | HTTP | CSP-RO present | CSP enforce present | `report-uri` present | Narrowed policy live |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | yes | no | yes | yes |
| `/dashboard` | 200 | yes | no | yes | yes |
| `/login/candidate` | 200 | yes | no | yes | yes |
| `/register/candidate` | 200 | yes | no | yes | yes |
| `/demo` | 200 | yes | no | yes | yes |
| `/status` | 200 | yes | no | yes | yes |
| `/dashboard/calendar` | 200 | yes | no | yes | yes |
| `/api/public-health` | 200 | yes | no | yes | yes |

Enforce header check: **not present** on all routes.

## Public-health snapshot (read-only)

From `GET /api/public-health` (via FE alias), captured at burn-in restart (`2026-06-02T14:18:33Z`):

| Field | Value |
| --- | --- |
| `status` | `ok` |
| `db_ok` | `true` |
| `validated_jobs` | `652` |
| `market_coverage_active_validated` | `2579` |
| `worker_active` | `true` |
| `broker_configured` | `true` |

## Required evidence list before founder decision (6)

- 1) Burn-in start + end timestamps and immutable header audit evidence for the 8 routes.
- 2) Railway log triage for full 72h (`csp_report violation` cadence + hourly rollup + unique `blocked-uri` list).
- 3) False-positive triage decisions (extensions/bots/dev-noise) with explicit include/exclude rationale.
- 4) Multi-browser DevTools checklist (Chrome, Safari, Firefox, mobile Safari, mobile Chrome) completed on required routes.
- 5) Founder demo dry-run evidence on the same alias with pass/fail notes and any CSP anomalies.
- 6) Founder sign-off line (HOLD report-only / approve enforce PR) after reviewing logs + DevTools pack.

## Early checkpoint (2026-06-02)

**Checkpoint UTC:** `2026-06-02T14:32:09Z` (~14m after burn-in restart `2026-06-02T14:18:33Z`)

**Source:** Founder early Railway log triage (search: `csp_report`)

| Finding | Detail |
| --- | --- |
| Fresh `csp_report` after restart | **None** |
| Historical violations | Jun 1 2026 20:52–20:53 CEST — `connect-src` / Railway API host (`twin-production-bcd9.up.railway.app`); **fixed** in `24146f9` deploy |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next manual checkpoint (UTC):** `2026-06-02T18:18:33Z` (~4h after start) — Railway `csp_report` log triage + note any new `blocked-uri`.

## Manual checkpoint (2026-06-02)

**Checkpoint UTC:** `2026-06-02T14:42:07Z` (~24m after burn-in start `2026-06-02T14:18:33Z`)

**Source:** Founder dashboard smoke + route spot check + Railway log triage (`csp_report`)

| Check | Result |
| --- | --- |
| Dashboard smoke | **OK** |
| Routes (no white screen / breaking errors) | Dashboard, Jobs, Profile, Calendar, Demo — **OK** |
| Railway `csp_report` after `2026-06-02T14:18:33Z` | **No fresh entries** |
| Historical violations | Jun 1 2026 `connect-src` / Railway API — **known, fixed** |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next manual checkpoint (UTC):** `2026-06-02T18:18:33Z` (~4h after start) — Railway `csp_report` log triage + route/DevTools cadence per checklist.

## Manual checkpoint — clean (2026-06-02)

**Checkpoint UTC:** `2026-06-02T15:42:41Z` (~84m after burn-in start `2026-06-02T14:18:33Z`)

**Source:** Founder Railway log triage — service `production/twin`, deployment `37096ecc` (search: `csp_report`)

| Check | Result |
| --- | --- |
| Railway `csp_report` search | **No logs found** / **no fresh CSP reports** after window start |
| Dashboard | **OK** (founder) |
| Auto-apply | **PAUSED** — `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` (prior evidence; unchanged) |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next manual checkpoint (UTC):** `2026-06-02T18:18:33Z` (~4h after start) — Railway `csp_report` log triage + route/DevTools cadence per checklist.

## Agent checkpoint — header audit + tests (2026-06-03)

**Checkpoint UTC:** `2026-06-03T08:00:23Z` (~17h 42m after burn-in start `2026-06-02T14:18:33Z`; **~54h 18m** remaining until `2026-06-05T14:18:33Z`)

**Source:** Release-gate shift (read-only prod; no deploy). `bash scripts/audit-csp-headers.sh` (8 routes) · `GET /api/public-health` · local `pytest tests/test_csp_report*.py` (9 passed) · `npm run test:security-headers` (ok)

| Check | Result |
| --- | --- |
| 8-route CSP-RO + no enforce | **PASS** — `audit-csp-headers.sh` 0 failures |
| Public-health | `status=ok`, `db_ok=true`, `nightly_auto_apply_beat_enabled=false`, `git_commit=6382a91…` |
| `validated_jobs` / `market_coverage_active_validated` | `652` / `2634` (2026-06-03 curl) |
| Railway `csp_report` after window start | **Not available to agent** — founder manual triage required (see missed cadence below) |
| DevTools multi-browser matrix | **Incomplete** — not claimable via curl/tests alone |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Missed founder 4h cadence (UTC, no agent log access):** `2026-06-02T18:18:33Z`, `2026-06-02T22:18:33Z`, `2026-06-03T02:18:33Z`, `2026-06-03T06:18:33Z` — backfill Railway search `csp_report` for each interval or one combined rollup before window end.

**Next manual checkpoint (UTC):** `2026-06-03T10:18:33Z` (~20h after start) — Railway `csp_report` triage + DevTools cadence per checklist.

**Next agent checkpoint (suggested UTC):** `2026-06-03T14:18:33Z` (~24h after start) — repeat header audit + test bundle if shift continues.

## Founder-directed checkpoint — cadence + Railway template (2026-06-03)

**Checkpoint UTC:** `2026-06-03T11:16:42Z` (~20h 58m after burn-in start `2026-06-02T14:18:33Z`; **~51h 2m** remaining until `2026-06-05T14:18:33Z`)

**Founder direction (2026-06-03):** Production OK · DB OK · auto-apply **PAUSED** · nightly beat **OFF** · S2 **CONTINUE / NOT READY** · pilot/demo **GO** · public launch **NO-GO** · **no code/env changes today**

**Source (agent, read-only):** `bash scripts/audit-csp-headers.sh` · `GET /api/public-health` (sanitized)

| Check | Result |
| --- | --- |
| 8-route CSP-RO + no enforce | **PASS** — `audit-csp-headers.sh` 0 failures |
| Public-health | `status=ok`, `db_ok=true`, `celery.nightly_auto_apply_beat_enabled=false`, `celery.worker_active=true`, `git_commit=6382a91…` |
| `validated_jobs` / `market_coverage_active_validated` | `652` / `2634` |
| Railway `csp_report` (founder UI) | **Confirmed none** through `2026-06-03T12:23:52Z` — see § Founder Railway checkpoint (`2026-06-03`) |
| DevTools Chrome | **IN PROGRESS** — see `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md` § Chrome |
| Enforce header | **Absent** (unchanged) |
| Decision (agent-side) | **CONTINUE** report-only HOLD — no agent-observed CSP violations; **not** sufficient for S2 PASS without founder Railway rollup |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

### Railway `csp_report` search — founder procedure (manual UI)

1. Railway → project → service **`production/twin`** (API) → **Logs** (read-only).
2. Time filter: from **`2026-06-02T14:18:33Z`** (burn-in restart) through checkpoint time.
3. Search: `csp_report violation` (plain text).
4. Optional filters: `connect-src`, `script-src`, `blocked-uri` + host substring per `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`.
5. Record in the table below; attach excerpts to `docs/evidence/S2_CSP_BURNIN_LOG_<start>_<end>.md` (local only; no secrets in git).

**Founder fill-in template (copy row after UI search):**

| Field | Founder entry |
| --- | --- |
| Search UTC | |
| Log lines matching `csp_report violation` | count: ___ / none |
| New `blocked-uri` hosts (post-restart) | list or **none** |
| Matches historical `connect-src` Railway API (pre-fix)? | yes / no |
| Dashboard / routes smoke | OK / issues (non-CSP) |
| Decision | CONTINUE / HOLD / investigate |

**Next founder Railway cadence (UTC):** `2026-06-03T14:18:33Z` (~24h after start) · window end `2026-06-05T14:18:33Z`.

## Autonomous gate checkpoint (2026-06-03)

**Checkpoint UTC:** `2026-06-03T11:31:01Z` (~21h 12m after burn-in start `2026-06-02T14:18:33Z`; **~50h 48m** remaining until `2026-06-05T14:18:33Z`)

**Source (agent, read-only):** `bash scripts/audit-csp-headers.sh` (8 routes) · `curl -sI` on `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/privacy`, `/terms` (all **HTTP 200**) · `GET /api/public-health` · local `pytest` CSP + verified-readiness + public-health (**29 passed**)

| Check | Result |
| --- | --- |
| CSP-RO headers (8 audited routes) | **PASS** — enforce absent |
| Marketing/legal routes | `/privacy`, `/terms` **200** + CSP-RO per audit script pattern |
| Public-health | `status=ok`, `db_ok=true`, `nightly_auto_apply_beat_enabled=false`, `worker_active=true` |
| Railway `csp_report` | **Founder-confirmed none** through `2026-06-03T12:23:52Z` (search `csp_report` from window start) |
| Agent-observed CSP violations | **None** (header probe only) |
| Decision | **CONTINUE** report-only HOLD — **caveat:** Railway UI confirmation still required before S2 PASS |
| S2 status / PASS / public launch | **NOT READY** / **NO** / **NO-GO** |

**Founder Railway row (fill after UI search from `2026-06-02T14:18:33Z`):**

| Search UTC | `csp_report violation` count | New blocked-uri post-restart | Founder decision |
| ---------- | ------------------------------ | ---------------------------- | ---------------- |
| `2026-06-03T12:23:52Z` | **none** (no fresh entries since window start) | **none** | **CONTINUE** |

**Next founder cadence (UTC):** `2026-06-03T18:18:33Z` · **Next agent read-only cadence:** `2026-06-03T18:18:33Z` (optional).

## Founder Railway checkpoint (2026-06-03)

**Checkpoint UTC:** `2026-06-03T12:23:52Z` (~22h 5m after burn-in start `2026-06-02T14:18:33Z`; **~49h 55m** remaining until `2026-06-05T14:18:33Z`; **~31%** elapsed)

**Source:** Founder Railway UI — service `production/twin` → **Logs** → search `csp_report` (time filter from `2026-06-02T14:18:33Z`)

| Field | Founder entry |
| --- | --- |
| Type | founder Railway UI |
| Search | `csp_report` |
| Fresh entries after window start | **No** — brak świeżych wpisów od `2026-06-02T14:18:33Z` |
| New `blocked-uri` hosts (post-restart) | **none** |
| Matches historical `connect-src` Railway API (pre-fix)? | no (no new reports) |
| Dashboard / routes smoke | not re-run this checkpoint (prior checkpoints OK) |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Agent read-only corroboration (same session):** `bash scripts/audit-csp-headers.sh` — 0 failures · `GET /api/public-health` → `status=ok`, `db_ok=true`, `nightly_auto_apply_beat_enabled=false`, `git_commit=6382a91…`

**Clears PENDING:** § Founder-directed checkpoint (`2026-06-03T11:16:42Z`) and § Autonomous gate checkpoint (`2026-06-03T11:31:01Z`) — Railway `csp_report` count now **founder-confirmed none** for interval through this checkpoint.

**Next founder Railway cadence (UTC):** `2026-06-03T18:18:33Z` (~28h after start) · window end `2026-06-05T14:18:33Z`.

## Founder combined checkpoint — Railway + Chrome DevTools (2026-06-03)

**Checkpoint UTC:** `2026-06-03T13:29:36Z` (~23h 11m after burn-in start `2026-06-02T14:18:33Z`; **~48h 49m** remaining until `2026-06-05T14:18:33Z`; **~32%** elapsed)

**Source:** Founder Railway UI + Chrome DevTools S2 pass (new session evidence — distinct from Railway-only row `2026-06-03T12:23:52Z`)

| Check | Result |
| --- | --- |
| Type | founder Railway UI + Chrome DevTools checkpoint |
| Burn-in start | `2026-06-02T14:18:33Z` (unchanged) |
| Railway search | `csp_report` — **no fresh entries** since window start |
| Chrome DevTools routes | `/`, `/login/candidate`, `/register/candidate`, `/dashboard`, `/dashboard/calendar`, `/demo`, `/status`, `/api/public-health` — **no CSP violations** |
| `/api/v1/jobs/saved` | **422** — no CSP line in Console; **non-CSP** (API/auth/validation) |
| Safari / Firefox DevTools | **PENDING** — see `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md` |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next founder Railway cadence (UTC):** `2026-06-03T18:18:33Z` (~28h after start) · window end `2026-06-05T14:18:33Z`.

## Founder DevTools — non-CSP image proxy (2026-06-03)

**Source:** Founder Chrome DevTools on `https://twin-sooty.vercel.app` (same burn-in alias; **post** Chrome CSP pass `2026-06-03T13:29:36Z` / `ece6588`)

| Field | Entry |
| --- | --- |
| Console signal | Red `GET` failures for `/_next/image?url=…` (encoded external URLs) |
| Example upstream hosts | `https://icons.duckduckgo.com/…`, `https://www.google.com/s2/favicons?…`, `https://cdn.simpleicons.org/…` |
| HTTP statuses observed | **400** Bad Request · **404** Not Found · **502** Bad Gateway |
| CSP Console message | **None** — no “Content Security Policy”, “Refused to connect/load”, “violates the following directive”, or `blocked-uri` CSP error |
| Classification | **Non-CSP** app/UX — Next.js image optimizer proxying marketing logo marquee sources (`frontend/src/components/marketing/company-logo-marquee.tsx` multi-tier `brandLogoUrls` → `next/image`); upstream favicon/SI CDN misses or optimizer errors |
| S2 burn-in clock | **No reset** — orthogonal to Railway `connect-src` fix and CSP-RO burn-in |
| Chrome CSP pass | **Unchanged** — core routes still **no CSP violations** at `13:29:36Z` |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Likely cause (read-only triage):** Marquee loads ~80 brands × fallback chain (DuckDuckGo → Google favicons → jsDelivr/Simple Icons) through `/_next/image`; some slugs/domains 404/502 at origin; optimizer returns 400/404/502. `images.remotePatterns` in `frontend/next.config.ts` already allowlist these hostnames — not a CSP `img-src` gap.

**Follow-up (shipped on branch, CSP unchanged):** (1) `SafeCompanyLogo` — native `<img>` (no `/_next/image` proxy), capped `onError` fallback chain, initials placeholder. (2) `FAVICON_INITIALS_ONLY_DOMAINS` — skip remote fetch for blocklisted domains (`homedepot.com`, `chevron.com`, `servicenow.com`, `humana.com`, `cvs.com`). (3) `MARQUEE_STABLE_SI_SLUGS` — SI vectors only (jsDelivr + `cdn.simpleicons.org`); raster favicon helpers **deleted** from `brand-logo-urls.ts`. (4) Marquee plates are decorative `role="img"` spans (**no** outbound `href`) so Chrome does not prefetch `t*.gstatic.com/faviconV2` for link targets. Tests `npm run test:safe-company-logo`. **Deployed:** PR **#24** merged (`18e6ce4` chain); **`6d08742`** layered initials (Console clean, too many initials plates). **2026-06-04 allowlist trim:** phantom SI slugs removed; primary slug fixes (`chase`, `johndeere`); **59** marquee brands with stable SI URLs; remainder initials-only. **S2 burn-in: CONTINUE** (no clock reset). **Public launch: NO-GO** until 72h rollup + founder sign-off.

## Founder non-CSP logo smoke — post PR #24 (2026-06-04)

**Checkpoint UTC:** `2026-06-04T08:39:36Z` (~42h 21m after burn-in start `2026-06-02T14:18:33Z`; **~29h 39m** remaining until `2026-06-05T14:18:33Z`; **~59%** elapsed)

**Source:** Founder Chrome **Incognito** DevTools on `https://twin-sooty.vercel.app/` after PR **#24** merge/deploy (logo cleanup `18e6ce4` chain).

| Check | Result |
| --- | --- |
| Deploy | PR **#24** merged — favicon/logo cleanup **LIVE** on prod alias |
| Route | `/` homepage + logo marquee |
| `/_next/image` red errors | **None** |
| `icons.duckduckgo.com/ip3` red errors | **None** |
| `google.com/s2/favicons` red errors | **None** |
| `t*.gstatic.com/faviconV2` red errors | **None** |
| Fallback initials | **Working** |
| Console CSP violations | **None** |
| Classification | **Non-CSP UX fixed** |
| CSP policy / burn-in clock | **Unchanged** — **no reset** |
| Chrome CSP pass (`2026-06-03T13:29:36Z`) | **Unchanged** |
| Safari / Firefox DevTools | **PENDING** |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next founder cadence (UTC):** Railway `csp_report` triage `2026-06-04T14:18:33Z` (~48h after start) · Safari + Firefox DevTools per checklist · window end `2026-06-05T14:18:33Z`.

## Founder combined checkpoint — Safari + Firefox DevTools + Railway (2026-06-04)

**Checkpoint UTC:** `2026-06-04T08:47:35Z` (~42h 29m after burn-in start `2026-06-02T14:18:33Z`; **~29h 31m** remaining until `2026-06-05T14:18:33Z`; **~59%** elapsed)

**Source:** Founder Safari DevTools + Firefox DevTools + Railway `csp_report` triage on `https://twin-sooty.vercel.app`

| Check | Result |
| --- | --- |
| Safari DevTools routes | `/`, `/login/candidate`, `/register/candidate`, `/dashboard`, `/dashboard/calendar`, `/demo`, `/status`, `/api/public-health` — **no CSP violations** |
| Safari logo smoke (`/`) | No red favicon/`/_next/image` errors; initials OK |
| Firefox DevTools routes | Same core routes — **no CSP violations** |
| Firefox logo smoke (`/`) | No red favicon/`/_next/image` errors; initials OK |
| Railway `csp_report` after window start | **No fresh entries** since `2026-06-02T14:18:33Z` (last seen `2026-06-02T14:18:33Z` boundary) |
| Chrome empty white logo plates (founder `2026-06-04`) | **Found** — fixed in **`6d08742`** (`SafeCompanyLogo` layered initials); Console clean post-deploy |
| Chrome too many initials-only plates (founder post-`6d08742`) | **Found** — phantom `MARQUEE_STABLE_SI_SLUGS` (404 SI hops); **trimmed** to 59 verified slugs + `chase`/`johndeere` primary fixes; **post-deploy visual smoke required** |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next founder cadence (UTC):** Window end rollup `2026-06-05T14:18:33Z` · post-deploy `/` initials smoke after fix deploy · optional mobile DevTools.

## Gate closure session note (2026-06-03)

**Session UTC:** `2026-06-03T13:19:53Z` (~23h 1m elapsed; **~32%** of 72h window)

| Item | Status |
| --- | --- |
| New founder Railway `csp_report` evidence | **None this session** — prior checkpoint `12:23:52Z` still authoritative |
| S2 PASS | **NO** — burn-in continues until `2026-06-05T14:18:33Z` + full evidence pack + founder enforce sign-off |
| Enforce PR | **Not prepared** — hard ban |
| Public launch | **NO-GO** |

## Manual checkpoint cadence

- **Window end review:** `2026-06-05T14:18:33Z` — full 72h evidence pack before any enforce decision.

## Guardrails

- Do **not** enable enforce mode in this window.
- Do **not** claim S2 PASS during this window.
- Public launch remains **NO-GO** until founder decision after full 72h evidence review.
