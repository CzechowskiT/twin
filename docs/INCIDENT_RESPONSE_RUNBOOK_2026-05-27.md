# Incident response runbook — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 13 of the long autonomous security session.
A docs-only runbook for handling production incidents on TWIN
(Phase 1, pilot stage). Codifies severity grading, who does
what, and the minimum diagnostic / recovery / post-mortem
steps. Pairs with the controlled pilot manual and the security
risk register.

## Severity matrix

| Sev | Definition                                                                                                | Example                                                                                                                                | Response window |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **S0** | Total outage or active data-loss / security-breach                                                       | API 5xx for > 5 min; Railway DB unreachable; recruiter token leaked publicly; mass mis-submission to job boards                        | < 15 min        |
| **S1** | Major surface broken, customer impact in real time                                                       | Login broken; calendar sync broken; auto-apply nightly sweep didn't run; placement state machine wedged                                | < 1 hour        |
| **S2** | Single-user / single-route degradation                                                                   | One pilot user's scraper failing; one OAuth provider's callback slow; one recruiter inbox stuck                                         | < 1 day         |
| **S3** | Cosmetic / non-blocking                                                                                  | Stale market-coverage stat; one i18n string wrong; flaky e2e test                                                                      | next sprint     |

## Roles

The founder is on-call for every severity today. When the team
grows, this section gets re-written.

| Role                  | Responsibility                                                                                                                          | Today      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Incident commander**| Decides severity, drives the timeline, owns comms                                                                                       | Founder    |
| **Operator**          | Runs the diagnostic / recovery commands                                                                                                  | Founder    |
| **Scribe**            | Logs every command + decision into the post-mortem doc                                                                                   | Founder    |
| **Comms**             | Decides what to tell affected users (status page note, direct DM, both)                                                                  | Founder    |

When the team is one person, all four roles collapse into one
human. The structure exists so the next hire can be plugged
into a specific role without re-deriving the playbook.

## Triage flow (15-minute checklist for S0 / S1)

1. **Confirm the incident is real.**
   - For an API outage: `curl https://twin-production-bcd9.up.railway.app/api/v1/health` ; expect `200 {"status":"ok"}`.
   - For a frontend outage: `curl -sI https://twin-sooty.vercel.app/` ; expect `200`.
   - For a "feels slow" report: `curl -w '%{time_total}\n' -o /dev/null -s https://twin-production-bcd9.up.railway.app/api/v1/health` ; > 5s on this endpoint is a real signal.
2. **Snapshot what's broken.**
   - Railway logs (`railway logs --service=api`).
   - GitHub Actions latest smoke (`gh run list --limit 3 --workflow smoke.yml`).
   - Vercel deployment status on `twin` project (`npx vercel inspect twin-sooty.vercel.app`).
