# P1 / P2 docs index — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 10 of the long autonomous security session.
A docs-only index that maps every `P1_*` / `P2_*` doc in
`/docs/` to the slice it documents and the status of that
slice. Operators reading this should be able to jump to the
right doc in one click.

This index is **not** authoritative for behaviour — every
linked doc remains the source of truth for its slice. The
index just helps future-me find the right doc fast.

## How to use

| You want to …                                            | Read                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Understand the current P1 security work plan             | [`P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`](./P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md) |
| Find what shipped in last session                        | [`P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md`](./P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md), then [`THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md`](./THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md) |
| Find what's safe to ship next                            | The "Top 5 next steps" sections in each session report                                |
| Understand the CSP burn-in plan                          | [`P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`](./P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md)    |
| Understand the auth-mutation rate-limit architecture     | [`P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`](./P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md) |
| Understand the Stripe dedup migration plan               | [`P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`](./P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md) |
| Verify the canonical Vercel mapping                      | [`VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`](./VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md) |
| Run the canonical alias drift guard                      | [`VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md`](./VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md) |

## By status

Legend:

- ✅ **Shipped** — code or migration is live on this branch.
- 📐 **Design ready** — implementation-sized; waiting on
  migration freeze / KV provisioning / human review.
- 🗺️ **Map / audit** — documentation that maps a surface; no
  code change associated.
- 📓 **Session report** — post-mortem for a session.

### Security — shipped

| Status | Doc                                                                                                                                          | Slice                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ✅     | [`P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md`](./P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md)                                                   | `POST /beta/join` rate-limit (5/min per IP). Code in `45e5d6a`; doc re-verifies on the branch.    |
| ✅     | [`P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md`](./P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md)                                       | `POST /auto-apply/trigger-sweep` gated to ops allowlist + rate-limited. Code in `dd0b8a2`.       |
| ✅     | [`P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`](./P1_CSP_REPORTING_ENDPOINT_2026-05-27.md)                                                       | `POST /csp-report` sink endpoint, storage-free, rate-limited. Code in `0dfc6c9`.                 |
| ✅     | [`P1_CSP_REPORT_URI_WIRING_2026-05-27.md`](./P1_CSP_REPORT_URI_WIRING_2026-05-27.md)                                                         | `Content-Security-Policy-Report-Only` now wires `report-uri /api/v1/csp-report`. Code in `974bd15`. |
| ✅     | [`P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md`](./P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md)                                       | Layer 2 of authenticated mutation rate-limit (`user_or_ip_key`) on 8 LLM endpoints. Code in `28a50a0`. |
| ✅     | [`P2_STRIPE_EVENT_DEDUP_HELPERS_2026-05-27.md`](./P2_STRIPE_EVENT_DEDUP_HELPERS_2026-05-27.md)                                               | Service module + model for Stripe webhook dedup; helpers tolerate missing table. Code in `f341e1f`. |

### Security — design ready

| Status | Doc                                                                                                                                          | Slice                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 📐     | [`P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`](./P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md)                                                 | Stripe `event.id` dedup: migration `050_stripe_webhook_events.py` + 6-line patch to billing.py.   |
| 📐     | [`P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`](./P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md)                   | Layer 1 (Vercel KV + edge) + Layer 2 (SlowAPI) architecture. Layer 2 now ✅ shipped.                |
| 📐     | [`P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`](./P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md)                                                            | Burn-in plan + enforce-mode CSP target string. Gated on 72h zero-violation observation.           |
| 📐     | [`P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`](./P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md)                                            | Sequenced item list for the security workstream.                                                  |

### Security — audits / maps

| Status | Doc                                                                                                                                                | Slice                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 🗺️     | [`P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md`](./P1_MUTATION_RATE_LIMIT_AUDIT_2026-05-27.md)                                                       | Enumerates the 15 authenticated mutating endpoints; surfaces the Layer 2 gap.                     |
| 🗺️     | [`P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md`](./P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md)                                                   | Maps every no-JWT public route; ranks abuse risk; identifies 2 HIGH (beta CV / voice uploads).    |
| 🗺️     | [`P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md`](./P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md)                                                                 | Walk-through of every webhook handler; surfaces the replay-bumps-counter gap.                     |
| 🗺️     | [`P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md`](./P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md)                                                             | Cookie consent + analytics provider audit (Plausible / PostHog).                                  |
| 🗺️     | [`P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md`](./P1_DEPENDENCY_AUDIT_BASELINE_2026-05-27.md)                                                       | Dependency-tree audit baseline; no current CVEs above LOW severity.                               |
| 🗺️     | [`P1_SECURITY_NEXT_STEPS_2026-05-26.md`](./P1_SECURITY_NEXT_STEPS_2026-05-26.md)                                                                  | Day-1 sequencing of the security plan; superseded by the 2026-05-27 implementation plan.         |

