# Launch-day monitoring & rollback runbook — 2026-06-04

**Role:** TWIN Launch-Day Monitoring & Rollback Runbook Coordinator (docs-only)  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Branch HEAD:** `a2e38d8` (at doc creation)  
**Doc UTC:** `2026-06-04`  
**Production (unchanged by this doc):** FE `https://twin-sooty.vercel.app` · API `https://twin-production-bcd9.up.railway.app` · Railway project **twin-production**

**Verdict at authoring:** **Public launch NO-GO** · **Controlled pilot / investor demo GO** · **S2 NOT READY** (72h burn-in until `2026-06-05T14:18:33Z`) · **Auto-apply PAUSED** · **Delegated apply NOT LIVE**

**This document describes what to watch and how to decide — it does not execute deploys, env changes, CSP enforce, migrations, or apply/scrape operations.**

---

## A — Launch scope (controlled pilot only)

| Dimension | In scope today | Out of scope (hard ban) |
| --------- | -------------- | ------------------------ |
| **Audience** | ≤20 named pilot users (`docs/PILOT_TRACKER.csv`); curated investor/CTO demo | Public announcement (LinkedIn, X, PressOn); uncontrolled signup spike |
| **Stack** | Same prod FE + API URLs above | Staging-only shortcuts; “demo” DB |
| **CSP** | Report-only on prod until enforce PR merged + deployed; enforce PR **prepared** (`chore/s2-csp-enforce-pr-2026-06-05`) | Flip live without founder merge/deploy approval |
| **Auto-apply** | Server gates live; nightly beat **disabled**; no mass autonomous apply | Nightly sweep on; `AUTO_APPLY_SUBMIT` enable without founder approval; ops trigger-sweep without allowlist |
| **Delegated / KYC apply** | Documented **NOT LIVE** | Any copy or config implying live delegated submit |
| **Legal** | L6 export self-service; erasure manual (`docs/GDPR_MANUAL_DSR.md`); L6 + O5 waivers signed `2026-06-03T13:19:53Z` | Self-service delete; full Apple Calendar OAuth claims |

**“Launch day” in this runbook** = any calendar day the founder runs pilot onboarding, investor demo, or pre-public rehearsal — **not** public GO until `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` shows all required gates green (S2 primary blocker).

**Pilot GO criteria (today):** `GET https://twin-sooty.vercel.app/api/public-health` → `status=ok`, `db_ok=true`; P6 smoke PASS; auto-apply pause confirmed (`nightly_auto_apply_beat_enabled=false`).

**Public NO-GO criteria (today):** S2 burn-in incomplete; optional GAP-04 open; L6/O5 waivers are **pilot-only**, not substitutes for uncontrolled public launch.

---

## B — Roles (founder approves GO, enforce, env, rollback)

| Role | Responsibility | Approver (today) |
| ---- | -------------- | ---------------- |
| **Launch commander** | Final GO/NO-GO for pilot activity vs hold; owns comms tone | Founder |
| **Security / CSP** | Burn-in evidence, enforce flip, CSP rollback decision | Founder only — no agent S2 PASS |
| **Ops / platform** | Health checks, Railway/Vercel status, env rollback | Founder only — no agent env/deploy |
| **Auto-apply safety** | Confirm beat off, no sweep, no live delegated | Founder + `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` |
| **Privacy / DSR** | Manual erasure path; export escalations | Founder per `docs/GDPR_MANUAL_DSR.md` |
| **Scribe** | Fills evidence log (§ K) during the day | Founder or delegate |
| **Comms** | Pilot DMs, status notes — no public launch posts | Founder |

**Single approver rule:** Any action that changes production (deploy, CSP enforce, Railway variables, DB, migrations, scrape/apply) requires **explicit founder approval** documented in the evidence log. Agents and automation **must not** perform these actions during launch-day monitoring shifts.

---

## C — Pre-launch checklist (T-60 / T-30 / T-15)

All times relative to **first pilot user session** or **investor demo start** (whichever is earlier that day). Use **UTC** in the evidence log.

