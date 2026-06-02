# Auto-apply production ops pause plan — 2026-06-02

**Role:** TWIN Auto-Apply Production Ops Pause Planner (docs-only)  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Context:** Safety fix `e764e68` **live** on prod via merge `6382a91` (PR #21). GAP-01/02 **closed** in code. Operational stance: auto-apply **PAUSED**, delegated **NOT LIVE**, public launch **NO-GO**, S2 burn-in **IN PROGRESS**.

**This document does not change production.** Founder executes Railway steps only after explicit approval.

**Hard bans (planner session):** no env changes, deploy, Railway restart, migrations, prod DB mutation, scrape/apply/sweep, secrets, S2 PASS, public launch GO.

---

## 1. Current production state (read-only evidence)

**Source:** `GET https://twin-sooty.vercel.app/api/public-health` (2026-06-02 planner session)

| Signal | Value |
| ------ | ----- |
| `status` / `db_ok` | `ok` / `true` |
| `git_commit` | `6382a918882664df0076d996ca65c08e9138536a` (includes `e764e68`) |
| `validated_jobs` | `652` |
| `market_coverage_active_validated` | `2579` |
| `scrape_worker_ready` | `true` |
| `celery.worker_active` | `true` |
| `celery.broker_configured` | `true` |
| **`celery.nightly_auto_apply_beat_enabled`** | **`true`** ← GAP-03 |
| `celery.beat_schedule_has_nightly` | `true` |
| `celery.celery_task_always_eager` | `false` |

**Code defaults** (`backend/app/config.py`): `nightly_auto_apply_beat_enabled=True`, `auto_apply_submit=True`.

**Inferred:** Nightly beat is **scheduled** on prod (02:00 Europe/Warsaw per `nightly_auto_apply_hour/minute`). Per-job Playwright path can **submit** to portals when called and gates pass.

**Already enforced in code (no env required):**

- `enforce_autonomous_apply_allowed()` on `POST /applications/auto-apply` (403)
- `POST /auto-apply/trigger` — **ops allowlist only**
- `delegated_apply_allowed` / `can_submit_delegated_application` — always **false**

---

## 2. Environment variables — what they control

Pydantic `Settings` loads from process env (Railway variables). Names are **case-insensitive**; use uppercase in Railway UI.

| Variable | Default (code) | Read by | Effect when `false` |
| -------- | -------------- | ------- | --------------------- |
| `NIGHTLY_AUTO_APPLY_BEAT_ENABLED` | `true` | **API** (health), **Worker** (beat schedule + task guard) | Beat entry `nightly-auto-apply` **not** added in `celery_app.py`; `nightly_auto_apply_sweep` returns `{"skipped": true, "reason": "beat_disabled"}` if invoked |
| `AUTO_APPLY_SUBMIT` | `true` | **API** (and worker if per-job apply runs there) | `POST /applications/auto-apply` fills forms but **does not** click final portal submit (prepare / dry-run behaviour) |
| `NIGHTLY_AUTO_APPLY_HOUR` / `MINUTE` | `2` / `0` | Worker beat | Schedule time (Europe/Warsaw label in UI; stored as crontab UTC on worker) |
| `CELERY_TASK_ALWAYS_EAGER` | `false` (prod) | API + worker | Must stay **false** on prod for real async; do not toggle for pause |

**Frontend (Vercel):** No env vars for nightly beat or `AUTO_APPLY_SUBMIT`. Pause is **backend-only**.

**Which Railway services to touch:**

| Service | Variables (pause) | Why |
| ------- | ----------------- | --- |
| **Worker** (+ beat if separate) | `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` | Beat schedule and sweep execution |
| **API** | Same + optional `AUTO_APPLY_SUBMIT=false` | Health reflects flag; per-job auto-apply runs on API process |
| **Frontend (Vercel)** | None | — |

After env changes, Railway typically **redeploys** the affected service (counts as deploy/restart — founder-initiated only).

---

## 3. Options (founder decision)

### Option A — Disable nightly beat only (GAP-03)

**Set:** `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` on **Worker** and **API** (keep values in sync).

| Pros | Cons |
| ---- | ---- |
| Stops scheduled mass sweep at 02:00 | Per-job `POST /applications/auto-apply` can still **submit** if a user triggers prepare |
| Aligns health with policy (`beat_schedule_has_nightly: false`) | Requires worker/API reload (redeploy) to pick up beat schedule |
| Smallest change for “no autonomous while I sleep” | Consent rows stay active; ops trigger-sweep still possible for allowlisted accounts |

**Best when:** You trust server gates + low consent volume; only nightly automation is the worry.

---

### Option B — Beat off + prepare-only submit (GAP-03 + GAP-04) — **recommended**

**Set:**

- `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` (Worker + API)
- `AUTO_APPLY_SUBMIT=false` (API; set on Worker too if workers ever run `auto_apply_for_user` directly)

| Pros | Cons |
| ---- | ---- |
| Strongest **PAUSED** posture without code deploy | Users with consent see “active” UI but no nightly runs; per-job becomes package-only |
| Matches launch **NO-GO** / pilot safety narrative | Must communicate that “prepare” does not mean “submitted on portal” |
| Server gates (`e764e68`) remain as second line of defense | Still does not disable consent storage or ops paths |

**Best when:** Public launch window, S2 burn-in, and founder want **zero** accidental portal submissions from TWIN automation.

---

### Option C — No env change (policy-only **PAUSED**)

**Set:** nothing.

| Pros | Cons |
| ---- | ---- |
| No Railway touch; no redeploy | Prod health shows `nightly_auto_apply_beat_enabled: true` |
| Code gates already live | Any user with consent + readiness could get nightly apply or per-job submit |
| Fine for curated pilot with manual monitoring | Weakest alignment with “auto-apply PAUSED” label |

**Best when:** Immediate risk is low (no prod consents / no ready users) and founder accepts monitoring until S2 closes.

---

## 4. Recommendation

**Option B** for the current **public NO-GO** window:

1. Nightly beat **ON** on prod contradicts **PAUSED** (GAP-03).
2. `AUTO_APPLY_SUBMIT=true` allows portal submit on per-job path even with readiness gates (GAP-04).
3. Code gates (`e764e68`) are necessary but not sufficient for ops **PAUSED**.

Revert to Option C only if founder confirms **zero** active consents and accepts 02:00 sweep risk.

---

## 5. Railway checklist (founder — do not run from agent)

**Pre-flight**

- [ ] Confirm public launch still **NO-GO** and S2 **NOT READY**
- [ ] Note current `public-health` celery block (baseline screenshot or curl)
- [ ] Ensure no in-flight manual `trigger-sweep` / ops testing

**Variables (Option B example)**

1. Open [Railway](https://railway.app) → project **twin** (production).
2. **Worker** service → **Variables** → add or edit:
   - `NIGHTLY_AUTO_APPLY_BEAT_ENABLED` = `false`
   - (optional mirror) `AUTO_APPLY_SUBMIT` = `false`
3. **API** service → **Variables** → same keys and values.
4. Save — allow Railway to **redeploy** worker (and API if vars changed there).
5. Do **not** change database, run migrations, or scale services to zero unless incident runbook says so.

**Post-change validation (read-only)**

```bash
curl -sS "https://twin-sooty.vercel.app/api/public-health" | python3 -m json.tool
```

| Expect | Option A | Option B |
| ------ | -------- | -------- |
| `celery.nightly_auto_apply_beat_enabled` | `false` | `false` |
| `celery.beat_schedule_has_nightly` | `false` | `false` |
| `git_commit` | unchanged unless separate deploy | unchanged unless separate deploy |

Optional (founder token):

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health/celery-status"
```

**Morning after 02:00 Europe/Warsaw**

- [ ] Worker logs: **no** `nightly_auto_apply_sweep` (or log line `skipped (beat disabled)`)
- [ ] No unexpected new `auto_apply_runs` rows for that night (read-only SQL if founder uses DB console)

**Do not** run `POST /auto-apply/trigger`, `trigger-sweep`, or `POST /applications/auto-apply` against prod for validation.

---

## 6. Rollback

To restore pre-pause behaviour (only when launch gates allow):

| Variable | Rollback value |
| -------- | -------------- |
| `NIGHTLY_AUTO_APPLY_BEAT_ENABLED` | `true` |
| `AUTO_APPLY_SUBMIT` | `true` |

Apply on **Worker + API**, redeploy, re-run `public-health` curl. Reconfirm consent volume and S2 status before re-enabling.

---

## 7. What this plan does not do

- Does not flip S2 CSP enforce or claim S2 PASS
- Does not enable delegated apply or public launch
- Does not replace legal/consent review or pilot manual
- Does not modify repo code defaults (avoids surprise dev/test drift)

---

## Related

- `docs/NIGHTLY_AUTO_APPLY_DEPLOY.md` — launch pause summary
- `docs/AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md` — GAP register
- `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md` — prod SHA evidence
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` — emergency beat stop
- `backend/app/services/autonomous_apply_policy.py` — server gates
