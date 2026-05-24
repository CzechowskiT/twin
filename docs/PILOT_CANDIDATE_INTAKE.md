# Candidate Pilot Intake — 7-day paid TWIN pilot

**Cel:** Minimalny intake na start pilota w 24h — bez nowych feature'ów w produkcie.  
**Beachhead:** mid/senior tech, EU remote — patrz [PILOT_OFFER_COPY_PL.md](./PILOT_OFFER_COPY_PL.md).  
**Metryki tygodniowe:** [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md).

---

## 1. Mapowanie 20 pól intake

| # | Pole | Zebrane? | Gdzie (route / field / model) | Luka + minimalna poprawka |
|---|------|:--------:|-------------------------------|---------------------------|
| 1 | Imię i nazwisko | ✅ | `/profile` → `name` → `candidates.name` | — |
| 2 | Email | ✅ | `/register/candidate` → `email` → `users.email` | — |
| 3 | LinkedIn URL | ⚠️ | OAuth: `users.linkedin_id` + import `/api/v1/profile/import-linkedin` — **brak vanity URL** | **Gap:** founder zbiera URL w [PILOT_INTAKE_FORM_TEMPLATE.md](./PILOT_INTAKE_FORM_TEMPLATE.md); opcjonalnie w `users.signup_referred_by_note` jako `linkedin:https://…` |
| 4 | Aktualne CV | ✅ | `/profile` upload → `candidates.cv_text`, `resume_path`, `cv_filename`, `cv_uploaded_at` | W onboarding krok `cv` → `ProfileImport` + link do `/profile` |
| 5 | Obecna rola | ⚠️ | AI z CV: `cv_insights.headline` (read-only na `/profile`, z `cv_enrichment.py`) | **Gap:** founder dopisuje w szablonie intake; docelowo pole tekstowe na profilu |
| 6 | Role docelowe | ✅ | `/profile` → `preferred_job_titles` (JSON) **oraz** `/dashboard/career` → `ideal.target_role_titles` w `candidates.profile_signals_json` | Ujednolicić w checkliście: oba miejsca; Career Compass ma bogatszy model |
| 7 | Seniority | ⚠️ | AI z CV: `cv_insights.seniority` (`junior\|mid\|senior\|lead\|executive`) — tylko odczyt | **Gap:** founder pyta w szablonie; opcjonalnie skopiować do `experience_years` + tytuły |
| 8 | Lokalizacja | ✅ | `/profile` → `candidates.location` | — |
| 9 | Preferowane kraje/miasta/remote | ⚠️ | `/dashboard/career` → `work_formats`, `location_preferences` w `profile_signals_json.career_compass.ideal` | **Gap:** nie w onboarding; founder prosi wypełnić Career Compass w D0 |
| 10 | Widełki salary | ⚠️ | `/profile` → `desired_salary` (pojedyncza liczba); `/dashboard/career` → `target_salary_gross_monthly_pln` | **Gap:** brak min/max; founder zbiera widełki w szablonie (PLN brutto/mies.) |
| 11 | Dostępność startu | ❌ | — | **Gap:** szablon founder + notatka w Notion/CRM; pole `signup_referred_by_note` np. `avail:2026-06-01` |
| 12 | Typ umowy | ❌ | Częściowo: `work_formats` (remote/hybrid/onsite) — **nie** UoP/B2B/contract | **Gap:** szablon founder |
| 13 | Preferowane branże | ⚠️ | `/dashboard/career` → `industries[]`; CV AI → `cv_insights.industries` | Career Compass w checkliście D0 |
| 14 | Wykluczone branże | ❌ | — | **Gap:** szablon founder (lista); founder trzyma w Notion do filtrowania ręcznego |
| 15 | Aktywnie szuka pracy | ❌ | Pośrednio: `auto_apply_consents.is_active` | **Gap:** szablon founder (TAK/NIE + pilność) |
| 16 | Zgoda: rekomendacje ofert | ⚠️ | Rejestracja: `users.ai_matching_consent_at`; kolejka `/dashboard/acceptance` (matche) | Wystarczy core consents + acceptance queue; brak osobnego checkboxa „rekomendacje” |
| 17 | Zgoda: apply dopiero po akceptacji | ⚠️ | `/dashboard/settings/auto-apply` → `auto_apply_consents` (`consent_given_at`, `min_score_threshold`, `daily_limit`) | Pilot: **wyłącz auto-apply** do momentu akceptacji matchy w `/dashboard/acceptance`; consent = nightly apply, nie per-oferta |
| 18 | Zgoda: raportowanie odpowiedzi/rozmów | ⚠️ | `users.email_interview_reminders`; statusy aplikacji + `scheduled_interviews` | **Gap:** brak osobnej zgody „raportuj odpowiedzi”; szablon founder + founder aktualizuje statusy ręcznie/support |
| 19 | Zgoda: anonimowy case study | ⚠️ | `/profile` → `talent_pool_opt_in` + `talent_pool_opt_in_at` (B2B pool, nie case study) | **Gap:** osobna zgoda w szablonie founder; nie mylić z talent pool |
| 20 | Status płatności pilota | ⚠️ | `/dashboard/billing` → `users.plan_tier`, `subscription_status`, `subscription_current_period_end`, `subscription_invoice_payment_count` | **Gap:** brak SKU „7 dni / 49 PLN” — Stripe = subskrypcje miesięczne; founder: ręczny tracking + `utm_campaign=pilot7` / notatka `pilot-paid:49PLN:2026-05-24` |

