# PII Data Visibility Policy — 2026-06-06

**Status:** Product policy (engineering alignment) — **not legal advice**. Legal review remains founder/DPO responsibility.

**Canonical contexts:** `application_review` · `anonymized_talent_pool` · `recruiter_demo` · `future_ats` · `future_delegated_apply`

---

## 1 — Context definitions

### `application_review` (LIVE — recruiter inbox)

Employer reviewing a **submitted or tracked application** for their company via token-scoped recruiter inbox.

| Data | Visibility |
| ---- | ---------- |
| Display name | **Visible** |
| Email | **Hidden** in inbox API |
| Phone | **Hidden** in inbox API |
| CV raw text / file | **Hidden** in inbox API |
| Profile fields (skills, location, experience, salary band) | **Visible** as matching signals only |
| Match score + reasons (≤3) | **Visible** |
| Review card | **Visible** — rule-based guidance, not hiring decision |

**Consent basis:** Registration consents for job-data processing + AI-assisted matching (`User.gdpr_consent_at`, job-data consent, AI-matching consent).

**API metadata (inbox row):** `data_visibility_context`, `data_visibility_summary`, `candidate_data_visible[]`, `candidate_data_hidden[]`, `consent_receipt_available`, `human_decision_required`.

---

### `anonymized_talent_pool` (LIVE — candidate opt-in, recruiter browse roadmap)

B2B pool preview for employers browsing **opted-in** candidates who are not necessarily applying to a specific role.

| Data | Visibility |
| ---- | ---------- |
| Display name | **Hidden** — `public_id` only |
| Email / phone / CV | **Never shown** |
| Skills + validated badge + match % | **Visible** |

**Consent basis:** Separate `talent_pool_processing_consent` + `talent_pool_opt_in_at` on first opt-in.

---

### `recruiter_demo` (LIVE — Nova Hiring PL seed)

Same rules as `application_review`. Demo queue uses **five synthetic** seeded candidates (H4 — `docs/H4_DEMO_SEED_POLISH_2026-06-06.md`); names are fictional `*(demo)` labels. **Do not screenshot** queue rows into public channels.

---

### `future_ats` (NOT LIVE)

Planned: employer ATS webhooks / `external_ats_id` for placement verification. Scope TBD per B2B contract — default **minimum necessary**; no blanket CV export without DPA.

---

### `future_delegated_apply` (NOT LIVE — product paused)

When/if enabled: application package may include CV PDF for employer submission. Requires **additional** consent gate beyond inbox `application_review`. Inbox remains **prepare-only** on production today.

---

## 2 — Candidate-side transparency panel

When a candidate has an application in `pending`, `applied`, `interview`, or **rejected** status, the dashboard **applications panel** shows a collapsible **“What TWIN shows to the recruiter”** panel (`CandidateApplicationTransparencyPanel`) summarizing:

- **Context:** `application_review`
- **We show:** name, status, match score/reasons, AI-assisted review card, role-assessment signals
- **Not shown by default:** phone, email, full CV, exact address, sensitive attributes
- **Important:** TWIN does not make hiring decisions
- **Automation:** auto-apply **PAUSED**; delegated apply **NOT LIVE**

No new DB table — copy is static and aligned with this policy. See **`docs/CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md`**.

---

## 3 — Recruiter-side explanation

Recruiter inbox shows a compact **data visibility note** (PL/EN via i18n, or API `data_visibility_summary` when locale header is set) explaining why names appear and what is withheld.

---

## 4 — Do not claim

Product, sales, demo, and docs **must not** claim:

| Forbidden claim | Reality |
| --------------- | ------- |
| “Fully anonymized recruiter inbox” | Names visible in `application_review` |
| “Recruiters see candidate email/phone in TWIN inbox” | Not exposed in inbox API today |
| “Full CV shared automatically with every employer” | Raw CV not in inbox; delegated apply **NOT LIVE** |
| “Talent pool shows candidate names” | Anonymized `public_id` only |
| “TWIN auto-submits applications on production” | Auto-apply **PAUSED** |
| “Delegated apply is live” | **NOT LIVE** |
| “Public launch GO” | **NO-GO** |
| “This policy is legal advice” | Engineering alignment only |

---

## 5 — Future feature boundaries (NOT LIVE)

| Feature | PII stance until shipped |
| ------- | ------------------------ |
| Anonymized pre-accept inbox cards | Names hidden until recruiter accepts — requires product + policy sign-off |
| Recruiter talent pool browse UI | `anonymized_talent_pool` only |
| ATS webhook hire events | Employer attestation / webhook — no candidate cold outreach |
| HM packet export | Calendar + placement metadata — scope in placement docs |
| Recruiter SSO | Replaces token pilot — RBAC for visibility contexts |

---

## 6 — Verification

```bash
cd backend && pytest tests/test_recruiter_match_explanations.py -q
cd frontend && npm run test:candidate-transparency && npm run test:pii-data-visibility && npm run test:recruiter-inbox-decision && npm run lint && npx tsc --noEmit
```

---

## Related

- `docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`
- `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` §6

---

## Merge record (safe lane)

**PR #38** merged to `cursor/phase1-monorepo-scaffold` as **`2cc18db`** (`2026-06-06T16:52:20Z` UTC). Automated post-merge smoke: `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` § Post-merge automated smoke — PR #38. Launch stance unchanged: public **NO-GO**, pilot **READY FOR FOUNDER DECISION**.
