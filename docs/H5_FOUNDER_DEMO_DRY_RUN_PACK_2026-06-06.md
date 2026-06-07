# H5 Founder Demo Dry Run Pack — 2026-06-06

**Owner:** TWIN H5 Founder Demo Dry Run Pack Owner  
**Branch:** `chore/h5-founder-demo-dry-run-pack-2026-06-06`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Audience:** Founder (private dry run before any external recruiter conversation)  
**Doc UTC:** `2026-06-06`

**Launch stance:** Public **NO-GO** · controlled recruiter pilot **READY FOR FOUNDER DRY RUN** · auto-apply **PAUSED** · delegated **NOT LIVE** · external invitations **deferred** until explicit founder **H5 GO**

**Hard bans in this pack:** No deploy, env, DB, migrations, secrets, tokens, public GO, auto-apply/delegated enable, invitation sending, CSP changes, recruiter-replacement language.

---

## 1 — Executive summary

This pack prepares the founder to run a **private, repeatable 20–30 minute recruiter/HR demo** on production stack using the **Nova Hiring PL** canonical queue (`/recruiter/inbox?company_slug=nova-hiring-pl`).

**What this pack does:**

- Provides a timed agenda, live screen path, PL/EN talk tracks, candidate-by-candidate notes, objection scripts, feedback questions, and a scoring rubric so the first external conversation does not rely on improvisation.
- Validates **trust and recruiter-supporting positioning** — TWIN ranks and explains; the recruiter decides.

**What this pack does NOT do:**

- **Does not authorize** sending external recruiter invitations.
- **Does not authorize** public launch.
- **Does not change** product, env, DB, or production configuration.

**H5 decision is separate:** Completing this dry run and scoring **GO** or **GO SMALL** is a prerequisite for the founder to sign **H5 GO** and use `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md`. Until then, external invites remain deferred.

**Product reality preserved:** S2 CSP **PASS** enforce ON · R1–R5 **PASS** · H4 **CLEAN PASS** · 5 canonical Nova Hiring PL rows · PII/consent **DONE** · candidate transparency panel **polished 2026-06-07** · public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE**.

---

## 2 — Demo objective

Founder must validate in dry run (self-score or trusted internal observer):

| # | Validation question | Pass signal |
| - | ------------------- | ----------- |
| V1 | Can founder explain TWIN in **less than 2 minutes**? | Clear north star: calendar of acceptance, not CV firehose |
| V2 | Can founder show recruiter value in **less than 5 minutes**? | Queue loads; match % + reasons visible without scrolling chaos |
| V3 | Can founder explain why TWIN **supports recruiters** rather than replacing them? | Uses required phrases; human decision emphasized |
| V4 | Can founder show **match score / reasons / review card** clearly? | Expands card on ≥2 rows; sections A–H named aloud |
| V5 | Can founder explain **PII boundaries** and **candidate consent**? | application_review vs anonymized talent pool distinguished |
| V6 | Can founder answer core **AI/HR objections** without overclaiming? | No legal certification; no personality claims; honest roadmap |
| V7 | Can founder ask **useful feedback questions**? | Uses §10 script; captures 1–5 scores + open notes |

**Dry-run success:** Average rubric score **≥4.0** and zero **HOLD** triggers (see §11, §13). Recommended path: **GO SMALL** after one internal dry run passes.

---

## 3 — Pre-demo checklist

Complete **within 30 minutes** of dry run. Use `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` for tick boxes.

