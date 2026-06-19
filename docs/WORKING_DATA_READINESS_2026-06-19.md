# Working Data Layer Readiness

**Branch:** `product/board-working-data-readiness-2026-06-19`
**Route:** `/board/working-data-readiness`

Internal board page mapping pilot/demo surfaces to future persisted entities.

## Sections

| Marker | Section |
|--------|---------|
| `working-data-readiness-header` | Header |
| `working-data-readiness-entities` | Core domain entities |
| `working-data-readiness-demo-sources` | Current demo/pilot sources |
| `working-data-readiness-persistence-candidates` | First persistence candidates |
| `working-data-readiness-unsafe-deferrals` | Unsafe live actions to defer |
| `working-data-readiness-backend-boundaries` | Required backend boundaries |
| `working-data-readiness-audit-preview` | Audit model preview |
| `working-data-readiness-implementation` | Implementation order |
| `working-data-readiness-launch` | Launch/P0/Phase 3B status |

## Tests

```bash
cd frontend
npm run test:working-data-readiness
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:working-data-readiness-browser
```

## Production smoke

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:working-data-readiness-browser
```

## Status

- Launch: **NO-GO**
- P0 performance: **OPEN**
- Phase 3B: **HARD BLOCKED**
