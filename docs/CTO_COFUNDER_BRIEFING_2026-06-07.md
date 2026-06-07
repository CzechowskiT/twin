# TWIN — CTO / Co-Founder Briefing — 2026-06-07

**Full audit:** `docs/CTO_COFUNDER_DUE_DILIGENCE_AUDIT_2026-06-07.md`  
**Audience:** Co-founder or technical partner — 10-minute read  
**Audit UTC:** `2026-06-07` · **Branch HEAD:** `a49a0e2`

---

## 1 — What TWIN is today

TWIN is an AI-powered **candidate-first career agent** on real production infrastructure (FastAPI/Railway + Next.js/Vercel + PostgreSQL + Celery). It scrapes Polish job boards, ranks roles, tracks applications, and supports **recruiter batch acceptance** via a token-gated inbox. The north star is a **short calendar of acceptance-ready moments** — not inbox spam.

**What it is not today:** A public-scale marketplace, an autonomous apply bot, or a revenue-generating SaaS at meaningful MRR.

---

## 2 — Launch stance (unchanged)

| Audience | Verdict |
| -------- | ------- |
| Public launch (LinkedIn, PressOn, uncontrolled signup) | **NO-GO** |
| Controlled candidate pilot (10–20 named) | **GO** |
| Investor / CTO demo | **GO** (curated Nova Hiring path) |
| External recruiter pilot | **HOLD** — H5b PASS; **0 invites** sent |
| Auto-apply | **PAUSED** |
| Delegated apply | **NOT LIVE** |

---

## 3 — What is LIVE (evidence-backed)

- **Security:** CSP enforce **ON** — S2 **PASS** (`2026-06-05T16:20:13Z`)
- **Candidate:** OAuth login, dashboard, matching, CV upload, Google/Microsoft calendar, application transparency panel
- **Recruiter:** Inbox with match score, reasons, review card — R1–R5 **PASS**; H4 **5 Nova Hiring PL rows**; H5b dry run **PASS**
- **Billing:** Stripe checkout + webhook dedup (migration `050` on prod)
- **Ops:** DB stable post-incident; O7 restore drill **PASS**; Celery worker live
- **Legal (pilot):** GDPR consent, cookie banner, export — delete is **manual** (L6 waiver signed)

---

## 4 — What is NOT LIVE (do not market)

| Area | Status |
| ---- | ------ |
| Public launch | **BLOCKED** |
| Nightly auto-apply on prod | **PAUSED** |
| Delegated / KYC submit | **NOT LIVE** |
| Recruiter calendar sync | **NOT LIVE** (placeholder) |
| ATS OAuth (Greenhouse/Lever) | **NOT LIVE** |
| Employer SSO / talent pool GTM | **NOT LIVE** |
| External recruiter invites | **0** — H5c/H5d **HOLD** |
| Self-service account delete | **NOT LIVE** |
| Apple Calendar OAuth | **NOT LIVE** (ICS partial) |
| MRR / paying users at scale | **No evidence** |

---

## 5 — Co-founder scoring snapshot (1–5)

| Dimension | Score |
| --------- | ----- |
| Technical honesty & documentation | **4** |
| Production infra & security | **4** |
| Candidate product | **3.5** |
| Recruiter product | **2.5** |
| Scale / corpus depth | **3** |
| GTM discipline (NO-GO held) | **4** |

**Overall:** **~3.5 / 5** — credible **pilot-stage** engineering, not scale-stage.

---

## 6 — Top risks

1. **Vision vs reality gap** — "autonomous agent" narrative vs **PAUSED** auto-apply
2. **Recruiter SKU gap** — marketing watchlists/HM packets vs inbox-only live surface
3. **Metric drift** — job count differs by endpoint (investor confusion)
4. **L6/O5 waivers** — acceptable for pilot, **not** for uncontrolled public launch
5. **Premature recruiter invites** — mitigated by H5c **HOLD** and 0 sent

---

## 7 — 30 / 60 / 90 (executive)

**0–30d:** H5d slot-1 scoring → H5c **GO SMALL 1** or **HOLD**; maintain CSP; **≤2** recruiter invites only after explicit GO  
**30–60d:** Slot-1 feedback; L6 self-service delete engineering; token rotation policy  
**60–90d:** Founder limited-launch decision (≠ public GO); load test baseline; SSO exploration — **no** auto-apply re-enable without controls

---

## 8 — CTO verdict (one paragraph)

TWIN is a **truthfully documented Phase-1 MVP** with production deploy, strong security gates (including CSP enforce), and an unusually thorough ops doc trail. It is **fit for controlled pilot and technical diligence**, **not fit for public launch or scale GTM claims**. Co-founder partnership on **product vision** is supportable; partnership assuming **near-term autonomous revenue or two-sided liquidity** is **not** supported by current evidence. **Next action:** Founder H5c decision after H5d slot-1 scoring — no engineering required.

---

## 9 — Do not say in co-founder conversations

- "We're live" (public) · "Auto-apply runs nightly" · "Delegated apply shipped" · "Two-sided marketplace" · "Recruiter calendar sync" · "10k jobs" · "Paying customers" · "Pilot recruiters onboarded" (0 invites)

---

## Related

- `docs/CTO_COFUNDER_DUE_DILIGENCE_AUDIT_2026-06-07.md` — full 20-section audit
- `docs/CTO_COFUNDER_EVIDENCE_INDEX_2026-06-07.md` — evidence map
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch gates (stance unchanged)
