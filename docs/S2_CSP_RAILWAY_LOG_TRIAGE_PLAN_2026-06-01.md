# S2 CSP 72h Railway log triage plan — 2026-06-01

**Scope:** Burn-in evidence for gate **S2** while CSP stays **Report-Only**.
**Sink:** `POST /api/v1/csp-report` → `backend/app/api/csp_reports.py` (storage-free).
**No SQL. No DB table. No migrations.**

Public launch remains **NO-GO** until this plan completes with a signed evidence pack.

## Preconditions

1. Narrowed report-only CSP deployed to **preview alias** (or prod with founder approval) from `frontend/next.config.ts`.
2. `report-uri /api/v1/csp-report` visible on audited routes (`bash scripts/audit-csp-headers.sh`).
3. Backend sink live on Railway (`df15618` or newer); `pytest tests/test_csp_report*.py` green.

## What gets logged

Well-formed reports emit **WARNING** lines:

```text
csp_report violation: {'document-uri': '...', 'blocked-uri': '...', 'violated-directive': '...', ...}
```

Malformed payloads → DEBUG only (no WARNING).

## Railway log query workflow

### Access

1. Railway project → **API service** → **Logs** (read-only).
2. Time window: **72 consecutive hours** after narrowed report-only deploy.
3. Do **not** change env, restart, or redeploy during the window unless rollback.

### Filter patterns

Use Railway log search (plain text):

| Goal | Search / filter |
| ---- | ---------------- |
| All CSP reports | `csp_report violation` |
| Script blocks | `csp_report violation` + `script-src` |
| Image blocks | `csp_report violation` + `img-src` |
| Connect blocks | `csp_report violation` + `connect-src` |
| Frame blocks | `csp_report violation` + `frame-src` |
| Specific host | `csp_report violation` + `blocked-uri` substring (e.g. `posthog`, `plausible`) |

Export: copy log excerpts to `docs/evidence/S2_CSP_BURNIN_LOG_<start>_<end>.md` (create folder at triage time; do not commit secrets).

### Counting template

| Hour (UTC) | WARNING count | Unique blocked-uri | Action |
| ---------- | ------------- | ------------------ | ------ |
| 2026-06-__T00 | | | |
| … | | | |
| **72h total** | | | |

**Clean window criteria:** zero **unexpected** WARNING lines after false-positive triage (see below).

## False-positive triage

| Pattern | Expected? | Action |
| ------- | ----------- | ------ |
| Browser extensions injecting scripts | Yes (noise) | Ignore; reproduce in clean incognito without extensions |
| Bot/crawler odd payloads | Maybe | Ignore if `blocked-uri` is not a TWIN-required host |
| `unsafe-eval` on dev-only paths | Maybe | Confirm on **production build** only |
| Third-party not in inventory | No | Add host to allowlist **or** fix code; reset 72h clock |
| Rate-limit 429 on sink | No | Investigate flood; not a CSP violation |
| Empty / shapeless payloads | Yes | DEBUG only — do not count |

## Artifacts required for founder sign-off

1. **Deploy record:** preview/prod URL + Vercel deployment ID + git SHA of narrowed CSP.
2. **Header proof:** `bash scripts/audit-csp-headers.sh` output (all routes CSP-RO=yes, CSP-E=no).
3. **72h log summary:** total WARNING count, triaged table, list of accepted vs rejected violations.
4. **DevTools pack:** completed checklist (`docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md`).
5. **Founder demo dry-run:** PASS note referencing `docs/INVESTOR_DEMO_RUNBOOK.md`.
6. **Sign-off line:** founder name + date + “HOLD report-only” or “approve enforce flip PR”.

## Rollback during burn-in

If violation spike indicates broken UX:

1. Revert `frontend/next.config.ts` CSP string to prior permissive report-only (or previous deploy).
2. Redeploy frontend only.
3. Log incident row in `docs/P1_CSP_ENFORCE_BURNIN_DAILY_LOG_2026-05-27.md`.
4. **Do not** flip to enforce.

## After clean 72h

- Update `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` verdict → **READY FOR FOUNDER DECISION** (not auto-PASS).
- Enforce flip remains a **separate** single-character header rename + deploy, with post-enforce smoke.

## Hard bans (this plan)

- No enforce flip during triage.
- No prod DB writes for CSP reports.
- No claiming S2 PASS without artifact pack.