### T-60 minutes

| # | Check | Command / doc | Pass criterion |
| - | ----- | ------------- | -------------- |
| 1 | Public health | `curl -fsS https://twin-sooty.vercel.app/api/public-health \| jq '{status,db_ok,nightly_auto_apply_beat_enabled,git_commit}'` | `status=ok`, `db_ok=true`, `nightly_auto_apply_beat_enabled=false` |
| 2 | API health | `curl -fsS 'https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1' \| jq .status` | `ok` |
| 3 | FE reachability | `curl -sI https://twin-sooty.vercel.app/ \| head -1` | HTTP `200` |
| 4 | CSP mode | `curl -sI https://twin-sooty.vercel.app/ \| grep -i content-security-policy` | **Report-Only** present; **no** enforce header |
| 5 | S2 window | `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` | If before `2026-06-05T14:18:33Z`: enforce **HOLD** |
| 6 | Gate matrix | `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` § L | Public **NO-GO** acknowledged; pilot **GO** only if intentional |
| 7 | Copy audit | `docs/PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md` | No BLOCKER claims on routes you will show |
| 8 | Incident runbook | `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` | Open and reachable |
| 9 | Post-mortem template ready | `docs/POSTMORTEM_<date>_<slug>.md` path reserved | Empty file or ticket ready |
| 10 | Evidence log | § K below | Table created for the day |

### T-30 minutes

| # | Check | Pass criterion |
| - | ----- | -------------- |
| 11 | Pilot roster | `docs/PILOT_TRACKER.csv` — today's users named | No unknown email invites |
| 12 | Auto-apply stance | `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` §1 | Beat disabled; delegated false in code |
| 13 | Calendar smoke (if demo includes calendar) | `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` | Google path known-good; Apple = ICS/WebCal only |
| 14 | DSR path | `docs/GDPR_MANUAL_DSR.md` | Erasure = manual; export self-service OK |
| 15 | GitHub smoke (optional) | `gh run list --workflow smoke.yml --limit 3` | Recent runs green or known flake documented |

### T-15 minutes

| # | Check | Pass criterion |
| - | ----- | -------------- |
| 16 | Browser dry-run | Chrome Incognito: `/`, `/login/candidate`, `/dashboard` (if authed) | No red console CSP violations on shown routes |
| 17 | Logo / marquee (if showing `/`) | Founder smoke `2026-06-04T10:29:29Z` baseline | No broken `/_next/image` / favicon noise |
| 18 | Comms templates | § J | Copied into scratch doc |
| 19 | Hold triggers | § E | Founder knows S0 vs S1 vs hold |
| 20 | **Explicit pilot GO** | Founder signs evidence log row | “Pilot/demo GO for &lt;UTC window&gt;” — **not** public GO |

**If any T-60 security row fails (health down, CSP enforce appeared, beat enabled):** **HOLD** — do not onboard new pilot users until § E resolved.

---

## D — Monitoring cadence (first 15 min, 1 h, 24 h)

### First 15 minutes (continuous)

| Signal | How | Action if bad |
| ------ | --- | ------------- |
| FE + API up | `curl` health endpoints every 5 min | § E S0 |
| Error rate | Railway API logs — 5xx spike | § E S0/S1 |
| CSP reports | Railway search `csp_report` (founder UI) | New unexpected `blocked-uri` → § G |
| User-reported blockers | Pilot DM / screen share | Log in evidence log; triage severity |

### First 1 hour

| Signal | How | Pass |
| ------ | --- | ---- |
| Public-health stability | Same JSON as T-60; compare `git_commit` | Unchanged unless planned deploy |
| Auth flows | Pilot completes login OAuth or email | No 5xx on `/api/v1/auth/*` |
| Dashboard load | `/dashboard` 200; key API calls succeed | No sustained CSP violations on dashboard |
| Auto-apply | `nightly_auto_apply_beat_enabled` still false; no surprise `last-sweep` submissions | § H if submissions &gt; 0 |
| Celery | `GET .../api/v1/health/celery-status` | Worker active; beat schedule has no nightly |

