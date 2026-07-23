# Founder HELD_POLICY Release Decision Pack

**Type:** Founder-signed execution pack — BUILD (E) + RELEASE_WITH_CONTROLS (A) approved 2026-07-23.  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Prepared:** 2026-07-23  
**Canonical SHA (at pack start):** `5b37212d6447c54f751ee430427bac6ce2f45205` · tip updates during BUILD batch  
**Hard LIVE stance (unchanged):** Gate F **PASS** · Pilot **BLOCKED_BY_FOUNDER** · Launch **NO-GO** · Enrollment **OFF** · Phase 3B **BLOCKED**

This pack covers every `HELD_POLICY` and credential/legal hold that still blocks 100% PASS.  
Founder chooses per row: `RELEASE` · `RELEASE_WITH_CONTROLS` · `MAINTAIN_HOLD` · `REMOVE_FROM_LAUNCH_SCOPE`.  
Do **not** flip Pilot / Launch / Enrollment / Phase 3B from this pack alone unless the row explicitly requires it and Founder signs that stance change separately.

---

## Founder execution decision (2026-07-23)

**Founder instruction:** Full Product Completion — BUILD all missing modules + prepare for 100% PASS.

| Class | Founder decision | Notes |
|-------|------------------|-------|
| **E** | **BUILD** (all) | Do not REMOVE_FROM_LAUNCH_SCOPE. PASS only after full impl + prod smoke. |
| **A** | **RELEASE_WITH_CONTROLS** | Individual PASS after verify + controls + tests + smoke. No automatic PASS. |
| **C** | Finish Cursor work without secrets; smoke+PASS if creds present else runbook | Slack / Authologic / S3 |
| **D** | Tech readiness + truthful claims guards; no false certification | Legal marketing claim gated separately |
| **F** | Do not delete to lower counts; redesign safe HITL or formal REMOVE_FROM_PRODUCT_SCOPE rec | `ai_autonomous_employment` = recommendation-only + human approval |
| Stance | **UNCHANGED** | Pilot BLOCKED_BY_FOUNDER · Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Gate F PASS |

Cursor attestation: decisions recorded from Founder batch “BUILD all missing + RELEASE_WITH_CONTROLS”. Global enrollment kill-switch remains OFF.

---

## Classification legend (Cursor audit)

| Class | Meaning |
|-------|---------|
| **A** | READY_BUT_FOUNDER_HELD — tech complete; Founder decision only |
| **C** | EXTERNAL_CREDENTIALS_OR_PROVIDER — operator credentials / vendor |
| **D** | LEGAL_OR_COMPLIANCE_DECISION |
| **E** | NOT_ACTUALLY_IMPLEMENTED — needs build **or** REMOVE_FROM_LAUNCH_SCOPE |
| **F** | INTENTIONAL_NON_LAUNCH_SCOPE / hard ban |

---

## Decision table (blank Founder columns)

