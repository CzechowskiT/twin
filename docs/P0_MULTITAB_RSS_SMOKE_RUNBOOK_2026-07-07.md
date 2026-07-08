# P0 Multitab RSS Manual Smoke Runbook — 2026-07-07

**Status:** **READY FOR FOUNDER EXECUTION** — not yet run  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Gate F:** **PENDING**  
**Related:** [P0 browser memory incident](./P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md) · [Gate E attempt 19](./gate-e-phase3b-attempt19-result-2026-07-06.md) · [Gate F re-audit result](./GATE_F_REAUDIT_RESULT_2026-07-07.md) · [P0 closure checklist](./P0_CLOSURE_CHECKLIST_2026-07-07.md)

---

## 1. Objective

Validate **real Chrome RSS memory and responsiveness** on production workspace routes with **8–12 tabs open**, using the same route set that passed Gate E Phase 3B attempt 19 (CDP heap harness). This smoke closes the **measurement gap** documented in [P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md](./P0_PRODUCTION_STUCK_ROUTES_RENDERER_MEMORY_2026-06-16.md): CDP heap PASS does **not** prove absence of GB-scale RSS regression in normal Chrome.

**This runbook does not close P0.** Evidence from a completed run feeds the [P0 closure checklist](./P0_CLOSURE_CHECKLIST_2026-07-07.md) and requires separate founder approval.

---

## 2. Prerequisites

| # | Requirement | How to verify |
|---|-------------|---------------|
| 1 | Gate E Phase 3B **PASS 20/20** (attempt 19) | [gate-e-phase3b-attempt19-result-2026-07-06.md](./gate-e-phase3b-attempt19-result-2026-07-06.md) — run `28849996684`, SHA `80d981c` |
| 2 | Prod frontend aligned to attempt 19 SHA (or later docs-only) | `curl -s https://twin-sooty.vercel.app/api/public-health \| jq '.frontend_commit'` — prefix `80d981c` or scaffold HEAD |
| 3 | `public-health` OK | `status=ok`, `db_ok=true` |
| 4 | Founder machine with **Google Chrome** (not headless, not Playwright) | See §3 |
| 5 | Activity Monitor (macOS) or equivalent process monitor | RSS per Chrome renderer process |
| 6 | No other heavy Chrome profiles / extensions skewing memory | Incognito or dedicated profile recommended |
| 7 | **No prod mutation** — read-only browsing only | Do not submit forms, change settings, or trigger writes |

**Hard bans for this run:** NO Playwright, NO Gate E rerun, NO backend/API deploys, NO claiming P0 CLOSED or Launch GO from this run alone.

---

## 3. Production URL and browser

| Field | Value |
|-------|-------|
| **Production base URL** | `https://twin-sooty.vercel.app` |
| **Health check** | `https://twin-sooty.vercel.app/api/public-health` |
| **Browser** | **Google Chrome** (stable channel) |
| **Minimum version** | Chrome **120+** (record exact version: `chrome://version`) |
| **Platform** | macOS (founder machine) — record OS version |
| **Profile** | Fresh Incognito window **or** dedicated test profile (record which) |

---

## 4. Hardware assumptions

| Assumption | Rationale |
|------------|-----------|
| Apple Silicon Mac (M-series) or Intel Mac with **≥16 GB RAM** | Incident baseline was 3–6 GB **per renderer** on founder hardware |
| Normal thermal state (not throttling from prior stress) | CPU readings must be representative |
| Single display, no external GPU anomalies | Simplifies reproducibility |
| Wi-Fi or wired network stable | Exclude connectivity as failure cause |

Record in evidence: machine model, chip, total RAM, macOS version, Chrome version.

---

## 5. Route sequence (Phase 3B workspace routes — attempt 19)

Open tabs **in order** (stagger **500–1000 ms** between opens). Use **10 tabs** (within 8–12 range) covering all persona lanes:

