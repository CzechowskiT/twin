# Investor demo script — show, say, fallback

**Duration:** 25–35 minutes (logged-in) + optional 5 min marketing  
**Aligns with:** [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md)  
**Prereq:** Seed complete — see [DEMO_PREP_ACTION_PLAN.md](./DEMO_PREP_ACTION_PLAN.md)  
**URLs:** Frontend https://twin-sooty.vercel.app · API https://twin-production-bcd9.up.railway.app  

**North-star line (repeat once):**  
*TWIN returns you from time away to a **short calendar of acceptance-ready moments**—not thousands of CVs or interview spam.*

---

## Before you start

- [ ] `demo@twin.career` password in demo sheet (never on slides)  
- [ ] Recruiter inbox URL with token (`--print-credentials`)  
- [ ] `OPS_ADMIN_TOKEN` for optional ops curl (not shown to investors)  
- [ ] Tab order: Home → Demo → Login → Dashboard → Calendar → Investor → Recruiter  
- [ ] Confirm `GET /api/v1/demo/snapshot` → `"source":"live_db"` (else use **Fallback A** below)  

---

## Optional opening — no login (5 min)

| Show | Say | Fallback |
|------|-----|----------|
| `/` hero → **See demo** | “This is the product promise before account creation.” | — |
| `/demo` ranked matches + application + interview card | “Live when seeded; otherwise representative data—same UX.” | **Fallback A:** If API down, explain static marketing data; open saved screenshot of `live_db` JSON |

**Fallback A — static snapshot:**  
Prod without seed returns `static_fallback`—honest line: *“We’re looking at the marketing-safe snapshot; after seed this binds to our demo user’s real matches.”*

---

## Step 0 — Landing (logged out)

| Show | Say |
|------|-----|
| https://twin-sooty.vercel.app/ | “TWIN is an autonomous career agent: find, match, apply, and book interviews while the candidate sleeps.” |
| CTA **See demo** | “Prospects see value without signing up—reduces funnel friction.” |

---

## Step 1 — Login

| Show | Say | Fallback |
|------|-----|----------|
| `/login/candidate` | `demo@twin.career` + password | “GDPR consents and onboarding are pre-completed in seed—like a returning user.” | If login fails: check seed + `email_verified_at`; re-run `--reset-password` |

→ Land on **`/dashboard`**.

---

## Step 2 — Profile & ranked feed

| Show | Say | Fallback |
|------|-----|----------|
| `/profile` | “Structured CV drives matching—not just keyword blast.” | Open profile tab if dashboard crowded |
| `/dashboard` job cards | “Each card is **match %** against this candidate’s skills—ranked pipeline, not inbox volume.” | Empty feed: **stop** and seed prod (audit blocker) |

**Modals (pick 2–3, don’t exhaust all seven):**

| Action | Say |
|--------|-----|
| **Company intel** on a job | “US-C051: research before apply—reduces junk applications.” |
| **Hiring insights** | “What the hiring manager optimizes for—interview focus, not generic tips.” |

If Claude unavailable: “Deterministic fallback still demonstrates flow; production uses Claude with cache.”

---

## Step 3 — Optimize CV (applied row)

| Show | Say | Fallback |
|------|-----|----------|
| Applications panel → **Applied** → **Optimize CV** | “US-C052: ATS-aware rewrite with match before/after—one acceptance-ready package.” | No applied row: show modal on any application or skip to calendar |

---

## Step 4 — Calendar

| Show | Say | Fallback |
|------|-----|----------|
| `/dashboard/calendar` | “North star: **slots worth showing up for**—seeded interview ~3 days out.” | |
| **Interview prep** modal | “US-C053: prep pack tied to this slot.” | |
| **Follow-up email** (if shown) | “US-C055: post-interview draft from notes.” | |
| **ICS / WebCal** | “Apple-only users aren’t second-class—subscribe without Google.” | No Google OAuth needed |

---

## Step 5 — Auto-apply

| Show | Say | Fallback |
|------|-----|----------|
| Dashboard **nightly auto-apply strip** | “Overnight sweep applies only above consent threshold—autonomous, bounded.” | |
| `/dashboard/settings/auto-apply` | “Consent + daily cap; **Run now** hits Pracuj for demo.” | Run now slow/blocked: “Beat already ran—ops endpoint shows last sweep” + screenshot from `docs/ops/nightly-verify-2026-05-22.md` |

