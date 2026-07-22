# Feature flag registry — 2026-07-13 (updated 2026-07-20 Wave 0)

> **Stance:** Pilot **BLOCKED_BY_FOUNDER** · Launch **NO-GO** · Gate F **PENDING** · PMF **INSUFFICIENT_DATA** · no LIVE flips without Hard LIVE 30 + founder smoke PASS · no real cohort invites

## Ship-status constants (workspace modules)

| Constant / module | File | Value | Launch scope |
|-------------------|------|-------|--------------|
| `RECRUITER_C1_SHIP_STATUS` | `seven-day-c2-recruiter.ts` | PILOT | Controlled / blocked external |
| `RECRUITER_C2_SHIP_STATUS` | `seven-day-c2-recruiter.ts` | PILOT | Controlled / blocked external |
| `RECRUITER_C3_SHIP_STATUS` | `seven-day-c3-notification-prefs.ts` | PILOT | Pilot — in-app only |
| `RECRUITER_C4_SHIP_STATUS` | `seven-day-c4-saved-views.ts` | PILOT | Pilot |
| `RECRUITER_C5_SHIP_STATUS` | `seven-day-c5-activity-timeline.ts` | PILOT | Pilot |
| `CANDIDATE_TIMELINE_SHIP_STATUS` | `all-modules-green-wave-candidate-activity-timeline.ts` | PILOT | Pilot |
| `LAUNCH_STANCE` | `investor-metrics-reality.ts` | `noGo` | Public launch blocked |
| `PILOT_STANCE` | `production-action-gates.ts` | `BLOCKED_BY_FOUNDER` | External pilot blocked |
| `EXTERNAL_PILOT_ENROLLMENT_ENABLED` | `production-action-gates.ts` + DB `feature_flag_states` | **false** default | No real invites |
| `PRODUCT_FUNNEL_EVENTS_ENABLED` | backend `config.py` | `true` | Server funnel writes; set `false` to stop |
| `NEXT_PUBLIC_TTV_MATCHES_REDIRECT` | `features.ts` | on unless `false` | Activation experiment → matches |
| `NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT` | `features.ts` | on unless `false` | Consent-gated client dual-write |
| `ACTIVATION_AUTO_MATCHING_ENABLED` | backend `config.py` | `true` | Auto-match after onboarding |
| `ACTIVATION_TTV_METRICS_ENABLED` | backend `config.py` | `true` | Funnel TTV percentiles block |
| `ACTIVATION_TTV_ALERTS_ENABLED` | backend `config.py` | `true` | Activation quality alerts |
| `NEXT_PUBLIC_ACTIVATION_MATCHING_STATUS_ENABLED` | `features.ts` | on unless `false` | Matches page activation banner |
| `PLATFORM_FOUNDATIONS_WAVE0` | DB seed via `platform_foundations` | `true` | Schema present — not product LIVE claim |
| `CANDIDATE_WAVE1_TRUST_LIVE_PATH` | DB seed via `candidate_wave1` | `true` | Trust UIs use real APIs — LIVE badge still smoke-gated |
| `CANDIDATE_WAVE1_HARD_LIVE_REGISTRY` | DB seed via `candidate_wave1` | `true` | Hard LIVE evidence rows — 6 PASS / 2 PARTIAL after auth smoke 2026-07-20 |
| `CANDIDATE_WAVE1_EXPORT_LIFECYCLE` | DB seed via `candidate_wave1` | `true` | Export preview = self-serve export.json + intake (ops fulfillment separate) |
| `CANDIDATE_WAVE1_MANUAL_IDENTITY_REVIEW` | DB seed via `candidate_wave1` | `true` | Trust identity = manual review status; Authologic start remains HELD |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | DB seed via `candidate_wave1` / `recruiter_wave2` | `false` | Hard ban — MS write blocked |
| `RECRUITER_WAVE2_HARD_LIVE_REGISTRY` | DB seed via `recruiter_wave2` | `true` | Wave 2 Hard LIVE evidence rows |
| `RECRUITER_WAVE2_DECISION_MEMORY_LIVE` | DB seed via `recruiter_wave2` | `true` | Live decision memory API (demo fixtures forbidden) |
| `RECRUITER_WAVE2_TEAM_INVITE_DRY_RUN` | DB seed via `recruiter_wave2` | `true` | Team invite dry-run — no real email |
| `RECRUITER_WAVE2_COMMS_DRAFT_ONLY` | DB seed via `recruiter_wave2` | `true` | Recruiter comms outbox draft only |
| `RECRUITER_WAVE2_DEMO_ISOLATION` | DB seed via `recruiter_wave2` | `true` | Demo journeys forced DEMO_ONLY |
| `COMPANY_WAVE3_HARD_LIVE_REGISTRY` | DB seed via `company_wave3` | `true` | Wave 3 Hard LIVE evidence rows |
| `COMPANY_WAVE3_ORG_SETTINGS_LIVE` | DB seed via `company_wave3` | `true` | Company org settings live persistence |
| `COMPANY_WAVE3_SCORECARDS_LIVE` | DB seed via `company_wave3` | `true` | Company scorecards live (no demo fixtures) |
| `COMPANY_WAVE3_TEAM_INVITE_DRY_RUN` | DB seed via `company_wave3` | `true` | Team invite dry-run — delivery HELD |
| `COMPANY_WAVE3_COMMS_DRAFT_ONLY` | DB seed via `company_wave3` | `true` | Company notifications outbox draft only |
| `COMPANY_WAVE3_DEMO_ISOLATION` | DB seed via `company_wave3` | `true` | Company demo journeys forced DEMO_ONLY |
| `COMPANY_WAVE3_RBAC_MATRIX` | DB seed via `company_wave3` | `true` | Company RBAC matrix + hiring_manager role |