| Tab # | Route | Persona lane |
|-------|-------|--------------|
| 1 | `https://twin-sooty.vercel.app/dashboard` | Candidate workspace |
| 2 | `https://twin-sooty.vercel.app/dashboard/jobs` | Candidate workspace |
| 3 | `https://twin-sooty.vercel.app/dashboard/matches` | Candidate workspace |
| 4 | `https://twin-sooty.vercel.app/profile` | Candidate workspace |
| 5 | `https://twin-sooty.vercel.app/recruiter` | Recruiter workspace |
| 6 | `https://twin-sooty.vercel.app/recruiter/candidates/demo-candidate-001` | Recruiter workspace |
| 7 | `https://twin-sooty.vercel.app/recruiter/jobs/demo-role-001/pipeline` | Recruiter workspace |
| 8 | `https://twin-sooty.vercel.app/company/dashboard` | Company workspace |
| 9 | `https://twin-sooty.vercel.app/company/candidates/demo-candidate-001` | Company workspace |
| 10 | `https://twin-sooty.vercel.app/company/roles/demo-role-001/pipeline` | Company workspace |

**Optional tabs (11–12)** if expanding to 12: `/recruiter/candidates/demo-candidate-001/trust`, `/company/candidates/demo-candidate-001/team`.

**Alternate full 20-route set:** Gate E attempt 19 validated all 20 routes individually; this smoke uses a **representative 10-tab subset** across candidate/recruiter/company lanes. Full route list: [attempt 19 §2.1](./gate-e-phase3b-attempt19-result-2026-07-06.md).

---

## 6. Tab count

| Parameter | Value |
|-----------|-------|
| **Minimum tabs** | **8** |
| **Target tabs** | **10** (default sequence above) |
| **Maximum tabs** | **12** |

Do not exceed 12 tabs. Do not run fewer than 8.

---

## 7. Waiting periods and interaction protocol

| Phase | Duration | Action |
|-------|----------|--------|
| **T0 — Open** | Stagger 500–1000 ms per tab | Open all tabs in sequence; leave **tab 1** foreground during opens |
| **T1 — Initial settle** | **30 s** | Background all tabs except tab 1; do not interact |
| **T2 — Foreground rotate** | **5 s per tab** | Switch to each tab 1→N; note paint time and console |
| **T3 — Background soak** | **60 s** | Background all tabs; record RSS/CPU at T3 start and end |
| **T4 — Re-foreground stress** | **3 s per tab** | Rapidly flip through all tabs; note sluggishness |
| **T5 — Final settle** | **30 s** | Leave tab 1 foreground; final RSS/CPU snapshot |

**Total wall time:** ~4–6 minutes.

**During soak:** Do not scroll, click, or reload unless testing responsiveness in T4.

---

## 8. Metrics to record

| Metric | How to capture | When |
|--------|----------------|------|
| **RSS memory** | Activity Monitor → Chrome "Renderer" processes → Memory column (MB/GB) | T1 end, T3 start, T3 end, T5 end |
| **CPU %** | Activity Monitor → Chrome processes | T3 end, T5 end |
| **Responsiveness** | Subjective: tab switch to interactive paint | T2, T4 (record seconds) |
| **Console errors** | DevTools → Console (per tab at T2) | Count errors + warnings; note `page-error` |
| **Crashes** | Chrome "Aw, snap!" or tab reload | Any phase |
| **Browser OOM** | Chrome kills tab or shows out-of-memory | Any phase |
| **"Tab slow" warning** | Chrome infobar | Any phase |
| **Visual regressions** | Blank shell >8 s, animated marquee on workspace | T2 |

Record **per-tab RSS** (highest renderer associated with each tab if identifiable) and **aggregate Chrome RSS**.

---

## 9. Pass / fail criteria

### PASS (all must hold)

| # | Criterion |
|---|-----------|
| P1 | **8–12 tabs** opened on prod routes per §5–6 |
| P2 | **No browser OOM** and **no tab crashes** |
| P3 | **No Chrome "tab slow" warnings** |
| P4 | **Per-renderer RSS ≤ 1.5 GB** at T3 end and T5 end (steady state) — no GB-scale regression vs pre-fix incident (3–6 GB/tab) |
| P5 | **Aggregate Chrome RSS ≤ 8 GB** on 16 GB machine (scale proportionally if >16 GB RAM) |
| P6 | **Tab switch to interactive ≤ 3 s** for every tab at T2 (≤ 5 s at T4 rapid flip) |
| P7 | **No permanent blank workspace shell** (>8 s without content, skeleton, or auth gate) |
| P8 | **Zero critical console errors** (`page-error`, uncaught exceptions) on workspace tabs |
| P9 | **Workspace strip** shows static 6-logo strip (not full animated marquee) on workspace routes |

