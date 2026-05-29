# Career intelligence product backlog — 2026-05-27

**North star:** fewer noisy applications, more **acceptance-ready calendar**
moments (see `.cursorrules`). This doc captures Phase 1+ signals work
without shipping large UX untested.

## Themes

1. **AI-resilience signals** — roles less exposed to automation risk (skills
   mix, task type, industry trend flags). Output: ranked explanation on
   job cards, not a separate feed.
2. **Repositioning hints** — when match score is high but apply volume is
   low, suggest title/skill tweaks from profile gaps (Claude batch, Celery).
3. **Market signals (read-only)** — validated job count deltas per board,
   salary band drift — already partially in `mvp-stats`; extend with
   `feed_stale` warnings from `market_coverage_status`.

## MVP slices (docs / API only until tests exist)

| Slice | User value | Backend | Frontend |
| ----- | ---------- | ------- | -------- |
| C1 | “Why this match” one-liner on Top 20 | Extend matcher metadata in API | Dashboard card — gated behind flag |
| C2 | Weekly repositioning email | Celery + consent check | N/A |
| C3 | Stale board badge on status page | Public health / status API | `/status` row |

## Out of scope (HARD BAN session)

- Live scrape expansion
- Auto-apply volume claims
- Public launch copy

## Dependencies

- Authenticated mutation rate limits (S10b) — deployed
- Demo snapshot must stay anonymized (`demo_snapshot.py`)
