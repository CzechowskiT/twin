# Limited Recruiter Pilot Pack — 2026-06-06

**Owner:** TWIN Limited Recruiter Pilot Pack Owner  
**Branch:** `chore/limited-recruiter-pilot-pack-2026-06-06`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Audience:** Founder, named pilot recruiters (3–5), internal GTM  
**Doc UTC:** `2026-06-06`

**Launch stance:** Public **NO-GO** · controlled recruiter pilot **READY FOR FOUNDER DECISION** (founder **defers external invitations** until hardening) · S2 **PASS** · R1–R5 **PASS** (R5 Match Receipt `2026-06-06T16:38:40Z`) · auto-apply **PAUSED** · delegated **NOT LIVE** · audit verdict **C)** candidate-first, recruiter-supporting

**Hard bans in this pack:** No deploy, env, DB, migrations, secrets, tokens, public GO, auto-apply/delegated enable, recruiter-replacement language, CSP changes.

---

## 1 — Executive summary

TWIN invites **3–5 named recruiters** into a **limited, founder-led pilot** to validate the **calendar-of-acceptance** north star from the employer side: a **short queue of pre-qualified applications** with **match score + rule-based reasons**, explicit **accept / decline**, and **no CV firehose**.

Production recruiter inbox smoke **R1–R5 PASS** (R1–R4 `2026-06-06T16:07:18Z`; **R5 Match Receipt** `2026-06-06T16:38:40Z`). This is **not** public launch, **not** a two-sided marketplace claim, and **not** permission to enable auto-apply or delegated submit.

**Founder decision required:** **H1–H4 complete 2026-06-06** (`docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`, `docs/H4_DEMO_SEED_POLISH_2026-06-06.md`); H4 final visual smoke **CLEAN PASS** `2026-06-06T17:36:25Z`. **H5 dry run pack shipped** (`docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md`) — founder completes private dry run **before** any external invite. **H5 founder GO** for 3–5 named recruiters only after dry run PASS (rubric ≥4.0) — then use `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` and track outcomes in `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`. External invitations deferred until H5 GO.

---

## 2 — Pilot scope and audience

| Dimension | In scope | Out of scope |
| --------- | -------- | ------------ |
| **Cohort size** | 3–5 **named** recruiters (founder-selected) | Open LinkedIn campaign; uncontrolled signup |
| **Product surfaces** | `/for-recruiters`, `/recruiter/inbox`, `/recruiter/jobs` (POST) | Watchlists, HM packets, employer SSO, talent-pool browse |
| **Auth model** | Invite-only **access code** + company slug (per partner) | Self-serve recruiter checkout; seat packs without contract |
| **Languages** | PL + EN (UI + founder talk track) | Full i18n beyond shipped strings |
| **Duration** | 4–6 weeks initial window; extend by founder decision | Indefinite “production GA” promise |
| **Support** | Founder onboarding call + async feedback channel | 24/7 SLA; dedicated Slack bridge (roadmap tier only) |

**Ideal pilot profile:** In-house or agency recruiter placing tech/product roles in Poland (or PL-speaking), willing to give structured feedback on **signal vs noise**, not expecting ATS replacement on day one.

---

## 3 — North star (recruiter lens)

Outside TWIN, someone returns from time off to **random interview spam** or **thousands of raw CVs**. In TWIN they return to a **short calendar of pre-qualified moments**: candidates see slots worth showing up for; recruiters see **profiles already matched to the bar** — **accept / decline / reschedule**, not blind sifting.

**Pilot promise (honest):** TWIN **ranks before rows hit your inbox**; **you** decide who gets an interview slot. Automation on the candidate side is **paused** on production today; delegated submit is **not live**.

---

## 4 — What is live today