| # | Check | Pass when |
| - | ----- | --------- |
| P1 | Open **Chrome Incognito** (or Safari Private) | Clean session; no stale tokens in URL bar |
| P2 | Navigate to `https://twin-sooty.vercel.app/recruiter/inbox?company_slug=nova-hiring-pl` | Access form loads; PL/EN labels OK |
| P3 | Access code available via **secure channel only** (vault / local seed output — **never** in docs) | Code ready; **not** visible on screen before screen share |
| P4 | Load queue | Banner: *AI-assisted ranking. Recruiter decision required.* (or PL equivalent) |
| P5 | Confirm **exactly 5 rows** (filter: All statuses) | No sixth legacy row |
| P6 | **Alex Kowalski (demo)** — status **interview** | Badge *Zaakceptowany na rozmowę* / *Accepted for interview* |
| P7 | **Jan Kaczor (demo)** — status **rejected** | Badge *Odrzucony* / *Declined* |
| P8 | **Marta / Piotr / Ewa** — status **applied** | Zaakceptuj/Odrzuć visible on pending rows |
| P9 | **Review card** expands on at least Marta + Ewa | Sections A–H render |
| P10 | **PII visibility note** under queue header | Locale-aware summary visible |
| P11 | DevTools Console — **no CSP violations** | S2 enforce unchanged |
| P12 | Confirm **public launch NO-GO** | No launch copy in demo |
| P13 | Confirm **auto-apply PAUSED** | Verbal honesty block ready |
| P14 | Confirm **delegated NOT LIVE** | Verbal honesty block ready |
| P15 | Second display / notes doc open for scoring | Checklist § scoring table ready |

**If any P4–P11 fails:** **STOP** — do not proceed to external invite planning. See §13 failure modes.

---

## 4 — 20–30 minute demo agenda

| Time | Block | Focus | Founder outcome |
| ---- | ----- | ----- | --------------- |
| **0–2 min** | Context and framing | North star; pilot honesty; not public launch | Audience knows this is controlled pilot-ready demo |
| **2–5 min** | Candidate and recruiter problem | CV firehose vs calendar of acceptance | Pain acknowledged; TWIN positioned as signal filter |
| **5–12 min** | Recruiter inbox walkthrough | Load queue; 5 rows; status variety; banner | Queue trust established |
| **12–17 min** | Candidate Review Card / Match Receipt | Expand card on Marta + Ewa; explain gaps | Explainability demonstrated |
| **17–20 min** | PII / consent / human decision | Visibility note; consent receipt mention; section G | Boundaries clear; no overclaim |
| **20–25 min** | Objections and discussion | §9 table — pick 2–3 likely objections | Honest answers without legal certification |
| **25–30 min** | Feedback questions and next step | §10 questions; dry-run scoring if solo | Notes captured; H5 decision draft |

**Solo dry run:** Record yourself or use trusted internal observer. **Live recruiter demo:** Same agenda; skip rubric self-score until after call.

---

## 5 — Live screen path (A–M)

**Route base:** `https://twin-sooty.vercel.app`  
**Demo company:** Nova Hiring PL (`nova-hiring-pl`)  
**Queue URL:** `/recruiter/inbox?company_slug=nova-hiring-pl`

| Step | Action | Say (one line) | Do not |
| ---- | ------ | -------------- | ------ |
| **A** | Homepage or verbal context only | “I'll show the recruiter inbox — not a marketing tour.” | Do not claim public launch from homepage |
| **B** | Open `/recruiter/inbox?company_slug=nova-hiring-pl` | “This is the pilot acceptance inbox.” | Do not paste token into URL query on shared screen |
| **C** | Enter access code + load queue | “Short queue — your decision on every row.” | Do not read code aloud |
| **D** | Show 5 canonical rows (All statuses) | “Five applications — different match bands and statuses.” | Do not claim real candidates |
| **E** | **Alex Kowalski (demo)** — interview | “Already accepted — badge shows decided state; no stale accept button.” | Do not re-accept Alex in dry run |
| **F** | **Marta Nowak (demo)** — good / applied | “Strong overlap — but salary missing; verify before calendar.” | Do not claim salary verified by TWIN |
| **G** | **Piotr Zieliński (demo)** — possible / applied | “Possible fit — seniority and stack gaps flagged.” | Do not claim TWIN rejected Piotr |
| **H** | **Ewa Wiśniewska (demo)** — weak / applied | “Low confidence — incomplete profile; red flags visible.” | Do not claim AI filtered her out automatically |
| **I** | **Jan Kaczor (demo)** — rejected | “Prior decline with note — audit trail for recruiter.” | Do not claim candidate was notified of note |
| **J** | Expand **review card** on Marta, then Ewa | “Sections A–H — why, matched, gaps, verify, confidence, flags, human decision, disclaimer.” | Do not say LLM wrote the card |
| **K** | Point to **data visibility note** | “application_review context — name shown; email/phone/CV not in inbox.” | Do not claim full GDPR certification |
| **L** | Explain accept/decline **only** — do not mutate live queue | “You accept who gets the calendar slot; TWIN does not book alone.” | **No accept/decline clicks** on prod during dry run unless rehearsing reset locally |
| **M** | End with feedback questions (§10) | “What would make this trustworthy enough for a pilot week?” | Do not promise immediate invite |