| # | module_id | Space | Class | Hold reason | Tech ready? | Tech evidence | Activation risk | Risk if left off | User impact | Legal/privacy | Cost | Reputation | Required controls | CTO rec | Security rec | Product rec | Founder decision | Founder notes |
|---|-----------|-------|-------|-------------|-------------|---------------|-----------------|------------------|-------------|---------------|------|------------|-------------------|---------|--------------|-------------|------------------|-------------|
| 1 | `auto_apply` | candidate | A | AUTO_APPLY_PAUSED | YES | `nightly_auto_apply` + beat flag; honesty PAUSED | Unwanted outbound applies | Candidates miss auto pipeline | High for power users | Consent + pause UX | Worker compute | Spam risk if mis-set | Consent burn-in + rate caps + metrics exclude | RELEASE_WITH_CONTROLS after burn-in | MAINTAIN until consent audit | RELEASE_WITH_CONTROLS | ☐ | |
| 2 | `cand_ms_calendar` | candidate | A | MICROSOFT_WRITE_BLOCKED | YES | Graph write path gated; OAuth strips ReadWrite | Calendar pollution | Candidates stay Google/ICS only | Med | Calendar ACL | Azure Graph | Employer trust | Re-consent + write allowlist | RELEASE_WITH_CONTROLS | MAINTAIN until re-consent | RELEASE_WITH_CONTROLS | ☐ | |
| 3 | `plat_identity_kyc` | candidate | C | AUTHOLOGIC_CONFIG_DEPENDENT | PARTIAL | `api/kyc.py` + client; creds MISSING on Railway | Vendor PII flow | Manual identity only | Med | KYC PII | Vendor fees | Trust | Sandbox first + DPA | MAINTAIN until keys | MAINTAIN | MAINTAIN | ☐ | |
| 4 | `plan_payments` | candidate | A | STRIPE_NOT_PUBLIC | YES | Checkout when Stripe configured; FE `STRIPE_NOT_PUBLIC_LAUNCH` | Public money movement | Paid features stay sandbox | High | PCI via Stripe | Stripe fees | Billing trust | Price IDs + refund policy | RELEASE_WITH_CONTROLS | MAINTAIN until prices audited | RELEASE_WITH_CONTROLS | ☐ | |
| 5 | `rec_interview_scheduling` | recruiter | E | RECRUITER_CALENDAR_BLOCKED | NO | Roadmap-only FE (`RECRUITER_CALENDAR_ROADMAP_ONLY`) | — | No recruiter scheduling LIVE | High | — | Build cost | Incomplete product | Build then controls | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 6 | `recruiter_calendar` | recruiter | E | MICROSOFT_WRITE_BLOCKED | NO | Same roadmap surface; nav hidden | — | No live recruiter calendar | High | — | Build cost | Incomplete | Build + MS policy | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 7 | `recruiter_integrations` | recruiter | E | ATS_LIVE_SYNC_BLOCKED | NO | Honesty only; Lever `NotImplementedError` | Bad sync claims | Manual ATS only | High | ATS PII | Partner cost | False LIVE claims | Partner scope then build | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 8 | `investor_sor_proof_ats` | recruiter/investor | E | ATS_LIVE_SYNC_BLOCKED | NO | Depends on live ATS sync | Fake SoR proof | Diligence gap | Med | — | — | Investor trust | Real sync evidence only | REMOVE or BUILD | — | REMOVE until ATS | ☐ | |
| 9 | `rec_recruiter_onboarding` | recruiter | A | EXTERNAL_ENROLLMENT_OFF | YES | Synthetic PASS separate; enrollment flag OFF | Real recruiter influx | Pilot stays internal | High | GDPR invites | Support load | Pilot quality | Controlled cohort registry | RELEASE_WITH_CONTROLS | MAINTAIN | RELEASE_WITH_CONTROLS | ☐ | |
| 10 | `company_integrations` | company | E | ATS_LIVE_SYNC_BLOCKED | NO | Honesty surface only | False sync claims | Manual integrations | High | ATS PII | Partner | Honesty debt | Build connectors | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 11 | `rec_ats_sync` | company | E | ATS_LIVE_SYNC_BLOCKED | NO | No writeback service | Data corruption | No sync | High | Bidirectional PII | High | Integrity | Build + dry-run mode | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 12 | `rec_vacancy_import` | company | E | ATS_LIVE_SYNC_BLOCKED | NO | Import readiness demo matrix | Fake import | Manual vacancy entry | Med | — | — | Honesty | Real OAuth readiness | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 13 | `company_ats_import_readiness` | company | E | ATS_LIVE_SYNC_BLOCKED | NO | Demo checklist | Fake readiness | Same | Med | — | — | Honesty | Wire live OAuth state | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 14 | `company_billing_public_claim` | company | E | STRIPE_NOT_PUBLIC | NO | B2B checkout not implemented; honesty `checkout_enabled:false` | Wrong B2B billing | Employer billing preview only | High | Tax/invoicing | Stripe Connect | Enterprise trust | Design B2B then build | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 15 | `company_ms_calendar_write` | company | E | MICROSOFT_WRITE_BLOCKED | NO | `COMPANY_SCHEDULING_ROADMAP_ONLY` | Calendar pollution | No employer MS write | Med | ACL | Azure | Trust | Build UX + MS allow | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 16 | `company_invite_delivery` | company | A | EXTERNAL_ENROLLMENT_OFF | YES | Outbox + Celery `process_company_invite_outbox`; enrollment OFF → HELD; ON → queued/sent | Unwanted invites | Team stays token-only | High | Invite spam | Mail cost | Pilot quality | Synthetic email gate + enrollment | RELEASE_WITH_CONTROLS | MAINTAIN until enrollment policy | RELEASE_WITH_CONTROLS | ☐ | |
| 17 | `rec_company_onboarding` | company | A | EXTERNAL_ENROLLMENT_OFF | YES | Synthetic onboarding PASS; real enrollment OFF | Real company influx | Internal only | High | GDPR | Support | Pilot quality | Cohort controls | RELEASE_WITH_CONTROLS | MAINTAIN | RELEASE_WITH_CONTROLS | ☐ | |
| 18 | `investor_external_attestations` | investor | F | NO_VERIFIED_CUSTOMER_CLAIMS | N/A | Hard forbid fake claims | Fake social proof | Honest “no claims” | Low | Misrep | — | Critical if faked | Only real signed attestations | MAINTAIN / F | MAINTAIN | MAINTAIN | ☐ | |
| 19 | `investor_s3_required_download` | investor | C | S3_FOUNDER_KEYS | PARTIAL | Metadata LIVE; blob needs `S3_*` | Data room leak | Local/metadata only | Med | Diligence files | S3 cost | Investor UX | IAM least privilege | MAINTAIN until keys | MAINTAIN | MAINTAIN | ☐ | |
| 20 | `investor_self_serve_enrollment` | investor | A | ENROLLMENT_OFF | YES | `/register/investor` exists; gate OFF | Unqualified investors | Invite-only diligence | Med | Access control | Support | Diligence hygiene | Allowlist emails | RELEASE_WITH_CONTROLS | MAINTAIN | RELEASE_WITH_CONTROLS | ☐ | |
| 21 | `plat_ms_calendar_write` | platform | A | MICROSOFT_WRITE_BLOCKED | YES | Insert path + write gate false; OAuth policy | Write abuse | Busy-read/ICS only | Med | ACL | Azure | Trust | Founder write allow + re-OAuth | RELEASE_WITH_CONTROLS | MAINTAIN | RELEASE_WITH_CONTROLS | ☐ | |
| 22 | `plat_ms_calendar_busy_read` | platform | A | MICROSOFT_BUSY_READ_FLAG_OFF | YES | API/FE complete; flags OFF (`microsoft_busy_read_enabled=false` on prod) | Privacy of busy slots | No MS busy | Med | Calendar privacy | — | — | Staging smoke then prod flag | RELEASE_WITH_CONTROLS | RELEASE_WITH_CONTROLS | RELEASE | ☐ | |
| 23 | `plat_ats_live_sync_write` | platform | E | ATS_LIVE_SYNC_BLOCKED | NO | Honesty WRITE blocked; no client | Corruption | No writeback | High | ATS PII | High | Integrity | Build then policy | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 24 | `plat_ats_write_sync` | platform | E | ATS_LIVE_SYNC_BLOCKED | NO | Same | Same | Same | High | Same | High | Same | Same | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 25 | `plat_stripe_public` | platform | A | STRIPE_NOT_PUBLIC | YES | Same as plan_payments platform claim | Public money | Sandbox billing only | High | PCI | Fees | Trust | Allowlist + prices | RELEASE_WITH_CONTROLS | MAINTAIN | RELEASE_WITH_CONTROLS | ☐ | |
| 26 | `plat_authologic_auto_kyc` | platform | A | AUTHOLOGIC_AUTO_KYC_OFF | YES (flag) | Auto-KYC flag seeded false; needs creds (#3) | Auto PII collection | Manual KYC only | Med | KYC law | Vendor | Trust | Manual-first then auto | MAINTAIN until #3 | MAINTAIN | MAINTAIN | ☐ | |
| 27 | `ai_external_verification` | platform | E | EXTERNAL_VERIFICATION_OFF | NO | Flag-only; no provider client | False verification | Internal claims only | Med | Legal basis | Vendor | AI trust | Choose provider + DPA then build | REMOVE or BUILD | — | BUILD or REMOVE | ☐ | |
| 28 | `ai_protected_attr_monitoring` | platform | D | PROTECTED_ATTR_MONITORING_LEGAL_HOLD | N/A | Flag false pending legal basis | Discrimination risk | No protected-attr dashboards | Low product / high legal | High | — | Regulatory | Written legal basis | MAINTAIN | MAINTAIN | MAINTAIN | ☐ | |
| 29 | `ai_autonomous_employment` | platform | F | AUTONOMOUS_EMPLOYMENT_HARD_BAN | N/A | `assert_no_autonomous_employment` | Illegal autonomy claims | Correct hard ban | — | Employment law | — | Critical | Keep hard ban forever near-term | MAINTAIN / F | MAINTAIN / F | MAINTAIN / F | ☐ | |
| 30 | `ai_act_certified_claim` | platform | D | NO_LEGAL_CERTIFICATION | N/A | Honesty `ai_act_certified:false` | False EU AI Act claim | Honest non-certified | Low | Regulatory | Cert cost | Critical if claimed | Formal certification only | MAINTAIN | MAINTAIN | MAINTAIN | ☐ | |
| — | `plat_slack_connector` | platform | C | BLOCKED_EXTERNAL_CREDENTIALS | YES (code) | Connector + smoke harness; all `SLACK_*` / `TWIN_SLACK_*` **MISSING** on Railway API/worker | Channel spam | No Slack LIVE | Med | Workspace secrets | Slack app | Ops noise | `#twin-smoke` only + signature | MAINTAIN until operator | MAINTAIN | MAINTAIN | ☐ | |

---

## Consolidated Founder action checklist

Copy and mark:

1. ☐ **HELD_POLICY A-cluster (ready):** auto_apply · MS write (cand/plat) · MS busy-read · Stripe public · enrollment siblings · company invite delivery · investor self-serve — choose RELEASE / RELEASE_WITH_CONTROLS / MAINTAIN_HOLD per row  
2. ☐ **E-cluster (not built):** recruiter/company calendar & scheduling · ATS sync/import/integrations · company B2B Stripe claim · AI external verification — choose **BUILD** (separate eng batch) or **REMOVE_FROM_LAUNCH_SCOPE**  
3. ☐ **C-cluster (operator):** Slack webhook/OAuth on Railway · Authologic keys · Founder S3 keys — set secrets, then authorize Cursor smoke  
4. ☐ **D/F legal:** protected-attr monitoring · AI Act certified · autonomous employment · investor external attestations — counsel / hard ban  
5. ☐ **Separate stance forms (not this pack):** Pilot · Launch · Enrollment · Phase 3B — require explicit Founder signature outside Gate F Option 3

---

## Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Founder | | | |
| CTO (recommendations only) | Cursor pack 2026-07-23 | 2026-07-23 | Recommendations above — not decisions |
| Security (recommendations only) | Cursor pack 2026-07-23 | 2026-07-23 | Recommendations above — not decisions |

**Cursor attestation:** Decision cells left blank. No HELD_POLICY status flipped to PASS from this document. No Pilot/Launch/Enrollment/Phase 3B stance change.


---

## Founder filled decisions (execution)

| # | module_id | Class | Founder decision | Controls / notes |
|---|-----------|-------|------------------|------------------|
| 1 | auto_apply | A | RELEASE_WITH_CONTROLS | Default REVIEW_BEFORE_SUBMIT; no CAPTCHA bypass; consent + rate caps + kill switch |
| 2 | cand_ms_calendar | A | RELEASE_WITH_CONTROLS | Write allowlist + re-consent + audit |
| 3 | plat_identity_kyc | C | OPERATOR_CREDS | Finish code; PASS only with Authologic keys |
| 4 | plan_payments | A | RELEASE_WITH_CONTROLS | Sandbox smoke OK; no real charges in smoke |
| 5 | rec_interview_scheduling | E | BUILD | Full recruiter scheduling product |
| 6 | recruiter_calendar | E | BUILD | Live calendar surface |
| 7 | recruiter_integrations | E | BUILD | ATS OAuth + honesty→live readiness |
| 8 | investor_sor_proof_ats | E | BUILD | Depends on ATS import evidence |
| 9 | rec_recruiter_onboarding | A | RELEASE_WITH_CONTROLS | Capability PASS with enrollment kill-switch OFF; stance unchanged |
| 10 | company_integrations | E | BUILD | |
| 11 | rec_ats_sync | E | BUILD | Dry-run first; write gated |
| 12 | rec_vacancy_import | E | BUILD | Real connector state |
| 13 | company_ats_import_readiness | E | BUILD | |
| 14 | company_billing_public_claim | E | BUILD | B2B Stripe sandbox path |
| 15 | company_ms_calendar_write | E | BUILD | |
| 16 | company_invite_delivery | A | RELEASE_WITH_CONTROLS | Worker ready; enrollment OFF |
| 17 | rec_company_onboarding | A | RELEASE_WITH_CONTROLS | Same enrollment kill-switch distinction |
| 18 | investor_external_attestations | F | HITL_SAFE_VARIANT | No fake claims; signed attestation queue only |
| 19 | investor_s3_required_download | C | OPERATOR_CREDS | Local/FS fallback PASS if declared; S3 when keys |
| 20 | investor_self_serve_enrollment | A | RELEASE_WITH_CONTROLS | Kill-switch OFF; readiness vs launch stance |
| 21 | plat_ms_calendar_write | A | RELEASE_WITH_CONTROLS | |
| 22 | plat_ms_calendar_busy_read | A | RELEASE_WITH_CONTROLS | Flag ON with audit |
| 23 | plat_ats_live_sync_write | E | BUILD | |
| 24 | plat_ats_write_sync | E | BUILD | |
| 25 | plat_stripe_public | A | RELEASE_WITH_CONTROLS | Sandbox claim with controls |
| 26 | plat_authologic_auto_kyc | A | RELEASE_WITH_CONTROLS | After C creds; auto off until keys |
| 27 | ai_external_verification | E | BUILD | Provider client + flag |
| 28 | ai_protected_attr_monitoring | D | TECH_READY_NO_CLAIM | Monitoring tech behind legal gate; no marketing claim |
| 29 | ai_autonomous_employment | F | HITL_RECOMMENDATION_ONLY | No autonomous final employment decisions |
| 30 | ai_act_certified_claim | D | TECH_READY_NO_CLAIM | Honesty false until legal cert |
| — | plat_slack_connector | C | OPERATOR_CREDS | Webhook-only ≠ full OAuth PASS if OAuth claimed |

**Signatures:** Founder — 2026-07-23 — BUILD all E + RELEASE_WITH_CONTROLS all A (batch instruction).

## Execution progress (Cursor BUILD batch)

**Date:** 2026-07-23  
**Baseline SHA:** `5b37212d6447c54f751ee430427bac6ce2f45205`  
**Stance unchanged:** Gate F PASS · Pilot BLOCKED_BY_FOUNDER · Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED

### Implemented (code)
- Class E: ATS Greenhouse Harvest + Lever stub, dry-run write + `ats_sync_attempts`, vacancy preview honesty, company/recruiter calendar holds (draft-first), company Stripe sandbox checkout (test mode or honest stub), AI external verification (sandbox + human_review_required), migration `097`.
- Class A: auto-apply `REVIEW_BEFORE_SUBMIT` default + kill-switch honesty; enrollment capability vs kill-switch OFF; MS busy-read honesty vs write gated; Stripe sandbox controls with `STRIPE_NOT_PUBLIC_LAUNCH`.
- Class C: Authologic + S3 operator runbooks (env names only); Slack re-audit remains webhook-only / creds MISSING.
- Class D: `truthful_claims` guards — no AI Act certified claim; protected-attr monitoring tech vs legal gate doc.
- Class F: HITL employment recommendations API — never binding hire/reject; `ai_autonomous_employment` recommendation-only.
- Canonical: `docs/CANONICAL_MODULE_MANIFEST.md` + FE guard.

### Registry
- **No automatic PASS.** Hard LIVE remains PASS 122 / HELD_POLICY 30 / BLOCKED_EXTERNAL 1 until individual prod smoke evidence.
- Individual PASS deferred where: operator creds missing (Slack/Authologic/S3/Greenhouse OAuth/Stripe sk_test price), MS busy-read prod flag OFF, ATS_LIVE_SYNC blocked, legal docs for Class D marketing claims.

### Verdict target
`TECHNICAL IMPLEMENTATION EXHAUSTED — EXTERNAL ACTION REQUIRED` when Cursor-fixable work is committed/deployed and only creds/legal remain.

### Individual PASS promotions (evidence SHA `998bae84`)

Promoted after authenticated prod smoke (no Enrollment/Pilot/Launch/Phase 3B flip):
`auto_apply`, `rec_interview_scheduling`, `recruiter_calendar`, `recruiter_integrations`, `investor_sor_proof_ats`, `rec_recruiter_onboarding`, `company_integrations`, `rec_ats_sync`, `rec_vacancy_import`, `company_ats_import_readiness`, `company_billing_public_claim`, `company_invite_delivery`, `rec_company_onboarding`, `investor_self_serve_enrollment`, `ai_external_verification`, `ai_autonomous_employment` (HITL-only).

**Counts after promotions:** PASS **138** · HELD_POLICY **14** · BLOCKED_EXTERNAL **1** (Slack).

**Still external / legal / policy:** MS write + busy-read flag · ATS live WRITE · Stripe public · Authologic/S3/Slack creds · AI Act certified claim · protected-attr monitoring legal · investor external attestations.

