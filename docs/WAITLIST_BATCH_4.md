# Waitlist / traction — batch 4 (backlog + shipped in repo)

## Proposed next (priority order)

1. **Scrape ops by email** — `SCRAPE_OPS_EMAILS` on Railway (no numeric user id).
2. **Dashboard scrape guard** — `/auth/me` exposes `can_trigger_scrape`; button disabled with setup hint before 403.
3. **Waitlist live stats** — banner when API stats fail; pulse when live.
4. **Referral share** — Web Share API + copy on signup success.
5. **OpenGraph image** — static `/waitlist/opengraph-image` (locale-aware title already shipped).
6. **Microsoft calendar OAuth** — Graph read busy + propose events (corporate users).
7. **Placement verification slice** — in-product attestation + Celery retention (see `docs/PLACEMENT_VERIFICATION.md`).
8. **Waitlist → dashboard bridge** — email links with `?ref=` deep link (done on landing; extend in lifecycle emails).

## Shipped in this batch

- Scrape ops email allowlist + dashboard pre-check.
- Waitlist stats live/offline UX + share on success.
