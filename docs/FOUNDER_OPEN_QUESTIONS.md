# TWIN — otwarte decyzje founder (checklist)

**Cel:** jedna lista pytań, które **Ty** zamykasz (nie agent). Po decyzji dopisz datę / „TAK-NIE” i powiadom dev — zaktualizujemy roadmapę.

**Źródła:** [GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md](./GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md) · [ROADMAP_100_ACCEPTANCE.md](./ROADMAP_100_ACCEPTANCE.md) · [FOUNDER_P0_AUDIT_2026-05-23.md](./FOUNDER_P0_AUDIT_2026-05-23.md)

**Operacje P0 (kliki):** [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md) · **Sekrety:** [FOUNDER_SECRETS_WHERE.md](./FOUNDER_SECRETS_WHERE.md)

---

## Jak odpowiadać

- W wątku lub Notion: `TAK: 3` / `NIE: 7` / `odłożone: 12`
- Dla roadmapy 100 zadań: `akceptuję P0+P1` | `odrzuć: 12, 45, 88` (patrz [ROADMAP_100_ACCEPTANCE.md](./ROADMAP_100_ACCEPTANCE.md) § Jak akceptować)

---

## A. Fundraising i kapitał

| # | Pytanie | Status | Notatka TWIN |
|---|---------|--------|--------------|
| A1 | Kwota rundy seed (zakres ~350k–1M USD z materiałów) — jaki target deklarujesz inwestorom? | ☐ | Nie w repo; ustal z biznesplanem |
| A2 | Bootstrap vs seed teraz — czy produkt ma iść na płatne subskrypcje przed zamknięciem rundy? | ☐ | Stripe test/live już na prod |
| A3 | Kto podpisuje budżet infra (Railway/Vercel/Anthropic) miesięcznie? | ☐ | Lean: [RAILWAY_PROD_ENV_PL.md](./RAILWAY_PROD_ENV_PL.md) |

---

## B. Model biznesowy i GTM

| # | Pytanie | Status | Notatka TWIN |
|---|---------|--------|--------------|
| B1 | Core revenue: subskrypcja kandydata vs placement fee B2B vs enterprise flat rate — **priorytet narracji** na Q3? | ☐ | Hybryda w GlobJob synthesis |
| B2 | Czy pokazujemy **flat rate 10% budżetu wakatów** w kalkulatorze `/for-companies` jako oficjalną ofertę? | ☐ | Backlog P0 w GlobJob doc |
| B3 | Success fee: **10% / 50%** vs model **50% pensji** w umowie B2B — która wersja do podpisu? | ☐ | P1 backlog |
| B4 | „Kandydat zapłaci 4,99 USD” — test A/B EN vs PL po pełnym launchu? | ☐ | Cennik w produkcie; hipoteza do testu |
| B5 | Open IP / white-label dla partnerów (Staffly-style marketplace)? | ☐ | **Nie** na MVP (GlobJob) |
| B6 | Kanał acquisition #1: wishlist vs outbound B2B vs content Gen Z? | ☐ | Wszystkie w roadmapie P1–P2 |

---

## C. Produkt i roadmap (founder akceptacja)

| # | Pytanie | Status | Odniesienie roadmap |
|---|---------|--------|---------------------|
| C1 | Akceptujesz listę **P0+P1** z [ROADMAP_100_ACCEPTANCE.md](./ROADMAP_100_ACCEPTANCE.md) (100 zadań)? | ☐ | Domyślnie czeka na `akceptuję…` |
| C2 | **RocketJobs** w nocnym auto-apply po weryfikacji wolumenu scrape? | ☐ | FOUNDER_STATUS: następny slice |
| C3 | **Microsoft Graph — zapis** propozycji spotkań (nie tylko busy) — P0 dla korporacji? | ☐ | Roadmap §2 zad. 1 |
| C4 | **Plan Standby 0,99 USD** w Stripe — czy w ogóle oferować? | ☐ | GlobJob P2 |
| C5 | Wykluczenia świadome: masowy scrape LinkedIn, obietnica 100k ofert overnight — **potwierdzasz**? | ☐ | Roadmap §12 zad. 10 (informacyjne) |

---

## D. Prawo, compliance, due diligence

| # | Pytanie | Status | Notatka |
|---|---------|--------|---------|
| D1 | Data room: **S3 live** przed wysłaniem poufnego decku VC? | ☐ | Technicznie: [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md) |
| D2 | Domknięcie [QUANTICA_COMPLIANCE.md](./QUANTICA_COMPLIANCE.md) — termin due diligence? | ☐ | P1 roadmap |
| D3 | RODO: priorytet self-serve export/delete konta vs ręczny support? | ☐ | P1 roadmap |
| D4 | Responsible AI / audyt biasu — czy obiecujemy inwestorom datę? | ☐ | GlobJob ethics backlog |

---

## E. Operacje prod (Ty vs dev)

| # | Pytanie | Status | Kto |
|---|---------|--------|-----|
| E1 | **S3/R2** — Cloudflare vs AWS EU? | ☐ | Founder: bucket + klucze → Railway |
| E2 | Stripe **test** vs **live** na prod przed pierwszym płacącym klientem? | ☐ | Audit 2026-05-23: test OK na demo |
| E3 | Re-seed recruiter inbox po testach accept/decline na demo? | ☐ | Dev: `seed-investor-demo.py` |
| E4 | Pierwsza **płatna** subskrypcja na prod (karta testowa 4242…) — robisz Ty czy delegujesz? | ☐ | [STRIPE_FOUNDER_CHECKLIST.md](./STRIPE_FOUNDER_CHECKLIST.md) |

---

## F. Już zamknięte (referencja — nie blokują P0)

| Temat | Stan (2026-05-23) |
|-------|-------------------|
| Vercel Production Branch = `cursor/phase1-monorepo-scaffold` | ✅ doc + panel founder |
| Celery worker + beat osobno od API | ✅ prod |
| LinkedIn OAuth prod | ✅ |
| Stripe checkout + webhook Railway | ✅ audit |
| Microsoft Calendar OAuth prod | ✅ audit |
| Mail Resend prod | ✅ audit |
| `/status` + health ops | ✅ shipped |

Szczegóły: [FOUNDER_P0_AUDIT_2026-05-23.md](./FOUNDER_P0_AUDIT_2026-05-23.md) · [FOUNDER_STATUS_LIVE.md](./FOUNDER_STATUS_LIVE.md).

---

## Backlog po Twoich decyzjach (agent/dev)

1. Zaktualizować `ROADMAP_100_ACCEPTANCE.md` wg `odrzuć:` / `akceptuję P0+P1`.
2. Ticket: flat rate w kalkulatorze B2B (jeśli B2 = TAK).
3. Ticket: trzy kategorie dopasowania w UI (GlobJob P1).
4. Ujednolicić copy success fee po B3.

---

*Ostatnia aktualizacja: 2026-05-24.*