| Surface | Status | Recruiter-visible behaviour |
| ------- | ------ | --------------------------- |
| **Marketing** `/for-recruiters` | LIVE | Pilot inbox, match transparency, jobs POST marked live; watchlists / HM packets marked roadmap |
| **Acceptance inbox** `/recruiter/inbox` | LIVE (token pilot) | Queue load; match % badge + label; up to 3 rule-based reasons; **expandable review card (A–H)**; batch accept/decline; status badges; banner *“AI-assisted ranking. Recruiter decision required.”* |
| **Employer jobs** `/recruiter/jobs` | LIVE (pilot) | POST creates employer listing for future matches |
| **Match transparency** | LIVE (2026-06-06) | Deterministic reasons + **`review_card`** (gaps, verify checklist, data confidence) — not black-box LLM on inbox rows |
| **Human-in-the-loop** | LIVE | Accept → *Accepted for interview* / *Zaakceptowany na rozmowę*; decline → *Declined* / *Odrzucony*; no stale accept CTA on decided rows |
| **Rate limits** | LIVE | Inbox write caps (abuse protection) |
| **Production smoke** | PASS | R1–R4 `2026-06-06T16:07:18Z` · **R5 Match Receipt** `2026-06-06T16:38:40Z` — see `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` |

**Demo company (investor path only):** Nova Hiring PL — use only when founder explicitly runs demo; named pilots get **their own** company slug + access code via secure channel (not in this doc).

---

## 5 — What is NOT live (mandatory disclaimers)

| Claim | Reality |
| ----- | ------- |
| Public launch / open signup | **NO-GO** — named pilot only |
| Auto-apply “while you sleep” on production | **PAUSED** — prepare-only posture; server gates live |
| Delegated submit / KYC verified candidates | **NOT LIVE** |
| Recruiter watchlists, HM packets, governance presets | **Marketing roadmap** — not shipped app |
| Two-sided marketplace / liquidity at scale | **Not evidenced** — candidate-led corpus |
| Employer SSO / RBAC | **Token pilot only** |
| Anonymized B2B talent pool browse for recruiters | **Design + candidate opt-in copy** — no recruiter browse UI evidenced |
| ATS webhooks production-verified | **Scaffold / best-effort** |
| Full Apple Calendar OAuth | **ICS/WebCal partial** (O5 waiver) |
| Self-service account delete | **Manual DSR** (L6 waiver) |
| “Replace LinkedIn / replace recruiters” | **Forbidden** — supportive tooling only |

Always pair candidate-side automation language with: *“Phased prepare-only on production; delegated submit not live.”* / *„Na produkcji prepare-only; delegated submit wyłączony.”*

---

## 6 — PII policy (pilot waiver)

| Surface | Candidate name | Email / phone / CV text |
| ------- | -------------- | ------------------------ |
| **Recruiter inbox** (`pii_context: application_review`) | **Shown** — employer reviewing submitted application | Not in inbox API — see `data_visibility_*` metadata |
| **B2B talent pool** (`pii_context: talent_pool_anonymized`) | **Hidden** — skills + badge + score only | Never shown |

**Policy docs:** `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md` · `docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`

**Pilot disclosure (include in every invite):** Inbox rows show **candidate names** for application review — this differs from the anonymized talent-pool design. Do not screenshot queue rows into public channels. Rotate access if a code leaks (founder-only ops — see `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md`).

---

## 7 — PL + EN talk track (founder)

### Opening (30 s)

**EN:** “TWIN is testing a recruiter inbox that shows you a **short, pre-ranked queue** — match score, three reasons, accept or decline in one click. This is a **named pilot**, not public launch. Auto-apply is **paused**; you stay in control of every interview slot.”

**PL:** „TWIN testuje skrzynkę rekrutera: **krótka, wstępnie oceniona kolejka** — wynik dopasowania, trzy powody, akceptuj lub odrzuć jednym kliknięciem. To **pilotaż na zaproszenie**, nie publiczny start. Auto-apply jest **wstrzymane**; Ty decydujesz o każdym slocie na rozmowę.”

### Value (60 s)

**EN:** “Our north star is **calendar of acceptance**, not inbox spam. Candidates opt in to matching; you see applications TWIN already scored against your bar. The banner says **AI-assisted ranking — recruiter decision required** — because nothing books an interview without your click.”

**PL:** „Nasz cel to **kalendarz akceptacji**, nie spam CV. Kandydaci wyrażają zgodę na dopasowanie; Ty widzisz aplikacje ocenione względem Twojego progu. Baner mówi: **Ranking wspomagany AI — decyzja rekrutera jest wymagana** — bo nic nie rezerwuje rozmowy bez Twojego kliknięcia.”

### Honesty block (45 s)

