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
| Secrets in evidence | **None** |

**Operator:** founder
**Detail doc:** `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`

## Recorded submission — full P6 routes (2026-05-29 UTC)

| Field | Value |
| ----- | ----- |
| Template received | Yes (structure only) |
| Route results filled | **Partial** — `/dashboard/calendar` Google OAuth PASS (above); other route lines not fully attested in template |
| Safety checks filled | **No** |
| Screenshots / issues | Prior session: most routes PASS; `/dashboard` layout FAIL (FE fix shipped) |
| Operator attestation | Google Calendar OAuth: **founder PASS** |

## Verdict

| Check | Status |
| ----- | ------ |
| Google Calendar OAuth prod smoke | **PASS** (2026-05-29) |
| Authenticated route smoke (8 routes + safety copy) | **PARTIAL** — calendar OAuth closed; full P6 still pending layout redeploy + safety rows |
| May mark PASS on launch gates (P6) | **No** — partial only |
| Public launch implication | **NO-GO unchanged** (`S2`, `O7`, `P6` partial, `S11`, delegated/KYC not live) |

## Founder next actions

1. Log in with pilot test account on https://twin-sooty.vercel.app (credentials outside repo).
2. Visit each route; note **PASS** / **FAIL** + one-line note per row in the template above.
3. Confirm auto-apply settings show schedule/test copy only — **do not** click Run now / sweep triggers.
4. Confirm readiness gate blocks apply when incomplete (screenshot optional).
5. Paste completed block into this doc (or reply to release gate thread) and re-run docs sync.

## Hard bans (this exercise)

- No prod migration, Railway/env changes, live auto-apply, real applications, scrape, force-push.
- No public launch GO, delegated apply live, or KYC live claims from empty evidence.

## Related

- `docs/FOUNDER_MANUAL_SMOKE_CHECKLIST_PL.md` — 13-step PL checklist
- `docs/RESPONSIVE_QA_MATRIX_2026-05-29.md` — viewport matrix (auth rows pending)
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — program gates
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — capability snapshot
