# Interactive demo QA runbook

## Pre-merge (CI)

```bash
cd frontend
npm run demo:visual-regression
npm run test:founder-led-demo-flow
npm run build
```

## Manual smoke

1. Open `/demo` — hero + interactive player visible
2. Play → pause → scrub chapter dots
3. Switch role tabs (candidate / recruiter / company)
4. Enable takeover — cursor hidden, no autoplay advance
5. Toggle OS reduced motion — cursor animation off
6. Expand surface catalog — 35 links render
7. PL locale — all `interactiveDemoPlayer.*` strings present

## Launch stance

- Pilot CTA → `/waitlist` only
- No auto-apply or Stripe LIVE copy in demo narrative
- Gate F PENDING — do not deploy narrative to prod without founder sign-off
