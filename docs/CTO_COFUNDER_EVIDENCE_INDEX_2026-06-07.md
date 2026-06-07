# TWIN — CTO / Co-Founder Evidence Index — 2026-06-07

**Purpose:** Map supporting docs to what each **proves** for co-founder due diligence.  
**Primary audit:** `docs/CTO_COFUNDER_DUE_DILIGENCE_AUDIT_2026-06-07.md`  
**Briefing:** `docs/CTO_COFUNDER_BRIEFING_2026-06-07.md`

---

## A — Launch gates & production reality

| Document | Proves |
| -------- | ------ |
| `PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` | Section-by-section launch audit; **public NO-GO**; S2 PASS; auto-apply PAUSED |
| `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` | Binary S/O/L/P gates; operator checklist |
| `PRODUCTION_REALITY_MATRIX_2026-05-27.md` | Capability LIVE/PARTIAL/OFF matrix vs prod |
| `LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | Pilot/demo GO with monitoring; public NO-GO |
| `PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md` | Marketing claims vs prod; founding BLOCKER reduced |

---

## B — Security & CSP

| Document | Proves |
| -------- | ------ |
| `S2_CSP_ENFORCE_READINESS_2026-06-01.md` | Enforce rollout criteria + rollback |
| `S2_CSP_BURNIN_WINDOW_2026-06-01.md` | 72h burn-in window COMPLETE |
| `S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md` | CSP violation triage |
| `P1_CSP_ENFORCE_BURNIN_CHECKLIST_2026-05-27.md` | Burn-in operator steps |
| `SECURITY_RISK_REGISTER_2026-05-27.md` | R-001–R-025 tracked risks |
| `backend/tests/test_csp_report*.py` | 9 passed (audit session) — sink contract |

---

## C — Recruiter pilot & alignment

| Document | Proves |
| -------- | ------ |
| `RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` | **R1–R5 PASS** on prod |
| `H4_DEMO_SEED_POLISH_2026-06-06.md` | **H4 CLEAN PASS** — **5 canonical rows** |
| `H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` | **H5b PASS** `2026-06-07T07:03:13Z` |
| `H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` | Talk track + demo script |
| `H5C_GO_SMALL_DECISION_PACK_2026-06-07.md` | **H5c DONE** — default **HOLD**; GO SMALL options |
| `H5D_SLOT1_REVIEWER_SHORTLIST_PACK_2026-06-07.md` | **H5d DONE** — slot-1 scoring framework |
| `LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` | 3–5 named pilot scope |
| `LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` | Cohort tracker — **0 invited** |
| `LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` | Templates — **not sent** until H5c GO |
| `TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md` | Verdict **C** candidate-first, recruiter-supporting |
| `RECRUITER_TRUST_ROADMAP_2026-06-06.md` | Trust hardening roadmap |
| `RECRUITER_INBOX.md` | Product spec for inbox |

---

## D — PII, transparency & legal

| Document | Proves |
| -------- | ------ |
| `PII_DATA_VISIBILITY_POLICY_2026-06-06.md` | What recruiter sees vs hidden |
| `PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md` | **PII DONE** — H1–H3 alignment |
| `CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07.md` | **Candidate transparency DONE** |
| `GDPR_MANUAL_DSR.md` | Manual erasure process (L6 partial) |
| `L6_DSR_PRIVACY_AUDIT_2026-06-03.md` | Export live; delete not self-service |
| `COOKIE_CONSENT.md` | L2 cookie banner |
| `PLACEMENT_VERIFICATION.md` | Machine-assisted placement design |
| `SCRAPING_COMPLIANCE.md` | L4 board compliance |

---

## E — Auto-apply & delegated apply

| Document | Proves |
| -------- | ------ |
| `AUTO_APPLY_PRODUCTION_OPS_PAUSE_PLAN_2026-06-02.md` | **PAUSED** — `nightly_auto_apply_beat_enabled=false` |
| `AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md` | Safety gates; delegated **NOT LIVE** |
| `POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md` | Post-merge prod sanity |
| `DELEGATED_APPLY_CONSENT_MODEL_2026-05-28.md` | Consent model — design |
| `VERIFIED_CANDIDATE_GATEWAY_TECH_AUDIT_2026-05-28.md` | Gateway hard-false |
| `backend/app/services/candidate_readiness.py` | `delegated_apply_allowed=False` |
| `backend/app/services/autonomous_apply_policy.py` | Server 403 gate |

---

## F — Calendar

| Document | Proves |
| -------- | ------ |
| `GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` | Google **FULL prod smoke PASS** |
| `PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` § D | O5 partial-with-waiver; recruiter calendar **NOT LIVE** |
| PR #43 `2fa2746` (cited in matrices) | Recruiter calendar placeholder |

---

## G — Candidate & founder smoke

| Document | Proves |
| -------- | ------ |
| `FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` | P6 **PASS** — 8/8 routes |
| `CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` | Candidate flow PASS |
| `RESPONSIVE_QA_MATRIX_2026-05-29.md` | Layout QA |
| `FOUNDER_MANUAL_SMOKE_CHECKLIST_PL.md` | Operator checklist PL |

---

## H — Infrastructure, DB & billing

| Document | Proves |
| -------- | ------ |
| `BACKUP_RESTORE_DRILL_LOG.md` | O7 **PASS** 2026-06-01 |
| `PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md` | INC-DB resolved |
| `RUNBOOK_DB_RESTORE_2026-05-27.md` | Restore procedure |
| `ALEMBIC_050_FOUNDER_VERIFICATION_2026-05-29.md` | S5 Stripe dedup on prod |
| `P1_STRIPE_WEBHOOK_AUDIT_2026-05-27.md` | Webhook signature |
| `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` | O8 incident playbook |

---

## I — Engineering inventory & prior CTO audits

| Document | Proves |
| -------- | ------ |
| `BACKEND_ROUTE_INVENTORY_2026-05-27.md` | 175 API routes |
| `BACKEND_TEST_MAP_2026-05-27.md` | Test file grouping |
| `CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` | Baseline CTO audit |
| `CTO_AUDIT_DELTA_2026-05-27.md` | Maturity delta +0.6 |
| `INVESTOR_CTO_DUE_DILIGENCE_PACK_2026-05-28.md` | Prior investor pack (superseded for 2026-06-07 state) |
| `P1_DOCS_INDEX_2026-05-27.md` | Gate doc entry map |
| `.github/workflows/smoke.yml` | CI smoke subset |
| `README.md` | Stack, quick start, security summary |

---

## J — Product direction (roadmap — not live claims)

| Document | Proves |
| -------- | ------ |
| `PRODUCT_ROADMAP.md` | Phase plan |
| `TWIN_PRODUCT_PILLARS_2026-05-28.md` | Product pillars — direction |
| `CANDIDATE_CAREER_BRIEF_2026-05-28.md` | Career brief — roadmap |
| `SKILL_EVIDENCE_LAYER_2026-05-28.md` | Skill evidence — roadmap |
| `CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | P1 pilot ops |

