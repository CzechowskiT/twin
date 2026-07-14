# Interactive demo architecture

**Branch:** `feat/interactive-demo-homepage-candidate`  
**Surfaces:** `/demo` full player · homepage candidate story · video export  
**Verdict:** Pilot / demo **GO** · Public launch **NO-GO** (unchanged)

---

## Shared manifest (`frontend/src/lib/demo/demo-scene-manifest.ts`)

| Concept | Values |
| ------- | ------ |
| `DemoSurface` | `full-demo` · `homepage-candidate` · `video-export` |
| `DemoScene.surfaces[]` | Each scene lists which surfaces render it |
| `DemoSequence` | `candidate-homepage-story` (7 scenes, 38.5s) · `full-product-story` (8 scenes) · `video-export-homepage` · `video-export-full` |

**Reused components** (under `frontend/src/components/marketing/demo/`):

- `DemoSceneStage` — visual stage per scene id
- `DemoCaption` — title, description, highlights
- `DemoCursor` — autoplay pointer
- `DemoTimeline` / progress — chapter scrubber
- `DemoControls` — play / pause / restart (/demo player)
- `DemoFixtureProvider` data via `demo-fixtures.ts` + `demo-walkthrough-data.ts`

---

## `/demo` — full product story

- `InteractiveDemoPlayer` — role paths, autoplay, chapter nav
- `InteractiveDemoSystemMap` — persona map
- `DemoSurfaceCatalog` — founder-led link grid
- `InteractiveDemoWalkthrough` — legacy 8-step simulation (unchanged)
- `DemoPilotCta` — founder wishlist, NO-GO boundary copy

---

## Homepage — `CandidateHomepageStory`

**Placement:** below `LandingHero` + `CandidateRewardsBand` (poster SSR, lazy hydrate).

| Concern | Implementation |
| ------- | -------------- |
| LCP | Static poster shell; `dynamic(..., { ssr: false })` |
| Hydration | `IntersectionObserver` (`rootMargin: 120px`) |
| Autoplay | Viewport + `!prefers-reduced-motion` + pause outside viewport |
| Scenes | start → profile → Career Compass → Trust Center → no auto-apply → timeline → CTA |
| CTAs | `/demo` + `#interactive-story` founder pilot — **no public signup** |
| Analytics | `homepage_candidate_story_*` via `demo-analytics.ts` |
| i18n | `homepageCandidateStory.*` EN/PL |

---

## Video pipeline (single)

```bash
cd frontend
npm run demo:render:video          # all variants JSON
npm run demo:render:video homepage # 1280×720
npm run demo:render:video full     # 1440×900
```

Config: `demo-video-export.ts` + `scripts/demo-render-video.ts`.

---

## Tests

```bash
npm run test:homepage-candidate-story
npm run test:interactive-demo-architecture
npm run test:interactive-demo
npm run lint && npx tsc --noEmit && npm run build
```

---

## Hard bans (honoured)

No env/DB changes · no auto-apply enable · no public GO · no signup on homepage story · synthetic fixtures only · launch stance **NO-GO**.