### First 24 hours

| Signal | How | Notes |
| ------ | --- | ----- |
| S2 burn-in continuity | `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` | Do **not** reset clock for unrelated fixes |
| Railway `csp_report` rollup | Founder ~48h cadence | Record UTC + “no fresh entries” or triage list |
| Pilot tracker | `PILOT_TRACKER.csv` “Yesterday's signal” | Per `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` |
| DSR tickets | Manual inbox | Any erasure request → § I |
| End-of-day verdict | § L | Public still NO-GO unless S2 + gates closed |

---

## E — Stop / hold / rollback triggers (S0–S3)

Aligned with `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` severity matrix.

| Sev | Launch-day examples | Immediate action |
| --- | ------------------- | ---------------- |
| **S0** | API 5xx &gt; 5 min; `db_ok=false`; data breach; mass mis-apply to job boards; recruiter token public | **STOP** pilot onboarding; § F rollback options; § J comms; post-mortem now |
| **S1** | Login broken; calendar sync broken for all pilots; placement state wedged | **HOLD** new pilot sessions; fix or rollback within 1 h; update pilots |
| **S2** | One pilot scraper failing; one OAuth provider slow; single inbox stuck | Per-user workaround; fix within 1 day |
| **S3** | Copy typo; stale stat; flaky e2e | Log; next sprint |

**Launch-specific HOLD (no severity yet):**

- CSP **enforce** header appears on any audited route → **HOLD** enforce rollout; § G rollback-to-RO procedure (founder executes).
- `nightly_auto_apply_beat_enabled=true` on public-health → **HOLD** pilot; § H.
- Unexpected `total_applications_submitted` on last-sweep → **HOLD**; § H.
- Founder has not signed S2 rollup after `2026-06-05T14:18:33Z` → **Public launch remains NO-GO** regardless of pilot health.

---

## F — Rollback options (documentation only — do not perform in agent sessions)

These are **founder-executed** recovery moves. Agents document and recommend; they do **not** run them unless the user explicitly orders a separate ops session.

| Scenario | Rollback option | Side effects | Doc reference |
| -------- | --------------- | ------------ | ------------- |
| Bad FE deploy | Vercel instant rollback to prior deployment | ~60–90s alias propagation | `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md` |
| Bad API deploy | Railway rollback deployment or `git revert` + push | API redeploy | `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` § API outage |
| CSP enforce broke UX | Rename header enforce → report-only in `frontend/next.config.ts`; push | Vercel redeploy | `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` § CSP |
| Auto-apply runaway | `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` Worker+API; optional `AUTO_APPLY_SUBMIT=false` | Railway redeploy | `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` |
| Wrong job submitted | Stop beat; manual recruiter apology; board allowlist review | Trust impact | Incident runbook § Auto-apply |
| DB corruption | **Do not** ad-hoc prod restore without runbook | High risk | `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`, `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md` |
| Stripe duplicate webhook | Manual count fix until dedup verified | Billing | Incident runbook § Webhook replay |
| Public launch announced by mistake | Pull announcement; status page; revert to pilot-only narrative | Comms | § J |

**Rollback anti-patterns (never during launch-day agent shift):** force-push `main`; prod `alembic upgrade` without drill; scrape/apply/sweep to “fix” data; CSP enforce to “fix” console noise.

---

## G — CSP playbook (report-only burn-in)

| Item | Value |
| ---- | ----- |
| Window | `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z` |
| Mode | **Report-Only** on 8 audited routes; enforce **absent** |
| Prod FE | `https://twin-sooty.vercel.app` |
| Sink | `POST /api/v1/csp-report` via `report-uri` |
| Enforce readiness | `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` |
| Burn-in window | `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` |
| DevTools checklist | `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md` |
| Railway triage | `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md` |

### Monitoring commands (read-only)

```bash
# Header audit (8 routes)
bash scripts/audit-csp-headers.sh

# Single-route spot check
curl -sI https://twin-sooty.vercel.app/dashboard | grep -i content-security-policy

# Local regression
pytest tests/test_csp_report*.py -q
cd frontend && npm run test:security-headers
```

