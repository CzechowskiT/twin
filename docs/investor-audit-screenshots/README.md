# Investor audit screenshots

Capture set for diligence and demo walkthroughs. Prefer **production** (`https://twin-sooty.vercel.app`) after scaffold deploy; re-capture when UI changes materially.

## URLs to capture

| File | Route | Notes |
|------|--------|--------|
| `01-demo-live-preview.png` | `/demo` | Public demo theater; no login if demo seed is enabled |
| `02-demo-ranked-roles.png` | `/demo` | Scroll to ranked roles / match cards |
| `03-investor-metrics.png` | `/investor/metrics` | Investor persona session or `?persona=investor` if gate allows |
| `04-investor-calculator.png` | `/investor/calculator` | Expand slider guide table (Suwak \| Co to jest \| Domyślnie) |
| `05-investor-calculator-kpis.png` | `/investor/calculator` | KPI row + scenario chips |
| `06-dashboard-pipeline.png` | `/dashboard` | Candidate login; pipeline / applications |
| `07-billing-plans.png` | `/dashboard/billing` | Standby / Standard / Premium / Pro cards |
| `08-jobs-competitive.png` | `/workspace/candidate/jobs` | Tech stack, skill match, one-click apply |

## How to capture

### Browser (recommended)

1. Open production frontend (or `npm run dev` locally).
2. Set viewport **1440×900** (desktop).
3. For investor routes: sign in as investor test user or use persona dev bypass documented in `docs/DEMO_SCRIPT_v1.md`.
4. Save PNGs into this folder with the names above.

### CLI smoke (HTTP only)

```bash
FE=https://twin-sooty.vercel.app
for path in /demo /investor/metrics /investor/calculator; do
  curl -fsS -o /dev/null -w "%{http_code} $path\n" "$FE$path"
done
```

HTTP 200 does not replace visual capture; use for CI sanity only.

## Status

| Asset | Status |
|-------|--------|
| `01-demo-live-preview.png` | captured |
| `02-demo-ranked-roles.png` | captured |
| `03`–`08` | placeholder — capture before investor send |

## Related

- `docs/INVESTOR_DEMO_AUDIT_REPORT.md`
- `docs/DEMO_SCRIPT_v1.md`
- `.github/workflows/smoke.yml` (prod health after push to scaffold)
