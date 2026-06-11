# Investor Room MVP — 2026-06-11

## Purpose

Public **honest executive view** for the investor persona — aligned with `PRODUCTION_REALITY_MATRIX` and `PUBLIC_LAUNCH_READINESS_MATRIX`. No fake traction, no fundraising claims unless in approved docs, no public launch GO.

## Routes

| Route | Role |
| ----- | ---- |
| `/investor` | **Canonical** public investor room |
| `/for-investors` | Legacy marketing alias (same component) |
| `/investor/metrics`, `/investor/calculator`, etc. | Gated investor tools (unchanged) |
| `/workspace/investor` | Authenticated investor workspace hub |

## Sections (`investorRoom.*` i18n)

1. One-line thesis + lead
2. Public launch stance banner (NO-GO)
3. Problem + market wedge
4. Personas: candidate / recruiter / company
5. Product demo map (links to honest surfaces)
6. Current status: Live / Demo / Not live (from `investor-room.ts` model)
7. Roadmap (no GA dates)
8. Risks & mitigations
9. Founder contact CTA

## Hard bans (enforced in copy + `test:investor-room-mvp`)

- No fake revenue, customers, or cohort counts
- No Series A/B/C or “raised $” unless approved elsewhere
- No guaranteed market claims
- No public launch GO / GA language
- Not-live items must say NOT LIVE, PAUSED, BLOCKED, or NO-GO

## Tests

```bash
cd frontend && npm run test:investor-room-mvp
```

Also run: `test:trust-language-guard`, `lint`, `tsc --noEmit`, `build`.

## Files

- `frontend/src/lib/investor-room.ts` — status model
- `frontend/src/components/investor/investor-room-page.tsx` — UI
- `frontend/src/lib/overlays/investor-room.ts` — es–ja overlays
- `frontend/scripts/investor-room-mvp.test.ts` — guardrails
