# Demo Founder Review Evidence — 2026-07-14

**Type:** Production demo verification pack — **not launch approval**  
**Branch:** `cursor/phase1-monorepo-scaffold` @ `934cbbeb`  
**Prod URL:** https://twin-society.vercel.app/demo  
**Vercel deployment:** `dpl_GrHTLLyKi7c3HLH82LioY4z6MTgF`  
**Gate F:** PENDING · **Launch:** NO-GO

**Related:** [Gate F decision record](./GATE_F_FOUNDER_DECISION_RECORD_2026-07-09.md) · [Founder demo review package](../reports/FOUNDER_DEMO_REVIEW_PACKAGE.md) · PR #476 real video demo

---

## 1. Production identity preflight

| Check | Result | Detail |
|-------|--------|--------|
| repo_head | **PASS** | `934cbbeb9eb69b6140386ad91f6c2a28b99b0f0e` |
| prod FE SHA | **PASS** | `934cbbeb9eb69b6140386ad91f6c2a28b99b0f0e` (matches repo) |
| prod API SHA | **PASS** | `ae14bfb58fc0c2db56a6fa0f417ca41c534b7960` |
| db_ok | **PASS** | `true`, head `077` |
| public-health | **PASS** | `status=ok` |
| alignment | **ALIGNED** | FE = repo HEAD |
| Vercel READY | **PASS** | `dpl_GrHTLLyKi7c3HLH82LioY4z6MTgF` (context batch) |

### Credentials (SET/UNSET only)

| Variable | Status |
|----------|--------|
| PLAYWRIGHT_ALLOW_PROD_SMOKE | SET (batch runtime) |
| VERCEL_AUTOMATION_BYPASS_SECRET | SET |
| NEXT_PUBLIC_POSTHOG_KEY | UNSET |
| NEXT_PUBLIC_POSTHOG_HOST | UNSET |
| POSTHOG_PERSONAL_API_KEY | UNSET |

---

## 2. Real video proof (prod)

| Field | Value | Verdict |
|-------|-------|---------|
| `<video>` element | `data-demo-product-video` visible | **PASS** |
| currentSrc | `…/demo/twin-product-film-en.webm` (not blob/data) | **PASS** |
| duration | 42s (≥40) | **PASS** |
| dimensions | 1920×1080 | **PASS** |
| readyState | 4 | **PASS** |
| poster | `twin-product-film-poster-en.webp` | **PASS** |
| MP4 HEAD | 200 `video/mp4` | **PASS** |
| WebM HEAD | 200 `video/webm` | **PASS** |
| VTT HEAD | 200 `text/vtt` | **PASS** |
| playback growth | currentTime advanced after play | **PASS** |
| pause / seek / skip | controls exercised | **PASS** |
| skip → roles | `[data-sales-demo-roles]` visible | **PASS** |
| captions toggle | exercised | **PASS** |
| muted / no autoplay audio | `muted=true`, `autoplay=false` | **PASS** |
| WebKit smoke | video visible @ 1280×800 | **PASS** |

---

## 3. Visual founder acceptance (18 criteria)

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Hero EN desktop | **PASS** | `hero-EN-1920x1080.png` |
| 2 | Hero PL desktop | **PASS** | `hero-PL-1920x1080.png` |
| 3 | Hero EN mobile | **PASS** | `hero-EN-390x844.png` |
| 4 | Hero PL mobile | **PASS** | `hero-PL-390x844.png` |
| 5 | Real video element | **PASS** | `video-milestone-0s-EN.png` |
| 6 | currentSrc mp4/webm | **PASS** | prod CDN URL |
| 7 | Duration ≥40s | **PASS** | 42s |
| 8 | 1920×1080 | **PASS** | measured |
| 9 | readyState | **PASS** | 4 |
| 10 | Poster | **PASS** | webp |
| 11 | Assets HTTP 200 | **PASS** | mp4/webm/vtt/poster |
| 12 | Playback controls | **PASS** | growth + milestones |
| 13 | Complete → interactive | **PASS** | `video-complete-interactive-EN.png` |
| 14 | Candidate flow | **PASS** | `role-candidate-flow-EN-desktop.png` |
| 15 | Recruiter flow | **PASS** | `role-recruiter-flow-EN-desktop.png` |
| 16 | Company flow | **PASS** | `role-company-flow-EN-desktop.png` |
| 17 | Reduced motion | **PASS** | `a11y-reduced-motion-EN.png` |
| 18 | No autoplay audio + captions | **PASS** | muted + captions toggle |

