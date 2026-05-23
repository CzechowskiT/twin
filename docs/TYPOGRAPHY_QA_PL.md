# Typography & Polish copy QA checklist

Use this before shipping marketing or locale-sensitive UI changes.

## CSS (no “long spaces” or bad hyphen breaks)

- [ ] `body` uses `text-align: start` and `hyphens: manual` (not `justify` / `auto`).
- [ ] Marketing surfaces override: `.marketing-journey-host`, `.marketing-section-hero`, `.marketing-section-page`, `.marketing-copy-rail`, `.marketing-hero-rail`, `.marketing-gradient-heading`.
- [ ] Hero `h1` uses `text-wrap: balance`, `hyphens: none`, `overflow-wrap: break-word`.
- [ ] Long legal pages keep justified prose only inside `.twin-prose` (privacy, terms).
- [ ] Billing and auth hubs keep explicit `text-align: start` / `hyphens: none` (`.twin-billing-surface`, `.twin-auth-zone-hub`).

## Polish locale (`pl`)

- [ ] No English glue words in PL strings (`not`, `and`, `or` as standalone connectors).
- [ ] Product terms: **auto-aplikacja** (not `auto-apply` in PL UI); **ścieżka aplikacji** (not `pipeline` in PL marketing).
- [ ] **panel** for signed-in app surface; **skrzynka** for acceptance inbox (not `inbox`).
- [ ] Em dash: ` — ` with spaces, or Polish comma; never EN-style `word—not`.
- [ ] No mixed PL/EN in one sentence unless brand or API name (TWIN, Stripe, ATS, OAuth).
- [ ] FAQ / home / register / demo / `site-messages` / waitlist narrative reviewed with `locale=pl`.

## English locale (`en`)

- [ ] No accidental Polish in `en` tree in `i18n.ts` or `SITE_MESSAGES_EN`.
- [ ] Em dash spacing consistent: ` — ` (space–dash–space) in headlines where used.

## Components

- [ ] Marketing pages use `LanguageProvider` + `t()`; no hardcoded meta lines (e.g. FAQ uses `site.faqPageMeta`).
- [ ] Company marquee and header chrome use i18n keys only.

## Quick verify

```bash
cd frontend && npm run build
```

Manual: open `/` and `/faq` with PL selected; scan hero `h1`, FAQ answers, register hub microcopy for rivers, `war-tych`-style breaks, and English leaks.