## Hard-ban flags (must remain true / blocked)

| Flag | File | Value | Ban |
|------|------|-------|-----|
| `FORCE_MICROSOFT_CALENDAR_COMING_SOON` | `product-polish-p2.ts` | `true` | No MS Calendar write |
| `ATS_COMING_SOON_NO_LIVE_SYNC` | `seven-day-d6-integrations.ts` | `true` | No ATS writeback |
| `NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON` | `seven-day-d6-integrations.ts` | `true` | Honest integration badges |
| Auto-apply UI | `all-workspace-modules-activation.ts` | PAUSED | No auto-apply |
| `STRIPE_LIVE` / `STRIPE_PUBLIC_LAUNCH` | — / DB flag | **not present** / false | No live Stripe checkout |
| `MICROSOFT_CALENDAR_LIVE` / `ATS_LIVE_SYNC` | — / DB flag | **not present** / false | No MS write / ATS sync |
| `EXTERNAL_PILOT_ENROLLMENT_ENABLED` | gates + DB | **false** | No real cohort enrollment |

## Pilot surface limits

| Persona | Primary limit | Source |
|---------|---------------|--------|
| Candidate | 8 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Recruiter | 5 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Company | 4 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Investor | 99 (public DD) | `CONTROLLED_PILOT_PRIMARY_LIMITS` |

**Note:** Limits do **not** authorize external enrollment while Pilot=BLOCKED_BY_FOUNDER.

## Hidden / hold module IDs

See `FOUNDER_LAUNCH_SCOPE_DECISION_2026-07-08.md` §E — `ALWAYS_HIDDEN_MODULE_IDS` / `HIDDEN_HOLD_MODULE_IDS`.  
Wave 0 honesty: sample/preview trust & team mutations use `NonLiveMutationBanner` + disabled production submits.

## Guard

- `npm run test:hardening-feature-flag-audit-guard` (PR #459)
- `npm run test:founder-launch-scope-decision-guard`
- `npx tsx --test scripts/production-action-gates-guard.test.ts`

**Audit batch 2026-07-13:** no unauthorized LIVE flips detected in wave PRs #448–#460.  
**Wave 0 2026-07-20:** enrollment gate + foundations flags seeded OFF for external pilot.
