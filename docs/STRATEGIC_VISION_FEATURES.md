# Strategic Vision Features — Shipped vs Stubbed

Branch: `cursor/strategic-vision-features`  
Base: `cursor/phase1-monorepo-scaffold`

This document tracks implementation of the GlobJob/Glimmer → TWIN strategic vision (see also `cursor_vision_features_implementation.md`).

## Phase 1: AI Profile Intelligence

| Feature | Status | Routes / paths |
|---------|--------|----------------|
| LinkedIn profile import + AI synthesis | **Shipped (MVP)** | `POST /api/v1/profile/import-linkedin`, `POST /api/v1/profile/import-cv-text` |
| Opportunity Forecaster (Perfect / Near Miss / Stretch) | **Shipped** | `GET /api/v1/opportunities/forecast` |
| Frontend: ProfileImport | **Shipped** | `/onboarding` (CV step), `frontend/src/components/onboarding/ProfileImport.tsx` |
| Frontend: OpportunityForecast | **Shipped** | `/dashboard` |

**Notes:**
- LinkedIn OAuth uses OpenID scopes only (`openid profile email`) — no positions/skills API. Import falls back to stored candidate + CV text; optional short-lived token accepted in body.
- Claude synthesis runs when `ANTHROPIC_API_KEY` is set; otherwise deterministic enrichment via `cv_enrichment`.
- Learning paths: deterministic for all tiers; Claude-enhanced for Premium when `ANTHROPIC_API_KEY` is set (`learning_path_ai` gate)

## Phase 2: Subscription tiers & paywall

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe tiers | **Shipped** | Free $0, Standby $0.99, Standard $1.99, Premium $4.99, Pro $9.99 |
| `subscription_gates.py` | **Shipped** | Five-tier gates in `backend/app/core/subscription_gates.py` |
| FeaturePaywall UI | **Shipped** | Four-tier story + localized tier names in `FeaturePaywall.tsx` |

**Gates (Premium unless noted):**
- Full forecast (Free: 5 roles/band)
- Unified feed type filters
- AI Interview Coach
- Full gamification dashboard
- LinkedIn AI synthesis: Free (deterministic always; Claude when key set)

Micro-tiers use `STRIPE_PRICE_STANDBY` and `STRIPE_PRICE_STANDARD` (or `STRIPE_PRICE_ID_*` aliases); existing Premium/Pro price IDs map unchanged via webhooks.

## Phase 3: Gamification

| Feature | Status | Routes |
|---------|--------|--------|
| `candidate_progress` table | **Shipped** | Migration `046_strategic_vision_features` |
| Gamification service + API | **Shipped** | `GET /api/v1/gamification/my-progress` |
| ProgressDashboard | **Shipped** | `/dashboard` |

Complements existing `career_compass` XP in `profile_signals_json` — does not replace it.

## Phase 4: Unified job + freelance feed

| Feature | Status | Routes |
|---------|--------|--------|
| Job fields: `opportunity_type`, duration, hourly rates | **Shipped** | Migration `046` |
| Unified feed API | **Shipped** | `GET /api/v1/opportunities/unified-feed` |
| Dashboard type filter | **Shipped** | Job filters bar + `GET /api/v1/jobs?opportunity_type=` |

Default `opportunity_type` = `full_time` for existing rows.

## Phase 5: AI Interview Coach

| Feature | Status | Routes |
|---------|--------|--------|
| Generate questions | **Shipped (Premium)** | `POST /api/v1/interview-coach/generate-questions` |
| Evaluate answer | **Shipped (Premium)** | `POST /api/v1/interview-coach/evaluate-answer` |
| Existing career-assistant interview prep | **Unchanged** | `POST /api/v1/career-assistant/interview-prep` (calendar-linked, Claude) |
| InterviewCoachPanel | **Shipped** | Job employer modal on dashboard |

**Stubbed / coming soon:**
- ~~Claude-heavy learning path generation on forecast~~ — **Shipped (Premium + ANTHROPIC_API_KEY)**; deterministic fallback for Free or when key unset
- LinkedIn full profile scrape (requires partner API scopes)
- ~~Standby / $1.99 micro-tier Stripe price IDs~~ — **Shipped** (env-driven price IDs)

## Investor demo paths

1. **Onboarding import:** `/onboarding` → CV step → paste CV → completeness score
2. **Forecast:** `/dashboard` → Opportunity Forecast cards (Perfect / Near Miss / Stretch)
3. **Gamification:** `/dashboard` → Progress panel (XP, streak, badges)
4. **Unified feed:** Dashboard job filters → opportunity type dropdown
5. **Interview coach:** Dashboard → open job → Employer hub modal → AI Interview Coach (Premium account or upgrade paywall)
6. **Billing:** `/dashboard/billing` → Premium checkout

## Tests

```bash
cd backend && pytest tests/test_strategic_vision.py tests/test_subscription_gates.py -q
cd frontend && npm run build
```

## Migrations

- `046_strategic_vision_features` — `candidate_progress` + job opportunity columns