3. **Set severity** (use the matrix above).
4. **Open the post-mortem doc immediately** —
   `docs/POSTMORTEM_<YYYY-MM-DD>_<short-slug>.md`. Include the
   minute-by-minute log starting now. (You're not writing
   prose; you're writing a timeline.)
5. **Decide on the recovery move** (see "Recovery playbooks"
   below).
6. **Tell users**, in this order: status page first, then
   pilot users by DM if S0/S1. Use a one-line template:
   *"We're aware of <symptom> on TWIN since <UTC time>. We're
   investigating and will update by <UTC + 30 min>."*
7. **Re-verify** every 15 min until resolved.

## Recovery playbooks (paste-ready)

### API outage (S0)

```
# 1. Is Railway up?
railway status

# 2. Is the API container up?
railway service status --service=api

# 3. Is the DB reachable from the API?
curl -fsS https://twin-production-bcd9.up.railway.app/api/v1/health?db=true | jq

# 4. If the API is up but DB isn't:
#    - check Railway Postgres add-on
#    - confirm DATABASE_URL hasn't been rotated
#    - confirm SSL is on the DSN

# 5. If both API and DB are up but the route returns 5xx,
#    that's an application error — pull the last logs and
#    `git revert` the last deploy.
git log -3 --oneline
git revert <bad-sha>
git push
# Vercel + Railway auto-redeploy on push.
```

### Webhook replay (Stripe sends a duplicate `invoice.payment_succeeded`)

Until the `stripe_webhook_events` migration ships
(`P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`):

```
# Confirm the user's subscription_invoice_payment_count.
psql $DATABASE_URL -c "SELECT email, subscription_invoice_payment_count FROM users WHERE email='affected@user';"

# If it's one too high, decrement it in a transaction.
psql $DATABASE_URL -c "BEGIN; UPDATE users SET subscription_invoice_payment_count = subscription_invoice_payment_count - 1 WHERE email='affected@user'; COMMIT;"

# Document the manual fix in the post-mortem.
```

After the migration ships, dedup is automatic and this
playbook moves to historical.

### CSP enforce broke a route

```
# Edit frontend/next.config.ts: rename
#   "Content-Security-Policy" → "Content-Security-Policy-Report-Only"
# Push:
git commit -am "fix(security): csp enforce → report-only rollback"
git push
# Vercel auto-redeploys in 60-90s; rollback is a one-character
# header rename, no data side-effect.
```

### Auto-apply submitted to a wrong job

```
# Stop the beat immediately.
railway variables set NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false --service=worker
# Open a manual contact to the recruiter with an apology.
# Document the failure mode; consider an explicit board-allowlist.
```

### Recruiter token leaked publicly

```
# Rotate immediately:
railway variables set RECRUITER_COMPANY_TOKEN=<new-random-value> --service=api
# Push the new token to the affected recruiter through a
# secure channel (1Password share link, not email).
```

## Comms templates

- **Status page note (S0):** *"We're aware of <symptom>. ETA
  to resolution: <UTC>. Updates here every 30 min."*
- **Pilot DM (S0/S1):** *"Hi <name> — we just hit
  <symptom> on TWIN. Your <pilot artefact> is safe and we'll
  follow up by <UTC>. Sorry for the disruption."*
- **Status page closing note:** *"Resolved at <UTC>. Root
  cause: <one sentence>. Customer-visible impact: <one
  sentence>. Post-mortem will be linked here."*

## Post-mortem template

Write one (and only one) post-mortem per incident. Copy
this template into `docs/POSTMORTEM_<YYYY-MM-DD>_<slug>.md`:

```
# Postmortem: <slug> — <YYYY-MM-DD>

## Summary
- Severity: S0 / S1 / S2 / S3
- Detected at: <UTC>
- Resolved at: <UTC>
- Customer-visible impact: <one sentence>

## Timeline (UTC)
- 12:00 — first report from <user>.
- 12:02 — confirmed via `curl /api/v1/health`.
- 12:10 — `git revert <sha>` pushed.
- 12:15 — Vercel deploy live.
- 12:17 — `curl /api/v1/health` returns 200; resolved.

## Root cause
<one paragraph>

## What worked
<bullets>

## What didn't
<bullets>

## Follow-up actions
- [ ] <action 1> — owner, due date.
- [ ] <action 2> — owner, due date.
```

## What this runbook does **not** cover

- Pre-prod debugging — that's `.cursorrules` + local
  testing.
- Migration playbook — separate doc when migration freeze
  lifts.
- Pilot-specific procedures (consent disputes, individual
  user comms) — those live in
  `CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md`.
- Public-launch announcement comms — out of scope for the
  session HARD BAN.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel change in this commit.
- ✅ No DB migration in this commit.
- ✅ No `.env` change.
- ✅ No secret in this doc.
- ✅ No UX / copy change.
- ✅ No public-launch messaging.

## Files

- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` (this doc).

## Related

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` —
  references this runbook on gate O8.
- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` —
  references this runbook in its per-event playbooks.
- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` (this
  session, TASK 14) — the surface this runbook acts on.
- `docs/DEPLOY_VERIFICATION_CHECKLIST.md` — post-deploy
  verification steps, complementary to incident response.
