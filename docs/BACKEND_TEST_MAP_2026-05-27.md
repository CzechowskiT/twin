# Backend test map — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 24 of the long autonomous security session.
A docs-only map of all 138 backend test files, grouped by
concern. Pairs with `BACKEND_ROUTE_INVENTORY_2026-05-27.md`
(routes) and `SECURITY_RISK_REGISTER_2026-05-27.md` (risks).

The point of this map is not to be exhaustive but to make
"where do I add the next test for X?" a one-glance decision.

## Stats

- 138 test files in `backend/tests/`
- 7 of them are in the CI smoke set (see
  `.github/workflows/smoke.yml` and
  `SMOKE_COMMAND_REFERENCE_2026-05-27.md`)
- Remaining 131 run only on `pytest -q` locally / in a manual
  CI run

## Group: Authentication & access (16 files)

| File                                          | Covers                                                 |
| --------------------------------------------- | ------------------------------------------------------ |
| `test_auth_integration.py`                    | End-to-end login / register / me                       |
| `test_auth_login_rate_limit.py`               | `/auth/login` 5/min cap                                |
| `test_auth_reset_password_rate_limit.py`      | `/auth/forgot-password` rate cap                       |
| `test_auth_me_scrape_flags.py`                | `/auth/me` exposes `is_ops`                            |
| `test_auth_notification_preferences.py`       | `/auth/me/notification-preferences`                    |
| `test_auth_oauth_redirect.py`                 | OAuth provider redirect (state cookie)                 |
| `test_provider_oauth_helpers.py`              | OAuth helper unit tests                                 |
| `test_web_oauth.py`                           | OAuth web flow integration                              |
| `test_linkedin_oauth.py`                      | LinkedIn OAuth                                          |
| `test_change_password.py`                     | `/auth/me/password`                                     |
| `test_password_reset.py`                      | Password reset flow                                     |
| `test_email_verification.py`                  | `/auth/verify-email` flows                              |
| `test_integration_auth_flow.py`               | Cross-route auth integration                            |
| `test_request_id.py`                          | `X-Request-ID` middleware                              |
| `test_request_locale.py`                      | Locale resolution middleware                            |
| `test_user_rate_limiter.py`                   | Layer 2 user-keyed rate-limit (R-005)                  |

## Group: Beta waitlist (3 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_beta_waitlist_rate_limit.py`         | 5/min cap on `/beta/join`                          |
| `test_beta_waitlist_mail.py`               | Welcome email rendering                            |
| `test_beta_waitlist_contract.py`           | Public-surface contract (Backlog 17, this session) |

## Group: Auto-apply (12 files)

| File                                                  | Covers                                              |
| ----------------------------------------------------- | --------------------------------------------------- |
| `test_auto_apply.py`                                  | Core auto-apply unit tests                          |
| `test_auto_apply_demo_simulation.py`                  | Investor demo path                                  |
| `test_auto_apply_guards.py`                           | Pre-submission validation                            |
| `test_auto_apply_investor_demo.py`                    | Investor demo end-to-end                             |
| `test_auto_apply_settings_api.py`                     | `/auto-apply/settings` PATCH                         |
| `test_auto_apply_trigger_sweep_admin_gate.py`         | Ops-only gate on `trigger-sweep` (R-002, hardened)  |
| `test_applications_auto_apply_auth.py`                | Auto-apply requires auth                             |
| `test_nightly_auto_apply.py`                          | Nightly batch unit tests                             |
| `test_nightly_auto_apply_integration.py`              | Nightly batch integration                            |
| `test_nightly_auto_apply_mail.py`                     | Nightly batch email digest                           |
| `test_market_scrape_no_auto_apply.py`                 | Scrape never triggers auto-apply                     |
| `test_ops_auto_apply.py`                              | Ops endpoints for auto-apply                         |

## Group: Applications & placement (12 files)

| File                                                  | Covers                                              |
| ----------------------------------------------------- | --------------------------------------------------- |
| `test_acceptance_queue.py`                            | Candidate acceptance queue                           |
| `test_admin_placement_queue.py`                       | Admin placement queue UI                             |
| `test_application_package_pdf.py`                     | PDF generation for application bundle                |
| `test_application_submission_truth.py`                | Application state machine truthiness                 |
| `test_applications_export.py`                         | `/applications/me/export.{csv,xlsx}`                 |
| `test_applications_me_list.py`                        | `/applications/me` list                              |
| `test_applications_package_presign.py`                | S3 presign URL for auto-apply package                |
| `test_placement_dispute.py`                           | Placement dispute resolution                          |
| `test_placement_employer_attest.py`                   | Employer attestation flow                            |
| `test_placement_employer_preview.py`                  | Employer attestation preview                          |
| `test_placement_events_access.py`                     | Placement events audit log                            |
| `test_placement_tasks.py`                             | Placement Celery tasks                                |
| `test_placement_verification.py`                      | Verification state machine                            |
| `test_ops_resolve_placement_dispute.py`               | Admin placement dispute resolve                       |

