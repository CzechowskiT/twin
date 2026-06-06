# Recruiter demo path — 2026-06-06

**Branch:** `cursor/phase1-monorepo-scaffold`
**Audience:** Founder / investor / named pilot recruiter (2–3 min)
**Launch stance:** Public **NO-GO** · pilot **GO** · auto-apply **PAUSED** · delegated **NOT LIVE**
**Production smoke:** `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` — R1–R4 ✅ **PASS** (`2026-06-06T16:07:18Z`); **R5 Match Receipt** ✅ **PASS** (`2026-06-06T16:38:40Z`); recruiter demo queue **PASS**

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
   - **Show review card** / **Pokaż kartę oceny** → walk sections A–H (why, matched, gaps, verify, confidence, flags, human decision, disclaimer).  
   - **Candidate name visible** — `pii_context: application_review` (see PII policy below).

4. **Human-in-the-loop**  
   - **Accept for interview** on one row → badge *Accepted for interview* / *Zaakceptowany na rozmowę*; accept button **gone** (no stale CTA).  
   - **Decline** another (optional internal note) → badge *Declined* / *Odrzucony*.  
   - **Applied** filter = only rows awaiting decision; **All statuses** shows decided rows with badges.

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
| `review_card` | Nested object — sections A–H (why, matched, gaps, verify, confidence, flags, human decision, disclaimer) |
| `human_decision_required` | Always `true` |
| `pii_context` | `application_review` (inbox) vs `talent_pool_anonymized` (B2B pool) |
| `data_visibility_context` | Same as `pii_context` for inbox rows |
| `data_visibility_summary` | Locale-aware one-line PII scope (PL/EN via `X-Locale`) |
| `candidate_data_visible[]` | Field keys shared in inbox (e.g. `name`, `match_score`) |
| `candidate_data_hidden[]` | Field keys withheld (e.g. `email`, `phone`, `cv_raw_text`) |
| `consent_receipt_available` | `true` — candidate dashboard shows matching receipt |

---

## PII policy (pilot)

| Surface | Candidate name | Email / phone / CV text |
| ------- | -------------- | ------------------------ |
| **Recruiter inbox** (application review) | **Shown** — employer reviewing submitted application | Not in inbox API — policy `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md` |
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

## Production recruiter inbox smoke prerequisites

**Full checklist + founder steps:** `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md`

| Smoke | Status (2026-06-06) |
| ----- | ------------------- |
| **R1 Access UX** — friendly PL/EN unavailable copy; no raw JSON | ✅ **PASS** (founder) |
| **R2 Config** — pilot token on frontend + API; `recruiter_inbox_configured: true` | ✅ **PASS** (`2026-06-06T16:07:18Z`) |
| **R3 Queue** — load queue with valid pilot code | ✅ **PASS** — Nova Hiring PL; match score + reasons visible |
| **R4 Accept / decline** | ✅ **PASS** — Alex Kowalski: *Zaakceptowany na rozmowę* + *Decyzja zapisana*; no stale accept; pending row Zaakceptuj/Odrzuć |
| **R5 Match Receipt / Review Card** | ✅ **PASS** (`2026-06-06T16:38:40Z`) — Nova Hiring PL; all sections A–H visible; accept/decline unchanged; no CSP errors |

**Founder checkpoint UTC:** `2026-06-06T16:38:40Z` (Match Receipt) · `2026-06-06T16:07:18Z` (R1–R4) · **Recruiter demo queue PASS** · **Match Receipt PASS** · controlled pilot/demo **READY FOR FOUNDER DECISION** (founder **defers external invitations** until hardening) · public launch **NO-GO**

**User-visible error mapping (EN/PL via i18n):**

| Condition | API `detail` | UI message |
| --------- | ------------ | ---------- |
| Pilot token not configured | `recruiter_inbox_unavailable` | Inbox not available in this environment |
| Wrong access code | `recruiter_inbox_invalid_token` | Access code did not match |
| Empty queue (valid auth) | *(200, `items: []`)* | “No applications waiting…” |
| Browser/network failure | *(no JSON)* | Network error — retry |

Never expose configuration key names in API responses or UI.

---

## Related

- `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` — config readiness + founder smoke (R1–R4 PASS `2026-06-06T16:07:18Z`)
- `backend/app/services/recruiter_match_explanations.py` — deterministic reasons + `review_card`  
- `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md` — trust & explainability roadmap
- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` — limited recruiter pilot pack (3–5 named)
- `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` — cohort tracker + rubric
- `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` — PL/EN outbound templates
- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` — spam playbook (now can cite inbox `match_score`)
- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`