**Aggregate:** 18/18 **PASS** — no prod demo fix required.

---

## 4. Screenshot inventory

**Path:** `reports/demo-founder-review/2026-07-14/` (20 PNG + `batch-evidence.json`)

Milestones captured @ 0, 5, 10, 18, 22, 26, 33, 38s + final interactive frame.

---

## 5. Playwright prod smoke

| Spec | Result | Notes |
|------|--------|-------|
| `real-video-demo-browser` | **PASS** | PR #476 sales demo harness |
| `founder-led-demo-flow-browser` | **PASS** | Updated to `SalesDemoExperience` selectors (`data-sales-demo-hero`, `data-demo-product-video`, `data-sales-demo-roles`) |
| `interactive-demo-a11y` | **PASS** | Axe scope `[data-sales-demo]` — prod mounts `SalesDemoExperience` |
| Viewports (6) | **PASS** | 1920×1080 … 375×667 via custom capture |
| Chromium + WebKit | **PASS** / **PASS** | |

---

## 6. Analytics events

**Classification:** **CODE_PRESENT** — event exports verified in `demo-analytics.ts`; live prod capture **not PASS** (PostHog UNSET).

| Event | Prod capture | Code export |
|-------|--------------|-------------|
| demo_video_impression | CODE_ONLY | ✓ |
| demo_video_play | CODE_ONLY | ✓ |
| demo_video_pause | CODE_ONLY | ✓ |
| demo_video_25/50/75 | CODE_ONLY | ✓ |
| demo_video_complete | CODE_ONLY | ✓ |
| demo_video_skip | CODE_ONLY | ✓ |
| demo_role_select | CODE_ONLY | ✓ |
| demo_interaction | CODE_ONLY | ✓ |
| demo_outcome | CODE_ONLY | ✓ |
| demo_cta_click | CODE_ONLY | ✓ |

PostHog not configured in agent env — events verified via static guards only; live capture **BLOCKED** (no `NEXT_PUBLIC_POSTHOG_KEY`).

**PII:** event props use locale/role/action only — no email/name fields in demo analytics exports.

---

## 7. PostHog founder dashboard

**Status:** **BLOCKED** — `NEXT_PUBLIC_POSTHOG_KEY` + `POSTHOG_PERSONAL_API_KEY` UNSET.

**Spec (not created):** Dashboard „TWIN Demo Founder Review” — funnel `demo_video_impression → play → complete → demo_role_select → demo_outcome → demo_cta_click`; breakdowns: locale, role, viewport, device; video quartiles; data-quality panel (no PII).

**Founder action:** Set PostHog credentials in `frontend/.env.local`, re-run Stage 11.

---

## 8. Final regression

| Check | Result |
|-------|--------|
| `verify:production-v3:077` | **PASS** |
| `probe:prod-public` ×2 | **220/220 PASS** |
| `test:real-video-demo` (static) | **7/7 PASS** |
| `test:interactive-demo-guard` | **12/12 PASS** — blocks legacy demo return on `/demo` |
| `founder-led-demo-flow-browser` | **PASS** — SalesDemoExperience selectors |
| `interactive-demo-a11y` | **PASS** — `[data-sales-demo]` axe scope |

---

## 9. Stance

- **Gate F:** PENDING — founder checkbox **empty**
- **Launch:** NO-GO
- **Demo prod:** Real video @ PR #476 — **verified PASS** on prod
- **Harness debt:** Closed in PR follow-up — `founder-led-demo-flow-browser` + `interactive-demo-a11y` updated to SalesDemoExperience selectors

```
DEMO_FOUNDER_REVIEW_DATE: 2026-07-14
REPO_HEAD: 934cbbeb
PROD_FE: 934cbbeb
PROD_API: ae14bfb58fc0
DB_HEAD: 077
VISUAL_CRITERIA: 18/18_PASS
VIDEO_PROD: PASS
GATE_F: PENDING
LAUNCH: NO-GO
```
