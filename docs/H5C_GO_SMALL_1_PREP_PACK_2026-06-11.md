# H5c GO SMALL 1 Prep Pack — 2026-06-11

**Owner:** TWIN H5c GO SMALL 1 Prep Owner  
**Branch:** `docs/h5c-go-small-1-prep-2026-06-11`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Audience:** Founder (controlled Slot-1 recruiter visual/product review)  
**Doc UTC:** `2026-06-11`

**Launch stance:** Public **NO-GO** · controlled recruiter pilot **H5b PASS** (`2026-06-07T07:03:13Z`) · **H5c default HOLD** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar **NOT LIVE** · external invitations **not sent**

**Hard bans in this pack:** No code, env, DB, auth, CSP changes · no invitation sending · no external messages · no public launch GO · no auto-apply/delegated enable · no recruiter-replacement language · no fake metrics/testimonials · no pilot-started claims.

---

## 0 — Executive summary

TWIN is ready for **one controlled Slot-1 recruiter visual/product review** — a founder-led 5–7 minute walkthrough of the recruiter decision console on production (`twin-sooty.vercel.app`), not a public launch or cohort expansion.

**Prerequisites met:** H5b founder dry run PASS · R1–R5 smoke PASS · H4 CLEAN PASS · premium polish Slices 0–7 complete · recruiter inbox premium card redesign (PR #77 founder confirmed “ok jest ok”) · H5c/H5d packs created.

**This pack does not send invites.** Default decision remains **HOLD** until founder completes §1 decision gate, scores slot-1 candidates in H5d §6, and explicitly signs **GO SMALL 1**.

**Recommended human next action:** Run §2 pre-demo smoke → conduct Slot-1 visual review with one trusted recruiter (founder-present only) → capture feedback via §9 → decide per §10.

---

## 1 — H5c decision gate

Founder selects **one** path. Log in H5c §9 decision log when ready.

| Option | Label | When | Cohort |
| ------ | ----- | ---- | ------ |
| **A** | **HOLD** (default) | No slot-1 named; §2 not green; any stop trigger | **0 invites** |
| **B** | **GO SMALL 1** | H5b PASS; one trusted reviewer ≥4.2 composite; §2 + H5d §8 green | Invite **1** only |
| **C** | **GO SMALL 2** | Two reviewers identified; founder capacity | Invite **2** |
| **D** | **ITERATE** | Narrative/product gaps from review | **0 invites** until re-run PASS |

### Founder fields (empty — founder fills)

| Field | Value |
| ----- | ----- |
| **H5c decision** | `hold` *(default)* |
| **Decision UTC** | |
| **Slot-1 reviewer name** | |
| **Slot-1 organization** | |
| **H5d composite score** | |
| **Founder sign-off** | |

**Default at pack publish:** **HOLD (A)** — prep complete; no external invite authorized.

---

## 2 — Pre-demo product smoke checklist

Run **within 7 days** of Slot-1 review. All must pass before demo.

| # | Check | How | Pass? |
| - | ----- | --- | ----- |
| PS1 | `/recruiter/inbox` HTTP 200 | `curl -sS -o /dev/null -w "%{http_code}\n" https://twin-sooty.vercel.app/recruiter/inbox` | ☐ |
| PS2 | `/api/public-health` `db_ok: true` | `curl -sS https://twin-sooty.vercel.app/api/public-health` | ☐ |
| PS3 | Nova Hiring PL queue **5 canonical rows** | Load inbox with demo token + company slug | ☐ |
| PS4 | Decision console segments | Strong fit / Good fit / Needs verification / Decided visible | ☐ |
| PS5 | Premium card layout | Match score card + signal rows + decision rail readable on dark | ☐ |
| PS6 | Review card expands | **Zobacz kartę oceny** → sections + PII note | ☐ |
| PS7 | Accept/decline contract | Pending: both actions; interview/rejected: badge only | ☐ |
| PS8 | `/recruiter/calendar` NOT LIVE | No sync claims | ☐ |
| PS9 | Hard bans grep | No auto-apply live, no public GO, no AI-hires copy | ☐ |
| PS10 | PL UI spot-check | No obvious English chip leakage on demo reasons | ☐ |

**Evidence refs:** `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` §4 · `docs/RECRUITER_INBOX_PREMIUM_CARD_REDESIGN_2026-06-11.md` · `docs/RECRUITER_DECISION_RAIL_TEXT_READABILITY_FIX_2026-06-11.md`

**If any PS fails:** **STOP** — do not run Slot-1 review until resolved.

---

## 3 — Slot-1 reviewer criteria

Select **one** reviewer matching as many as possible (from H5d §3):

| # | Criterion | Required? |
| - | --------- | --------- |
| P1 | In-house or agency recruiter — tech/product, Poland or PL-speaking | Strong |
| P2 | Founder relationship — candid, low reputational risk | **Yes** |
| P3 | Structured feedback habit — willing to score signal vs noise | Strong |
| P4 | Accepts disclaimers — no auto-apply, no public launch, token pilot, calendar NOT LIVE | **Yes** |
| P5 | Not expecting ATS replacement day one | **Yes** |
| P6 | Available 15-min onboarding + async check-in within 7 days | Strong |
| P7 | Separate company slug — not Nova Hiring PL demo path | **Yes** |

**Do not select:** press/influencer without ops role · enterprise TA expecting SSO/RBAC · cold LinkedIn targets · competitor/hostile evaluator · HM-only without inbox ownership.

**Scoring:** H5d §5 rubric — composite **≥4.2** for slot-1 eligibility.

---

## 4 — 5–7 min demo script (time-boxed)

**Setup:** Founder screen-share · production `twin-sooty.vercel.app` · PL or EN per reviewer · Nova Hiring PL for structure demo only if reviewer uses separate slug for pilot.

| Time | Step | Action | Say (short) |
| ---- | ---- | ------ | ----------- |
| **0:00–0:30** | Frame | State scope: invite-only pilot, not public launch | “To kontrolowany podgląd produktu — nie publiczny start.” |
| **0:30–1:30** | Access | Show token + company fields; load queue | “Logujesz się tokenem firmy — bez SSO na tym etapie.” |
| **1:30–2:30** | Console header | Point to awaiting-decision count + stat cards | “Widzisz ile kandydatów czeka na Twoją decyzję.” |
| **2:30–3:30** | Segments | Click Strong fit → Good fit → Needs verification | “Segmenty pomagają iść od najmocniejszych dopasowań.” |
| **3:30–5:00** | Card walkthrough | One pending card: score card, signals, review CTA | “Procent, sygnały, potem pełna karta oceny — Ty decydujesz.” |
| **5:00–5:45** | Review card | Expand sections; PII/consent note | “Widzisz tylko to, na co kandydat wyraził zgodę.” |
| **5:45–6:30** | Actions | Show accept + decline on pending; decided row badge-only | “Akceptacja to zaproszenie do rozmowy — nie automatyczne zatrudnienie.” |
| **6:30–7:00** | Honest gaps | `/recruiter/calendar` placeholder; auto-apply paused | “Kalendarz rekrutera i auto-apply — jeszcze nie na produkcji.” |

**Do not:** mutate prod queue during live demo · show candidate dashboard unless asked · claim metrics or traction.

---

## 5 — Talk track (PL + EN)

### PL — otwarcie

> TWIN to asystent dopasowania dla rekruterów — nie zastępuje Cię. Pokazuję kontrolowany podgląd inboxu decyzyjnego: dopasowanie, powody, karta oceny, akceptuj/odrzuć. To nie jest publiczny start — auto-apply jest wstrzymane, kalendarz rekrutera jeszcze nie działa. Chcę Twoją szczerą opinię: czy to skraca drogę do rozmów warte Twojego czasu?

### PL — zamknięcie

> Dziękuję za feedback. Jeśli warto kontynuować, dam Ci osobny dostęp pod Twoją firmą — osobna wiadomość z kodem. Nie udostępniaj linku publicznie.

### EN — opening

> TWIN is a matching assistant for recruiters — it does not replace you. This is a controlled preview of the decision inbox: match score, reasons, review card, accept/decline. This is not a public launch — auto-apply is paused and recruiter calendar sync is not live yet. I want honest feedback: does this reduce noise toward conversations worth your time?

### EN — closing

> Thank you for the feedback. If we continue, I’ll send separate company access in a private message. Please don’t share the link publicly.

---

## 6 — Forbidden statements during demo

**Never say:**

| # | Forbidden | Say instead |
| - | --------- | ----------- |
| F1 | “Auto-apply is live” / “applies while you sleep” | “Auto-apply is **paused** on production” |
| F2 | “TWIN hires for you” / “AI decides” | “**You** decide — TWIN surfaces signal” |
| F3 | “We’re publicly launched” / “pilot is live for everyone” | “**Invite-only** controlled preview” |
| F4 | “Recruiter calendar syncs with Google/Outlook” | “Recruiter calendar is **not live** — placeholder” |
| F5 | “Delegated apply works” | “Delegated apply is **not live**” |
| F6 | “We have thousands of users / placements” | No traction claims — demo data only |
| F7 | “Replaces your ATS” / “replaces recruiters” | “Recruiter-supporting — inbox workflow” |
| F8 | “Watchlists / HM packets shipped” | “Marketing roadmap — inbox is what’s live” |

**If reviewer asks about missing feature:** acknowledge gap honestly; note on feedback form.

---

## 7 — Questions after demo (10)

Ask after screen-share. Capture verbatim notes in §9.

| # | Question (PL) | Question (EN) |
| - | ------------- | ------------- |
| Q1 | Czy procent dopasowania i powody są wiarygodne dla Twojej roli? | Do match % and reasons feel trustworthy for your bar? |
| Q2 | Które wiersze były szumem — i dlaczego? | Which rows felt like noise — and why? |
| Q3 | Czy otworzyłbyś ten inbox za tydzień bez mojego przypomnienia? | Would you open this inbox again next week without a nudge? |
| Q4 | Czy produkt zgadza się z tym, co obiecałem przed demo? | Did the product match what I promised before the demo? |
| Q5 | Czy notatka PII / widoczność danych jest wystarczająca? | Is the PII / data visibility note sufficient? |
| Q6 | Co było najbardziej mylące w UI? | What was most confusing in the UI? |
| Q7 | Czy karta oceny daje Ci dość kontekstu przed decyzją? | Does the review card give enough context before deciding? |
| Q8 | Jak oceniasz czytelność na ciemnym motywie (1–5)? | How readable is the dark theme (1–5)? |
| Q9 | Jakie funkcje oczekiwałeś, a ich nie ma? | What features did you expect that aren’t there? |
| Q10 | Czy warto dać Ci dostęp pilotowy pod Twoją firmą? | Worth a pilot access under your company slug? |

---

## 8 — Success criteria

| # | Criterion | Pass signal |
| - | --------- | ----------- |
| S1 | **Signal trust** — match % + reasons + review card align with recruiter bar | Qualitative “yes” or actionable gaps |
| S2 | **Noise identifiable** — reviewer can name misfit rows | Specific examples, not vague |
| S3 | **Workflow intent** — would return to inbox | R5-style rubric ≥3/5 |
| S4 | **Honesty fit** — no invite/reality mismatch complaints | No F1–F8 violations reported |
| S5 | **PII comfort** — no compliance alarm | No leak reports |
| S6 | **Visual quality** — premium console readable | Dark-theme score ≥3/5 on Q8 |
| S7 | **Expansion signal** — worth pilot access or slot 2 | Explicit founder recommendation |

**Not success criteria for Slot-1:** revenue, placement fees, public case study, NPS at scale, ATS commitments.

**Minimum bar to proceed GO SMALL 1:** S1 + S4 pass; no open §6 forbidden-statement incidents; §2 all green.

---

## 9 — Feedback capture template

Copy per reviewer session.

```
Slot-1 feedback — [DATE UTC]
Reviewer: [founder-local only — not in git if preferred]
Organization: 
Demo locale: PL / EN
Founder present: yes

Pre-demo smoke (§2): all PASS / FAIL — notes:

Scores (1–5):
- Signal trust (S1): 
- Would return (S3): 
- Dark theme readability (Q8): 
- Honesty fit (S4): 

Noise examples (Q2):
- 

UI confusion (Q6–Q7):
- 

Missing features (Q9):
- 

Worth pilot access? (Q10): yes / no / maybe — notes:

Forbidden phrase incident? yes / no — detail:

Founder recommendation: HOLD / GO SMALL 1 / ITERATE
```

---

## 10 — Post-demo decision options

| Outcome | Action |
| ------- | ------ |
| **Strong yes** (S1+S4 pass, Q10 yes) | Log H5d `select_slot_1` → founder signs H5c **GO SMALL 1** → complete H5d §8 → tracker row 1 → then invites pack (separate secure message) |
| **Yes with gaps** (minor UI/copy) | **ITERATE** — fix list → re-smoke §2 → second short review optional |
| **Mixed** (signal ok, workflow weak) | **HOLD** — synthesize week-1 learnings before invite |
| **No** (honesty mismatch or noise too high) | **HOLD** — do not invite; widen H5d §6 search |
| **Stop trigger** (§6 incident, prod regression) | **cohort_pause** — no invites until cleared |

**This pack does not auto-send.** GO SMALL 1 authorizes founder to **begin** invite workflow manually.

---

## 11 — One-message invite draft (DO NOT SEND)

> ⚠️ **DO NOT SEND** until H5c **GO SMALL 1** signed, H5d slot-1 selected, H5d §8 complete, and access code prepared in **separate secure message**. Templates for reference only — not outbound authorization.

### PL

**Temat:** TWIN — zaproszenie do kontrolowanego podglądu inboxu (1 firma)

Cześć [Imię],

Dziękuję za dzisiejszy podgląd. Jeśli chcesz kontynuować, przygotowałem **osobny dostęp pilotowy** pod [Firma] — token i kod wyślę w **osobnej wiadomości** (nie w tym mailu).

To **nie jest publiczny start** TWIN: auto-apply jest wstrzymane, synchronizacja kalendarza rekrutera jeszcze nie działa. Chodzi o Twój szczery feedback na dopasowanie, karty oceny i akceptuj/odrzuć.

15 min onboarding: [link do kalendarza founder'a]

Proszę nie udostępniaj linku publicznie.

Pozdrawiam,  
[Founder]

### EN

**Subject:** TWIN — invite to controlled inbox preview (1 company)

Hi [Name],

Thanks for today’s walkthrough. If you’d like to continue, I’ve set up **separate pilot access** for [Company] — I’ll send the token and code in a **separate message** (not in this email).

This is **not a public TWIN launch**: auto-apply is paused and recruiter calendar sync is not live yet. I’m looking for honest feedback on matching, review cards, and accept/decline.

15-min onboarding: [founder calendar link]

Please don’t share the link publicly.

Best,  
[Founder]

---

## 12 — H5c / H5d status update

| Field | Value |
| ----- | ----- |
| **H5c decision** | **HOLD** (default) |
| **H5d slot-1** | **none selected** — §6 table empty |
| **Cohort invited** | **0 / 3–5** |
| **External invitations sent** | **no** |
| **Public launch** | **NO-GO** |
| **Auto-apply** | **PAUSED** |
| **Delegated apply** | **NOT LIVE** |
| **Recruiter calendar** | **NOT LIVE** |
| **Slot-1 visual review prep** | **READY** — `docs/H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md` |
| **Recruiter inbox visual QA** | **PASS** — founder confirmed after PR #77 |
| **Next founder action** | Run §2 smoke → Slot-1 visual review → §9 feedback → score H5d §6 names → sign GO SMALL 1 if eligible |

**Related:** `docs/H5C_GO_SMALL_DECISION_PACK_2026-06-07.md` · `docs/H5D_SLOT1_REVIEWER_SHORTLIST_PACK_2026-06-07.md` · `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`

---

## Hard bans honoured

- ✅ Docs only — no code, env, deploy, DB, migrations, secrets, tokens
- ✅ No public launch GO · auto-apply **PAUSED** · delegated **NOT LIVE**
- ✅ No invitation sending · no external communications · no pilot-started claims
- ✅ No recruiter-replacement language · no fake metrics/testimonials
- ✅ Founder fields empty at publish · default **HOLD**
