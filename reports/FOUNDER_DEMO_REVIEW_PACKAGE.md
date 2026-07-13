# Founder demo review package

> **SHA:** `e788dd9f` · **Branch:** `feat/interactive-demo-homepage-candidate` · **PR:** [#462](https://github.com/CzechowskiT/twin/pull/462)  
> **Generated:** 2026-07-13T12:35:00Z · **Gate F:** PENDING · **Launch:** NO-GO (frontend-only slice; no merge without founder narrative approval)

---

## Preview

| Field | Value |
|-------|-------|
| Vercel preview URL | https://twin-git-feat-interactive-demo-homepage-candidate-twin.vercel.app |
| Vercel deployment | Ready (CI green @ `e788dd9f`) |
| Preview access | **SSO-gated** — unauthenticated curl/browser redirects to Vercel login |
| Local smoke @ current SHA | PASS — production build + Playwright |

**Note:** Preview SSO blocks anonymous smoke; local production-build evidence used (same commit). Do **not** fake preview PASS.

---

## Video artifact classification (ffprobe @ 2026-07-13T12:35Z)

| Class | Variant | MP4 duration | Frames | FPS | Purpose |
|-------|---------|--------------|--------|-----|---------|
| **SHORT export** | Homepage EN/PL | **7.5s** | 15 | 2 | Investor-deck teaser; frame-capture @ 2fps |
| **SHORT export** | Full EN/PL | **19.5s** | 39 | 2 | Condensed /demo walkthrough export |
| **INTERACTIVE runtime** | Homepage story player | **38.5s** | — | — | Manifest `candidate-homepage-story` band 35–60s |
| **INTERACTIVE runtime** | /demo full story | **~108s** | — | — | Manifest `full-product-story` band 60–110s |

**Honesty gap (documented, not hidden):** VTT captions use **interactive runtime** timestamps; MP4/WebM files are **SHORT** frame-capture exports. Marketing copy must not claim “35–60s video” when linking to the 7.5s MP4. Interactive player is the canonical full narrative.

**FULL-runtime MP4 (38.5s/108s):** NOT rendered this batch — would require `demo:capture-pipeline` with dwell/fps tuning on #462 branch after `npm run build`. ffmpeg available; Playwright capture blocked without local webserver in Path B batch.

| Variant | MP4 | WebM | Duration (ffprobe) | Codec | Status |
|---------|-----|------|-------------------|-------|--------|
| Homepage EN | `twin-demo-homepage-en.mp4` (34 KB) | `.webm` | 7.500s | h264 / vp9 | PASS (SHORT) |
| Homepage PL | `twin-demo-homepage-pl.mp4` (34 KB) | `.webm` | 7.500s | h264 / vp9 | PASS (SHORT) |
| Full EN | `twin-demo-full-en.mp4` (221 KB) | `.webm` | 19.500s | h264 / vp9 | PASS (SHORT) |
| Full PL | `twin-demo-full-pl.mp4` (221 KB) | `.webm` | 19.500s | h264 / vp9 | PASS (SHORT) |

Re-render for narrative-complete MP4 is **optional founder decision** — not a launch blocker for #462 narrative review.

---

## Accessibility (axe-core @ 2026-07-13T12:35Z — re-verified)

| Check | Result |
|-------|--------|
| `@axe-core/playwright` added | YES — devDependency |
| Homepage story section (scoped) | **PASS** — 0 serious/critical |
| /demo interactive player (scoped) | **PASS** — 0 serious/critical |
| Static guards (`test:interactive-demo-guard`) | PASS |
| `role="progressbar"`, `aria-label`, reduced motion | PASS (code) |

Command: `PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:interactive-demo-a11y` @ `e788dd9f` → **2/2 PASS** (re-verified this batch)

---

## Lint (#462 touched demo files only)

| File | Result |
|------|--------|
| `candidate-homepage-story-player.tsx` | PASS (derived `activeIndex`, no setState-in-effect) |
| `interactive-demo-player.tsx` | PASS |
| `demo-role-selector.tsx` | PASS |
| `demo-video-export.ts` | PASS |

---

## Browser smoke summary (local production build)

| Check | EN | PL | Result |
|-------|----|----|--------|
| Homepage loads | ✓ | ✓ | PASS |
| Candidate story section | ✓ | ✓ | PASS |
| /demo interactive player | ✓ | ✓ | PASS |
| Play / Pause / Takeover | ✓ | ✓ | PASS |
| 35-link catalog (collapsed) | ✓ | ✓ | PASS |
| Hard-banned CTAs absent | ✓ | ✓ | PASS |
| `test:founder-led-demo-flow-browser` | — | — | 4/4 PASS (prior batch @ `cb0b9f80`) |
| Vercel preview anonymous | — | — | **BLOCKED** (SSO) |

---

## Tests (@ `e788dd9f`)

| Command | Result |
|---------|--------|
| `test:homepage-candidate-story` | 10/10 PASS |
| `test:interactive-demo-guard` | 10/10 PASS |
| `test:interactive-demo-a11y` | **2/2 PASS** (re-verified 2026-07-13T12:35Z) |
| `npm run build` | PASS |
| Scoped eslint (demo touched) | PASS |

---

## Founder review questions

1. **Narrative tone** — 7-scene homepage + 8-scene /demo: calendar-of-acceptance north star without over-promising?
2. **PL copy** — Native quality on `homepageCandidateStory.*` / `interactiveDemoPlayer.*`?
3. **Video exports** — Accept **SHORT** 7.5s/19.5s teasers, or fund full-runtime re-render (38.5s/108s)?
4. **CTA routing** — Waitlist + demo only (no signup pressure)?
5. **Merge** — Approve #462 merge for marketing deploy, or hold until train #448–#455?

**Do NOT auto-merge. Gate F PENDING. Launch remains NO-GO.**

---

## Merge stance

| Item | Status |
|------|--------|
| PR #462 merge | **BLOCKED** — founder narrative approval required |
| PR #461 | CLOSED duplicate of #462 |
| Release train #448–#455 | Separate track; smoke-gated on credentials |
