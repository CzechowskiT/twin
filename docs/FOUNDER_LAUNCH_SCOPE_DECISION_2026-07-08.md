# Founder Launch Scope Decision — 2026-07-08

**Źródło:** [Product Scope Reality Review](./PRODUCT_SCOPE_REALITY_REVIEW_2026-07-08.md) (Product Polish P0–P3). **Ten plik:** tylko decyzje foundera — **bez** zmian produktu, backendu, API, auth, DB, env, Playwright / Gate E.

**Rekomendacja zespołu:** **scoped launch** (wąski rdzeń live + controlled pilot), **nie** full-platform launch (57 tras pilot → live).

| Ścieżka | Szacunek |
|---------|----------|
| Pełne doprowadzenie wszystkich pilot paths do public-launch-ready | **18–30 miesięcy**, **2–3 FTE** full-stack |
| Scoped / honest limited public launch (rdzeń live + founder-led pilot) | **2–4 tygodnie** (decyzje + smoke QA) |

---

## A. Current stance

| Pole | Wartość |
|------|---------|
| **P0** | **CLOSED** |
| **Gate E** | **PASS** |
| **Gate F** | **PENDING** |
| **Launch** | **NO-GO** |

**CANONICAL_STANCE:** `P0_CLOSED | Gate_E_PASS | Gate_F_PENDING | Launch_NO-GO`

---

## B. Accepted product reality

Founder potwierdza rozumienie (szczegóły w reality review):

- **18–30 miesięcy** / **2–3 FTE** na pełne pilot→live — **nie** przed pierwszym public launch.
- **2–4 tygodnie** na scoped launch na istniejącym rdzeniu live — **nie** 18 miesięcy dev.

**ACCEPTED_REALITY:** `18-30_months|2-3_FTE|scoped_launch`

---

## C. Proposed public launch surface

**Rekomendacja (primary nav / obietnica marketingowa):** `PUBLIC_LAUNCH_MODULES: candidate_8_recruiter_5_company_4`

| Persona | Moduły live (reference) | Limit |
|---------|-------------------------|-------|
| **Candidate** | panel, jobs, matches, profile, CV, applications, calendar (Google), identity | **8** |
| **Recruiter** | hub, inbox, pipeline, jobs, search | **5** |
| **Company** | dashboard, roles, pipeline | **4** |
| **Marketing** | `/`, `/for-*`, `/waitlist`, `/demo`, `/faq`, legal | public |
| **Investor** | public room, metrics, roadmap, calculator | public DD |

Poza primary: evidence, career, interview prep, trust subflows, billing preview, demo journeys, ATS, board.

---

## D. Controlled pilot only

**Rekomendacja:** `CONTROLLED_PILOT_PRIMARY_LIMITS` — candidate ≤8, recruiter ≤5, company ≤4; roadmap badges (P3); deep linki z `PilotPreviewBoundary` / `isPilotPreviewDeepLinkPath()`; chrome pilot tylko na `isPilotPreviewChromePath()`; kohorta **founder-led** / waitlist batch.

**Pilot-only (przykłady):** career compass, interview prep, referrals, trust subflows, recruiter daily cockpit / talent pool / analytics / integrations readiness, company talent pool / hiring cockpits, investor data room, `demo-*` journeys.

**CONTROLLED_PILOT_MODEL:** `primary_limits | roadmap_badges | deep_links_preserved | founder_led_cohort`

---

## E. Hidden / hold

**Always hidden** (`ALWAYS_HIDDEN_MODULE_IDS`): `auto_apply`, `candidate_revoke_delete`, `recruiter_calendar`, `recruiter_operational_work_queue`, `recruiter_ats_import_readiness`, `company_billing`, `company_ats_import_readiness`.

**Hold / internal:** `/board/*`, admin; partners / careers / media (coming_soon); Microsoft calendar (`FORCE_MICROSOFT_CALENDAR_COMING_SOON`); auto-apply UI **paused**; H5c/H5d external recruiter cohort **HOLD**.

**HIDDEN_HOLD_MODULE_IDS:** `auto_apply,candidate_revoke_delete,recruiter_calendar,recruiter_operational_work_queue,recruiter_ats_import_readiness,company_billing,company_ats_import_readiness,board_admin,partners_careers_media_coming_soon,microsoft_calendar_coming_soon`

---

## F. Logo disclaimer

| Opcja | Opis |
|-------|------|
| **Opcja 1** | Zostawić disclaimer **pod marquee** (adjacent) — rekomendowane |
| **Opcja 2** | Krótszy premium copy (rewrite, nadal widoczny przy marquee) |
| **Opcja 3** | Przenieść / usunąć disclaimer — wysokie ryzyko overclaim |

**LOGO_DISCLAIMER_DEFAULT:** `Option_1_keep`  
**LOGO_DISCLAIMER_RECOMMENDATION:** `Option_1_keep`

---

