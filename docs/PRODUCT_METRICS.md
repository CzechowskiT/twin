# Product metrics — taxonomy, north star, collection

**Status:** LIVE instrumentation (server-side) as of unicorn batch 2026-07-20  
**Rollback:** set `PRODUCT_FUNNEL_EVENTS_ENABLED=false` on Railway API (+ worker if shared env). No data loss; writes stop immediately. FE activation experiment: `NEXT_PUBLIC_TTV_MATCHES_REDIRECT=false` and redeploy Vercel.

## North Star

**`weekly_acceptance_ready_users`** — distinct users with `interview_scheduled` **or** `placement_verified` in the last 7 days.

| Field | Value |
|-------|--------|
| Definition | Users who reached an acceptance-ready calendar/placement moment |
| Why | Aligns with calendar-of-acceptance north star — not inbox volume |
| Data source | `product_funnel_events` (server) |
| Implementation | `GET /api/v1/admin/funnel` → `north_star.value_7d`; also on `/admin/metrics` |
| Target | Pilot 5–25 / week → growth 200+ / week |
| Owner | Founder + product ops |
| Cadence | Daily glance / weekly review |

## Event taxonomy (canonical)

| Event | Once/user | Emit site | Props (non-PII) |
|-------|-----------|-----------|-----------------|
| `signup_completed` | yes | `POST /auth/register` | `source` |
| `onboarding_completed` | yes | `POST /auth/onboarding/complete` | `source` |
| `first_match` | yes | after match persist | `match_count` |
| `application_created` | no | `POST /applications/` | `job_id`, `application_id` |
| `first_application` | yes | same | `application_id` |
| `calendar_connected` | yes | Google calendar OAuth callback | `provider` |
| `interview_scheduled` | no | (wire on schedule create — ready) | — |
| `placement_declared` | no | (wire on declare — ready) | — |
| `placement_verified` | no | (wire on verify — ready) | — |
| `activation_ttv_matches_view` | no | FE onboarding → matches (client) | `surface` |

Client dual-write is **optional** (`NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT`, consent-gated via `analytics.ts`). **Server events are source of truth.**

## Endpoints

| Path | Auth | Purpose |
|------|------|---------|
| `GET /api/v1/admin/metrics` | ops Bearer | Headline KPIs + north star + conversion |
| `GET /api/v1/admin/funnel?days=30` | ops Bearer | Full funnel snapshot |
| `GET /api/v1/admin/retention?weeks=8` | ops Bearer | Signup-week D7/D30 cohorts |
| FE `/admin/metrics` | same token via BFF | Dashboard UI |
| FE `/api/ops-admin/funnel` · `/retention` | BFF proxy | Same |

## Metrics tree (implementation state)

| Metric | Definition | Source | State | Missing | Validation | Target | Owner | Cadence |
|--------|------------|--------|-------|---------|------------|--------|-------|---------|
| Acquisition | Signups / 7d | `users.created_at` | LIVE | paid channels | admin metrics | pilot | Growth | weekly |
| Activation | Onboarding complete % | `onboarding_completed_at` + funnel | LIVE | persona split | funnel conversion | ≥60% of signups | Product | weekly |
| Engagement | Matches / apps | `job_matches`, `applications` | LIVE | session depth | admin metrics | rising | Product | weekly |
| Retention | D7/D30 by signup week | funnel + proxy | LIVE (cohort ready) | empty early weeks | `/admin/retention` | D7 ≥40% | Product | weekly |
| Revenue | Paid conversion / MRR | `User.plan_tier` | PARTIAL | cohort revenue API | Stripe + user | after Launch GO | Biz | monthly |
| Referral | Account referral edges | referral tables | LIVE data / weak metrics | funnel event | referral svc | later | Growth | monthly |
| Marketplace liquidity | Dual-side active | recruiter + candidate | PARTIAL | liquidity formula | — | Phase later | Marketplace | monthly |
| Supply | Validated jobs | `jobs` MVP boards | LIVE | — | market coverage | 10k path | Eng | weekly |
| Demand | Active candidates | users onboarded | LIVE | DAU definition | — | — | Product | weekly |
| Conversion | Funnel rates | funnel events | LIVE | interview/placement emit | `/admin/funnel` | see NS | Product | weekly |
| Match quality | Feedback + scores | matching-quality admin | LIVE | — | admin | median rising | Matching | weekly |
| Acceptance | Interview holds | scheduled_interviews + events | PARTIAL | emit on create | NS | — | Product | weekly |
| Placement | Verified placements | placement_events | PARTIAL | funnel emit | placement svc | — | Ops | weekly |
| TTV | Signup → first match / interview | funnel timestamps | PARTIAL | p50 latency API | cohort + funnel | <24h first match | Product | weekly |
| CAC/LTV/payback | Unit economics | — | NOT READY | attribution + Stripe cohorts | — | after monetization | Finance | monthly |
| Gross margin | After AI/scrape cost | — | NOT READY | cost allocation | — | — | Finance | quarterly |
| NRR | Expansion − churn | — | NOT READY | paid base | — | — | Finance | quarterly |
| Cohort retention | Signup week D7/D30 | `/admin/retention` | LIVE | longer windows | ops UI | D30 ≥25% | Product | weekly |

## Observability

- Emit failures are logged (`funnel_emit_failed`) and **never** raise into product paths.
- Flag `product_funnel_events_enabled` / env `PRODUCT_FUNNEL_EVENTS_ENABLED`.
- Indexes: `user_id`, `event_name`, `occurred_at`, `signup_week`, `(user_id, event_name)`.

## Privacy

- No email/name/CV in `properties_json` (banned keys stripped).
- Cascade delete on user deletion.
