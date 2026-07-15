# Demo Interactive Motion + Audio Evidence — 2026-07-15

**Type:** Interactive flow rebuild + ambient audio + duration/harness fixes — **not launch approval**  
**Baseline:** PR #482 @ `7118f735` · PR #483 @ `d4efe3ac` (**MERGED**)  
**Prod URL:** https://twin-society.vercel.app/demo  
**Gate F:** PENDING · **Launch:** NO-GO · **LB-107:** CLOSED · **Railway:** NONE

**Related:** [Demo Founder Review Evidence 2026-07-14](./DEMO_FOUNDER_REVIEW_EVIDENCE_2026-07-14.md)

---

## Source of truth

| Field | Value |
|-------|-------|
| repo_head | `d4efe3ac` + lokalne poprawki duration/harness/e2e |
| prod_frontend_commit | `cddcfac31a2a48a6b892734814fa1bef368da104` |
| prod_api_commit | `ae14bfb58fc0c2db56a6fa0f417ca41c534b7960` |
| alignment_status | **PARTIAL** — prod FE +1 commit vs lokalny HEAD; treść #483 live |
| docs_only_drift | NO |

---

## PR and CI

| Item | Status |
|------|--------|
| PR #483 | **MERGED** @ `d4efe3ac` — bez re-merge |
| CI #483 | security-regression PASS · smoke PASS · Vercel SUCCESS |
| Duration fix | Lokalnie: `test:real-video-demo` 42→45s, ffprobe ±0.25s EN+PL |

---

## Interactive Candidate / Recruiter / Company

| Role | EN desktop | PL desktop | EN mobile | PL mobile |
|------|------------|------------|-----------|-----------|
| Candidate | PASS | PASS | PASS (retry) | PASS |
| Recruiter | PASS | PASS | PASS | PASS |
| Company | PASS | PASS | PASS | PASS |

`test:interactive-demo-flow-browser` prod: **13/13 PASS**.

---

## Audio assets

| Asset | Prod HEAD |
|-------|-----------|
| `/demo/twin-demo-ambient.mp3` | 200 |
| `/demo/twin-demo-ambient.ogg` | 200 |

---

## Audio browser behavior

| Check | Result |
|-------|--------|
| preload=none | PASS |
| No autoplay | PASS |
| Gesture-gated toggle | PASS |
| Disabled under save-data | PASS |

---

## Video blank-frame fix

| Check | Result |
|-------|--------|
| MP4-first | PASS (24/24) |
| Prod duration | **45.056s** |
| Frame audit t=0 | **3/24 FAIL** (light surface, brak underlay w DOM) |
| Frame audit t≥0.25s | **PASS** |
| `demo:video:visual-validate` | PASS |

---

## Production verification

| Check | Result |
|-------|--------|
| `smoke:demo-founder-review-prod` | **18/18 PASS** |
| `verify:production-v3:077` | PASS |
| `probe:prod-public` ×2 | **220/220 PASS** |

---

## Final regression

| Test | Result |
|------|--------|
| `test:real-video-demo` | PASS (po fix 45s) |
| `test:interactive-demo-guard` | PASS |
| `test:interactive-demo-visual-change` | PASS |
| `test:demo-audio-validate` | PASS |
| `test:real-video-demo-browser` prod | PARTIAL 8/12 (stale selector — naprawiony lokalnie) |

---

## Cleanup

Lokalne poprawki niezacommitowane; artefakty w `reports/` — evidence only.

---

## Final decision

| Field | Value |
|-------|-------|
| Launch GO | **NO** |
| Gate F YES | **NO** |
| #483 merged | **YES** |
| Duration 45s | **YES** (prod 45.056s) |
| All 32 criteria | **NO** |
| Batch status | **PARTIAL** |