**Canonical queue order (verify):**

1. Alex Kowalski (demo) — **interview**
2. Marta Nowak (demo) — **applied**
3. Piotr Zieliński (demo) — **applied**
4. Ewa Wiśniewska (demo) — **applied**
5. Jan Kaczor (demo) — **rejected**

---

## 6 — Founder talk track — Polish

**Ton:** spokojny, wiarygodny, bez hype'u, bez nadinterpretacji prawnej, bez narracji „zastępujemy rekrutera”.

### Otwarcie (0–2 min)

„Dziękuję za czas. Pokażę Wam **kontrolowany pilotaż** TWIN po stronie rekrutera — **to nie jest public launch**. TWIN jest **kandydat-first i wspiera rekrutera**: **TWIN nie zastępuje rekrutera.** Nasz cel to **kalendarz akceptacji**, nie góra CV.”

### Problem (2–5 min)

„Po urlopie rekruter wraca do losowego spamu rozmów albo tysięcy surowych CV. TWIN **porządkuje sygnały** zanim trafią do skrzynki: wynik dopasowania, do trzech powodów, jawne luki. **AI porządkuje sygnały i pokazuje braki danych** — ale **decyzja należy do rekrutera.**”

### Skrzynka (5–12 min)

„Otwieramy skrzynkę Nova Hiring PL — **pięć wierszy demo**, różne pasma dopasowania. Baner: **Ranking wspomagany AI — decyzja rekrutera jest wymagana.** Alex jest już **zaakceptowany na rozmowę** — widać odznakę, bez wiszącego przycisku. Marta ma **dobre** dopasowanie, ale **brak widełek** — to element *co zweryfikować*. Piotr to **możliwe** dopasowanie ze **lukami seniority/stacku**. Ewa to **słabe** — niekompletny profil. Jan jest **odrzucony** — historia decyzji rekrutera.”

### Karta oceny (12–17 min)

„Rozwijam **kartę oceny** — nie czarna skrzynka LLM, tylko **reguły i jawne sekcje A–H**: dlaczego ten kandydat, co pasuje, czego brakuje, co zweryfikować przed kalendarzem, pewność danych, czerwone flagi, **decyzja człowieka**, disclaimer. To **Match Receipt** — rekruter widzi uzasadnienie przed kliknięciem.”

### PII i zgoda (17–20 min)

„**W inboxie widzimy dane w kontekście application review** — imię przy przeglądzie aplikacji; e-mail, telefon i pełne CV **nie są** w API skrzynki. Kandydat ma **paragon zgody** w panelu. **Talent pool/discovery pozostaje anonimizowany jako osobny kontekst** — to roadmapa, nie dzisiejszy produkt dla rekrutera.”

### Uczciwość produktu (wbudowane)

