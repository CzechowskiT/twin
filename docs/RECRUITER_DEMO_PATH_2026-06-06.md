# Recruiter demo path — 2026-06-06

**Branch:** `chore/recruiter-alignment-inbox-match-reasons-2026-06-06`  
**Audience:** Founder / investor / named pilot recruiter (2–3 min)  
**Launch stance:** Public **NO-GO** · pilot **GO** · auto-apply **PAUSED** · delegated **NOT LIVE**

---

## Goal

Show **calendar-of-acceptance** from the recruiter side: pre-qualified rows with **match score + reasons**, explicit **human decision**, batch accept/decline — not CV spam.

---

## Path (live stack)

1. **Marketing honesty** — `/for-recruiters`  
   Pilot inbox, match transparency, jobs POST marked **live**; watchlists / HM packets marked **roadmap**.

2. **Open inbox** — `/recruiter/inbox`  
   - Paste pilot **access code** + company (demo: **Nova Hiring PL** / `nova-hiring-pl` if seeded).  
   - Load queue → note banner: *“AI-assisted ranking. Recruiter decision required.”* (EN) / PL equivalent.

3. **Inspect one row**  
   - **Match %** badge + label (excellent / good / possible / weak).  
   - Up to **3 rule-based reasons** (skills overlap, title, location, etc.).  
   - **Candidate name visible** — `pii_context: application_review` (see PII policy below).

4. **Human-in-the-loop**  
   - **Accept for interview** on one row → status `interview`.  
   - **Decline** another (optional internal note) → status `rejected`.

5. **Optional: post job** — `/recruiter/jobs`  
   Same token + company slug; POST creates employer listing for future matches.

6. **Close with north star**  
   “TWIN ranks before they hit your inbox; you accept who gets a calendar slot.”

---

## Seed / credentials

```bash
cd backend && python3 ../scripts/seed-investor-demo.py --print-credentials
```

Sets recruiter inbox token + demo company **Nova Hiring PL**.

---

## API shape (inbox row)

| Field | Purpose |
| ----- | ------- |
| `match_score` | 0–100, persisted `job_matches` or live rule-based calc |
| `match_score_label` | `excellent` \| `good` \| `possible` \| `weak` |
| `match_reasons[]` | Max 3 evidence strings (locale via `X-Locale`) |
| `human_decision_required` | Always `true` |
| `pii_context` | `application_review` (inbox) vs `talent_pool_anonymized` (B2B pool) |

---

## PII policy (pilot)

| Surface | Candidate name | Email / phone / CV text |
| ------- | -------------- | ------------------------ |
| **Recruiter inbox** (application review) | **Shown** — employer reviewing submitted application | Not in inbox API today |
| **B2B talent pool** (opt-in browse, roadmap) | **Hidden** — skills + badge + score only | Never shown |

Documented in audit `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md` § G-R01; pilot waiver until anonymized pre-accept cards ship.

---

## Do not claim in demo

- Auto-apply running on production  
- Delegated submit / KYC live  
- Watchlists, HM packets, employer SSO  
- Two-sided marketplace liquidity  
- Public launch GO  

---

## Related

- `backend/app/services/recruiter_match_explanations.py` — deterministic reasons  
- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` — spam playbook (now can cite inbox `match_score`)  
- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`