**EN:** “What's **live**: inbox, match reasons, job POST. What's **roadmap**: watchlists, HM packets, SSO, anonymized talent-pool browse. We won't pretend those exist in the product today.”

**PL:** „**Na żywo**: skrzynka, uzasadnienia dopasowania, POST ogłoszeń. **Roadmapa**: watchlisty, paczki dla hiring managerów, SSO, anonimowa pula talentów. Nie udajemy, że to już jest w produkcie.”

### Close (30 s)

**EN:** “If a row feels like spam, tell us the match score — we'll tune thresholds. After four weeks we'll decide together whether to expand. No fee pressure in pilot; we want signal on **accept rate vs noise**.”

**PL:** „Jeśli wiersz wygląda na spam, podaj wynik dopasowania — dostroimy progi. Po czterech tygodniach wspólnie zdecydujemy o rozszerzeniu. W pilocie bez presji opłat; chcemy sygnału: **akceptacje vs szum**.”

---

## 8 — Demo script (5–7 minutes)

**Preconditions:** Founder has valid pilot access (secure channel). Browser: Chrome or Safari. Locale toggle tested once in PL and once in EN if audience is bilingual.

| Step | Time | Action | Say (EN) | Say (PL) |
| ---- | ---- | ------ | -------- | -------- |
| 1 | 0:30 | Open `/for-recruiters` | “This page is our honest SKU map — live vs roadmap.” | „Ta strona to uczciwa mapa — live vs roadmapa.” |
| 2 | 0:45 | Open `/recruiter/inbox` | “You'll get an access code by email — paste it here with your company name.” | „Dostaniesz kod mailem — wklej go tu z nazwą firmy.” |
| 3 | 0:30 | Load queue | “Banner: AI-assisted ranking — your decision is required.” | „Baner: ranking wspomagany AI — Twoja decyzja jest wymagana.” |
| 4 | 1:30 | Inspect one row | “Match percent, label — excellent to weak — and up to three reasons from profile overlap.” | „Procent dopasowania, etykieta — od doskonałego do słabego — i do trzech powodów z profilu.” |
| 5 | 1:30 | Accept one row | “Accepted for interview — accept button gone — no stale CTA.” | „Zaakceptowany na rozmowę — przycisk znika — bez wiszącego CTA.” |
| 6 | 1:00 | Decline another (optional note) | “Internal note is audit-only — not sent to candidate.” | „Notatka wewnętrzna tylko do audytu — nie idzie do kandydata.” |
| 7 | 0:45 | Filter Applied vs All statuses | “Applied hides decided rows; All shows badges.” | „Złożone ukrywa rozstrzygnięte; Wszystkie pokazuje odznaki.” |
| 8 | 0:30 | Optional: `/recruiter/jobs` | “You can POST a role — same access pattern.” | „Możesz dodać rolę — ten sam wzorzec dostępu.” |
| 9 | 0:30 | Close | “TWIN ranks before your inbox; you accept who gets the calendar slot.” | „TWIN sortuje zanim trafi do skrzynki; Ty akceptujesz kto dostaje slot.” |

**Full path reference:** `docs/RECRUITER_DEMO_PATH_2026-06-06.md` (2–3 min compressed variant for investors).

---

## 9 — Objection handling

