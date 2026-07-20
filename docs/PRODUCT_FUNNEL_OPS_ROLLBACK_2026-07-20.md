# Product funnel ops — deploy, health, rollback

## Deploy checklist

1. Merge PR → Railway API + worker pick up commit (Alembic `084_product_funnel_events`).
2. Confirm migration applied: ops `GET /api/v1/admin/migrations/current` (note: expected head constant may lag; verify `product_funnel_events` table exists via SQL or funnel endpoint).
3. Vercel FE: new `/admin/metrics` funnel UI + onboarding TTV redirect.
4. Smoke:
   - `GET /health` → ok
   - Register test user → row in `product_funnel_events` (`signup_completed`)
   - Complete onboarding → `onboarding_completed`
   - `GET /api/v1/admin/funnel` with ops token → `instrumentation_enabled: true`
   - Onboarding finish → lands on `/dashboard/matches?activated=1`

## Rollback

| Layer | Action | Effect |
|-------|--------|--------|
| Writes | `PRODUCT_FUNNEL_EVENTS_ENABLED=false` on Railway | Stops inserts; reads still work |
| Activation UX | `NEXT_PUBLIC_TTV_MATCHES_REDIRECT=false` + Vercel redeploy | Finish → `/dashboard` again |
| Client analytics | `NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT=false` | Stops FE dual-write |
| Schema | Prefer flag off; only `alembic downgrade` if table must go | Downtime risk — avoid unless required |

## Feature flags

| Flag | Default | Location |
|------|---------|----------|
| `PRODUCT_FUNNEL_EVENTS_ENABLED` | true | Backend Settings |
| `NEXT_PUBLIC_TTV_MATCHES_REDIRECT` | on (≠ false) | `frontend/src/lib/features.ts` |
| `NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT` | on (≠ false) | same |
