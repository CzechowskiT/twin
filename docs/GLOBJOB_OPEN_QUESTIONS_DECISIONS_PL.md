# GlobJob Open Questions → decyzje TWIN i backlog

Odpowiedzi na listę z **GlobJob - Open Questions** (maj 2026), zsynchronizowane z `docs/GLOBJOB_STRATEGY_SYNTHESIS_2026.md` i stanem repo.

---

## Model biznesowy

| Pytanie | Decyzja / backlog TWIN |
|---------|------------------------|
| Core revenue feature? | **Hybryda:** subskrypcja kandydata (Stripe) + placement/success fee B2B + programy roczne enterprise. Flat rate (10% budżetu wakatów) jako **opcja ilustracyjna** w kalkulatorze i tier procurement. |
| Open IP? | **Nie** na MVP — przewaga w danych zgody, matching, placement events, integracje kalendarza. |
| Target customers? | Kandydaci knowledge workers (PL→EU) + rekruterzy/B2B + inwestorzy (osobna ścieżka). |
| Dlaczego będą robić to, co chcemy? | Kandydat: mniej tabów, lepsze dopasowanie, kalendarz rozmów. B2B: niższy koszt vs agencja + mniej szumu. |
| SaaS vs service? | **SaaS + automatyzacja**; bez outsourced recruiters jako core. |
| Customer acquisition? | Wishlist founding, content/Gen Z, outreach B2B „oferty już widoczne”, partner API (roadmap). |
| Product roadmap? | `docs/PRODUCT_ROADMAP.md`, `docs/ROADMAP_100_ACCEPTANCE.md`. |

## Operacje

| Pytanie | Decyzja / backlog |
|---------|-------------------|
| Cost structure | Lean MVP: Railway/Vercel, Anthropic usage-based, Celery worker — `docs/RAILWAY_PROD_ENV_PL.md`. |
| Decision making | Founder-led; agent shipping zgodnie z `.cursorrules`. |
| Roles | Zespół dev + founder GTM do PMF. |
| Capital | Pre-seed zgodnie z investor materials; nie commitować kwot w repo. |
| Liability | Terms + DPA + placement disputes; nie obiecywać gwarancji zatrudnienia. |
| Scaling | Worker off API, scrape allowlist, Stripe live. |

## Inwestor vs bootstrap

| Pytanie | Decyzja |
|---------|---------|
| Ile pieniędzy? | Zakres z biznesplanów: ~350k–1M USD seed na MVP+traction — **walidacja z founderem**, nie w kodzie. |
| Budget responsibility | Board/founder; raportowanie przez metryki inwestora. |

## Ryzyka

| Ryzyko | Mitygacja TWIN |
|--------|----------------|
| Product risk | Lean MVP, wishlist, pytest, nightly beats. |
| Regulatory | RODO, scraping compliance, brak LinkedIn jako dowodu placementu. |
| Market fit | Trzy kategorie match + calendar north star jako testable hypothesis. |
| Competitors | Synteza YC + LinkedIn/Indeed — sekcja 5 w synthesis doc. |
| Ethics / bias | Transparentność AI, audyt algorytmu — backlog Responsible AI checklist. |

## Produkt

| Pytanie | Decyzja |
|---------|---------|
| Problem? | Szum i asymetria w rekrutacji globalnej. |
| MVP? | Scrape + match + apply tracking + calendar + placement hooks (shipped w części). |
| Dlaczego zadziała? | Gen Z + AI orchestration + niższa friccja niż spray-and-pray. |
| Evidence? | Public stats job boards; founder traction metrics. |
| Assets | Repo TWIN, scrapers PL, Stripe, Google OAuth. |
| Buy-in | Pracodawcy na umowę/API; kandydaci przez freemium/wishlist. |
| Tradeoffs | Redirect apply vs auto-apply; scraping vs legal API. |
| Założenia do testu | „Kandydat zapłaci 4,99 USD” — test A/B po launch Stripe live. |
| Test minimalny | Wishlist + onboarding funnel + pierwsze verified placements. |
| Build vs buy | LLM/API, Playwright scrape; ATS przez webhooks. |
| Premium vs mass | **Mass acquisition, premium monetization** (freemium + premium). |

---

## Backlog ticket-ready (skrót)

1. **P0** — flat rate w kalkulatorze B2B + tier `/for-companies` *(ta integracja)*.
2. **P1** — UI trzech kategorii dopasowania; freemium bez nazw firm.
3. **P1** — ujednolicenie success fee 10%/50% vs model 50% pensji w kontrakcie.
4. **P2** — plan Standby 0,99 USD w Stripe.
5. **P2** — mock interview / upskill paths (post-apply).
6. **P3** — partner marketplace (Staffly model).