## Group: Calendar (5 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_calendar_me_interviews.py`           | `/calendar/me/interviews`                          |
| `test_calendar_oauth_redirect.py`          | Google / Microsoft OAuth redirect                  |
| `test_calendar_routes.py`                  | Calendar route inventory                            |
| `test_calendar_scheduling.py`              | Slot scheduling logic                               |
| `test_ics_export.py`                       | `.ics` export                                       |
| `test_webcal_feed.py`                      | WebCal subscribe feed                               |

## Group: Candidates / matching (10 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_candidate_readiness.py`              | Readiness score                                    |
| `test_candidates_matches_export.py`        | Matches CSV/XLSX export                            |
| `test_candidates_me_export_json.py`        | GDPR self-export                                   |
| `test_career_compass.py`                   | Career compass milestones                          |
| `test_matcher.py`                          | Matching algorithm unit tests                       |
| `test_matcher_sales.py`                    | Sales-specific matching                            |
| `test_matching_service.py`                 | Matching service                                    |
| `test_matching_quality_admin.py`           | Admin matching-quality metric                       |
| `test_match_jobs_scan_limit.py`            | Per-scan job limit                                  |
| `test_match_reason.py`                     | Match reason explanation                            |
| `test_ranking.py`                          | Ranking sort                                        |
| `test_skill_matcher.py`                    | Skill-level matching                                |
| `test_job_match_feedback.py`               | Thumbs-up/down feedback                             |

## Group: Career assistant & interview coach (3 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_career_assistant.py`                 | All 7 career assistant LLM endpoints               |
| `test_cv.py`                               | CV parser / store                                   |
| `test_cv_tailoring.py`                     | Tailored CV generation                              |

## Group: Scrapers (7 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_global_boards.py`                    | Global board registry                              |
| `test_greenhouse_scraper.py`               | Greenhouse JSON scraper                            |
| `test_linkedin_parser.py`                  | LinkedIn HTML parser                               |
| `test_pracuj_parser.py`                    | pracuj.pl parser                                   |
| `test_rocketjobs_parser.py`                | rocketjobs.pl parser (CI smoke)                    |
| `test_scrape_all_boards.py`                | `/jobs/scrape/all` route                            |
| `test_scrape_authorization.py`             | Ops-only gate on scrape                            |
| `test_scrape_ops.py`                       | Scrape ops audit                                    |
| `test_scrape_run_tracking.py`              | Scrape-run telemetry                                |
| `test_scraper_validation.py`               | Scraped-row validation                              |

## Group: Stripe / billing / referrals (8 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_billing_plans.py`                    | `/billing/plans`                                    |
| `test_plans.py`                            | Plan-tier model                                     |
| `test_stripe_checkout_methods.py`          | Checkout session creation                           |
| `test_stripe_event_dedup_helpers.py`       | Dedup helpers (R-004 partial)                       |
| `test_stripe_tier_mapping.py`              | Plan-tier ↔ Stripe price mapping (CI smoke)         |
| `test_stripe_webhook_signature.py`         | Webhook signature verification                       |
| `test_subscription_gates.py`               | Subscription gates                                   |
| `test_subscription_public_metrics.py`      | Public metrics aren't gated                          |
| `test_referral_program.py`                 | Referral payout state machine                        |
| `test_signup_referral.py`                  | Sign-up via referral code                            |
| `test_linkedin_viral_incentive.py`         | LinkedIn-share incentive (R-023)                     |

## Group: Recruiter & partner (5 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_recruiter_company_auth.py`           | Recruiter token auth                               |
| `test_recruiter_inbox.py`                  | Recruiter inbox (CI smoke)                          |
| `test_recruitment_feedback.py`             | Recruiter feedback                                  |
| `test_partner_api_keys.py`                 | Partner API keys                                    |
| `test_partner_export.py`                   | Partner CSV export                                  |
| `test_partner_revoke.py`                   | Partner API key revoke                              |
| `test_integrations_ats.py`                 | ATS OAuth integrations (Ashby, Greenhouse, Lever)   |