| Objection | Response (EN) | Response (PL) | Evidence |
| --------- | ------------- | ------------- | -------- |
| “Auto-apply bots will spam our jobs” | “Auto-apply is **paused** on production; server returns 403 if re-enabled without gates. Pilot inbox is human accept/decline only.” | „Auto-apply jest **wstrzymane** na produkcji; serwer zwraca 403 bez bramek. W pilocie tylko akceptuj/odrzuć.” | `autonomous_apply_policy.py`; pause plan docs |
| “Unqualified flood” | “Each row shows **match score + up to 3 reasons**. Tell us your bar; we tune thresholds. Low score = escalate to founder.” | „Każdy wiersz ma **wynik + do 3 powodów**. Podaj próg; dostroimy. Niski wynik = eskalacja do foundera.” | Inbox API 2026-06-06 |
| “Black-box AI” | “Inbox ranking is **rule-based** (skills, title, location, salary). **Review card** explains gaps and what to verify. Banner says AI-**assisted**, not AI-decided.” | „Ranking w skrzynce jest **regułowy**. **Karta oceny** pokazuje luki i co zweryfikować. Baner: wspomagany AI, nie decyzja AI.” | `recruiter_match_explanations.py` |
| “GDPR / names visible” | “Inbox = **application review** — names shown by pilot policy. Talent pool browse (roadmap) is anonymized. DPA on request.” | „Skrzynka = **przegląd aplikacji** — imiona w polityce pilotażu. Pula talentów (roadmapa) anonimowa. DPA na życzenie.” | PII table §6; audit G-R01 |
| “Can't integrate ATS” | “Webhook scaffold exists; **not production-verified** yet. Pilot is inbox-first.” | „Szkielet webhooka istnieje; **bez prod weryfikacji**. Pilotaż = skrzynka first.” | `integrations_ats.py` |
| “Replaces recruiters” | “TWIN is **candidate-first, recruiter-supporting** — you keep every accept/decline. We don't claim to replace LinkedIn or your desk.” | „TWIN jest **kandydat-first, wspiera rekrutera** — Ty zostawiasz każdą decyzję. Nie zastępujemy LinkedIn ani Twojego biurka.” | Audit verdict C |
| “Low liquidity / empty queue” | “Pilot may start with **empty queue** — still valid (200 + empty copy). We seed matches as candidates opt in to your roles.” | „Pilot może zacząć od **pustej kolejki** — to OK (200 + komunikat). Dopasowania rosną gdy kandydaci opt-in do Twoich ról.” | R3 smoke |
| “What's the fee?” | “Pilot is **invite-only** — no self-serve checkout. Success-fee design is **placement verification**, not apply volume — roadmap conversation.” | „Pilot **na zaproszenie** — bez self-serve. Model to **weryfikacja placementu**, nie wolumen aplikacji — rozmowa roadmapy.” | `PLACEMENT_VERIFICATION.md` |

---

## 10 — Onboarding flow (founder checklist)

| # | Step | Owner | Done |
| - | ---- | ----- | ---- |
| O1 | Confirm founder **GO** for this named recruiter | Founder | ☐ |
| O2 | Add row to `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` | Founder | ☐ |
| O3 | Mint company slug + access code (secure channel — **not** in docs) | Founder / ops | ☐ |
| O4 | Send invite from `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` (PL or EN) | Founder | ☐ |
| O5 | 15-min onboarding call — use talk track §7 + demo §8 | Founder | ☐ |
| O6 | Recruiter loads queue — confirm R1-style friendly errors if wrong code | Recruiter | ☐ |
| O7 | First accept/decline within 7 days — log in tracker | Recruiter | ☐ |
| O8 | Week-2 async check-in — spam playbook if needed | Founder | ☐ |
| O9 | Week-4 synthesis — expand / hold / withdraw per tracker rubric | Founder | ☐ |

**Launch-day monitoring:** If onboarding coincides with demo day, follow T-60/T-30/T-15 in `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` — pilot GO only, **not** public GO.

---

## 11 — Success criteria (pilot)

| Signal | Target (4–6 weeks) | How measured |
| ------ | ------------------- | ------------ |
| **Activation** | ≥1 queue load + ≥1 decision in first 7 days | Tracker column |
| **Signal quality** | Median match score on accepted rows ≥ median on declined (directional) | Tracker + founder notes |
| **Noise reports** | ≤1 “spam” escalation per recruiter without repeat after threshold tune | Operating manual playbook |
| **Honesty NPS** | Recruiter agrees product matched invite disclaimers | Week-4 interview |
| **Expansion intent** | ≥3/5 recruiters request second month or refer peer | Decision log |

Full rubric: `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` § Rubric.

---

## 12 — Feedback capture

| Channel | Use |
| ------- | --- |
| **Tracker notes column** | Structured weekly founder log |
| **Email reply to invite thread** | Bug reports, UX friction |
| **15-min week-2 / week-4 call** | Qualitative — accept rate, reasons trust, missing SKU |
| **Spam escalation** | Match score + screenshot (private) → `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` § recruiter spam |

Capture verbatim objections into tracker for synthesis — especially PII, ATS, and auto-apply fears.

---

## 13 — Escalation and spam playbook

