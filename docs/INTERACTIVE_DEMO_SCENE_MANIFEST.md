# Interactive demo scene manifest

Canonical type: `DemoScene` in `frontend/src/lib/demo/demo-scene-manifest.ts`.

## Fields

| Field | Purpose |
|-------|---------|
| `id` | Stable scene identifier |
| `role` | `overview` \| `candidate` \| `recruiter` \| `company` |
| `titleKey` / `descriptionKey` | i18n keys (`interactiveDemoPlayer.*`) |
| `durationMs` | Autoplay segment length |
| `highlightKeys` | Bullet highlights under caption |
| `cursorPath` | Optional normalized cursor polyline |
| `analyticsEvent` | PII-safe event name (`demo_*`) |
| `videoSafe` | Must be `true` for launch |
| `reducedMotionVariant` | `static` \| `fade` |

## Durations

| Mode | Scenes | Approx total |
|------|--------|--------------|
| Full overview | 8 | ~76s |
| Role chapter | subset | varies |

Validation: `validateDemoSceneManifest()` — total 45–130s band.

## Commands

```bash
npm run demo:validate-scenes
```
