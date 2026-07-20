# Feature flag registry — 2026-07-13

> **Stance:** Launch NO-GO · Gate F PENDING · no LIVE flips without founder smoke PASS

## Ship-status constants (workspace modules)

| Constant / module | File | Value | Launch scope |
|-------------------|------|-------|--------------|
| `RECRUITER_C1_SHIP_STATUS` | `seven-day-c2-recruiter.ts` | PILOT | Controlled pilot |
| `RECRUITER_C2_SHIP_STATUS` | `seven-day-c2-recruiter.ts` | PILOT | Controlled pilot |
| `RECRUITER_C3_SHIP_STATUS` | `seven-day-c3-notification-prefs.ts` | PILOT | Pilot — in-app only |
| `RECRUITER_C4_SHIP_STATUS` | `seven-day-c4-saved-views.ts` | PILOT | Pilot |
| `RECRUITER_C5_SHIP_STATUS` | `seven-day-c5-activity-timeline.ts` | PILOT | Pilot |
| `CANDIDATE_TIMELINE_SHIP_STATUS` | `all-modules-green-wave-candidate-activity-timeline.ts` | PILOT | Pilot |
| `LAUNCH_STANCE` | `investor-metrics-reality.ts` | `noGo` | Public launch blocked |
| `PRODUCT_FUNNEL_EVENTS_ENABLED` | backend `config.py` | `true` | Server funnel writes; set `false` to stop |
| `NEXT_PUBLIC_TTV_MATCHES_REDIRECT` | `features.ts` | on unless `false` | Activation experiment → matches |
| `NEXT_PUBLIC_PRODUCT_FUNNEL_CLIENT` | `features.ts` | on unless `false` | Consent-gated client dual-write |

## Hard-ban flags (must remain true / blocked)

| Flag | File | Value | Ban |
|------|------|-------|-----|
| `FORCE_MICROSOFT_CALENDAR_COMING_SOON` | `product-polish-p2.ts` | `true` | No MS Calendar write |
| `ATS_COMING_SOON_NO_LIVE_SYNC` | `seven-day-d6-integrations.ts` | `true` | No ATS writeback |
| `NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON` | `seven-day-d6-integrations.ts` | `true` | Honest integration badges |
| Auto-apply UI | `all-workspace-modules-activation.ts` | PAUSED | No auto-apply |
| `STRIPE_LIVE` | — | **not present** | No live Stripe checkout |
| `MICROSOFT_CALENDAR_LIVE` | — | **not present** | No MS calendar OAuth write |

## Pilot surface limits

| Persona | Primary limit | Source |
|---------|---------------|--------|
| Candidate | 8 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Recruiter | 5 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Company | 4 | `CONTROLLED_PILOT_PRIMARY_LIMITS` |
| Investor | 99 (public DD) | `CONTROLLED_PILOT_PRIMARY_LIMITS` |

## Hidden / hold module IDs

See `FOUNDER_LAUNCH_SCOPE_DECISION_2026-07-08.md` §E — `ALWAYS_HIDDEN_MODULE_IDS` / `HIDDEN_HOLD_MODULE_IDS`.

## Guard

- `npm run test:hardening-feature-flag-audit-guard` (PR #459)
- `npm run test:founder-launch-scope-decision-guard`

**Audit batch 2026-07-13:** no unauthorized LIVE flips detected in wave PRs #448–#460.
