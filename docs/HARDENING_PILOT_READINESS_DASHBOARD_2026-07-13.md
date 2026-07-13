# Hardening track — pilot readiness dashboard (2026-07-13)

> **PR scope:** docs + guard only on #451 — no UI merge

## Intent

Surface honest PILOT/NO-GO status per wave module without inflating launch metrics.

## Guard

`frontend/scripts/all-modules-green-wave-c3-notification-prefs-guard.test.ts` (extended in wave PRs).

## Acceptance

- Ship status constants remain `PILOT` until founder smoke  
- No `LIVE` or `GA` strings in C3–C5 recruiter modules  
- Dashboard links do not claim calendar/ATS integration

**Status:** guard present on stacked branches; founder smoke PENDING.
