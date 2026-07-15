# Demo Interactive Motion + Audio Evidence — 2026-07-15

**Type:** Interactive flow rebuild + ambient audio — **not launch approval**  
**Baseline:** PR #482 @ `7118f735` (product film v2, ALIGNED on prod)  
**Branch:** `feat/demo-interactive-motion-audio`  
**Prod URL:** https://twin-society.vercel.app/demo  
**Gate F:** PENDING · **Launch:** NO-GO · **LB-107:** CLOSED

**Related:** [Demo Founder Review Evidence 2026-07-14](./DEMO_FOUNDER_REVIEW_EVIDENCE_2026-07-14.md) · PR #482 product film v2

---

## 1. Scope (this batch)

| Area | Change |
|------|--------|
| Interactive flows | Step-based Candidate / Recruiter / Company with UI beat every 1–2s |
| Audio | Local MP3 + OGG in `public/demo/`, user-gesture gated |
| Video blank frames | MP4-first source order + poster underlay until first frame |
| Validators | `test:interactive-demo-visual-change`, `test:demo-audio-validate` |
| Browser tests | `e2e/interactive-demo-flow-browser.spec.ts` EN/PL desktop/mobile |

---

## 2. Black frame investigation

| Check | Result | Detail |
|-------|--------|--------|
| Prod screenshot @ 0s | **BLANK (light)** | Poster/background — not decoded frame |
| Prod screenshot @ 3s | **PASS** | Content visible (“Thousands of pings…”) |
| Prod screenshot @ 10s | **BLANK (light)** | Capture during decode gap / pre-play state |
| Local MP4 extract @ 10s | **PASS** | mean brightness 173 — content present in asset |
| Root cause | **RENDER TIMING** | Asset OK; browser showed empty surface before decode / between segments |
| Fix applied | **IN SCOPE** | MP4-first, poster underlay until `loadedData`, no fake PASS on blank captures |

---

## 3. Interactive rebuild

- `InteractiveRoleFlow` replaces cinematic `RoleStory` in `SalesDemoExperience`
- 8 steps per role: loading → scan → rank → highlight → decision → processing → success → outcome
- Decision buttons: hover / click / loading / success states with `DemoMatchGauge`
- `prefers-reduced-motion` + `save-data`: step picker, no auto-timer, no audio
- Outcome + CTA preserved; sample-data boundary note intact

---

## 4. Audio

| Asset | Path | Size |
|-------|------|------|
| MP3 | `/demo/twin-demo-ambient.mp3` | ~235 KB |
| OGG | `/demo/twin-demo-ambient.ogg` | ~199 KB |

- Procedurally generated sine ambient (royalty-free)
- `preload="none"`, no autoplay; toggle enabled after user gesture
- Analytics: `demo_audio_impression`, `demo_audio_play`, `demo_audio_pause`, `demo_audio_mute`, `demo_audio_unmute`

---

## 5. Validators

| Script | Purpose |
|--------|---------|
| `test:interactive-demo-visual-change` | Step timing 800–2000ms, ≥4 beats/role |
| `test:demo-audio-validate` | Asset existence, gesture policy, analytics |
| `test:interactive-demo-guard` | Sales stack, reduced-data, e2e hooks |

---

## 6. Prod verification (post-merge)

Run after manual merge + Vercel deploy:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=https://twin-society.vercel.app \
  npm run smoke:demo-founder-review-prod

npm run verify:production-v3:077
npm run probe:prod-public
```

---

## 7. Final decision

| Gate | Status |
|------|--------|
| Launch GO | **NO-GO** |
| Gate F YES | **BLOCKED** |
| Interactive + audio batch | **READY FOR PR** |
| Black frames on prod MP4 | **ASSET OK** — UI timing fix shipped |
