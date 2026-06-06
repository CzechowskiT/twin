# Recruiter Trust & Explainability Roadmap — 2026-06-06

**Owner:** TWIN Recruiter Trust & Explainability  
**Branch:** `cursor/phase1-monorepo-scaffold`
**Launch stance:** Public **NO-GO** · controlled recruiter pilot/demo **READY FOR FOUNDER DECISION** (founder **defers external recruiter invitations** until hardening below) · auto-apply **PAUSED** · delegated **NOT LIVE**

**Hard bans:** No deploy, env, DB migration, secrets, public GO, auto-apply/delegated enable, CSP changes, LLM on inbox rows, personality claims.

---

## North star (trust)

Recruiters should **trust the queue before they trust automation**. Every inbox row must answer: *why is this person here, what matched, what is uncertain, and what do I still need to verify?* — without implying TWIN made a hiring decision.

---

## Shipped in this slice (2026-06-06)

| Layer | Deliverable | Notes |
| ----- | ----------- | ----- |
| **Backend** | `review_card` nested object on inbox rows | Deterministic, locale via `X-Locale`; no schema change |
| **Frontend** | Expandable **Show review card** / **Pokaż kartę oceny** | Sections A–H; accept/decline UX unchanged |
| **Tests** | `test_recruiter_match_explanations.py`, inbox batch, frontend review-card script | CSP suite unchanged (no CSP edits) |
| **Docs** | This roadmap + pilot pack / tracker / demo path / launch matrix updates | |

### `review_card` API shape

| Field | Section | Purpose |
| ----- | ------- | ------- |
| `why_this_candidate` | A | One-paragraph fit summary (score band + recruiter voice) |
| `requirements_matched[]` | B | Evidence aligned with posting (skills, title, location, salary) |
| `uncertain_or_missing[]` | C | Gaps, mismatches, missing CV text |
| `what_to_verify[]` | D | Pre-calendar checklist for recruiter |
| `data_confidence` | E | `high` \| `medium` \| `low` \| `unknown` (heuristic, not ML) |
| `red_flags[]` | F | Salary / seniority / low-score warnings |
| `human_decision_required` | G | Always `true` |
| `disclaimer` | H | Rule-based guidance; not AI hiring decision |

Source: `backend/app/services/recruiter_match_explanations.py` → wired via `build_recruiter_match_summary()` into `build_recruiter_batch()`.

---

## Trust principles (non-negotiable)

1. **Rule-based inbox** — Match score + reasons + review card are deterministic; no LLM on recruiter inbox rows.
2. **Human-in-the-loop** — Accept/decline always recruiter-owned; banner + section G reinforce this.
3. **Honest data confidence** — `unknown` / `low` when profile sparse; never inflate to “high” without evidence.
4. **No outcome claims** — Copy avoids “perfect hire”, “AI picked”, or personality inference.
5. **PII proportionality** — Inbox shows name for **application review** (`pii_context: application_review`); B2B talent pool remains anonymized (roadmap).

---

## Roadmap phases

### Phase 0 — Match transparency (shipped 2026-06-06)

- Match % badge + label + up to 3 `match_reasons`
- Production smoke R1–R4 PASS

### Phase 1 — Candidate review card (shipped + smoke PASS 2026-06-06)

- Full `review_card` object + expandable UI
- Pilot demo step: expand card on one row before accept/decline
- **Founder production smoke — Match Receipt / Review Card:** ✅ **PASS** (`2026-06-06T16:38:40Z`) — see evidence block below

#### Founder smoke evidence — Match Receipt (verbatim)

| Field | Value |
| ----- | ----- |
| **Route** | `https://twin-sooty.vercel.app/recruiter/inbox` |
| **Company** | Nova Hiring PL |
| **Checkpoint UTC** | `2026-06-06T16:38:40Z` |
| Queue load | **PASS** |
| Review card visible | **yes** |
| Why this candidate visible | **yes** |
| Requirements matched visible | **yes** |
| Uncertain/missing visible | **yes** |
| What to verify visible | **yes** |
| Data confidence visible | **yes** |
| Red flags/missing evidence visible | **yes** |
| Human decision disclaimer visible | **yes** |
| Accept/decline unchanged | **yes** |
| No CSP errors | **yes** |
| **Decision** | **PASS** |

**Product reality preserved:** S2 CSP **PASS** (enforce ON) · recruiter inbox R1–R4 **PASS** · Recruiter Match Receipt **PASS** · auto-apply **PAUSED** · delegated apply **NOT LIVE** · public launch **NO-GO** · controlled pilot/demo technically **READY FOR FOUNDER DECISION** — founder **intentionally defers external recruiter invitations** until hardening complete.

### Phase 2 — Pre-pilot hardening (next — before named recruiter outbound)

| # | Item | Goal |
| - | ---- | ---- |
| 1 | **PII / consent receipt alignment** | Recruiter-visible consent scope matches what inbox shows |
| 2 | **Candidate-side consent receipt** | Candidate sees what was shared with employer on apply/match |
| 3 | **Recruiter-side data visibility explanation** | In-product copy for what data TWIN holds and why names appear |
| 4 | **Demo seed polish** | Stable Nova Hiring PL queue for repeatable founder/demo path |
| 5 | **Founder decision on 3–5 named recruiters** | Only after 1–4 — then tracker + invites |

### Phase 3 — Post-pilot trust (after cohort)

| Item | Goal | Dependency |
| ---- | ---- | ---------- |
| **Anonymized pre-accept cards** | Hide candidate name until accept (talent pool / browse) | Product + PII policy sign-off |
| **Employer attestation on decline reasons** | Structured decline taxonomy (not free-text only) | Inbox UX + analytics |
| **Match tune feedback loop** | “Reason wrong” → ops queue (no auto-retrain) | Event logging, no LLM |
| **HM packet export** | PDF/ICS bundle on accept | Calendar + placement docs |
| **Per-company audit trail** | Append-only decision events | Existing application model |

### Phase 4 — Enterprise trust

- Employer SSO + RBAC
- ATS webhook verification for placement economics
- SOC2-aligned retention on recruiter notes

---

## Demo script addition

After loading queue (`docs/RECRUITER_DEMO_PATH_2026-06-06.md`):

1. Click **Show review card** on one applied row.
2. Walk sections A–F (why, matched, gaps, verify, confidence, flags).
3. Read disclaimer (H) — *rule-based, recruiter decides*.
4. Accept or decline — badge behaviour unchanged.

---

## Verification

```bash
# Backend
cd backend && pytest tests/test_recruiter_match_explanations.py tests/test_recruiter_inbox.py tests/test_csp_report.py tests/test_csp_report_sanitization.py -q

# Frontend
cd frontend && npm run test:recruiter-inbox-decision && npm run test:recruiter-review-card && npm run lint && npx tsc --noEmit && npm run build
```

---

## Related docs

- `docs/RECRUITER_DEMO_PATH_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`
- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`
- `docs/RECRUITER_INBOX.md`
