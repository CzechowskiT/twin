# Interactive demo analytics

Events flow through `frontend/src/lib/demo/demo-analytics.ts` → `trackEvent()` (cookie-consent gated).

## Events

| Event | When |
|-------|------|
| `demo_viewed` | Player mounted |
| `demo_started` | First play |
| `demo_role_selected` | Role tab change |
| `demo_scene_*` | Scene enter (from manifest `analyticsEvent`) |
| `demo_completed` | Autoplay reaches end |

## PII policy

Allowed props: `scene_id`, `role`, `mode`, `locale`, `reduced_motion`.

Forbidden: emails, names, candidate IDs, tokens.

## Verification

```bash
npm run test:interactive-demo-guard
```

Guard asserts analytics module has no email fields.
