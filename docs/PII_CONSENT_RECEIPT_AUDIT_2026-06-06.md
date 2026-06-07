# PII & Consent Receipt Audit — 2026-06-06

**Branch:** `chore/pii-consent-receipt-alignment-2026-06-06`  
**Auditor:** TWIN PII & Consent Receipt Alignment Engineer  
**Scope:** Recruiter inbox, review card, talent pool, candidate dashboard, export, GDPR DSR, future surfaces  
**Verdict:** **C — candidate-first, recruiter-supporting** (unchanged)  
**Not legal advice** — product/engineering alignment only.

---

## Surface audit matrix

| Surface | Context | name | email | phone | CV | location | match score | reasons | consent basis | Status | Risk |
| ------- | ------- | ---- | ----- | ----- | -- | -------- | ----------- | ------- | ------------- | ------ | ---- |
| **Recruiter inbox** | `application_review` | **OK** — shown for employer review | **Hidden** — not in inbox API | **Hidden** | **Hidden** — raw text not exposed | Profile field only (matching) | **OK** | **OK** (≤3) | Job-data + AI-matching consent at registration | ✅ Aligned + visibility metadata | M — name visible by pilot policy |
| **Review card** | `application_review` | Indirect (via row name) | Hidden | Hidden | Hidden — may note “no CV text on profile” | Overlap signal only | **OK** | N/A (structured sections) | Same as inbox | ✅ Shipped R5 PASS | L |
| **B2B talent pool copy** | `anonymized_talent_pool` | **Hidden** | Hidden | Hidden | Hidden | Hidden (city-level not exposed) | **OK** (percent) | Hidden | Separate `talent_pool_processing_consent` | ✅ Anonymized API | L |
| **Candidate dashboard — applications** | `candidate_self` | Self only | Self only | Self only | Self only | Self | Self | Self | Registration consents | ✅ Transparency panel (2026-06-07 polish) | L |
| **Application ledger / export** | `candidate_self` | Self | Self (export) | If on profile | If stored | Self | Self | N/A | GDPR export right | ✅ Existing export paths | M — export is full self-data |
| **GDPR DSR** | `admin_ops` | Anonymise/delete per runbook | Anonymise | Anonymise | Delete/anonymise | Anonymise | N/A | N/A | Legal process | ✅ Documented `GDPR_MANUAL_DSR.md` | M — manual ops |
| **Future ATS webhook** | `future_ats` | TBD — employer contract | TBD | TBD | TBD | TBD | TBD | TBD | B2B DPA + webhook scope | 📐 NOT LIVE | H if over-shared |
| **Future delegated apply** | `future_delegated` | Employer submit flow | May appear on employer form | May appear | Package PDF when enabled | Profile | N/A | N/A | Extra consent gate | ⏸ NOT LIVE (paused) | H |
| **Future talent pool browse (recruiter)** | `anonymized_talent_pool` | **Hidden** | Hidden | Hidden | Hidden | Hidden | **OK** | Hidden | Pool opt-in only | 📐 NOT LIVE | L |
| **Demo Nova Hiring PL** | `recruiter_demo` | **Shown** (seed) | Hidden in API | Hidden | Hidden | Profile overlap | **OK** | **OK** | Demo seed + pilot waiver | ✅ H4 shipped — 5 synthetic rows; **H5b dry run PASS** `2026-06-07T07:03:13Z` | M — demo screenshots |

---

## H5 founder dry run evidence (`2026-06-07T07:03:13Z` UTC)

**H5 Founder Dry Run PASS:**

- Queue loaded: **PASS**
- Rows count: **5**
- Candidate review card works: **PASS**
- Recruiter data visibility / consent explanation: **PASS**
- Candidate transparency mentioned: **PASS**
- No blocking issues observed
- **Decision: PASS**

**Founder:** „wszystko pass jedziemy dalej”

**Gate record:** **H5b PASS** · **Next gate:** **H5c GO SMALL** · external invites **not sent** until explicit GO SMALL

**Product reality preserved:** S2 CSP **PASS** enforce ON · R1–R5 **PASS** · H4 **CLEAN PASS** · PII/consent **DONE** · candidate transparency **DONE** · calendar placeholder **NOT LIVE** · public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE**

---

## Policy summary

| Context | Candidate name | Email / phone / CV raw |
| ------- | -------------- | ---------------------- |
| Inbox (`application_review`) | **Shown** — employer reviewing submitted application | **Not in inbox API** |
| Talent pool (`anonymized_talent_pool`) | **Hidden** — skills + badge + score only | **Never shown** |

See **`docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md`** for canonical rules and “do not claim” list.

---

## Implementation status (2026-06-06)

| Item | Status |
| ---- | ------ |
| Inbox API `data_visibility_*` metadata | ✅ Shipped (no DB migration) |
| Recruiter inbox visibility note (PL/EN) | ✅ Shipped |
| Candidate transparency panel on applications (`CandidateApplicationTransparencyPanel`) | ✅ Shipped 2026-06-06; **polished 2026-06-07** — structured PL/EN copy, `rejected` status, automation pause |
| Audit + policy docs | ✅ This file + policy doc |
| Demo seed polish (Nova Hiring PL) | ✅ `docs/H4_DEMO_SEED_POLISH_2026-06-06.md` |
| H5b founder dry run (PII/consent + transparency) | ✅ **PASS** `2026-06-07T07:03:13Z` — see § H5 founder dry run evidence |

---

## Hard bans honoured

- No deploy, env, DB migration, Railway/Vercel mutations, secrets in docs
- Public launch remains **NO-GO**; auto-apply **PAUSED**; delegated apply **NOT LIVE**
- No CSP or auth weakening

---

## Related

- `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md`
- `docs/RECRUITER_DEMO_PATH_2026-06-06.md`
- `backend/app/services/recruiter_match_explanations.py`