**If recruiter reports spam-looking application:**

1. Pull row **match score** and reasons (recruiter-visible in UI).
2. If score below recruiter bar, discuss **threshold** — candidate-side `min_score_threshold` drift is a known pilot failure mode.
3. Founder responds with score transparency; tune or document decline pattern.
4. Log incident in tracker **Decision log**.

**If access code leaks:** Founder rotates credentials per operating manual — **not** documented in this pack.

**If production inbox unavailable:** Check R2 config readiness checklist in `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` — founder-only ops.

**Public comms incident:** Do **not** post about pilot on LinkedIn/X until public launch gates green.

---

## 14 — Do-not-claim list (pilot outbound)

- ❌ Public launch live
- ❌ Auto-apply or delegated submit **live** on production
- ❌ “Apply while you sleep” without paused/delegated qualifiers
- ❌ Watchlists, HM packets, governance presets as **shipped**
- ❌ Two-sided marketplace / guaranteed interviews
- ❌ KYC-verified candidates
- ❌ Full Apple Calendar OAuth
- ❌ “Replace recruiters” / “Replace LinkedIn”
- ❌ Self-serve recruiter checkout at scale
- ❌ Production-verified ATS for all vendors

---

## 15 — Related docs

| Doc | Purpose |
| --- | ------- |
| `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` | Cohort table, rubric, decision log |
| `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` | Outbound templates PL/EN |
| `docs/RECRUITER_DEMO_PATH_2026-06-06.md` | Compressed demo path |
| `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` | R1–R4 evidence |
| `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md` | Verdict C; gap list |
| `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | Daily ops + kill-switches |
| `docs/CONTROLLED_PILOT_INVITE_BRIEF_2026-05-28.md` | General pilot invite guardrails |
| `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | Demo-day monitoring |
| `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` | Pre-invite founder dry run (20–30 min) |
| `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` | Dry run tick-box + decision log |
| `docs/PLACEMENT_VERIFICATION.md` | Fee / verification design |

---

## 16 — Current status

| Field | Value |
| ----- | ----- |
| **Public launch** | **NO-GO** |
| **Controlled recruiter pilot** | **READY FOR FOUNDER DRY RUN** — H4 **CLEAN PASS**; H5 pack **shipped**; founder **defers external invitations** until **H5 GO** after dry run PASS |
| **S2 CSP** | **PASS** (post-enforce `2026-06-05T16:20:13Z`; enforce ON; 24h monitor complete `2026-06-06T16:20:13Z`) |
| **Recruiter inbox R1–R4** | **PASS** `2026-06-06T16:07:18Z` |
| **Recruiter Match Receipt (R5)** | **PASS** `2026-06-06T16:38:40Z` — Nova Hiring PL; all review-card sections visible |
| **Auto-apply** | **PAUSED** |
| **Delegated apply** | **NOT LIVE** |
| **Audit verdict** | **C)** candidate-first, recruiter-supporting |
| **Cohort invited** | **0 / 3–5** (tracker empty — awaiting hardening + founder GO) |
| **This pack** | **COMPLETE** — docs only; no prod mutations |

**Pre-pilot hardening (complete):**

1. ~~PII / consent receipt alignment~~ ✅ **2026-06-06**
2. ~~Candidate-side consent receipt~~ ✅ **2026-06-06** (dashboard applications panel)
3. ~~Recruiter-side data visibility explanation~~ ✅ **2026-06-06** (inbox note + API metadata)
4. ~~Demo seed polish~~ ✅ **2026-06-06** — H4 final visual smoke **CLEAN PASS** `2026-06-06T17:36:25Z`
5. ~~H5 dry run pack~~ ✅ **2026-06-06** — `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` + checklist
6. **H5 — Founder dry run PASS** → **H5 GO** for 3–5 named recruiters — **next**

**Next founder action:** Run dry run per H5 pack → score rubric → sign H5 decision → fill tracker row 1 → send first invite → schedule onboarding call.

---

## Hard bans honoured

- ✅ Docs only — no code, env, deploy, DB, migrations, secrets, tokens
- ✅ No public launch GO · auto-apply stays **PAUSED** · delegated **NOT LIVE**
- ✅ No recruiter-replacement language · no CSP changes