### FAIL (any triggers FAIL)

| # | Criterion |
|---|-----------|
| F1 | Any renderer RSS **> 1.5 GB sustained** (>30 s) at T3 or T5 |
| F2 | Aggregate Chrome RSS **> 8 GB** (16 GB machine) or **>50% total RAM** |
| F3 | Chrome **"tab slow"** warning |
| F4 | **Browser OOM** or tab crash |
| F5 | Tab switch **> 8 s** to interactive on any tab |
| F6 | **Permanent blank** workspace route |
| F7 | **Critical console error** on any workspace tab |
| F8 | **< 8 or > 12 tabs** used (protocol violation) |

**Outcome labels:** `PASS`, `FAIL`, or `ABORT` (see §11).

---

## 10. Screenshots and evidence required

| # | Evidence | Filename pattern |
|---|----------|------------------|
| E1 | Activity Monitor — RSS at T3 end | `p0-rss-smoke-YYYYMMDD-T3-end-activity-monitor.png` |
| E2 | Activity Monitor — RSS at T5 end | `p0-rss-smoke-YYYYMMDD-T5-end-activity-monitor.png` |
| E3 | Chrome version (`chrome://version`) | `p0-rss-smoke-YYYYMMDD-chrome-version.png` |
| E4 | `public-health` JSON (frontend_commit) | `p0-rss-smoke-YYYYMMDD-public-health.json` |
| E5 | Console summary (one composite or per-tab) | `p0-rss-smoke-YYYYMMDD-console-summary.png` |
| E6 | Tab bar showing all open routes | `p0-rss-smoke-YYYYMMDD-tab-bar.png` |
| E7 | Metrics table (founder-filled) | `p0-rss-smoke-YYYYMMDD-metrics.md` |

Store evidence under: `docs/evidence/p0-rss-smoke-YYYYMMDD/` (gitignored local folder) **or** attach to founder decision record. Do not commit secrets.

### Evidence file naming convention

```
p0-rss-smoke-{YYYYMMDD}-{phase}-{descriptor}.{png|json|md}
```

Examples:

- `p0-rss-smoke-2026-07-07-T3-end-activity-monitor.png`
- `p0-rss-smoke-2026-07-07-metrics.md`
- `p0-rss-smoke-2026-07-07-public-health.json`

---

## 11. Rollback and abort conditions

**ABORT immediately (do not claim PASS or FAIL):**

| Condition | Action |
|-----------|--------|
| `public-health` not `ok` / `db_ok=false` | Stop; file infra issue — no P0 signal |
| `frontend_commit` mismatch (not attempt 19 SHA or later scaffold) | Stop; align prod first |
| Founder machine unstable (thermal throttle, <8 GB RAM free) | Reschedule |
| Unrelated Chrome extension interference | Disable extensions or use Incognito |
| Network outage / 5xx on routes | Stop; not a performance signal |

**On FAIL:** Do **not** close P0. File evidence, open engineering follow-up. Launch remains **NO-GO**.

**On PASS:** Update [P0 closure checklist](./P0_CLOSURE_CHECKLIST_2026-07-07.md) RSS smoke checkbox only. **P0 closure still requires founder approval** — see checklist.

**This runbook does not grant Launch GO or Gate F YES.**

---

## 12. Post-run checklist

- [ ] Metrics table completed (`p0-rss-smoke-YYYYMMDD-metrics.md`)
- [ ] All required screenshots attached (§10)
- [ ] Outcome recorded: PASS / FAIL / ABORT
- [ ] [P0_CLOSURE_CHECKLIST_2026-07-07.md](./P0_CLOSURE_CHECKLIST_2026-07-07.md) updated (RSS smoke + evidence checkboxes)
- [ ] **No P0 CLOSED** or **Launch GO** claimed in any doc

---

## 13. Launch stance footer

**Launch: NO-GO** · **P0: OPEN** · **Gate F: PENDING**

No P0 CLOSED. No Launch GO. No Gate F YES. **Launch GO remains separate** from P0 closure. RSS smoke PASS is necessary evidence toward P0 closure, not sufficient alone.
