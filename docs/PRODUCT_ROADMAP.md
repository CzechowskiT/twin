# TWIN product roadmap (living doc)

North star: **short calendar of acceptance-ready moments** — not inbox noise.

## Why these priorities

| Priority | Bet | Rationale |
|----------|-----|-----------|
| Calendar + placement verification | Trust & fees | Revenue and retention depend on **verified hires** landing on real calendars, not spam applications. |
| Data corpus + matching | Supply | Without validated jobs and profile signal, the agent has nothing acceptance-worthy to show. |
| Ops automation | Scale | Human email ping-pong does not scale; machine-assisted verification + ATS webhooks do. |
| Billing (Stripe) | Sustainability | Premium unlocks autonomous apply and calendar depth once core loop works. |

## Shipped (2026-05-19 session — `cursor/phase1-monorepo-scaffold`)

- Quantica compliance: onboarding, help, feedback, admin metrics, lifecycle email
- Dashboard: WebCal one-click, Microsoft calendar connect, empty jobs state
- Public `/status`, `/developers`, OpenAPI export
- Placement: work-email verify, employer attest link, dispute queue, ATS hire → verified
- Ops: data-quality + metrics + placement dispute admin UI
- Worker: interview reminders, placement retention beat, scrape beat guards
- Ops dispute queue + resolve API; Ashby/Lever/Greenhouse ATS hire → verified
- Partner API keys (hashed), acceptance queue UI, mobile calendar strip, employer slug URLs

## Next 10 (proposed)

1. **Production secrets on Railway** — mail, Stripe test→live, Microsoft OAuth (`docs/RAILWAY_PROD_ENV_PL.md`). *Unblocks real user E2E.*
2. **Dedicated `twin-worker` service** — Celery beat + scrape off API process. *Reliability for overnight jobs.*
3. **Stripe Premium E2E in staging** — `docs/STRIPE_E2E.md` then flip live prices. *Monetization proof.*
4. **Scrape corpus growth** — ops allowlist + monitor `validated_jobs` on `/status`. *Matching needs supply.*
5. **Interview reminder copy + prod beat** — verify emails when `mail_configured`. *North star = calendar moments.*
6. **Ashby webhook** — same pattern as Greenhouse/Lever. *Enterprise ATS coverage.*
7. **B2B partner API keys** — scoped tokens for integrators (read matches, post applications). *Distribution without UI-only.*
8. **Placement dispute resolution API** — ops mark resolved / re-open from admin UI. *Close the exception loop.*
9. **Recruiter batch acceptance UI** — short list of pre-qualified slots (calendar north star). *Reduce noise toward accept/decline.*
10. **Mobile-friendly dashboard strip** — calendar + next interview on small viewports. *Candidates check phone, not desktop.*

## Out of scope for Phase 1 (explicit)

- Manual “did you sign yet?” email campaigns as default workflow
- LinkedIn scraping as placement proof (policy risk)
- Full employer portal before candidate loop is stable
