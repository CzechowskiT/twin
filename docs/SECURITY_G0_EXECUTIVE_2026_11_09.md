# Executive TWIN G0: security release gate — 2026-11-09

**Status: PR-only / NOT APPROVED for live data or production release.**
No credentials, billing, subscriptions, database migration or paid environment created.

## Implemented in PR #543

1. **Fail-closed Preview backend:** on Vercel `VERCEL_ENV=preview`, Next middleware
   returns HTTP 503 for all `/api/*` requests. Its matcher includes API routes.
   The generic Next API proxy's `getUpstreamApiBase` returns null in Preview.
   The browser's `getPublicApiBase` returns null when a compiled Preview flag
   or Vercel preview metadata is present. The global Preview CSP forbids
   third-party `connect-src`.
2. **Canary admin:** authenticated Founder allowlist, additional step-up/MFA,
   anti-CSRF and preview mutation guard (in the existing canary PR).
3. **Durable stop:** Founder stop pauses future planning *before* requesting
   cancellation of the linked Cursor run. A remote stop request is marked
   `cancelling`, not `cancelled`. It becomes terminal only after a Cursor
   status snapshot or signed webhook confirms the outcome. Failed requests
   leave the job pending/locked, and the parent paused. A completion/cancel
   race is routed to manual review; no auto-finalization of artifacts.
4. **Regression tests:** deletion `step_up` behavior, canary Founder auth,
   Preview source/runtime guard, and remote-cancellation positive/negative
   controls. Tests use mocked Cursor, never live calls.

## Explicit limitations

- `/api/*` Preview blocking is intentionally a temporary total outage
  of Preview backend features, **not** a deployed staging system.
- This code cannot prove that *existing deployed previews* never accessed
  production. It affects builds made from the updated branch; verify the
  exact Vercel deployment SHA and network traces.
- Vercel project environment variables could not be listed using current
  connector permissions (403). There is no evidence of a dedicated staging
  Railway API/DB. Do not configure Preview to point to production.
- The client helper covers normal browser API paths; separately audit custom
  direct `fetch` calls, server-side routes and integration-specific URLs.
- A Cursor stop can be **requested** without confirmation. While waiting,
  the run remains locked and the parent paused; retry/poll is required.
  Cancellation does not undo changes already made by Cursor.
- This is a defense-in-depth change and is NOT a completed security review
  or authorization to merge, deploy, enable a canary, or connect firm data.
- Current unit/CI test results are build-specific. Require green status
  on the final commit, not an earlier commit.

## G0 acceptance checklist (before enabling a live Executive Agent)

- [ ] All GitHub security-regression, smoke and dispatcher checks pass
      on the final reviewed commit.
- [ ] Reviewer confirms neither `NEXT_PUBLIC_API_URL`, `TWIN_API_BASE_URL`,
      `API_URL`, BFF or browser code can route Preview to production.
- [ ] Preview `GET /api/v1/health` returns 503 and no upstream call.
- [ ] Preview admin POST routes are blocked; no secret is sent to browser.
- [ ] Preview CSP enforces `connect-src 'self'` across the site.
- [ ] Full read/write OAuth scopes are mapped separately by tenant;
      no cross-organization grants or shared memory.
- [ ] Fail-closed stop tests pass for remote cancel failures, accepted
      but unconfirmed cancels, and completion races.
- [ ] Founder's approval recorded before provisioning any billable staging
      service or sharing confidential business data.

## Next decision

G0 code and tests may be reviewed without billable services. For a working
Preview against a staging backend, first price **isolated** Railway API,
PostgreSQL and Redis, with independent secrets and OAuth callbacks. Obtain
Founder consent for any additional monthly cost before provision/deploy.