„**To nie jest public launch.** **Auto-apply jest wstrzymane** na produkcji. **Delegated apply nie jest live.** **To jest kontrolowany pilotaż z feedbackiem** — max 3–5 named partnerów po mojej decyzji H5. Watchlisty, SSO, pełna integracja ATS — **roadmapa**, nie obietnica na dziś.”

### Zamknięcie (25–30 min)

„TWIN sortuje zanim trafi do skrzynki; **Ty akceptujesz, kto dostaje slot w kalendarzu.** Chcę Waszą szczerą feedback: czy powody są wiarygodne, czy szum byłby akceptowalny, co musiałoby się zmienić przed pilotażem tygodniowym.”

**Wymagane frazy (must say):**

- „TWIN nie zastępuje rekrutera.”
- „AI porządkuje sygnały i pokazuje braki danych.”
- „Decyzja należy do rekrutera.”
- „To nie jest public launch.”
- „Auto-apply jest wstrzymane.”
- „Delegated apply nie jest live.”
- „To jest kontrolowany pilotaż z feedbackiem.”
- „W inboxie widzimy dane w kontekście application review.”
- „Talent pool/discovery pozostaje anonimizowany jako osobny kontekst.”

---

## 7 — Founder talk track — English

**Tone:** calm, credible, no hype, no legal overclaim, no recruiter-replacement framing.

### Opening (0–2 min)

“Thanks for your time. I'll show a **controlled TWIN recruiter pilot** — **this is not a public launch**. TWIN is **candidate-first and recruiter-supporting**: **TWIN does not replace recruiters.** Our north star is **calendar of acceptance**, not a CV firehose.”

### Problem (2–5 min)

“After time off, recruiters return to random interview spam or thousands of raw CVs. TWIN **organizes signals** before rows hit your inbox: match score, up to three reasons, explicit gaps. **AI organizes signals and surfaces missing data** — but **the decision belongs to the recruiter.**”

### Inbox (5–12 min)

“We open the Nova Hiring PL inbox — **five demo rows**, different match bands. Banner: **AI-assisted ranking — recruiter decision required.** Alex is already **accepted for interview** — badge visible, no stale accept button. Marta is **good** fit but **salary missing** — listed under *what to verify*. Piotr is **possible** with **seniority/stack gaps**. Ewa is **weak** — incomplete profile. Jan is **declined** — prior recruiter decision on record.”

### Review card (12–17 min)

“I expand the **review card** — not a black-box LLM, **rule-based sections A–H**: why this candidate, what matched, what's uncertain, what to verify before calendar, data confidence, red flags, **human decision**, disclaimer. This is the **Match Receipt** — you see the reasoning before you click.”

### PII and consent (17–20 min)

“**In the inbox we see data in application_review context** — name for application review; email, phone, and full CV **are not** in the inbox API. Candidates have a **consent receipt** on their dashboard. **Talent pool/discovery stays anonymized as a separate context** — roadmap, not today's recruiter SKU.”

### Product honesty (embedded)

“**This is not a public launch.** **Auto-apply is paused** on production. **Delegated apply is not live.** **This is a controlled pilot with feedback** — max 3–5 named partners after my H5 decision. Watchlists, SSO, full ATS integration — **roadmap**, not a promise for today.”

### Close (25–30 min)

“TWIN ranks before your inbox; **you accept who gets the calendar slot.** I want candid feedback: whether reasons feel trustworthy, whether noise would be acceptable, and what must change before a one-week pilot.”

**Required phrases (must say):**

- “TWIN does not replace recruiters.”
- “AI organizes signals and surfaces missing data.”
- “The decision belongs to the recruiter.”
- “This is not a public launch.”
- “Auto-apply is paused.”
- “Delegated apply is not live.”
- “This is a controlled pilot with feedback.”
- “In the inbox we see data in application_review context.”
- “Talent pool/discovery stays anonymized as a separate context.”

---

## 8 — Candidate-by-candidate demo notes

### 1. Alex Kowalski (demo) — interview · excellent (96)

