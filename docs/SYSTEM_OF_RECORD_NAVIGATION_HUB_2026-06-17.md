# System-of-Record Navigation Hub (2026-06-17)

## Purpose

Every persona dashboard exposes **visible links/cards** to existing system-of-record modules. No hidden URLs, no 404, no blank pages, no generic dashboard bounce (except Panel card), no inert CTAs.

## Central registry

`frontend/src/lib/system-of-record-routes.ts` — single source for:

- Persona (`candidate` | `recruiter` | `company` | `investor`)
- Label / description / CTA (`TranslationKey` via `t()`)
- `href` (must resolve to existing `page.tsx` or safe external)
- `status` (`live` | `pilot` | `planned` | `not_live` | `needs_setup` | `paused`)
- `moduleFamily` (pipeline, profile, collaboration, integrations, …)
- `boundaryTags` (`pilot`, `draft_only`, `not_live`, `human_decision_required`, `no_outreach`, `no_ats_sync`)

## UI components

| Component | Path |
|-----------|------|
| `SystemOfRecordModuleCard` | `frontend/src/components/workspace/system-of-record-module-card.tsx` |
| `SystemOfRecordBoundaryBadge` | `frontend/src/components/workspace/system-of-record-boundary-badge.tsx` |
| `SystemOfRecordNavigationHub` | `frontend/src/components/workspace/system-of-record-navigation-hub.tsx` |

## Hub surfaces

| Persona | Surface | Path |
|---------|---------|------|
| Candidate | Dashboard module nav | `/dashboard` → `CandidateModuleNav` |
| Recruiter | Hub page | `/recruiter` |
| Company | Dashboard client | `/company/dashboard` |
| Investor | Workspace + public room | `/workspace/investor`, `/investor` (proof section) |

## Hard bans (unchanged)

- **Do not** touch `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceLayout`, `WorkspaceRouteLayout`, route fallback logic
- **Do not** mark P0 performance DONE or change launch stance from NO-GO
- **Do not** activate auto-apply, outreach, calendar sync, live ATS, or email send
- **Do not** reintroduce full 89-logo marquee on workspace/auth

## Tests

```bash
cd frontend
npm run test:system-of-record-navigation-hub          # 13 static assertions
npm run test:system-of-record-navigation-hub-browser    # 12 Playwright (workers=1)
```

Production smoke (gated):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
npm run test:system-of-record-navigation-hub-browser
```

## Related docs

- `docs/FOUNDER_P0_CHECKLIST.md` — P0 navigation item
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch stance unchanged
