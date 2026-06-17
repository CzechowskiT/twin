# GDPR / Consent / Contact History — 2026-06-17

**Branch:** `product/gdpr-consent-contact-history-2026-06-17`  
**Routes:** trust workspace + consent/contact-history aliases (recruiter + company)

## Purpose

Recruiter/company-facing **trust layer** connected to Candidate Profile 360, Job Pipeline, and Collaboration — consent status, data source & legal basis (not legal advice), contact permission, contact history timeline, retention/review, risk flags, candidate trust boundary, and audit connections. **Pilot/sample only** for `demo-candidate-001` and `demo-role-001`; invalid IDs render meaningful not-found (not Next 404 shell).

## Page sections (9)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — candidate/role, consent badge, contact permission badge, last reviewed, profile/pipeline/collaboration links, pilot badge | Pilot sample |
| 2 | Consent status — requires review for demo-candidate-001, source, dates, owner, confidence | Pilot sample |
| 3 | Data source & legal basis — candidate-submitted/ATS/recruiter/referral/talent pool; processing context; allowed purposes — not legal advice | Pilot sample |
| 4 | Contact permission — can contact after review; channels demo (email review required, phone not allowed, LinkedIn not live, automated prohibited) | Demo-only |
| 5 | Contact history timeline — deterministic events (imported, consent review, talent radar, digest, note, feedback requested; no outbound sent) | Pilot sample |
| 6 | Retention/review — retention status, next review, disabled review/delete buttons | Demo-only (read-only) |
| 7 | Risk flags — missing consent evidence, source verification, role-specific only, no auto outreach, data minimization | Pilot sample |
| 8 | Candidate trust boundary — human decision required, no auto-outreach | Live copy |
| 9 | Audit/decision memory — connections to Profile 360, Collaboration, Pipeline, Digest | Pilot sample |

## Routes

### Recruiter (candidate)

- `/recruiter/candidates/demo-candidate-001/trust` (primary)
- `/recruiter/candidates/demo-candidate-001/consent` (alias)
- `/recruiter/candidates/demo-candidate-001/contact-history` (alias)

### Recruiter (job)

- `/recruiter/jobs/demo-role-001/consent`

### Company

- `/company/candidates/demo-candidate-001/trust`
- `/company/candidates/demo-candidate-001/consent`
- `/company/candidates/demo-candidate-001/contact-history`
- `/company/roles/demo-role-001/consent`

## Data boundary

- **Demo:** `frontend/src/lib/candidate-trust-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateTrust()` / `resolveJobTrust()` return demo record only for sample IDs.

## Link integration

- **Candidate Profile 360** — consent/GDPR section → trust route.
- **Collaboration** — trust badge → trust route.
- **Job Pipeline** — candidate card consent badge → trust route.
- **`/demo` journey** — `trust` step → `/recruiter/candidates/demo-candidate-001/trust`.
- **Team collaboration (2026-06-17)** — trust audit connections → team workspace.

## Copy constraints

Never use: "GDPR compliant", "legally compliant", "fully compliant", "safe to contact", "automatic outreach", "automatic application", "we sent", "email sent".

Use: "requires review", "pilot signal", "privacy review needed", "human decision required", "not legal advice", "not live", "demo-only".

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no email send.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:gdpr-consent-contact-history
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:gdpr-consent-contact-history-browser
```

## Constants

- `frontend/src/lib/candidate-trust.ts`
- `frontend/src/components/recruiter/candidate-trust-workspace.tsx`