## Group: Public surface & security headers (5 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_public_mvp_stats.py`                 | `/public/mvp-stats` (CI smoke)                     |
| `test_public_health_regression.py`         | `/health` + `/health/celery-status` contract (R-015, R-016) |
| `test_csp_report.py`                       | CSP report sink happy path                          |
| `test_csp_report_sanitization.py`          | CSP report sink whitelist + sanitisation (R-024)    |
| `test_cookie_consent_api.py`               | `/consent/cookies` route                            |
| `test_compliance.py`                       | GDPR / consent surface                              |

## Group: Health / ops / startup (8 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_health_features.py`                  | `/health` (CI smoke)                               |
| `test_health_celery_status.py`             | `/health/celery-status` detail                      |
| `test_ops_demo_refresh.py`                 | Ops demo refresh (CI smoke)                         |
| `test_main_openapi.py`                     | `/openapi.json` shape                              |
| `test_app_import_boot.py`                  | App boots without circular imports                  |
| `test_startup_validation.py`               | Required env vars at boot                            |
| `test_config.py`                           | `app/config.py` settings parsing                    |
| `test_config_redis_url.py`                  | Redis URL parsing                                    |

## Group: Jobs / opportunities (10 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_job_competitive_api.py`              | Job competitive intel                              |
| `test_job_feed_stats.py`                   | `/jobs/feed-stats`                                  |
| `test_job_matching_v2.py`                  | Match score v2                                       |
| `test_job_search.py`                       | `/jobs/` query                                       |
| `test_job_storage_prepare.py`              | Storage prep                                         |
| `test_market_coverage.py`                  | Market coverage stats                                |
| `test_market_coverage_admin.py`            | Admin coverage view                                  |
| `test_market_scrape_batches.py`            | Scrape batch sizing                                  |
| `test_validate_job.py`                     | Scraped row validation                                |
| `test_company_intelligence.py`             | Company intel cache                                   |

## Group: Misc (10 files)

| File                                       | Covers                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `test_geo_api.py`                          | `/geo/jurisdiction-hint`                            |
| `test_geo_jurisdiction.py`                 | Jurisdiction inference logic                          |
| `test_data_quality_metrics.py`             | Data-quality admin                                    |
| `test_data_room_upload.py`                 | Investor data room                                     |
| `test_demo_snapshot.py`                    | Demo snapshot                                          |
| `test_email_templates.py`                  | Email template rendering                               |
| `test_employer_leads.py`                   | Employer lead capture                                  |
| `test_kyc_authologic.py`                   | Authologic KYC                                          |
| `test_product_feedback.py`                 | `/feedback`                                              |
| `test_profile_documents.py`                | Candidate document store                                  |
| `test_reminder_tasks.py`                   | Reminder Celery tasks                                     |
| `test_requirements_split.py`               | Requirement extraction                                     |
| `test_seed_investor_demo.py`               | Seed investor demo data                                    |
| `test_slug.py`                             | Slug helper                                                |
| `test_talent_pool.py`                      | Anonymous talent pool                                       |
| `test_strategic_vision.py`                 | Strategic vision endpoints                                  |
| `test_autonomous_execution.py`             | Autonomous execution loop                                    |
| `test_celery_beat_schedule.py`             | Celery beat config                                            |
| `test_celery_beat_market_schedule.py`      | Market-schedule beat                                          |

## What this map enables

- **"Where do I add a test for X?"** — jump to the group above
  and pattern-match.
- **"Which tests cover risk R-XXX?"** — cross-reference column
  notes inline.
- **"What runs on CI smoke?"** — the 7 tests called out by name
  in `SMOKE_COMMAND_REFERENCE_2026-05-27.md`.
- **"What's the coverage gap?"** — visible groups that look
  thin (only 1-2 files) are candidates for a future test
  audit.

## Suggested next-actions (out of scope this session)

- The **placement** group is 8 files — good coverage; consider
  consolidating fixtures.
- The **calendar** group has 5 files — possibly missing a
  Microsoft-Graph integration smoke; file as a follow-up.
- The **scrapers** group lacks an `is_validated=False`
  contract test; file as a follow-up.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No test added or modified in this commit.
- ✅ No deploy / Railway / Vercel / DB change.

## Files

- `docs/BACKEND_TEST_MAP_2026-05-27.md` (this doc).

## Related

- `docs/BACKEND_ROUTE_INVENTORY_2026-05-27.md` — the routes
  these tests cover.
- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` — the risks
  these tests retire.
- `.github/workflows/smoke.yml` — CI smoke set.
- `docs/SMOKE_COMMAND_REFERENCE_2026-05-27.md` — how to run
  any of these locally.

Backlog 24 of the long autonomous security session.
