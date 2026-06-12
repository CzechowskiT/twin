# Candidate calendar week events loading fix (2026-06-12)

## Symptom

Production `/dashboard/calendar`: both provider cards **POŁĄCZONO**, but week panel stuck on **„Ładowanie wydarzeń…”** indefinitely.

## Root cause

1. **`useEffect` refetch loop** — `fetchCalendarWeekEvents` depended on `googleSnapshot` / `microsoftSnapshot` objects recreated every render → effect re-fired on each render → perpetual in-flight requests.
2. **Stale `finally` guard** — superseded requests skipped `setEventsLoading(false)` when `isStale()`, so if the loop kept starting new requests, loading never cleared.

## Fix

### Frontend

- Memoize provider snapshots; read latest via refs inside `fetchCalendarWeekEvents`.
- Stable callback deps: `[weekStart, interviews]` only.
- `Promise.allSettled` per provider with 9s `timeoutMs`.
- Explicit `WeekEventsPhase`: `idle | loading | loaded | empty | partial_error | error | timeout | reconnect_required`.
- `finally`: clear loading only when `requestId === eventsRequestIdRef.current` (latest request).
- `/me/interviews` timeout-protected and non-blocking (fire-and-forget after status load).
- Week panel retry for `partial_error`, `error`, `timeout`.

### Backend

- Google `list_primary_events` and Microsoft `list_calendar_view_events` upstream HTTP timeout **9s** (was 30s) so hung provider APIs return 503/502 quickly.

## Terminal states (max ~10–12s)

| State | UI |
|-------|-----|
| loaded | Event grid |
| empty | „Brak wydarzeń w tym tygodniu.” |
| partial_error | Warning + partial events + retry |
| error | „Nie udało się wczytać wydarzeń z kalendarza.” + retry |
| timeout | „Ładowanie wydarzeń trwa zbyt długo.” + retry |

## Tests

```bash
cd frontend && npm run test:candidate-calendar-week-events-loading
```

## Launch stance

**Candidate calendar remains not PASS** until founder confirms week panel no longer hangs on „Ładowanie wydarzeń…” in production.

## Hard bans confirmed

No auth/login/deployment changes; no reconnect loop; no session clear; no fake connected state.
