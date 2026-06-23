# Placement verification — architecture (zero “CS tennis”)

Competitors (e.g. manual “did you sign / did you start?” email loops + human checks + outbound employer nudges) **do not scale** and create **friction between candidate, recruiter, hiring company, and the marketplace**. TWIN should default to **self-serve, machine-assisted, in-product** flows so we **never need a standing team** for routine placement confirmation.

This document is **design intent** for backend + frontend + commercial hooks. Implementation is phased; do not treat marketing-style “complete system” checklists as shipped code.

---

## Goals

1. **No primary reliance on human email back-and-forth** for standard placement / fee eligibility.
2. **Low collision**: each party gets the minimum surface needed; no surprise emails to employers from TWIN unless an **explicit** product path (e.g. one-click attestation the employer opts into).
3. **Honest signals**: prefer verification methods that are **automatable** but **document known weaknesses** (e.g. work-email domain heuristics are fuzzy; LinkedIn profile signals are **policy- and ToS-constrained**).
4. **Audit trail**: append-only **events** per `application` / `placement` (who, what, when, method, confidence) — supports disputes without reconstructing Gmail threads.

---

## Anti-patterns (explicitly avoid)

- Repeated **manual** “any update on the offer?” mail from ops as the default workflow.
- **Contacting the employer** “to help” without a **signed, scoped consent** and a **single-purpose** mechanism (magic link, ATS webhook, B2B dashboard action).
- **Blocking** payouts or candidate UX on **perfect** employer domain match when job posts use brand vs legal entity names.
- **Billing surprises**: invoicing before a **published state machine** says the placement is billable under contract.

---

## State machine (conceptual)

Keep states **small and enumerable**; drive UI and webhooks from them.

| State (example) | Meaning | Typical next step |
|-----------------|---------|---------------------|
| `pipeline` | Normal application tracking | User marks outcome |
| `offer_reported` | Candidate self-declares offer / hire intent | In-app verification options |
| `verification_pending` | Awaiting automated or self-serve signal | No human mail; show dashboard status |
| `placement_verified` | Policy satisfied for “successful placement” | Trigger **automated** billing per contract |
| `verification_failed` / `disputed` | Signal conflict or fraud flag | **In-app** dispute + rules engine; **not** default human ping-pong |

Transitions should be **idempotent** and **server-validated** (no trust-the-browser alone).

---

## Verification layers (automation-first)

### Layer 1 — Candidate, in-app (always)

- **Self-declaration**: “I received an offer” / “I accepted” / “I started” with **timestamp** and optional structured fields (start date, contract type).
- **Work email magic link**: user requests link to `name@company` → click proves mailbox control. **Domain match** to employer is a **hint**, not absolute proof; offer **alternate paths** (below) when mismatch.
- **Document upload (optional)**: offer letter PDF with **explicit consent** to process that document for verification only — OCR/LLM **extracts facts**, never “invents” terms.

### Layer 2 — Machine / partner signals (no CS)

- **Calendar-derived hints** (where user already connected Google): e.g. accepted interview events for **that** employer within a window — **low precision**, useful as **supporting** evidence only; disclose in privacy copy.
- **B2B / recruiter**: **one-click attestation** link (nonce, expires) or **ATS / HRIS webhook** (Workday, Greenhouse, etc.) when enterprise contracts exist — **best** collision profile: employer confirms inside their own tool.
- **Stripe / billing webhooks** already align with “money moved” signals — use for **reconciliation**, not as sole proof of employment.

### Layer 3 — Retention / milestone (scheduled, not naggy)

- **Celery** jobs on **dates the user supplied** (start date + N months), not open-ended “someone check LinkedIn daily by hand.”
- **Soft checks**: optional re-verify mailbox, optional in-app “still employed?” **one tap** — default **no** outbound human mail.
- **Failure path**: if signals weak, move to `verification_pending` with **clear next action in dashboard** — escalation to human is **exception queue**, not the default product.

---

## Collision map (who touches what)

| Flow element | Candidate | TWIN (automated) | Recruiter / B2B partner | Employer |
|--------------|-----------|------------------|-------------------------|----------|
| Declare hire / offer | ✓ in-app | records | optional notify via contract | only with explicit attestation product |
| Work email link | ✓ | sends transactional mail | — | — |
| Fee / invoice | sees status | **rules engine** + Stripe | per contract dashboard / webhook | only if contract says so |
| Dispute | ✓ in-app form | triage queue / automated rules | optional joint visibility | rarely; legal path separate |

---

## Backend direction

- **New tables** (when implemented): `placement_events` (append-only), optional `placement_verifications` (method, confidence, payload hash — no raw secrets).
- **APIs**: start verification, confirm token, list status — **all authenticated**; rate-limit; no PII in URLs beyond nonce.
- **Tasks**: retention milestones, invoice eligibility — **idempotent**; guard with “already invoiced” flags.
- **Email**: **transactional only** (magic link, receipt, invoice) — templates driven by state transitions, not free-form CS replies.

---

## Frontend direction

- **Dashboard** is the hub: one card per application in terminal states (“Verify placement”, “Verification in progress”, “Verified — retention clock”).
- **No** ambiguous “we’ll email you a bunch” as the happy path; show **exactly** what’s missing (e.g. “Confirm work email”, “Upload offer PDF”).
- **B2B surfaces** (future): separate minimal portal or embeddable attestation — do not overload candidate `/dashboard` with employer controls.

---

## Commercial & trust

- **Success fee triggers** bind to **published** states + contract text — engineering ships **configurable** thresholds (e.g. verified + start date passed).
- **Fraud / abuse**: automated flags (velocity, domain reuse, conflicting declarations) → **exception queue**; still avoid default employer outreach.
- **GDPR**: separate purpose for verification documents; retention TTL; easy delete when no longer needed for legal hold.

---

## Phased delivery (suggested)

1. **MVP**: in-app declaration + work-email magic link + event log + dashboard UI (no LinkedIn scraping as “proof”).
2. **B2B**: employer attestation link + webhook ingestion.
3. **Retention**: Celery date-driven checks + optional lightweight re-confirm in app.

Each phase should **reduce** human touchpoints, not add parallel email processes.

---

## Ops evidence (append-only)

| Date | Evidence |
|------|----------|
| 2026-06-21 | Alembic `068_placement_events_foundation` confirmed; broad persistence smoke 11/0/1 — `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-21.md` |
| 2026-06-23 | Dedicated placement-events auth smoke **PASS** 6/0/1 — POST, GET 200, `placement_id` filter; `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-23.md` |

Launch **NO-GO**, P0 **OPEN**, Phase 3B **HARD BLOCKED** unchanged.