**Legenda:** ✅ w produkcie · ⚠️ częściowo / inferowane · ❌ brak

### Kluczowe pliki (audyt)

| Warstwa | Ścieżki |
|---------|---------|
| Rejestracja | `frontend/src/app/register/candidate/page.tsx`, `frontend/src/components/auth/register-zone-form.tsx` |
| Onboarding | `frontend/src/app/onboarding/page.tsx`, `frontend/src/components/onboarding/ProfileImport.tsx` |
| Profil | `frontend/src/app/profile/page.tsx` |
| Career Compass | `frontend/src/app/dashboard/career/page.tsx` |
| Auto-apply / consent | `frontend/src/app/dashboard/settings/auto-apply/page.tsx`, `backend/app/database/models.py` (`AutoApplyConsent`) |
| Acceptance (north star) | `frontend/src/app/dashboard/acceptance/page.tsx`, `backend/app/services/acceptance_queue.py` |
| Aplikacje / rozmowy | `backend/app/database/models.py` (`Application`, `ScheduledInterview`), `frontend/src/components/applications-panel.tsx` |
| Billing | `frontend/src/app/dashboard/billing/page.tsx`, `backend/app/api/billing.py` |
| Modele | `backend/app/database/models.py` (`User`, `Candidate`), `backend/app/schemas/candidate.py`, `backend/app/schemas/career_compass.py` |

---

## 2. Checklist founder — nowy kandydat pilota

### Przed wysłaniem linku

- [ ] Potwierdź miejsce founding (49 PLN) vs standard (99 PLN) — [PILOT_OFFER_COPY_PL.md](./PILOT_OFFER_COPY_PL.md)
- [ ] Przygotuj link: `/register/candidate?utm_campaign=pilot7&utm_content=founding49&ref=FOUNDER`
- [ ] Dołącz [PILOT_INTAKE_FORM_TEMPLATE.md](./PILOT_INTAKE_FORM_TEMPLATE.md) (Notion/email) na pola ❌/⚠️

### D0 — rejestracja (kandydat, ~15 min)

1. Rejestracja `/register/candidate` — email, hasło, **4 core consents** (GDPR, ToS, job data, AI matching)
2. Onboarding `/onboarding` — przejść kroki; **CV** w kroku `cv` lub od razu `/profile`
3. `/profile` — uzupełnić: name, skills, preferred_job_titles, experience_years, location, **upload CV** + `cv_processing_consent`
4. `/dashboard/career` — ideal job: role, salary PLN, work_formats, industries, location_preferences
5. LinkedIn — OAuth (login) lub import; **vanity URL** → formularz founder
6. **Nie włączać** nightly auto-apply bez briefu — `/dashboard/settings/auto-apply`

### D0 — founder (~10 min)

