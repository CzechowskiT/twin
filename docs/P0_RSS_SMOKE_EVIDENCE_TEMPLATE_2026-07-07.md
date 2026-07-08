# P0 RSS Smoke Evidence — Fill-In Template — 2026-07-07

**Status:** **BLANK TEMPLATE** — founder fills after manual smoke execution  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**  
**Related:** [RSS smoke runbook](./P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07.md) · [P0 closure checklist](./P0_CLOSURE_CHECKLIST_2026-07-07.md) · [P0 closure decision template](./P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md)

---

## 1. Instructions

1. Execute the [P0 multitab RSS manual smoke runbook](./P0_MULTITAB_RSS_SMOKE_RUNBOOK_2026-07-07.md) on production.
2. Copy this template to `docs/evidence/p0-rss-smoke-YYYYMMDD/P0_RSS_SMOKE_EVIDENCE_YYYYMMDD.md` (local, gitignored) **or** a dated founder record.
3. Fill every field below. Do **not** claim P0 CLOSED or Launch GO from this evidence alone.

---

## 2. Run metadata

| Field | Value |
|-------|-------|
| **Date / time (UTC+offset)** | `YYYY-MM-DD HH:MM TZ` |
| **Operator** | `[founder name]` |
| **Machine** | `[model, chip, total RAM, macOS version]` |
| **Browser / version** | `Google Chrome [version from chrome://version]` |
| **Production URL** | `https://twin-sooty.vercel.app` |
| **Profile** | `[ ] Incognito` · `[ ] Dedicated test profile` |

---

## 3. Route list and tab count

**Tab count must be 8–12** (protocol requirement per runbook §6).

| Field | Value |
|-------|-------|
| **Number of tabs opened** | `[8–12]` |
| **Within 8–12 range?** | `[ ] YES` · `[ ] NO (protocol violation → FAIL)` |

### Routes opened (in order)

| Tab # | Route | Persona lane |
|-------|-------|--------------|
| 1 | `/dashboard` | |
| 2 | `/dashboard/jobs` | |
| 3 | `/dashboard/matches` | |
| 4 | `/profile` | |
| 5 | `/recruiter` | |
| 6 | `/recruiter/candidates/demo-candidate-001` | |
| 7 | `/recruiter/jobs/demo-role-001/pipeline` | |
| 8 | `/company/dashboard` | |
| 9 | `/company/candidates/demo-candidate-001` | |
| 10 | `/company/roles/demo-role-001/pipeline` | |
| 11 | *(optional)* | |
| 12 | *(optional)* | |

---

## 4. RSS / CPU metrics

Record per runbook §8 at T1 end (baseline), T3 end (peak soak), T5 end (final).

| Phase | Timestamp | Aggregate Chrome RSS | Highest renderer RSS | Chrome CPU % | Notes |
|-------|-----------|----------------------|----------------------|--------------|-------|
| **Baseline** (T1 end) | | `___ MB / GB` | `___ MB / GB` | `___ %` | |
| **Peak** (T3 end) | | `___ MB / GB` | `___ MB / GB` | `___ %` | |
| **Final** (T5 end) | | `___ MB / GB` | `___ MB / GB` | `___ %` | |

### Pass thresholds (reference)

| Criterion | Threshold | Met? |
|-----------|-----------|------|
| Per-renderer RSS ≤ 1.5 GB (T3/T5) | ≤ 1.5 GB | `[ ] YES` · `[ ] NO` |
| Aggregate Chrome RSS ≤ 8 GB (16 GB machine) | ≤ 8 GB | `[ ] YES` · `[ ] NO` |

---

## 5. Responsiveness notes

| Phase | Tab switch to interactive | Sluggish tabs? | Notes |
|-------|---------------------------|----------------|-------|
| T2 (5 s per tab) | `___ s max` | `[ ] None` · `[ ] List:` | |
| T4 (rapid flip) | `___ s max` | `[ ] None` · `[ ] List:` | |

- `[ ] No permanent blank workspace shell (>8 s)`
- `[ ] Workspace strip static (not animated marquee)`

---

## 6. Console errors

| Tab / route | Errors | Warnings | Critical (`page-error`, uncaught)? |
|-------------|--------|----------|-------------------------------------|
| | `___` | `___` | `[ ] YES` · `[ ] NO` |

**Total critical console errors:** `___`  
`[ ] Zero critical errors (PASS)` · `[ ] Critical errors present (FAIL)`

---

## 7. Crashes / OOM

| Event | Occurred? |
|-------|-----------|
| Browser OOM | `[ ] NO` · `[ ] YES` |
| Tab crash ("Aw, snap!") | `[ ] NO` · `[ ] YES` |
| Chrome "tab slow" warning | `[ ] NO` · `[ ] YES` |

---

## 8. Evidence attachments

| # | Evidence | Attached? | Filename |
|---|----------|-----------|----------|
| E1 | Activity Monitor — RSS at T3 end | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-T3-end-activity-monitor.png` |
| E2 | Activity Monitor — RSS at T5 end | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-T5-end-activity-monitor.png` |
| E3 | Chrome version screenshot | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-chrome-version.png` |
| E4 | `public-health` JSON | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-public-health.json` |
| E5 | Console summary | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-console-summary.png` |
| E6 | Tab bar (all routes visible) | `[ ] YES` · `[ ] NO` | `p0-rss-smoke-YYYYMMDD-tab-bar.png` |

**Screenshots attached:** `[ ] YES (all required)` · `[ ] NO (incomplete)`  
**public-health JSON attached:** `[ ] YES` · `[ ] NO`

`frontend_commit` from public-health: `_______________`

---

## 9. Pass / fail result

| Outcome | Selected |
|---------|----------|
| **PASS** — all runbook §9 criteria met | `[ ]` |
| **FAIL** — any runbook §9 fail trigger | `[ ]` |
| **ABORT** — runbook §11 abort condition | `[ ]` |

**Outcome label:** `PASS` / `FAIL` / `ABORT` *(circle one after smoke)*

---

## 10. Founder review

| Field | Value |
|-------|-------|
| **Evidence reviewed by** | `[founder name]` |
| **Review date** | `YYYY-MM-DD` |
| **GB-scale RSS regression absent?** | `[ ] YES` · `[ ] NO` · `[ ] N/A (ABORT)` |
| **Founder notes** | |

---

## 11. P0 closure recommendation (not a decision)

This section records a **recommendation only**. P0 closure requires a separate [closure decision record](./P0_CLOSURE_DECISION_TEMPLATE_2026-07-07.md).

| Recommendation | Selected |
|----------------|----------|
| Evidence supports moving toward P0 closure review | `[ ]` |
| Evidence does **not** support P0 closure (FAIL/ABORT/incomplete) | `[ ]` |
| Insufficient evidence — complete attachments first | `[ ]` |

**Explicit statement:** This evidence template does **not** close P0. P0 remains **OPEN** until founder signs the closure decision template.

---

## 12. Launch stance footer

**Launch: NO-GO** · **P0: OPEN** · **Gate F: PENDING**

No P0 CLOSED. No Launch GO. No Gate F YES claimed by this evidence template.
