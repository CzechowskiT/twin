# Founder authenticated smoke — evidence (2026-05-29)

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Frontend:** https://twin-sooty.vercel.app  
**API (read-only):** `git_commit=df15618`, `db_ok=true` via `/api/public-health` (2026-05-29)  
**Operator:** Release gate coordinator (docs sync) — **not** a substitute for founder execution.

## Source template (founder — paste results here)

```
FOUNDER SMOKE RESULT:
PASTE HERE:
- /dashboard:
- /dashboard/billing:
- /dashboard/settings/auto-apply:
- /dashboard/identity:
- /dashboard/career:
- /dashboard/calendar:
- /workspace/candidate/jobs:
- /profile:
- Auto-apply blocked when readiness incomplete:
- No active Run now / trigger:
- No KYC/legal/employer verified/guaranteed/delegated apply live copy:
- Any screenshots/issues:
```

## Google Calendar OAuth prod smoke (2026-05-29 UTC)

**Gate:** O5 (Google provider) · **Verdict:** **PASS**

| Check | Evidence |
| ----- | -------- |
| JS origin | `https://twin-sooty.vercel.app` in Google Cloud Console |
| Redirect URI | `https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback` (exact, no trailing `/`) |
| `/dashboard/calendar` Connect Google | Completes without `redirect_uri_mismatch` |
| Post-connect status | Google shows connected |
| Real events | Visible after reconnect |
| Fix | Google Cloud Console config only — no code/deploy for final fix |
| **Day mapping (week columns)** | **PASS** (founder re-smoke 2026-05-29) — Mon 2026-05-25 under Monday; all-day 2026-05-27 under Wednesday; no +1 shift |
| Vercel prod deploy (day-mapping fix) | `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` |
| Fix HEAD | `3631c45afea26c60e61dcf9fa31f691b307a2a33` |
| Calendar mutations | **None** |
| Secrets in evidence | **None** |

**Operator:** founder
**Detail doc:** `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`

## Google Calendar — founder re-smoke FULL PROD PASS (2026-05-29 UTC)

| Check | Evidence |
| ----- | -------- |
| Google OAuth / Connect | **PASS** |
| Real events on `/dashboard/calendar` | **PASS** |
| Week day mapping (`Europe/Warsaw`) | **PASS** — timed Mon 2026-05-25 → Monday column; all-day 2026-05-27 → Wednesday; no UTC +1 shift |
| Deploy | Vercel `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`; fix HEAD `3631c45` |
| Scope | FE-only; no Railway / env / migration |
| OAuth tokens logged | **None** |

## Recorded submission — full P6 routes (2026-05-29 UTC)

| Route | Founder verdict | Notes |
| ----- | --------------- | ----- |
| `/dashboard/billing` | **PASS** | Wide layout; subnav visible |
| `/dashboard/settings/auto-apply` | **PASS** | Schedule/test copy; no Run now |
| `/dashboard/identity` | **PASS** | No KYC overclaim |
| `/dashboard/career` | **PASS** | Career compass loads |
| `/dashboard/calendar` | **PASS** | Google FULL prod smoke (OAuth + events + day mapping) |
| `/workspace/candidate/jobs` | **PASS** | Long scroll OK when logged in |
| `/profile` | **PASS** | Long profile OK |
| `/dashboard` | **PENDING re-verify** | Prior FAIL: forecast CTA overlap — fix deployed Vercel `3631c45` / `a445878`; founder must confirm layout |
| Readiness blocks auto-apply when incomplete | **PASS** | |
| No Run now / trigger sweep in UI | **PASS** | |
| No KYC/legal/delegated apply live copy | **PASS** | |

| Field | Value |
| ----- | ----- |
| Template received | Yes |
| Route results filled | **Partial** — 7/8 routes PASS; `/dashboard` layout pending post-fix re-verify |
| Safety checks filled | **Yes** — all three safety rows PASS |
| Screenshots / issues | Prior `/dashboard` layout FAIL; FE fix shipped and deployed |
| Operator attestation | Google Calendar OAuth: **founder PASS** |

## Automated guard evidence (2026-05-29, release gate batch)

| Check | Result |
| ----- | ------ |
| `npm run test:verified-readiness-guard` | **PASS** |
| `npm run test:dashboard-ux-safety` | **PASS** |
| `npm run test:calendar-week` | **PASS** |
| Playwright unauth (`-g dashboard\|login\|…`) vs prod | **13/14 PASS** — `/status` cookie-banner strict-mode fixed on branch |
| Backend `test_candidate_verified_readiness_gate.py` | **11 passed** (local) |

## Verdict

| Check | Status |
| ----- | ------ |
| Google Calendar OAuth prod smoke | **PASS** (2026-05-29) |
| Google Calendar day mapping (Europe/Warsaw week view) | **PASS** (founder re-smoke 2026-05-29) |
| Google Calendar — full prod smoke (OAuth + events + day mapping) | **PASS** |
| Authenticated route smoke (8 routes + safety copy) | **PARTIAL** — 7/8 routes + safety **PASS**; `/dashboard` layout **PENDING founder re-verify** after deploy `3631c45` |
| May mark PASS on launch gates (P6) | **No** — `/dashboard` layout re-verify remains |
| Public launch implication | **NO-GO unchanged** (`S2`, `O7`, `P6` partial, `S11`, delegated/KYC not live) |

## Founder next actions

1. Re-verify `/dashboard` only — forecast section should be full-width without CTA overlap (deploy `3631c45` live).
2. Mark `/dashboard` **PASS** or **FAIL** in the route table above.
3. If PASS → notify release gate to flip P6 to ✅.

## Hard bans (this exercise)

- No prod migration, Railway/env changes, live auto-apply, real applications, scrape, force-push.
- No public launch GO, delegated apply live, or KYC live claims from empty evidence.

## Related

- `docs/FOUNDER_MANUAL_SMOKE_CHECKLIST_PL.md` — 13-step PL checklist
- `docs/RESPONSIVE_QA_MATRIX_2026-05-29.md` — viewport matrix (auth rows pending)
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — program gates
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — capability snapshot
