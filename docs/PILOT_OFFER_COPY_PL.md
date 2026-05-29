# Founding Member offer copy (PL + EN) — founder / landing / waitlist

**Oferta kanoniczna (krótka, PL):** [PILOT_OFFER_FINAL.md](./PILOT_OFFER_FINAL.md)

**Beachhead:** mid / senior tech, product, data/AI, tech sales — EU (remote-friendly), zmęczeni masowym aplikowaniem — chcą **krótkiego kalendarza rozmów**, nie inboxa ofert.

**Pricing (founding):** **Darmowy dostęp** dla **pierwszych 1000 founding members** — bez opłaty przy wejściu. Opcjonalna subskrypcja później (Stripe), gdy PMF i checkout live; **nie zmieniaj** logiki billing w kodzie na potrzeby founding.

**No fake testimonials** — sekcja social proof tylko z prawdziwych cytatów z [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md).

---

## Polski (PL)

### Nagłówek

**Founding member: od CV do rozmów na kalendarzu — bez spamu aplikacji.**

### Podnagłówek

TWIN analizuje Twoje CV, buduje krótką listę dopasowanych ról i prowadzi aplikacje oraz zaproszenia w jednym miejscu. Program dla **mid/senior tech, product, data/AI i tech sales w EU** — **pierwsze 1000 miejsc founding, darmowo**.

### Oferta (founding)

| Element | Opis |
|---------|------|
| Cena | **0 PLN** (founding member, pierwsze 1000) |
| Limit | **1000** founding members — potem waitlist / standard |
| Dla kogo | Mid / senior developer, product, data/AI, tech sales — remote EU |
| Czas | Early access / ścieżka pilota — ustal z founderem okno D0–D+7 |

### Co jest w programie

- **Analiza CV** — profil pod matching (nie tylko upload pliku).
- **Shortlist** — wybrane dopasowania zamiast setek losowych ofert.
- **Śledzenie aplikacji** — statusy i batch accept w jednym workspace.
- **Kalendarz** — zaproszenia na rozmowę / holdy (Google Calendar tam, gdzie skonfigurowane; ICS jako fallback).

### CTA (przyciski / linki)

| Kontekst | Tekst CTA | Docelowy URL |
|----------|-----------|--------------|
| Główny | **Dołącz jako founding member** | `/register/candidate?utm_campaign=founding1000` |
| Waitlist | **Dołącz do listy founding** | `/waitlist` |
| Po wyczerpaniu 1000 | **Dołącz do waitlisty** | `/waitlist` |
| Po zalogowaniu (opcjonalnie później) | **Upgrade w ustawieniach** | `/dashboard/billing` |

### Billing (technicznie — bez opłaty founding)

- Founding: **brak płatności przy wejściu** — tracker founder: `Payment amount = 0`, `founding slot N/1000`.
- Subskrypcja (później): `/dashboard/billing` gdy `stripe_checkout_ready: true` na prod — sprawdź `mvp-stats`.
- Waitlist / founding bez karty: `/waitlist` — ten sam North Star, inna ścieżka wejścia.
- Env: `STRIPE_SECRET_KEY` + ceny (`STRIPE_PRICE_*`) — patrz `docs/STRIPE.md`, `docs/STRIPE_RAILWAY_SETUP.md`.
- **Nie obiecuj** płatności na środowisku, gdzie `stripe_checkout_ready` jest `false`.

### Mikrocopy (FAQ jedna linia)

„Founding to nie masowe auto-apply — budujemy **kalendarz rozmów wartych przyjścia**, nie tysiące wysłanych CV. Pierwsza tysiączka wchodzi **za darmo**.”

---

## English (EN)

### Headline

**Founding member: from CV to interviews on your calendar — without application spam.**

### Subhead

TWIN analyzes your CV, builds a short list of matched roles, and keeps applications and invites in one workspace. For **mid/senior tech, product, data/AI, and tech sales in the EU** — **first 1,000 founding members, free**.

### Offer (founding)

| Item | Copy |
|------|------|
| Price | **$0 / 0 PLN** (founding member, first 1,000) |
| Cap | **1,000** founding members — then waitlist / standard |
| Who | Mid / senior engineers, product, data/AI, tech sales — remote-friendly EU |
| Duration | Early-access / pilot path — founder sets D0–D+7 window |

### What's included

- **CV analysis** — profile tuned for matching.
- **Shortlist** — curated matches, not hundreds of random listings.
- **Apply tracking** — statuses and batch acceptance in one place.
- **Calendar** — interview invites / holds (Google Calendar where configured; ICS fallback).

### CTA

| Context | CTA text | Target |
|---------|----------|--------|
| Primary | **Join as founding member** | `/register/candidate?utm_campaign=founding1000` |
| Waitlist | **Join founding waitlist** | `/waitlist` |
| After 1,000 cap | **Join waitlist** | `/waitlist` |
| Signed in (optional later) | **Upgrade in billing** | `/dashboard/billing` |

### Billing

Founding = no payment on entry; optional subscription later via `/dashboard/billing` when checkout is live. Verify `GET /api/v1/public/mvp-stats` → `stripe_checkout_ready`.

### One-line FAQ

“Founding isn’t spray-and-pray auto-apply — we’re building a **short calendar of interviews worth showing up for**. The first 1,000 members get in **free**.”

---

## Gdzie wkleić (bez nowej strony — domyślnie)

| Powierzchnia | Akcja |
|--------------|--------|
| `/waitlist` | Już ma founding offer (1000, free) — utrzymaj spójność z tym docsem |
| `/for-candidates` | Opcjonalnie: jeden akapit + link do rejestracji (wymaga i18n) |
| Deck / Notion | Kopiuj sekcje PL lub EN z tego pliku |
| Investor | Traction: [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md) + [INVESTOR_DEMO_TALKING_POINTS.md](./INVESTOR_DEMO_TALKING_POINTS.md) |

**mvp-stats (curl):**

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats" | jq '{registered_users, total_applications, interviews_scheduled, paid_subscribers, subscription_mrr_usd, stripe_checkout_ready}'
```