| Field | Guidance |
| ----- | -------- |
| **What to say** | “Top of queue — excellent match, already accepted. Shows decided-state UX: badge, no duplicate accept.” |
| **Why useful** | Demonstrates human-in-the-loop outcome; teaches stale-CTA prevention. |
| **What not to overclaim** | Not a real hire; not proof of marketplace liquidity; TWIN did not schedule calendar automatically. |
| **Review card** | High confidence; strong skills overlap (Python, FastAPI, PostgreSQL, Celery); section G: human decision already recorded. |

### 2. Marta Nowak (demo) — applied · good (74)

| Field | Guidance |
| ----- | -------- |
| **What to say** | “Strong backend profile — but **salary expectations not on profile**. Card lists *what to verify* before interview.” |
| **Why useful** | Shows TWIN surfaces **missing data** instead of hiding uncertainty. |
| **What recruiter should verify** | Salary range, seniority vs role bar, FastAPI depth in screen. |
| **What not to overclaim** | TWIN did not verify salary; no automated background check. |
| **Review card** | Good band; `what_to_verify` includes salary; `uncertain_or_missing` may note missing compensation. |

### 3. Piotr Zieliński (demo) — applied · possible (52)

| Field | Guidance |
| ----- | -------- |
| **What to say** | “Possible fit — Django-heavy, limited FastAPI/Celery; **seniority gaps** vs Senior Python Lead posting.” |
| **Why useful** | Teaches recruiters that **medium scores are explorable**, not auto-rejected. |
| **What not to overclaim** | TWIN did not reject Piotr; location (Kraków) may be a gap — recruiter decides. |
| **Review card** | `red_flags` / `uncertain_or_missing` — stack and seniority; data confidence likely medium. |

### 4. Ewa Wiśniewska (demo) — applied · weak (32)

| Field | Guidance |
| ----- | -------- |
| **What to say** | “Weak band — **incomplete profile**: sparse skills, no CV text, low confidence. Red flags visible — recruiter should decline or request more data.” |
| **Why useful** | Proves queue honesty — TWIN does not inflate weak rows to please employers. |
| **What not to overclaim** | Not proof of bad candidate as person; demo synthetic row; no auto-filter removed her. |
| **Review card** | Low/unknown data confidence; multiple red flags; section D urges verification or pass. |

### 5. Jan Kaczor (demo) — rejected · good (68)

| Field | Guidance |
| ----- | -------- |
| **What to say** | “Interesting case — **good score but prior decline**. Shows decision history and that score ≠ automatic accept.” |
| **Why useful** | Reinforces recruiter sovereignty; audit trail for pilot feedback. |
| **What not to overclaim** | Internal decline note not sent to candidate; not a legal rejection letter. |
| **Review card** | Good overlap possible; human decision section reflects prior decline; badge on All statuses filter. |

---

## 9 — Objection handling script

