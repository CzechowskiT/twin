# GDPR manual data-subject request (DSR) runbook

**Purpose:** Operator workflow for **access/portability** and **erasure** until self-service account delete ships (`docs/L6_DSR_PRIVACY_AUDIT_2026-06-03.md`, risk **R-019**).

**Scope:** Controlled **pilot** and pre–public-launch operations. Not legal advice — align with `frontend/public/legal/privacy-*.md` and counsel.

**Related:** `GET /api/v1/candidates/me/export.json` · application CSV/XLSX · `docs/COOKIE_CONSENT.md` · `docs/PLACEMENT_VERIFICATION.md` (placement rows may survive anonymised audit needs) · `docs/L6_DSR_PRIVACY_AUDIT_2026-06-03.md` · L6 founder waiver signed `2026-06-03T13:19:53Z` (see § Launch waiver below).

---

## What candidates can do self-service today

| Request type | Self-service | API / UI |
| ------------ | ------------ | -------- |
| **Access / portability** | **Yes** | `GET /api/v1/candidates/me/export.json` (attachment `twin-my-data.json`) |
| Applications export | **Yes** | `GET /api/v1/applications/me/export.csv` · `.xlsx` |
| Dashboard download | **Yes** | Candidate workspace subnav · profile page — i18n `exportMyDataJson` |
| **Erasure (full account)** | **No** | Manual operator workflow below |
| Partial delete (CV, documents, career compass) | **Yes** | `DELETE /api/v1/candidates/me/cv`, `/me/documents/{id}`, `/me/career-compass` — not full erasure |

**Export payload (schema v1):** Built by `build_user_owned_export_payload` — includes `user`, `candidate`, `applications`, `applications_summary`, `scheduled_interviews`, `identity_verifications`, `oauth_accounts` (no refresh tokens), `google_calendar` connection metadata, `profile_documents` metadata. **Omits** Stripe customer/subscription IDs and `referral_public_token` by design.

**Tests:** `backend/tests/test_candidates_me_export_json.py`, `backend/tests/test_applications_export.py`.

---

## Intake

1. **Channel:** Email (or in-app contact published on the site) to the operator inbox defined by founder policy.
2. **Log ticket** (spreadsheet or issue tracker): `DSR-YYYYMMDD-###`, request type (`access` | `erasure` | `rectification` | `restriction` | `objection`), requester email, UTC received, locale.
3. **Do not** process requests from unauthenticated third parties without identity proof.

---

## Identity verification (required before export delivery or erasure)

Verify the requester controls the account:

| Method | When to use |
| ------ | ----------- |
| Reply from **registered account email** | Default |
| OAuth-linked email match | If user registered via Google/GitHub |
| One-time signed link | If email changed recently — founder-approved tool only |
| Government ID | Only if counsel requires for disputed erasure — store minimally, delete after verification |

**Fail closed:** If identity cannot be verified within SLA, respond with generic “unable to verify” — do not confirm whether an account exists.

---

## Access / portability workflow

**SLA target:** **14 calendar days** (GDPR Art. 12(3) maximum 1 month; aim faster for pilot).

1. Ask user to sign in and use **Download my data (JSON)** on dashboard/profile, **or**
2. Operator (with founder approval) uses read-only prod DB access to confirm account exists — **never** paste passwords or tokens into tickets.
3. If user cannot access account: after identity verification, operator may trigger export by impersonation **only** via approved admin path (if none exists, manual SQL export is **founder-only** — not agent-automated).
4. Deliver: attach JSON or provide secure one-time download link (encrypted, expiry ≤ 7 days).
5. Include CSV/XLSX application exports if requested.
6. Close ticket; retention: keep DSR log row **2 years** (compliance audit), not full export contents.

---

## Erasure workflow (manual until API ships)

**SLA target:** **30 calendar days** from verified request (aim **14 days** for pilot).

### Pre-checks

- Confirm **no active billing dispute** or legal hold (counsel).
- Confirm user understands erasure is **irreversible** (template email in EN/PL).
- **Stripe:** Cancel subscription in Stripe Dashboard if `subscription_status` active — do not delete Stripe customer until finance policy allows (may retain for tax).

### Data domains to clear (conceptual — founder/ops executes on staging first)

Execute in a **single transaction** per user where possible. Order matters for FK constraints.

