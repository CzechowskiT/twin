# Controlled pilot operating manual — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 12 of the long autonomous security session.
A docs-only **operating manual** for running TWIN as a
controlled pilot (up to ~20 named users from the waitlist).
Codifies the daily / weekly / per-event procedures so a future
operator can run the pilot without re-deriving the playbook
each morning. Pairs with the existing `PILOT_*` docs (the
intake template, offer copy, tracker) — this one is the
**operating** layer: what to do, when, with what tooling.

## Pilot definition (binding scope)

| Dimension              | Pilot                                                          | Not pilot                             |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Audience               | ≤20 named candidates, all from `PILOT_TRACKER.csv`             | Public signup spike (= launch)        |
| Visibility             | Founder + pilot users only                                     | LinkedIn / X / press                  |
| Auto-apply scope       | Per-user consent + per-user daily limit                        | Platform-wide nightly sweep allowed   |
| Calendar / placement   | Live (Google + Microsoft + ICS)                                | Same — no scope diff here             |
| Incident response      | This manual + `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`        | Same                                  |
| Rate-limit budget      | SlowAPI defaults + Layer 2 user-keyed                          | Same                                  |

A pilot user *is* a real production user. Pilot ≠ staging.
**Everything that happens to a pilot user is irreversible in
production** unless reverted via the documented path.

## Daily rhythm (founder, ~30 min / day)

### Morning open (08:00 Europe/Warsaw)

1. **Health snapshot.** Run `./scripts/verify-prod-health.sh`.
   Expect all rows OK; if a row fails, work the incident
   runbook before doing anything else.
2. **Auto-apply nightly sweep result.**
   `curl https://twin-production-bcd9.up.railway.app/api/v1/auto-apply/last-sweep`
   Look at:
   - `total_applications_submitted` — non-zero means TWIN
     applied for pilot users overnight.
   - `boards` — per-board breakdown; investigate any board with
     `failed > 0` and `submitted == 0`.
3. **Pilot tracker sweep.** Open `docs/PILOT_TRACKER.csv`. For
   every pilot user with a fresh application in the last 24h,
   write a single-sentence note in the "Yesterday's signal"
   column. If a user has had **zero** applications in 3+
   consecutive nights, mark them as **at-risk** and trigger a
   manual check.

### Midday check (12:00 Europe/Warsaw)

1. **Recruiter inbox.**
   `curl -H "X-Twin-Recruiter-Token: $TOKEN" https://.../api/v1/recruiter/inbox?company_slug=…`
   Confirm at least one pilot user's application is showing in
   the recruiter view.
2. **Calendar sync.** If any pilot has an interview today,
   confirm the event landed in their calendar provider — check
   their consented provider (Google / Microsoft / ICS) for the
   event with the title prefix we set.

### Evening close (18:00 Europe/Warsaw)

1. **Smoke + Vercel canonical alias guard.**
   `gh run list --workflow smoke.yml --limit 3` → all green;
   `bash scripts/check-vercel-canonical-alias.sh` → drift
   logged but not breaking.
2. **Day journal.** Append a line to
   `docs/PILOT_TRACTION_DASHBOARD.md` of the form
   `2026-05-27 — N applications, M interviews scheduled, K placements verified, 0 incidents`.

## Weekly rhythm (founder, ~2h / week)

| Day                      | Action                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Monday morning**       | 30-min retro on last week's pilot tracker. Identify the 3 highest-friction touchpoints. |
| **Mid-week (Wed)**       | Per-user 1:1 (15 min) with one at-risk pilot user from the daily sweep.                  |
| **Friday afternoon**     | Weekly placement-verification reconciliation (`docs/PLACEMENT_VERIFICATION.md` §"Weekly"). |
| **Friday evening**       | Send weekly digest to pilot users: their personal stats + new TWIN features (read-only).  |

## Per-event playbooks

### A pilot user reports a broken application

1. Pull `tail -F` on the prod logs in the Railway dashboard;
   grep for the user's email.
2. If the failure was a **scraper / Playwright** issue —
   check `docs/AUTO_APPLY_RELIABILITY_REPORT.md` for the
   known-failure-mode list. If new, file a P2.
3. If the failure was a **policy / consent** issue —
   verify the user's `AutoApplyConsent` row is `is_active=True`
   and `consent_given_at IS NOT NULL`. If not, walk them
   through the consent UI.