| Objection | Founder answer | What to show in product | What not to claim |
| --------- | -------------- | ----------------------- | ----------------- |
| “AI will replace recruiters.” | “**TWIN does not replace recruiters.** AI organizes signals and surfaces gaps; **the decision belongs to the recruiter.** Banner and review card section G say human decision required.” | Banner; section G; Alex decided row without stale CTA | Replacement of LinkedIn, agency desk, or HM role |
| “Who is responsible for errors?” | “Recruiter owns accept/decline. TWIN provides rule-based ranking and explanations — not hiring outcomes. Mis-rank → tell us the score; we tune thresholds.” | Match score + reasons; decline flow | TWIN liable for hiring decisions; legal certification |
| “What about GDPR/consent?” | “Candidates consent at registration; inbox is **application_review** — names shown by pilot policy. Email/phone/CV not in inbox API. DPA on request — **not legal advice**.” | PII visibility note; `data_visibility_summary` | Full GDPR certification; lawyer-approved guarantee |
| “What about bias?” | “Inbox uses **rule-based** overlap (skills, title, location, salary signals) — no personality model. Sparse profiles get **low confidence**, not inflated scores.” | Ewa weak row; data confidence field | Bias-free certification; automated fairness audit |
| “Can candidates see what is shared?” | “Yes — **transparency panel** on candidate dashboard (`What TWIN shows to the recruiter`) explains application_review scope, what is hidden by default, that TWIN does not decide, and auto-apply/delegated apply are not live.” | Mention candidate dashboard panel (no live nav required) | Candidates see recruiter internal notes |
| “Can AI assess personality?” | “**No.** No personality, culture-fit, or psychometric inference in inbox. Only profile overlap and explicit gaps.” | Review card disclaimer (section H) | Culture fit AI; video analysis |
| “Can hiring managers override AI?” | “HM is not a separate AI layer — **recruiter/HM is the decision-maker.** Accept/decline is the override. No auto-booking.” | Accept/decline on pending row (explain only in dry run) | HM packet workflow shipped |
| “Does this violate EU AI Act?” | “We position inbox as **decision support**, not autonomous hiring. **We do not claim AI Act compliance or certification** — happy to discuss approach under NDA with your counsel.” | Human decision disclaimer | “AI Act compliant/certified” |
| “What about hallucinations?” | “Inbox rows are **deterministic** — no LLM generation on queue. Review card text is rule-based from profile fields.” | Expand card; cite rule-based copy | LLM-generated reasons in inbox |
| “Why would recruiters accept this?” | “Because it reduces **noise toward calendar-ready slots** — short queue, explicit reasons, one-click decline. Pilot is feedback-driven, not fee pressure.” | 5-row variety; Jan rejected vs Alex accepted | Guaranteed hires; volume replacement |
| “What if candidates are low quality?” | “Weak rows stay visible with **low scores and red flags** — you decline. Tell us your bar; we tune matching. Auto-apply is **paused** so no bot flood.” | Ewa row | TWIN guarantees candidate quality |
| “Is this ATS-integrated?” | “Webhook **scaffold exists**; **not production-verified** for your ATS. Pilot is inbox-first.” | Optional mention `/recruiter/jobs` POST | Full ATS integration live |
| “Is auto-apply live?” | “**No — auto-apply is paused** on production. Server gates block autonomous apply. Pilot is human accept/decline only.” | Honesty block | “Apply while you sleep” on prod |
| “Is delegated apply live?” | “**No — delegated apply is not live.** Prepare-only posture on candidate side.” | Honesty block | KYC-verified delegated submit |

---

## 10 — Feedback questions

Use after demo (dry run: self-debrief with trusted observer; live: recruiter).

### First reaction (1–5 + open)

| # | Question (EN) | PL | Score 1–5 |
| - | ------------- | -- | --------- |
| F1 | “What was your first impression of the queue vs your current inbox?” | „Jakie było pierwsze wrażenie kolejki vs Twoja obecna skrzynka?” | |
| F2 | “Did the match scores feel directionally right on Alex vs Ewa?” | „Czy wyniki Alex vs Ewa wydawały się kierunkowo sensowne?” | |

### Trust and explainability

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F3 | “Did the three reasons per row increase trust?” | |
| F4 | “Did the review card (sections A–H) feel understandable, not black-box?” | |
| F5 | “Would you accept at least one row based on what you saw?” | |

### Missing data and review card

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F6 | “Was missing salary on Marta useful signal, not noise?” | |
| F7 | “Were Piotr's seniority gaps surfaced clearly enough?” | |

### PII / consent

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F8 | “Is showing candidate name in application_review acceptable for your process?” | |
| F9 | “Is the visibility note under the queue sufficient?” | |

### Recruiter control

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F10 | “Did you feel in control of every interview slot?” | |
| F11 | “Did decided rows (Alex/Jan) look audit-safe?” | |

