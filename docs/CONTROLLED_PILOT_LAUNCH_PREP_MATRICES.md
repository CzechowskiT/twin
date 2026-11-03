# Controlled pilot + launch prep matrices

**Stance frozen:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Gate F PASS · Pilot READY

## Legal readiness

| Item | Status | Notes |
|------|--------|-------|
| Privacy / Terms routes | READY | `/privacy` `/terms` LIVE |
| GDPR consents on register | READY | invite-only gated |
| DSR / privacy requests | READY | candidate trust path |
| Cookie consent | READY | existing |
| AI Act marketing claim | HELD | LEGAL_MARKETING_CLAIM — no false certified claim |

## Security readiness

| Item | Status | Notes |
|------|--------|-------|
| RC1 security gate | PASS | Crit/High honesty |
| Invite-only register | ON | non-allowlisted → 403 |
| Admin unauth | 404 | |
| Ops Bearer on pilot-os | REQUIRED | |
| Secrets in health | FORBIDDEN | guarded |

## Commercial readiness

| Item | Status | Notes |
|------|--------|-------|
| Stripe public | NOT_LIVE | test/sandbox only |
| Company pilot price env | PREP | no public checkout claim |
| Billing prep | TEST_ONLY | |
| Success fee / placement | MACHINE-ASSISTED | see PLACEMENT_VERIFICATION |

## Monitoring / SLO (pilot)

| Signal | Target | Source |
|--------|--------|--------|
| API health | status=ok | `/api/v1/health` |
| Worker active | true | public-health celery |
| Invite gate | 403 non-allowlist | security gate |
| Support open tickets | triage <24h | pilot-os tickets |
| On-call assigned | true/true | health rc1_* |

## Website / marketing foundation

| Item | Rule |
|------|------|
| twin.care apex | Afternic park — do not market as open product |
| Operational URL | twin-sooty.vercel.app |
| Logos / quotes | No fake customer logos or testimonials |
| Demo env | `/demo` + synthetic identities only |

## Public enrollment architecture

Prepared behind `EXTERNAL_PILOT_ENROLLMENT_ENABLED=false` + invite-only.  
Capability endpoints may say engineering-ready; kill-switch stays OFF.

## Optional integration demand tracking

Track demand only (do not enable): MS Graph write, ATS live sync, Authologic KYC, Slack webhook — remain OPTIONAL / BLOCKED for write paths.