### Tests / CI

| Status | Doc                                                                                                                                                | Slice                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ✅     | [`P1_FRONTEND_E2E_SMOKE_EXPANSION_2026-05-27.md`](./P1_FRONTEND_E2E_SMOKE_EXPANSION_2026-05-27.md)                                                 | Adds 7 read-only Playwright tests (marketing + SEO + runtime CSP). Code in `b0b4988`.            |
| ✅     | [`CI_SMOKE_HEALTH_FIX_2026-05-27.md`](./CI_SMOKE_HEALTH_FIX_2026-05-27.md)                                                                          | Aligns prod-health smoke with the new public health contract.                                    |
| ✅     | [`CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md`](./CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md)                                                        | First-pass audit of `paths-ignore`.                                                              |
| ✅     | [`CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md`](./CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md)                                                              | Second-pass audit + push-coalescing notes.                                                       |
| ✅     | [`P1_CI_WORKFLOW_ENABLEMENT_2026-05-27.md`](./P1_CI_WORKFLOW_ENABLEMENT_2026-05-27.md)                                                              | The CI gate that protects pushes to `cursor/phase1-monorepo-scaffold`.                           |
| 🗺️     | [`P1_CI_HARDENING_2026-05-26.md`](./P1_CI_HARDENING_2026-05-26.md)                                                                                  | Map of CI gate evolution; superseded by the 27th-of-May enablement doc.                          |
| 🗺️     | [`P1_DASHBOARD_E2E_SMOKE_2026-05-26.md`](./P1_DASHBOARD_E2E_SMOKE_2026-05-26.md)                                                                    | The original dashboard-smoke spec scope.                                                         |

### Vercel / deploy

| Status | Doc                                                                                                                                                | Slice                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 🗺️     | [`VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`](./VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md)                                                  | Authoritative deploy story (Git push → `twin` project → `twin-sooty.vercel.app`).                |
| ✅     | [`VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md`](./VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md)                                                        | `scripts/check-vercel-canonical-alias.sh` — read-only drift check. Code in `3d89a03`.            |

### Session reports

| Status | Doc                                                                                                                                                | Window                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 📓     | [`P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md`](./P1_SECURITY_OPS_SESSION_REPORT_2026-05-27.md)                                                   | Morning security ops session (2026-05-27).                                                       |
| 📓     | [`THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md`](./THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md)                                   | Three-hour security engineering session (2026-05-27).                                            |
| 📓     | [`P1_RELEASE_BASELINE_2026-05-27.md`](./P1_RELEASE_BASELINE_2026-05-27.md)                                                                          | Same-day baseline used to gate the session work.                                                 |
| 📓     | `LONG_AUTONOMOUS_SECURITY_SESSION_REPORT_2026-05-27.md` (this session — written last in the queue)                                                 | Long autonomous security/release session (2026-05-27 afternoon).                                  |

## How to read commit SHAs in this index

Every "Code in `<sha>`" reference is a 7-char commit on
`cursor/phase1-monorepo-scaffold`. To inspect, run from the
repo root:

```
git show <sha> --stat       # files touched
git show <sha>              # full diff
git show <sha>:path/to/file # read the file as it was at that SHA
```

The branch is the source of truth — `main` is intentionally
not the prod branch; see `VERCEL_CANONICAL_DEPLOY_RUNBOOK`.

## What this commit does NOT cover

- Pilot, calendar, scrape, recruiter, observability,
  data-room, ATS, gamification, partner API — those have
  their own non-`P1_*` docs (`PILOT_*`, `OVERNIGHT_*`,
  `DEPLOY_*`, `RELEASE_*`, etc.). The index here is scoped to
  the **security workstream + the docs that gate it** so the
  list stays useful instead of becoming a `ls /docs`.
- Architecture / vision docs (`STRATEGIC_VISION_*`,
  `AGENT_SHIPPING_LOG.md`, `CLAUDE_FULL_AUDIT_BRIEF.md`) —
  those don't live on the security cadence.
- Older `P0_*` baselines — superseded.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source / config / migration / deploy change.
- ✅ No env / secret in this doc.
- ✅ No UX / copy change.

## Files

- `docs/P1_DOCS_INDEX_2026-05-27.md` (this doc).

## Related

- Each doc linked above is its own canonical source; the
  index does not summarise behaviour, only locates it.