### Workflow fit

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F12 | “Could you see using this weekly for one role?” | |
| F13 | “What's missing for your desk — SSO, ATS, HM view?” | *(open)* |

### Objections surfaced

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F14 | “What would stop you from a 4-week pilot?” | *(open)* |
| F15 | “Any fear we replace recruiters or automate hiring?” | |

### Pilot willingness

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F16 | “Willingness to join 3–5 named pilot (no public launch)?” | |
| F17 | “Would you refer one peer if month 1 goes well?” | |

### Must-fix before external invite

| # | Question | Score 1–5 |
| - | -------- | --------- |
| F18 | “Top must-fix before we invite another recruiter?” | *(open)* |
| F19 | “Founder narrative clarity — anything I said that felt like overclaim?” | *(open)* |

---

## 11 — Dry-run scoring rubric

Score each dimension **1–5** immediately after dry run. Record in `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md`.

| # | Dimension | 1 (poor) | 3 (acceptable) | 5 (strong) | Score |
| - | --------- | -------- | -------------- | ---------- | ----- |
| D1 | **Narrative clarity** | Cannot explain in 2 min | Explains with prompts | Crisp north star + honesty block | |
| D2 | **Recruiter-supporting perception** | Sounds like replacement | Mixed messaging | Clear “supports, not replaces” | |
| D3 | **Trust / explainability** | Skips review card | Shows card partially | Card + reasons on ≥2 rows | |
| D4 | **PII / consent clarity** | Vague on names | Reads note | application_review vs pool distinguished | |
| D5 | **Demo flow smoothness** | Queue/load failure | Minor stumbles | A–M path under 30 min | |
| D6 | **Objection readiness** | Defensive / overclaims | Answers 50% honestly | All tested objections handled | |

**Composite:** Average of D1–D6.

| Average | Decision | Meaning |
| ------- | -------- | ------- |
| **≥4.0** | **GO** | Ready for first **named** recruiter conversation (use invites pack after H5 sign-off) |
| **3.0–3.9** | **ITERATE** | Fix top issues; re-run dry run within 7 days |
| **<3.0** | **HOLD** | Do not invite; fix narrative or product smoke first |

**Automatic HOLD triggers (any one):** queue ≠5 rows · review card broken · PII note missing · CSP errors · founder used do-not-say phrase · recruiter-replacement framing detected.

**Recommended default:** **GO SMALL** — invite **1–2 trusted reviewers** only after **one internal dry run ≥4.0**, then expand to 3–5 after week-2 signal.

---

## 12 — Do-not-say list

| ❌ Do not say | ✅ Say instead |
| ------------ | -------------- |
| “AI replaces recruiters” | “TWIN does not replace recruiters — decision belongs to you” |
| “TWIN makes hiring decisions” | “TWIN ranks and explains; you accept or decline” |
| “Auto-apply is live” | “Auto-apply is **paused** on production” |
| “Delegated apply is live” | “Delegated apply is **not live**” |
| “Public launch” / “we're live for everyone” | “Controlled pilot — **not public launch**” |
| “Guaranteed interview” | “Pre-qualified queue — **you** choose calendar slots” |
| “KYC / legal verification live” | “Placement verification is roadmap — **not live**” |
| “Full ATS integration live” | “ATS webhook scaffold — **not production-verified**” |
| “SSO live” | “Token pilot only — SSO roadmap” |
| “Talent pool browse live” | “Anonymized pool — **separate context**, not shipped browse UI” |
| “AI Act compliant / certified” | “Decision support — **no compliance certification claimed**” |
| “Personality fit assessment” | “No personality inference — rule-based overlap only” |
| “Best candidate guaranteed” | “Short ranked queue — you verify gaps” |

---

## 13 — Demo failure modes

