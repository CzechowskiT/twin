# Demo Founder Review Evidence — 2026-07-14

**Generated:** 2026-07-14T14:00:38.633Z
**Prod:** https://twin-society.vercel.app/demo
**FE SHA:** aa33afe61ae82e7ce3f6ea9565c97d86aced8b88
**API SHA:** ae14bfb58fc0c2db56a6fa0f417ca41c534b7960
**Gate F:** PENDING · **Launch:** NO-GO

## Screenshots

| File | Locale | Viewport | State | UTC |
|------|--------|----------|-------|-----|
| hero-EN-1920x1080.png | EN | 1920x1080 | hero-loaded | 2026-07-14T14:00:57.112Z |
| hero-EN-390x844.png | EN | 390x844 | hero-loaded | 2026-07-14T14:00:58.824Z |
| hero-PL-1920x1080.png | PL | 1920x1080 | hero-loaded | 2026-07-14T14:01:01.025Z |
| hero-PL-390x844.png | PL | 390x844 | hero-loaded | 2026-07-14T14:01:02.629Z |
| video-milestone-0s-EN.png | EN | 1280x800 | video-t=0s | 2026-07-14T14:01:08.081Z |
| video-milestone-5s-EN.png | EN | 1280x800 | video-t=5s | 2026-07-14T14:01:08.534Z |
| video-milestone-10s-EN.png | EN | 1280x800 | video-t=10s | 2026-07-14T14:01:08.979Z |
| video-milestone-18s-EN.png | EN | 1280x800 | video-t=18s | 2026-07-14T14:01:09.432Z |
| video-milestone-22s-EN.png | EN | 1280x800 | video-t=22s | 2026-07-14T14:01:09.880Z |
| video-milestone-26s-EN.png | EN | 1280x800 | video-t=26s | 2026-07-14T14:01:10.330Z |
| video-milestone-33s-EN.png | EN | 1280x800 | video-t=33s | 2026-07-14T14:01:10.782Z |
| video-milestone-38s-EN.png | EN | 1280x800 | video-t=38s | 2026-07-14T14:01:11.229Z |
| video-complete-interactive-EN.png | EN | 1280x800 | post-skip-roles-visible | 2026-07-14T14:01:11.482Z |
| role-candidate-flow-EN-desktop.png | EN | 1280x800 | role-candidate-selected | 2026-07-14T14:01:11.649Z |
| role-recruiter-flow-EN-desktop.png | EN | 1280x800 | role-recruiter-selected | 2026-07-14T14:01:42.058Z |
| role-company-flow-EN-desktop.png | EN | 1280x800 | role-company-selected | 2026-07-14T14:02:12.476Z |
| a11y-reduced-motion-EN.png | EN | 1280x800 | reduced-motion | 2026-07-14T14:02:45.133Z |
| a11y-reduced-data-EN.png | EN | 1280x800 | reduced-data | 2026-07-14T14:02:47.100Z |
| a11y-keyboard-focus-EN.png | EN | 1280x800 | keyboard-tab-focus | 2026-07-14T14:02:49.310Z |
| role-candidate-flow-PL-mobile.png | PL | 390x844 | role-candidate-mobile | 2026-07-14T14:02:51.155Z |

## Visual acceptance (18 criteria)

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Hero EN desktop | **PASS** | hero-EN-1920x1080.png |
| 2 | Hero PL desktop | **PASS** | hero-PL-1920x1080.png |
| 3 | Hero EN mobile | **PASS** | hero-EN-390x844.png |
| 4 | Hero PL mobile | **PASS** | hero-PL-390x844.png |
| 5 | Real video element | **PASS** | video-milestone-0s-EN.png |
| 6 | currentSrc mp4/webm not blob | **PASS** | https://twin-society.vercel.app/demo/twin-product-film-en.webm |
| 7 | Duration >= 40s | **PASS** | duration=42 |
| 8 | 1920x1080 dimensions | **PASS** | 1920x1080 |
| 9 | readyState metadata | **PASS** | readyState=4 |
| 10 | Poster present | **PASS** | https://twin-society.vercel.app/demo/twin-product-film-poster-en.webp |
| 11 | MP4/WebM/VTT HTTP 200 | **PASS** | {"mp4":{"status":200,"contentType":"video/mp4"},"webm":{"status":200,"contentType":"video/webm"},"vtt":{"status":200,"contentType":"text/vtt; charset=utf-8"},"poster":{"status":200,"contentType":"image/webp"}} |
| 12 | Playback growth pause seek | **PASS** | video-milestone-10s-EN.png |
| 13 | Skip → interactive roles | **PASS** | video-complete-interactive-EN.png |
| 14 | Candidate role flow | **PASS** | role-candidate-flow-EN-desktop.png |
| 15 | Recruiter role flow | **PASS** | role-recruiter-flow-EN-desktop.png |
| 16 | Company role flow | **PASS** | role-company-flow-EN-desktop.png |
| 17 | Reduced motion fallback | **PASS** | a11y-reduced-motion-EN.png |
| 18 | No autoplay audio + captions | **PASS** | a11y-keyboard-focus-EN.png |

## Playwright smoke

- real-video-demo: PASS (exit 0)
- founder-led-demo: PASS (exit 0)
- interactive-demo-a11y: PASS (exit 0)