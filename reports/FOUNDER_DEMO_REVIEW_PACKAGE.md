# Founder demo review package

> **SHA:** `b658b7dc` · **Branch:** `feat/interactive-demo-homepage-candidate` · **PR:** [#462](https://github.com/CzechowskiT/twin/pull/462)  
> **Generated:** 2026-07-14T04:30:00Z · **Gate F:** PENDING · **Launch:** NO-GO

---

## Preview

| Field | Value |
|-------|-------|
| Vercel preview URL | https://twin-git-feat-interactive-demo-homepage-candidate-twin.vercel.app |
| Preview access | **SSO-gated** — unauthenticated curl redirects to Vercel login |
| Local smoke @ current SHA | PASS — production build + Playwright + a11y |

---

## Video artifact inventory (ffprobe @ 2026-07-13T12:52Z)

### Canonical naming (short + full, EN/PL)

| Class | File | Duration | Size | Codec | Status |
|-------|------|----------|------|-------|--------|
| Homepage SHORT EN | `twin-homepage-candidate-short-en-16x9.mp4` | 7.5s | 34 KB | h264 | RENDERED |
| Homepage SHORT PL | `twin-homepage-candidate-short-pl-16x9.mp4` | 7.5s | 34 KB | h264 | RENDERED |
| Homepage FULL EN | `twin-homepage-candidate-full-en-16x9.mp4` | **43.0s** | 84 KB | h264 | RENDERED |
| Homepage FULL PL | `twin-homepage-candidate-full-pl-16x9.mp4` | **43.0s** | 84 KB | h264 | RENDERED |
| Demo SHORT EN | `twin-demo-short-en-16x9.mp4` | 19.5s | 216 KB | h264 | RENDERED |
| Demo SHORT PL | `twin-demo-short-pl-16x9.mp4` | 19.5s | 216 KB | h264 | RENDERED |
| Demo FULL EN | `twin-demo-full-en-16x9.mp4` | **84.0s** | 448 KB | h264 | RENDERED |
| Demo FULL PL | `twin-demo-full-pl-16x9.mp4` | **84.0s** | 452 KB | h264 | RENDERED |

Each variant also has: `.webm`, `-poster.jpg`, `.vtt`, `metadata-{target}-{tier}-{locale}.json`

### Legacy aliases (SHORT only, backward compat)

`twin-demo-homepage-{en,pl}.mp4` · `twin-demo-full-{en,pl}.mp4` — symlinked copies of SHORT tier.

### Manifest bands vs rendered duration

| Sequence | Target band | Rendered FULL | Notes |
|----------|-------------|---------------|-------|
| `candidate-homepage-story` | 35–60s | 43.0s | Within band |
| `full-product-story` | 60–110s | 84.0s | Within band (frame capture @ 1fps) |

### Checksums

`reports/demo-video/checksums-e788dd9f-2026-07-13T12-45-54-317Z.json` — SHA256 for all 8 variants.

### Render command

```bash
cd frontend
npm run build
npm run start:e2e &   # or PLAYWRIGHT_ENABLE_WEBSERVER=1 for tests
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 npm run demo:capture:pipeline
```

---

## Accessibility (axe-core @ 2026-07-13T12:52Z)

| Check | Result |
|-------|--------|
| Homepage story section | **PASS** — 0 serious/critical |
| /demo interactive player | **PASS** — 0 serious/critical |
| `test:interactive-demo-guard` | PASS |
| `test:homepage-candidate-story` | PASS |

---

## Tests (@ pipeline batch)

| Command | Result |
|---------|--------|
| `test:homepage-candidate-story` | PASS |
| `test:interactive-demo-guard` | PASS |
| `test:interactive-demo-a11y` | **2/2 PASS** |
| `npm run build` | PASS |
| `demo:capture:pipeline` | **8/8 RENDERED** |

---

## Founder review questions

1. **Narrative tone** — 7-scene homepage + 8-scene /demo: calendar-of-acceptance north star?
2. **PL copy** — Native quality on `homepageCandidateStory.*` / `interactiveDemoPlayer.*`?
3. **Video exports** — Accept SHORT teasers (7.5s/19.5s) + FULL narrative (43s/84s)?
4. **CTA routing** — Waitlist + demo only?
5. **Merge** — Approve #462 for marketing deploy, or hold until train #448–#455?

**Founder narrative approval: GRANTED (2026-07-14). Gate F PENDING. Launch remains NO-GO.**

---

## Merge stance

| Item | Status |
|------|--------|
| PR #462 merge | **APPROVED** — founder narrative approval granted |
| PR #461 | CLOSED duplicate of #462 |
| Release train #448–#455 | Merged on scaffold; #462 rebased atop |