| Failure | Symptom | Action |
| ------- | ------- | ------ |
| Queue not loading | Spinner / error / empty with wrong company | **STOP** — check R2 config smoke doc; do not invite |
| Token invalid | `recruiter_inbox_invalid_token` | **STOP** — rotate via founder ops; re-run P4 |
| Review card missing | Toggle does nothing / empty sections | **STOP** — log issue; verify R5 smoke; fix before invite |
| PII note missing | No visibility copy under header | **STOP** — H3 regression; fix before invite |
| Too many rows | ≠5 (e.g. legacy row) | **STOP** — ops refresh per H4 doc; re-verify |
| Wrong candidate statuses | Alex not interview / Jan not rejected | **STOP** — do not demo; ops refresh |
| CSP errors | Console violations on inbox route | **STOP** — S2 incident path; no invite |
| Founder cannot explain consent | Vague on application_review | **ITERATE** — re-read §6–7 + PII policy |
| Recruiter interprets TWIN as replacement | “So you replace my desk?” | **ITERATE** — reset with §6 honesty block; do not proceed to cohort |

**For each failure:** Record in checklist **issue log** with UTC; **fix before any named recruiter invite**.

---

## 14 — H5 decision page

After dry run scoring, founder selects **one** path:

| Option | Label | When to choose | Next action |
| ------ | ----- | -------------- | ----------- |
| **A** | **GO** | Composite **≥4.0**; zero HOLD triggers; confident for 3–5 cohort | Sign H5 in tracker · prepare 3–5 names · **then** use invites pack |
| **B** | **GO SMALL** | Composite **≥4.0**; prefer lower risk | Invite **1–2 trusted reviewers** only · week-2 review before slots 3–5 |
| **C** | **ITERATE** | Composite **3.0–3.9** or minor narrative gaps | Fix top 3 issues from F18/F19 · re-run dry run within 7 days |
| **D** | **HOLD** | Composite **<3.0** or any §13 STOP | No invites · escalate product/smoke · revisit H5 in 2 weeks |

**Recommended default:** **GO SMALL (B)** after **one internal dry run PASS** — aligns with controlled pilot and deferred external comms until signal exists.

**This pack does not send invites.** Option A/B authorizes founder to **begin** invite workflow — not auto-send.

---

## 15 — Current launch stance

| Field | Value |
| ----- | ----- |
| **S2 CSP** | **PASS** — enforce ON; 24h monitor complete `2026-06-06T16:20:13Z` |
| **Recruiter inbox R1–R5** | **PASS** — R5 `2026-06-06T16:38:40Z` |
| **H4 demo seed** | **CLEAN PASS** — `2026-06-06T17:36:25Z`; 5 canonical rows |
| **H5 dry run pack** | **CREATED** — this doc + checklist `2026-06-06` |
| **Public launch** | **NO-GO** |
| **Auto-apply** | **PAUSED** |
| **Delegated apply** | **NOT LIVE** |
| **External recruiter invites** | **Deferred** until explicit founder **H5 GO** after dry run PASS |
| **Next gate** | Founder completes dry run → scores rubric → H5 decision A–D |

---

## Related docs

| Doc | Purpose |
| --- | ------- |
| `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` | Tick-box checklist + decision/issue logs |
| `docs/H4_DEMO_SEED_POLISH_2026-06-06.md` | Canonical queue evidence |
| `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` | R1–R5 smoke |
| `docs/RECRUITER_DEMO_PATH_2026-06-06.md` | Compressed 2–3 min path |
| `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` | Full pilot pack (post-H5) |
| `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` | Outbound templates (**after H5 GO only**) |
| `docs/CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md` | Candidate-side panel copy + verification |
| `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md` | PII boundaries |

---

## Hard bans honoured

- ✅ Docs only — no code, env, deploy, DB, migrations, secrets, tokens
- ✅ No public launch GO · auto-apply **PAUSED** · delegated **NOT LIVE**
- ✅ No invitation sending · no external communications
- ✅ No recruiter-replacement language · no CSP/auth changes