### Decision tree

| Observation | Action |
| ----------- | ------ |
| No fresh Railway `csp_report` since window start; DevTools clean | **CONTINUE** burn-in; public launch still **NO-GO** until window end |
| New `blocked-uri` on prod routes | Triage per `S2_CSP_RAILWAY_LOG_TRIAGE_PLAN`; fix allowlist in RO; **reset clock only** if policy in burn-in doc says so |
| Enforce header detected | **S1 HOLD** — founder rollback to RO (§ F); do not declare S2 PASS |
| Logo / marquee console noise only | Non-CSP; see matrix § H — does not reset burn-in |
| Window end `2026-06-05T14:18:33Z` | Founder reviews 6-item evidence pack in burn-in doc → **HOLD RO** or approve enforce PR |

**Hard ban:** No agent declares **S2 PASS** or flips enforce without founder sign-off after full rollup.

---

## H — Auto-apply safety playbook

| Control | Expected prod state | Verify |
| ------- | ------------------- | ------ |
| Nightly beat | **OFF** | `public-health` → `nightly_auto_apply_beat_enabled: false` |
| `AUTO_APPLY_SUBMIT` | Unset / default (GAP-04 optional) | Document in evidence log if checked |
| Server gate GAP-01 | `enforce_autonomous_apply_allowed()` → 403 | Code on `6382a91` |
| Per-user trigger GAP-02 | Ops allowlist only | No candidate UI |
| Delegated apply | **NOT LIVE** | `delegated_apply_allowed=false` |
| Ops sweep | Allowlist only | No agent `trigger-sweep` |

### If submissions appear

1. Confirm via `GET .../api/v1/auto-apply/last-sweep` (founder auth if required).
2. **HOLD** new pilot outreach.
3. Founder sets `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` (if not already) and optionally `AUTO_APPLY_SUBMIT=false` per pause plan.
4. Manual contact affected recruiters if portal submit occurred.
5. Log incident severity (S0 if mass; S1 if single user).

**Docs:** `docs/AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md`, `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md`, `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md`.

---

## I — Privacy / DSR playbook

| Request | Path | Launch-day stance |
| ------- | ---- | ----------------- |
| Export JSON | User self-service `GET /api/v1/candidates/me/export.json` | Direct user to dashboard |
| Applications CSV/XLSX | Self-service export endpoints | Same |
| Erasure | **Manual** — `docs/GDPR_MANUAL_DSR.md` | Founder-only; identity verify first |
| L6 waiver | Signed `2026-06-03T13:19:53Z` | Pilot OK; **not** public-launch substitute |

**SLA:** Access/portability aim &lt; 14 days; erasure per manual runbook after verification.

**During demo:** Do not claim “one-click delete account” — state export is live and full erasure is via support request.

**Risk register:** R-019 open until self-service delete ships.

---

## J — Comms templates

### Internal (founder scratch)

- **All-clear (pilot):** *"Pilot stack green at &lt;UTC&gt;. Health ok, auto-apply paused, CSP report-only. Session GO for named pilots only."*
- **Hold:** *"Holding pilot onboarding from &lt;UTC&gt; due to &lt;symptom&gt;. ETA update &lt;UTC+30m&gt;."*

### Pilot user DM (S1)

*Hi &lt;name&gt; — we're seeing &lt;symptom&gt; on TWIN since &lt;UTC&gt;. Your data is safe; we're investigating and will update by &lt;UTC+1h&gt;. Sorry for the disruption.*

### Status note (S0)

*We're aware of &lt;symptom&gt; on TWIN since &lt;UTC&gt;. Investigating; updates every 30 min.*

### Resolved

*Resolved at &lt;UTC&gt;. Impact: &lt;one sentence&gt;. Root cause: &lt;one sentence&gt;. Post-mortem: &lt;link when ready&gt;.*

### Forbidden without public GO

