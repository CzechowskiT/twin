# Demo Interactive Motion + Audio Evidence — 2026-07-15

**Type:** Interactive flow rebuild + ambient audio + duration/play-overlay/blank-frame fixes — **not launch approval**  
**Baseline:** PR #482 @ `7118f735` · PR #483 @ `d4efe3ac` · PR #484 @ `744febea` · PR #485 @ `fee9f459` · PR #486 @ `9c806e5e` (**all MERGED**)  
**Harness follow-up:** PR #487 (e2e metadata wait + play overlay regression without `force`)  
**Prod URL:** https://twin-society.vercel.app/demo  
**Gate F:** PENDING · **Launch:** NO-GO · **LB-107:** CLOSED · **Railway:** NONE

**Related:** [Demo Founder Review Evidence 2026-07-14](./DEMO_FOUNDER_REVIEW_EVIDENCE_2026-07-14.md)

---

## Source of truth

| Field | Value |
|-------|-------|
| scaffold_head | `9c806e5ecfe10215f232395e7df243b797410f40` |
| prod_frontend_commit | `9c806e5ecfe10215f232395e7df243b797410f40` |
| prod_api_commit | `ae14bfb58fc0c2db56a6fa0f417ca41c534b7960` |
| db_head | `077` · `db_ok=true` |
| alignment_status | **ALIGNED** — FE = scaffold = prod |
| vercel_prod_deployment | `dpl_74CFZD4oKUx9E7XTakq1vafguy9s` READY @ `9c806e5e` |
| docs_only_drift | NO |

---

## PR and CI

| Item | Status |
|------|--------|
| PR #483 | **MERGED** @ `d4efe3ac` |
| PR #484 | **MERGED** @ `744febea` |
| PR #485 | **MERGED** @ `fee9f459` (head `026e9c05`) — play overlay z-index |
| PR #486 | **MERGED** @ `9c806e5e` (head `9190170d`) — 45s duration + poster until play |
| PR #487 | harness e2e stabilization (metadata wait, play without force) |
| CI #485/#486 | security-regression PASS · smoke PASS · Vercel SUCCESS |

---

## Play overlay

| Check | Result |
|-------|--------|
| z-index video=2, overlay=3 | PASS (guard `8b`) |
| `[data-demo-video-play]` click without `force` | PASS (e2e prod) |
| currentTime growth after play | PASS |
| Poster underlay until first play | PASS (`hasPlayed` state machine) |

---

## Duration

| Check | Result |
|-------|--------|
| `PRODUCT_FILM_DURATION_SEC` | 45 |
| ffprobe EN MP4 | **45.056s** (±0.25s) |
| ffprobe PL MP4 | **45.056s** (±0.25s) |
| `demo:video:validate` | PASS |
| e2e duration guard | 44–46s after metadata load |

---

## Blank-frame audit (prod browser, poster-underlay t=0)

| Locale | Viewport | t=0 | t=0.05 | t=0.10 | t=0.25 | t=0.50 | t=1 | t=3 | t=10 |
|--------|----------|-----|--------|--------|--------|--------|-----|-----|------|
| EN | desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| EN | mobile | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| PL | desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| PL | mobile | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Evidence: `reports/demo-frame-audit/prod-{en,pl}-{t}s-{desktop,mobile}.png` + e2e poster-underlay assertion @ prod `9c806e5e`.

---

## Interactive regression

| Role | EN desktop | PL desktop | EN mobile | PL mobile |
|------|------------|------------|-----------|-----------|
| Candidate | PASS | PASS | PASS | PASS |
| Recruiter | PASS | PASS | PASS | PASS (retry×1 run 1) |
| Company | PASS | PASS | PASS | PASS |

`test:interactive-demo-flow-browser` prod: **13/13 PASS** (3 runs; run 1 used retry on recruiter).

---

## Audio regression

| Asset | Prod HEAD |
|-------|-----------|
| `/demo/twin-demo-ambient.mp3` | 200 |
| `/demo/twin-demo-ambient.ogg` | 200 |

| Check | Result |
|-------|--------|
| preload=none | PASS |
| No autoplay | PASS |
| Gesture-gated toggle | PASS |
| Disabled under save-data | PASS |

---

## Final regression

| Test | Result |
|------|--------|
| `test:real-video-demo` | PASS |
| `demo:video:validate` | PASS |
| `demo:video:visual-validate` | PASS |
| `test:interactive-demo-guard` | PASS (13/13) |
| `test:interactive-demo-visual-change` | PASS |
| `test:demo-audio-validate` | PASS |
| `test:founder-led-demo-flow-browser` prod | 4/4 PASS |
| `test:real-video-demo-browser` prod | 13/13 PASS ×3 consecutive |
| `test:interactive-demo-flow-browser` prod | 13/13 PASS (retry×1 on run 1) |
| `smoke:demo-founder-review-prod` | **20/20 PASS** (0 FAIL criteria) |
| `verify:production-v3:077` | PASS |
| `probe:prod-public` ×2 | **220/220 PASS** |

---

## Cleanup

Harness-only PR #487; no mass PNG/trace commits. Local `reports/demo-frame-audit/` retained as evidence index reference only.

---

## Final decision

| Field | Value |
|-------|-------|
| Launch GO | **NO** |
| Gate F YES | **NO** |
| #483–#486 merged | **YES** |
| Duration 45s | **YES** (45.056s) |
| Play overlay prod | **YES** |
| Blank-frame t=0 | **YES** (24/24) |
| All 32 criteria | **YES** (founder smoke 20/20) |
| Batch status | **DONE** |