1. Zweryfikuj w DB/admin: `users.email`, `candidates.has_cv`, `onboarding_completed_at`
2. Zapisz płatność: notatka `users.signup_referred_by_note` = `pilot-paid:49PLN:YYYY-MM-DD` **lub** potwierdzenie Stripe (`plan_tier` + `subscription_status=active`)
3. Wyślij szablon intake na brakujące pola (§1 tabela ❌)
4. Ustaw datę końca pilota (D+7) w Notion

### D1–D7 — operacje

1. Kandydat: `/dashboard` — matche; `/dashboard/acceptance` — **akceptuj/odrzuć** matche i trzymaj rozmowy
2. Apply: ręcznie z dashboardu **lub** auto-apply po explicit consent + progu score
3. Founder: co 2 dni — status aplikacji (`applications.status`, `applied_at`, `auto_applied`)
4. Rozmowy: `scheduled_interviews` / kalendarz Google; kandydat potwierdza slot w `/dashboard/acceptance`
5. Tydzień: wpisz wiersz w [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md)

### D+7 — zamknięcie

- [ ] Retrospekcja: north star, cytat (za zgodą) → dashboard cytatów
- [ ] Case study consent z szablonu — osobno od `talent_pool_opt_in`
- [ ] Decyzja: subskrypcja `/dashboard/billing` vs koniec

---

## 3. Definicje metryk (spójne z kodem)

| Metryka | Definicja operacyjna | Źródło w repo / SQL |
|---------|-------------------|---------------------|
| **Active candidate** | Użytkownik z `candidates` row + **meaningful action w oknie 7d (pilot) / 30d (north star)** | Login lub: update profilu, upload CV, match view, aplikacja, acceptance respond, calendar. Public stub: `registered_users` w `GET /api/v1/public/mvp-stats` — **nie** to samo co MAU |
| **Application accepted** | Kandydat **zaakceptował match** do pipeline | `POST /api/v1/candidates/me/acceptance-queue/{id}/respond` `kind=match`, `action=accept` → wpis `saved_jobs`. **Alternatywa (recruiter):** batch accept → `applications.status=interview` |
| **Application sent** | Aplikacja faktycznie wysłana / zarejestrowana jako applied | `applications.status IN ('applied','interview','hired')` **lub** `applied_at IS NOT NULL` **lub** `auto_applied=true`. Agregat: `mvp-stats.total_applications` |
| **Interview scheduled** | Zaplanowana rozmowa w systemie | `COUNT(scheduled_interviews)` gdzie `status != 'cancelled'`. Agregat: `mvp-stats.interviews_scheduled` |
| **Interview accepted** | Kandydat **potwierdził slot** (nie anulował) | Accept w acceptance queue: `kind=interview`, `action=accept` (status pozostaje `scheduled`). Decline → `status='cancelled'` |
| **Qualified outcome** | Pilot success = **rozmowa odbyta lub verified placement** | Tier 1: `scheduled_interviews` z `interview_start < now()` i `status='scheduled'`. Tier 2: `applications.status='hired'` + `placement_verified_at IS NOT NULL` (`mvp-stats.verified_placements`) |

**North star (pilot):** accepted interviews / active candidates — [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md).

---

## 4. Powiązane dokumenty

- [PILOT_TRACTION_DASHBOARD.md](./PILOT_TRACTION_DASHBOARD.md) — tygodniowa tabela + north star
- [PILOT_OFFER_COPY_PL.md](./PILOT_OFFER_COPY_PL.md) — copy PL/EN, CTA, ceny 49/99 PLN
- [PILOT_INTAKE_FORM_TEMPLATE.md](./PILOT_INTAKE_FORM_TEMPLATE.md) — formularz founder na luki

---

## 5. Po MVP pilota (nie na D0)

| Priorytet | Zmiana | Effort |
|-----------|--------|--------|
| P1 | Stripe Price: one-time 7d pilot 49 PLN → metadata `pilot_expires_at` | 1–2h config |
| P2 | Pola profilu: `linkedin_url`, `availability_date`, `contract_types[]`, `excluded_industries[]` | mała migracja |
| P3 | Checkboxy zgód pilota (case study, report responses) — osobne od talent pool | schema + UI |