- LinkedIn / X / press “we're live for everyone”
- Copy implying delegated apply, live KYC, or full Apple Calendar OAuth
- “CSP fully hardened” before S2 PASS

---

## K — Evidence log template

Copy into `docs/LAUNCH_DAY_EVIDENCE_<YYYY-MM-DD>.md` or a spreadsheet.

| UTC | Phase | Check | Result | Actor | Notes |
| --- | ----- | ----- | ------ | ----- | ----- |
| | T-60 | public-health | | | `git_commit`, `nightly_auto_apply_beat_enabled` |
| | T-60 | CSP headers RO only | | | 8-route or `audit-csp-headers.sh` |
| | T-30 | pilot roster | | | |
| | T-15 | founder pilot GO | | | Explicit **not** public GO |
| | +15m | health stable | | | |
| | +1h | auth/dashboard | | | |
| | +24h | S2 burn-in status | | | CONTINUE / triage / window end |
| | +24h | public launch verdict | | | Expected: **NO-GO** until S2 |
| | | incident ID | | | Link post-mortem if any |

---

## L — Final GO / NO-GO checklist

Run at end of launch day or before any **public** announcement.

| # | Question | Required for **public** GO | Today (2026-06-04) |
| - | -------- | -------------------------- | ------------------- |
| 1 | S2 — 72h burn-in complete + founder sign-off? | ✅ | ❌ IN PROGRESS (~61% at `10:34:36Z`) |
| 2 | CSP enforce intentionally live ≥72h with 0 unexpected violations? | ✅ | ❌ enforce OFF |
| 3 | `public-health` ok + `db_ok`? | ✅ | ✅ |
| 4 | Auto-apply paused; delegated NOT LIVE? | ✅ | ✅ PAUSED |
| 5 | L6 self-service delete or accepted waiver for **public**? | ✅ full or explicit public waiver | ⚠️ pilot waiver only |
| 6 | O5 Apple/iCal verified or public waiver? | ✅ | ⚠️ pilot waiver only |
| 7 | GAP-04 `AUTO_APPLY_SUBMIT` closed or waived? | Per policy | ⚠️ optional open |
| 8 | Copy audit BLOCKERs cleared? | ✅ | ⚠️ MEDIUM fixed; public still ops-blocked |
| 9 | O7 backup drill PASS? | ✅ | ✅ |
| 10 | Incident + launch runbooks current? | ✅ | ✅ (this doc) |
| 11 | Founder explicit **public** GO line in evidence log? | ✅ | ❌ **NO-GO** |

| Audience | Verdict |
| -------- | ------- |
| **Public launch** | **NO-GO** |
| **Controlled pilot** | **GO** (with § C–D monitoring) |
| **Investor / CTO demo** | **GO** (curated) |
| **Auto-apply / delegated** | **PAUSED / NOT LIVE** |

**Next mandatory milestone:** S2 rollup at `2026-06-05T14:18:33Z` → founder **HOLD RO** vs enforce decision per `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`.

---

## M — Hard bans honoured (agent / automation)

- ✅ Docs only — no code, env, deploy, DB, migrations, Railway restart
- ✅ No CSP enforce flip · no S2 PASS · no public launch GO
- ✅ No scrape · no apply · no trigger-sweep · no secrets in docs
- ✅ No delegated live · no KYC/legal “go live” beyond existing waivers
- ✅ No `.vercel/` or `.env` in commits

---

## N — Related docs

| Doc | Purpose |
| --- | ------- |
| `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` | Gate-by-gate status |
| `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` | Operator GO/NO-GO rows |
| `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` | LIVE vs BLOCKED capabilities |
| `docs/PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md` | Marketing claim safety |
| `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` | S0–S3 incident procedures |
| `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | Daily pilot rhythm |
| `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` | Active burn-in window |
| `docs/AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` | Pause options |
| `docs/GDPR_MANUAL_DSR.md` | Manual erasure |
| `docs/DEPLOY_VERIFICATION_CHECKLIST.md` | Post-deploy verification |

---

## Files

- `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` (this doc)
