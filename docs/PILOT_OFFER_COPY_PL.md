# Pilot offer copy (PL + EN) — founder / landing / waitlist

**Oferta kanoniczna (krótka, PL):** [PILOT_OFFER_FINAL.md](./PILOT_OFFER_FINAL.md)

**Beachhead:** mid / senior tech, EU (remote-friendly), zmęczeni masowym aplikowaniem — chcą **krótkiego kalendarza rozmów**, nie inboxa ofert.

**Pricing (pilot):** 7 dni · **49 PLN** (early) / **99 PLN** (standard) — jednorazowo lub jako trial przed subskrypcją; doprecyzuj w Stripe przed publikacją.

**No fake testimonials** — sekcja social proof tylko z prawdziwych cytatów z [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md).

---

## Polski (PL)

### Nagłówek

**7 dni pilota: od CV do rozmów na kalendarzu — bez spamu aplikacji.**

### Podnagłówek

TWIN analizuje Twoje CV, buduje krótką listę dopasowanych ról i prowadzi aplikacje oraz zaproszenia w jednym miejscu. Pilot dla **mid/senior tech w EU** — ograniczona liczba miejsc.

### Oferta (7 dni)

| Element | Opis |
|---------|------|
| Cena | **49 PLN** (founding pilot) · **99 PLN** (po wyczerpaniu miejsc founding) |
| Czas | 7 dni pełnego dostępu do ścieżki pilota |
| Dla kogo | Mid / senior developer, product, data — remote EU |

### Co jest w pilocie

- **Analiza CV** — profil pod matching (nie tylko upload pliku).
- **Shortlist** — wybrane dopasowania zamiast setek losowych ofert.
- **Śledzenie aplikacji** — statusy i batch accept w jednym workspace.
- **Kalendarz** — zaproszenia na rozmowę / holdy (Google Calendar tam, gdzie skonfigurowane; ICS jako fallback).

### CTA (przyciski / linki)

| Kontekst | Tekst CTA | Docelowy URL |
|----------|-----------|--------------|
| Główny | **Zacznij 7-dniowy pilot** | `/register/candidate` lub `/waitlist` (jeśli brak miejsc) |
| Po zalogowaniu | **Opłać pilot w ustawieniach** | `/dashboard/billing` |
| Brak checkout na env | **Dołącz do listy founding** | `/waitlist` |

### Stripe / billing (technicznie)

- Checkout: `/dashboard/billing` (gdy `stripe_checkout_ready: true` na prod — sprawdź `mvp-stats`).
- Waitlist / founding bez karty: `/waitlist` — ten sam North Star, inna ścieżka wejścia.
- Env: `STRIPE_SECRET_KEY` + ceny (`STRIPE_PRICE_*`) — patrz `docs/STRIPE.md`, `docs/STRIPE_RAILWAY_SETUP.md`.
- **Nie obiecuj** płatności na środowisku, gdzie `stripe_checkout_ready` jest `false`.

### Mikrocopy (FAQ jedna linia)

„Pilot to nie masowe auto-apply — budujemy **kalendarz rozmów wartych przyjścia**, nie tysiące wysłanych CV.”

---

## English (EN)

### Headline

**7-day pilot: from CV to interviews on your calendar — without application spam.**

### Subhead

TWIN analyzes your CV, builds a short list of matched roles, and keeps applications and invites in one workspace. Pilot for **mid/senior tech in the EU** — limited seats.

### Offer (7 days)

| Item | Copy |
|------|------|
| Price | **49 PLN** (founding pilot) · **99 PLN** (after founding seats) |
| Duration | 7 days full access to the pilot path |
| Who | Mid / senior engineers, product, data — remote-friendly EU |

### What's included

- **CV analysis** — profile tuned for matching.
- **Shortlist** — curated matches, not hundreds of random listings.
- **Apply tracking** — statuses and batch acceptance in one place.
- **Calendar** — interview invites / holds (Google Calendar where configured; ICS fallback).

### CTA

| Context | CTA text | Target |
|---------|----------|--------|
| Primary | **Start 7-day pilot** | `/register/candidate` or `/waitlist` |
| Signed in | **Pay for pilot in billing** | `/dashboard/billing` |
| Checkout not live | **Join founding waitlist** | `/waitlist` |

### Stripe / billing

Same as PL: `/dashboard/billing` when checkout is live; `/waitlist` otherwise. Verify `GET /api/v1/public/mvp-stats` → `stripe_checkout_ready`.

### One-line FAQ

“The pilot isn’t spray-and-pray auto-apply — we’re building a **short calendar of interviews worth showing up for**, not thousands of sent résumés.”

---

## Gdzie wkleić (bez nowej strony — domyślnie)

| Powierzchnia | Akcja |
|--------------|--------|
| `/waitlist` | Już ma founding offer — dopasuj badge do 49/99 PLN ręcznie w copy waitlist, jeśli chcesz spójność |
| `/for-candidates` | Opcjonalnie: jeden akapit + link do rejestracji (wymaga i18n) |
| Deck / Notion | Kopiuj sekcje PL lub EN z tego pliku |
| Investor | Traction: [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md) + [INVESTOR_DEMO_TALKING_POINTS.md](./INVESTOR_DEMO_TALKING_POINTS.md) |

**mvp-stats (curl):**

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats" | jq '{registered_users, total_applications, interviews_scheduled, paid_subscribers, subscription_mrr_usd, stripe_checkout_ready}'
```