| Domain | Tables / stores | Action |
| ------ | ----------------- | ------ |
| Account | `users` | Delete row or anonymise email → `deleted+<id>@anonymised.local`, clear PII fields, `is_active=false` |
| Profile | `candidates` | Delete or cascade with user |
| Applications | `applications` | Delete rows for `candidate_id` |
| Saved jobs | `saved_jobs` | Delete via `candidate_id` |
| Auto-apply | `auto_apply_consent`, `auto_apply_events`, `auto_apply_runs` | Delete user/candidate scoped rows |
| Interviews | `scheduled_interviews` | Delete `user_id` rows |
| Identity | `identity_verifications` | Delete `user_id` rows |
| OAuth | `oauth_accounts` | Delete `user_id` rows |
| Calendar tokens | `user_google_calendar`, Microsoft calendar link table | Delete connection rows; revoke OAuth in Google/Microsoft consoles if needed |
| Profile docs | `user_profile_documents` + blob storage | Delete DB rows + `delete_profile_document_file` paths |
| CV / audio | `candidates.resume_path`, intro audio paths | `delete_cv_for_candidate` / storage purge |
| Password reset | `password_reset_tokens` | Delete for `user_id` |
| CSP / logs | Application logs | No PII retention required for DSR — do not export Railway logs to user |

**Do not** delete aggregated job corpus (`jobs` table) or other users’ data.

### Post-erasure

1. Send confirmation email (no internal IDs).
2. Mark ticket **closed — erasure completed** with UTC timestamp and operator initials.
3. If user had marketing opt-in, ensure no further mail (check `marketing_emails_opt_in`).

---

## Rectification / restriction / objection

| Right | Pilot handling |
| ----- | -------------- |
| **Rectification** | User edits profile in app; operator assists via support if stuck |
| **Restriction** | Set `is_active=false`, disable auto-apply consent; document in ticket |
| **Objection** (automated matching) | Disable AI matching consent fields on user row if present; pause auto-apply |

Escalate non-routine cases to founder + counsel.

---

## Logging and escalation

| Event | Log field |
| ----- | --------- |
| Request received | ticket id, type, email hash (optional), UTC |
| Identity verified | yes/no, method |
| Export sent | UTC, channel |
| Erasure completed | UTC, operator, staging drill ref if applicable |
| Escalation | legal hold, dispute, law enforcement |

**Escalate to founder immediately:** law enforcement requests, children’s data, multi-user breach suspicion, erasure during active placement fee dispute (`docs/PLACEMENT_VERIFICATION.md`).

---

## Launch waiver (founder sign-off)

For **controlled pilot** and optional **public launch** while self-service delete is absent, the following may satisfy gate **L6** as **partial-with-waiver** (not full PASS):

> **Manual DSR runbook accepted:** TWIN will honour access via self-service JSON/CSV export and erasure via this runbook with the SLAs above until `DELETE /api/v1/auth/me/delete-account` (or equivalent) ships.

| Field | Value |
| ----- | ----- |
| Waiver document | `docs/GDPR_MANUAL_DSR.md` (this file) |
| Audit reference | `docs/L6_DSR_PRIVACY_AUDIT_2026-06-03.md` |
| Gate row | `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` **L6** |
| Founder sign-off (name / UTC) | **Signed** — Tomasz Czechowski · `2026-06-03T13:19:53Z` |
| Scope | Controlled **pilot** / **limited launch readiness** only — not full public launch |
| Limitation | Self-service `delete-account` remains future work (pre–full-public-launch or post-launch per roadmap) |
| Public launch unlocked by waiver alone? | **No** — S2 and other blockers still apply |

### Founder acceptance (L6 waiver)

> Founder accepts the manual DSR/GDPR process described in `docs/GDPR_MANUAL_DSR.md` as a temporary solution for controlled pilot and limited public-launch readiness until self-service delete-account is implemented.

| Field | Value |
| ----- | ----- |
| Signed | Tomasz Czechowski |
| UTC | `2026-06-03T13:19:53Z` |
| Scope | Controlled pilot / limited launch readiness only |
| Limitation | Self-service delete-account remains future work |
| Public launch | Still **NO-GO** until S2 and remaining gates |

**L6 gate status:** Manual process **accepted** / waiver **signed** — **not** full self-service complete. **Not** a blocker for controlled pilot / limited launch readiness. Self-service delete-account remains a post-launch or pre–full-public-launch item.

**Without this sign-off (historical):** L6 remained **partial** → **public launch NO-GO** per launch matrix (`docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` § G).

---

## Hard bans (operators)

- No prod schema migration as part of a DSR ticket unless founder approves in writing.
- No mass delete scripts without staging rehearsal (`docs/BACKUP_RESTORE_DRILL_LOG.md`).
- No secrets, refresh tokens, or full DB dumps in ticket attachments.