---

## K — Code anchors (grep-verified, read-only)

| Path | Proves |
| ---- | ------ |
| `backend/app/api/kyc.py` | KYC API exists — **NOT LIVE** for GTM without prod smoke |
| `backend/app/services/lever_oauth.py` | Lever stub — **NOT LIVE** |
| `backend/app/schemas/talent_pool.py` | Talent pool schemas — opt-in column only |
| `frontend/src/components/dashboard/candidate-application-transparency-panel.tsx` | Transparency UI shipped |
| `frontend/next.config.ts` | CSP headers configuration |

---

## L — This audit session (2026-06-07)

| Document | Proves |
| -------- | ------ |
| `CTO_COFUNDER_DUE_DILIGENCE_AUDIT_2026-06-07.md` | Full 20-section co-founder audit |
| `CTO_COFUNDER_BRIEFING_2026-06-07.md` | Executive briefing |
| `CTO_COFUNDER_EVIDENCE_INDEX_2026-06-07.md` | This index |

**Matrix updates (stance unchanged):** `PUBLIC_LAUNCH_READINESS_MATRIX`, `PUBLIC_LAUNCH_GATE_CHECKLIST`, `PRODUCTION_REALITY_MATRIX` — reference this audit; **public NO-GO** preserved.

---

## How to use this index

1. Start with **Briefing** for co-founder conversation.
2. For any claim, find the row above — if no row, **do not claim**.
3. For launch decisions, use **Section A** only — this audit does **not** flip gates.
4. For recruiter invite decisions, use **Section C** H5c/H5d — default **HOLD**.