**Ops talking point (optional, technical audience):**  
`GET /api/v1/ops/auto-apply/last-run` — beat fired, row exists; user count 0 until prod consents (expected).

---

## Step 6 — Investor lane (same JWT)

| Show | Say | Fallback |
|------|-----|----------|
| Header **persona switcher → Investor** | “One account, three lenses—candidate, investor, recruiter.” | |
| `/investor/metrics` | “Public MVP stats: corpus size, placements, interviews—no fake DB dumps in slides.” | Zeros pre-seed: after seed, placements/interviews update |
| `/investor/placement` | “Machine-assisted verification timeline—not CS tennis email ping-pong.” | |
| `/investor/data-room` | “NDA + pack; demo mode when S3 off—local metadata path.” | Banner explains demo mode |

---

## Step 7 — Recruiter

| Show | Say | Fallback |
|------|-----|----------|
| `/recruiter/inbox?company_slug=nova-hiring-pl` + token | “Batch accept/decline—investor sees **both sides** of the marketplace.” | Token missing: re-run seed `--print-credentials` |
| `/recruiter/integrations/ats` | “Greenhouse OAuth when env set; Lever webhook path for hire signals.” | Buttons disabled → “MVP stub; connect when client credentials on Railway” |

---

## Step 8 — Referrals

| Show | Say |
|------|-----|
| `/dashboard/referrals` | “Growth loop without Stripe Connect in this demo—manual payout copy.” |
| `/dashboard/referrals/cash-out` | “Cash-out **request** queue—ops fulfillment, not automated Connect.” |

---

## Step 9 — Close

| Say | |
|-----|--|
| “We’re not selling more email—we’re selling **calendar acceptance** for candidates and recruiters.” | |
| “Shipped this sprint: seven-feature career assistant, investor seed, demo snapshot, recruiter inbox, placement verification, nightly auto-apply beat on Railway.” | |
| “Next: Microsoft calendar + Stripe when secrets land; ATS OAuth live beyond webhooks.” | Point to `docs/NEXT_10_STEPS.md` if asked |

**Do not show unless asked:** Stripe checkout (flag false), Microsoft OAuth (flag false), raw ops tokens, `.env` files.

---

## Talking points — objections

| Question | Answer |
|----------|--------|
| “How is this different from LinkedIn Easy Apply?” | Bounded auto-apply + match threshold + calendar outcome, not spray-and-pray. |
| “Is AI just hallucinating companies?” | Same guardrails as CV tailoring; caches for repeated intel; fallbacks documented. |
| “Placement fees without email tennis?” | State machine + events + employer attestation link; ops queue for disputes only. |
| “Two users on prod?” | Early prod; metrics API is honest—seed creates **demo** density without inventing counts. |
| “What about Microsoft shops?” | Graph calendar on roadmap; ICS/WebCal ships today. |

---

## Fallback summary card

| Step | If broken | Use |
|------|-----------|-----|
| `/demo` | API 404 | `DEMO_MODE_ENABLED=false` — enable on Railway |
| Login | Auth fail | Re-seed password; check Vercel `NEXT_PUBLIC_API_URL` |
| Dashboard empty | No seed | Run action plan Day −3; or static `/demo` + screenshots |
| AI modals error | 502/timeout | “Fallback path” button copy; next modal |
| Calendar empty | No interview row | ICS demo from runbook static snapshot JSON |
| Recruiter inbox | 401 token | New token from seed |
| Investor metrics zeros | Pre-seed | Explain seed; show `live_db` snapshot JSON on phone |

---

## Quick reference — API smoke (presenter laptop)

```bash
API=https://twin-production-bcd9.up.railway.app
curl -sS "$API/api/v1/health" | python3 -m json.tool
curl -sS "$API/api/v1/demo/snapshot" | python3 -m json.tool
curl -sS "$API/api/v1/public/mvp-stats" | python3 -m json.tool
```

---

## Related docs

- [INVESTOR_DEMO_AUDIT_REPORT.md](./INVESTOR_DEMO_AUDIT_REPORT.md)  
- [DEMO_PREP_ACTION_PLAN.md](./DEMO_PREP_ACTION_PLAN.md)  
- [RELEASE_NOTES_INVESTOR_DEMO.md](./RELEASE_NOTES_INVESTOR_DEMO.md)  
- [AI_CAREER_ASSISTANT.md](./AI_CAREER_ASSISTANT.md)  