## G. Founder checkboxes (decision-only)

Zaznacz **jedną** opcję na wiersz. Odpowiedź można też zapisać jako `YES` (accept) / `NO` (reject) / `EDIT` (dopisz w komentarzu).

**FOUNDER_CHECKBOX_FORMAT:** `YES|NO|EDIT`

| # | Decyzja | Opcje |
|---|---------|--------|
| **1** | **Public launch surface** | [ ] Accept recommended scoped surface (sekcja C, 8/5/4) · [ ] Edit scope · [ ] Reject scope |
| **2** | **Controlled pilot surface** | [ ] Accept recommended pilot surface (sekcja D) · [ ] Edit pilot scope · [ ] Reject pilot scope |
| **3** | **Hidden/Hold list** | [ ] Accept hidden/hold list (sekcja E) · [ ] Edit hidden/hold list · [ ] — |
| **4** | **Logo disclaimer** | [ ] Keep adjacent disclaimer (Opcja 1) · [ ] Rewrite to shorter premium copy (Opcja 2) · [ ] Move/remove disclaimer (Opcja 3) |
| **5** | **Gate F next step** | [ ] Proceed to Gate F decision (osobny krok — **≠ Launch GO**) · [ ] Keep Gate F pending |

**FOUNDER_GATE_F_NEXT_STEP:** `separate_decision_not_launch_go` — wybór „Proceed to Gate F decision” **nie** ustawia Gate F YES ani Launch GO.

**Launch GO:** osobny dokument po Gate F i checklistie — **nie** w tym pliku.

---

## H. Explicit non-claims

- **NOT Launch GO** — ten dokument **nie** zatwierdza public launch.
- **NOT Gate F YES** — Gate F pozostaje **PENDING** do founder response (wiersz G5) i osobnego Gate F packa.
- **Gate F YES ≠ Launch GO** — nawet po Gate F YES wymagana osobna decyzja Launch GO.
- **Gate F:** **PENDING** (nie zmienione przez ten plik).

**EXPLICIT_NON_CLAIMS:** `NOT_Launch_GO|NOT_Gate_F_YES|Gate_F_PENDING`

**Stance footer:** **P0 CLOSED** | **Gate E PASS** | **Gate F PENDING** | **Launch NO-GO**

---


---

## Current repository state

| Artefakt | Status |
|----------|--------|
| **PR #414** (product polish P3) | **MERGED** — `abb0f4d420381982806066f0ae8a4b0070d736df` |
| **PR #415** (product scope reality review) | **MERGED** — `a6981eba8644b91d432d198ffcd5f855715ef914` |
| **PR #416** (product polish P4) | **MERGED** — `b204b3c47074a63d25b84c85dbd9cd3d4e4116f3` |
| **PR #417** (founder launch scope decision scaffold) | **MERGED** — `536adf80aa23ef6ff97b48a3baa23e95bb64fd45` |
| **`cursor/phase1-monorepo-scaffold` HEAD** | `536adf80aa23ef6ff97b48a3baa23e95bb64fd45` |

**Current stance (repo):**

| Pole | Wartość |
|------|---------|
| **P0** | **CLOSED** |
| **Gate E** | **PASS** |
| **Gate F** | **PENDING** |
| **Launch** | **NO-GO** |

`CANONICAL_STANCE: P0_CLOSED | Gate_E_PASS | Gate_F_PENDING | Launch_NO-GO`

---

## Founder action required

Founder uzupełnia decyzje **G1–G8** (puste do wypełnienia — bez auto-uzupełniania przez zespół):

| ID | Temat | Decyzja foundera |
|----|--------|------------------|
| **G1** | Public launch scope | |
| **G2** | Scoped launch vs full-platform | |
| **G3** | Controlled pilot | |
| **G4** | Hidden/hold list | |
| **G5** | Auto-apply paused | |
| **G6** | Logo disclaimer option | |
| **G7** | Gate F next step | |
| **G8** | Launch GO remains separate | |

## Metryki (guard / automation)

```
FOUNDER_LAUNCH_SCOPE_DECISION_DATE: 2026-07-08
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
ACCEPTED_REALITY: 18-30_months|2-3_FTE|scoped_launch
PUBLIC_LAUNCH_MODULES: candidate_8_recruiter_5_company_4
CONTROLLED_PILOT_PRIMARY_LIMITS: candidate=8,recruiter=5,company=4
HIDDEN_HOLD_MODULE_IDS: auto_apply,candidate_revoke_delete,recruiter_calendar,recruiter_operational_work_queue,recruiter_ats_import_readiness,company_billing,company_ats_import_readiness
LOGO_DISCLAIMER_DEFAULT: Option_1_keep
FOUNDER_CHECKBOX_FORMAT: YES|NO|EDIT
EXPLICIT_NON_CLAIMS: NOT_Launch_GO|NOT_Gate_F_YES|Gate_F_PENDING
```
