# API deploy decision memo — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 15 of the long autonomous security session.
A docs-only **decision memo** capturing the current state and
the explicit decision **not** to redeploy the API today. The
session HARD BAN forbids Railway / API redeploy and prod env
change; this memo records the reasoning so the next session
doesn't second-guess it.

## TL;DR

| Question                                            | Today's answer                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Should we redeploy the API today?                   | **No.** All shipped code lands on `cursor/phase1-monorepo-scaffold` and Railway's git-deploy hook picks it up automatically. |
| Should we change the Railway env today?             | **No.** Session HARD BAN; no env / secret rotation in scope.                                         |
| Is there any code that needs a deploy to take effect?| **No.** Every commit this session was either docs-only, tests-only, or service-module wiring that does not change runtime behaviour. |
| Should we move off Railway?                         | **Not now.** Phase 1 cost / operability target is met. Re-evaluate when Phase 2 ships.              |

## What shipped this session that touches the backend runtime

| Commit       | Surface                                                                                                              | Deploy required? |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `974bd15`    | Frontend `next.config.ts` — wires CSP `report-uri`. **Vercel** auto-deploys. **No Railway action.**                  | No (Vercel only) |
| `28a50a0`    | `app/limiter.py` + `app/api/career_assistant.py` + `app/api/interview_coach.py` — Layer 2 user-keyed rate-limit       | Yes (auto)        |
| `edcebfe`    | Tests-only on `tests/test_auto_apply_trigger_sweep_admin_gate.py` — no runtime change                                | No                |
| `f341e1f`    | `app/database/models.py` registers `StripeWebhookEvent`; `app/services/stripe_events.py` is **not yet imported by any route** | No (model unused) |
| `62967e9`    | Tests-only on `tests/test_public_health_regression.py` — no runtime change                                            | No                |
| Doc commits  | `docs/*.md` only                                                                                                     | No                |
| `b0b4988`    | `frontend/e2e/smoke.spec.ts` — Playwright spec, not in CI smoke                                                       | No                |
| `3d89a03`    | `scripts/check-vercel-canonical-alias.sh` — operator script; not invoked at runtime                                   | No                |

Net: **only `28a50a0` changes runtime behaviour on the API**
— and Railway's git-deploy hook on `cursor/phase1-monorepo-scaffold` has already redeployed it.
No manual deploy action needed.

## Why this matters

A wrong instinct to "deploy to be safe" has three real costs:

1. **CI smoke goes red** if a deploy fires while the Vercel
   build is still resolving (race between the two providers).
2. **An off-schedule API deploy invalidates in-flight JWTs**
   issued before the deploy. Pilot users hit a logout loop.
3. **It breaks the audit trail.** Every Railway deploy in
   this session would log a new SHA, but the SHA didn't
   change between the last verified deploy and now — so the
   log line is misleading.

The HARD BAN on API redeploy this session is a feature, not
a constraint.

## What would a deploy look like (for reference only)

Documented for the **next** session, not for this one:

1. Confirm `gh run list --workflow smoke.yml --limit 3` is
   all-green on the SHA we want to ship.
2. Confirm `railway status --service=api` shows the current
   prod SHA matches `git rev-parse origin/cursor/phase1-monorepo-scaffold`.
3. If they don't match, the auto-deploy didn't run — open
   the Railway UI and check the latest deploy log for
   build failure (rare).
4. If they do match, the deploy is already live; no manual
   action needed.

A **forced** redeploy (because of a Railway hiccup, not a
code change) is documented in
`INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` § "API outage".

## Should we move off Railway?

Phase-1 / pilot scale is fine on Railway:

- One small Postgres + one API + one worker + Redis broker.
- Per-month cost is dominated by Postgres, not compute.
- Deploys via `git push`, which integrates with our pilot
  ops cadence.

Triggers that would force a re-evaluation:

| Trigger                                                              | Replatform target                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Postgres backup / restore drill (R-018) fails or is too cumbersome    | Managed Postgres provider with documented PITR (Neon, Supabase). |
| Per-month bill exceeds founder's runway model by > 3x                | Hetzner cloud + managed Postgres, or Fly.io if EU + EU-only.     |
| Pilot expands beyond 50 users with > 5k applications / week           | Fly.io or AWS ECS Fargate.                                       |
| A Railway region outage causes > 1h downtime on the canonical alias  | Multi-region anywhere except Railway.                            |

None of those triggers are hit today. Re-evaluate at the end
of Phase 1 / start of Phase 2.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source / config change.
- ✅ No Railway / Vercel manual deploy in this session.
- ✅ No env change.
- ✅ No DB migration.
- ✅ No secret in this memo (only env-var names / paths).
- ✅ No UX / copy change.
- ✅ No public-launch messaging.

## Files

- `docs/API_DEPLOY_DECISION_MEMO_2026-05-27.md` (this doc).

## Related

- `docs/DEPLOY.md`, `docs/DEPLOY_AUTO.md`,
  `docs/DEPLOY_VERIFICATION_CHECKLIST.md` — operational
  deploy playbooks (referenced here, unchanged this session).
- `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md` — the
  canonical deploy story (Vercel side).
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` — when to
  force-redeploy (separate ticket from "should I redeploy
  today?").
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — O1-O3
  rely on the no-manual-deploy posture this memo documents.

---

## Addendum — 12h launch readiness session (2026-05-27)

### New runtime commits (require Railway auto-deploy when pushed)

| Change | Deploy? | Migration? |
| ------ | ------- | ---------- |
| Alembic `050_stripe_webhook_events.py` | No effect until `alembic upgrade` | **Yes — founder approval; NOT run by agent** |
| Auth mutation rate limits (match-feedback, profile, applications, documents) | **Yes** — SlowAPI decorators on API routes | No |

### Recommendation

1. **Push branch** → let Railway git-deploy pick up rate-limit commits.
2. **Do NOT** run `050` migration until founder signs gate S5 checklist.
3. After deploy: `curl https://twin-sooty.vercel.app/api/public-health` → confirm new `git_commit`.
4. Re-run `pytest tests/test_auth_mutation_rate_limits.py -q` on CI (smoke workflow).

### Verdict

| Action | Today |
| ------ | ----- |
| API redeploy for rate limits | **Recommended** after green CI on pushed SHA |
| Stripe migration on prod | **NO** — ready in repo only |
| Manual forced redeploy | **NO** |