4. **Never re-trigger the apply from the backend directly.**
   The trigger-sweep endpoint is ops-only; the per-user
   `/auto-apply/trigger` route exists for the user themselves
   (rate-limited Layer 2).

### A pilot user reports a missed interview

1. Pull the application row:
   `curl -H "Authorization: Bearer $JWT" .../api/v1/applications/{id}`.
2. Confirm the `ScheduledInterview` row exists in `scheduled_interviews`.
3. If yes, confirm the calendar provider sync ran (Google /
   Microsoft) — re-trigger from the dashboard if the user
   wants.
4. If no, this is a **placement-state bug**, not a scrape
   issue. Open a P1 against `app/services/scheduled_interview*.py`.

### A recruiter (B2B pilot side) reports a spam-looking application

1. Pull the application's `match_score` and trail.
2. If `< 0.6`, the matching algorithm let the application
   through anyway — check the user's `min_score_threshold`
   on `AutoApplyConsent`. Threshold drift is a real failure
   mode of long-running pilots.
3. Tell the recruiter the score; either raise the user's
   threshold or auto-decline future applications below the
   recruiter's bar.

### A pilot user wants to leave the pilot

1. Confirm the request in writing (email + WhatsApp).
2. Flip the user's `is_active=False` in DB **only** after
   you've exported their data via `/api/v1/auth/me/export`
   (manual today; doc gap on `L6`).
3. Soft-delete their `AutoApplyConsent` row by setting
   `is_active=False`.
4. Mark them `withdrawn` in `PILOT_TRACKER.csv`.

## Kill-switches (when to flip)

| Trigger                                                    | Action                                                                                        | Recovery                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| > 3 pilot users report duplicate applications same day      | Set `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false`; redeploy backend                                  | Confirm Stripe `event.id` dedup is live; re-enable beat |
| Recruiter token leak in chat / Slack screenshot             | Rotate `RECRUITER_COMPANY_TOKEN` via Railway env; redeploy                                    | Doc the leak in `INCIDENT_RESPONSE_RUNBOOK`             |
| One pilot user generates 10× the median scrape volume       | Investigate scrape-ops; their JWT could be running automation outside the dashboard           | Talk to user; revoke token if intentional automation    |
| CSP enforce mode breaks a dashboard route                   | Flip `Content-Security-Policy` → `Content-Security-Policy-Report-Only` (1-char in next.config) | Re-run the burn-in for 72h                              |
| LLM provider returns 429 / 5xx > 10% of calls               | Confirm Layer 2 user-keyed rate-limit is binding; consider lowering bucket to 30/min          | Re-tune budgets after a week of preview traffic         |
| Auto-apply submits a recruiter's job we don't have scope for | Stop the apply for that job board: set `SCRAPE_BOARDS` env minus the offending board, redeploy | Add explicit per-job-board allowlist                    |

## What this manual does **not** cover

- Migration / DB-schema changes — see `RELEASE_PLAYBOOK`
  (not on branch yet; future doc).
- Calendar provider OAuth setup — `docs/APPLE_LOGIN_*.md`,
  `setup-microsoft-azure.sh`, and Vercel env app.
- Pricing / plan-tier changes — `docs/STRIPE_*.md`.
- Public messaging — `docs/RELEASE_NOTES_INVESTOR_DEMO.md`
  plus the marketing channels owned by the founder.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No DB migration.
- ✅ No `.env` change.
- ✅ No secret in this doc.
- ✅ No UX / copy change.
- ✅ No public-launch messaging.

## Files

- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` (this doc).

## Related

- `docs/PILOT_INTAKE_FORM_TEMPLATE.md`,
  `docs/PILOT_OFFER_FINAL.md`,
  `docs/PILOT_OFFER_COPY_PL.md`,
  `docs/PILOT_TRACKER.csv`,
  `docs/PILOT_TRACKER_GUIDE.md`,
  `docs/PILOT_TRACTION_DASHBOARD.md` — pilot collateral.
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` (this
  session, TASK 13) — the on-call procedure referenced by
  the per-event playbooks.
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (this
  session, TASK 11) — pilot vs launch boundary.
- `docs/PLACEMENT_VERIFICATION.md` — the verification
  mechanic the Friday reconciliation references.
- `.cursorrules` — pilot-related principles (calendar of
  acceptance, placement verification, calendar
  integrations).
