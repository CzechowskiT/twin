# Candidate Application Transparency — 2026-06-07

**Status:** Shipped (frontend static panel) — **not legal advice**.  
**Branch:** `chore/candidate-transparency-polish-2026-06-07`  
**Context:** `application_review` on dashboard applications panel.

---

## What the candidate sees

For each tracked application in **pending**, **applied**, **interview**, or **rejected** status, the dashboard applications panel shows a collapsible panel titled **“What TWIN shows to the recruiter”** (PL: **“Co TWIN pokazuje rekruterowi”**).

Sections:

| Section | Purpose |
| ------- | ------- |
| **Context** | Explains this is recruiter **application review** (`application_review`) |
| **We show** | Name, application status, match score/reasons, AI-assisted review card, role-assessment signals |
| **Not shown by default** | Phone, email, full CV, exact address, sensitive attributes — unless separate feature + consent |
| **Important** | TWIN does **not** make hiring decisions; recruiter decides |
| **Automation status** | Auto-apply **PAUSED**; delegated apply **NOT LIVE** |

Component: `frontend/src/components/dashboard/candidate-application-transparency-panel.tsx`  
Legacy alias: `ApplicationConsentReceipt` (back-compat re-export).

No DB table — copy is static and aligned with `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md`.

---

## What the recruiter sees (aligned)

Recruiter inbox (`application_review`):

| Data | Visibility |
| ---- | ---------- |
| Display name | Visible |
| Email / phone / CV raw | **Hidden** in inbox API |
| Match score + reasons (≤3) | Visible |
| Review card | Visible — rule-based guidance, not hiring decision |

Recruiter-side note: `recruiterInbox.dataVisibilityNote` (PL/EN i18n) + API `data_visibility_summary` when present.

---

## Contexts compared

| Context | Candidate name | Email / phone / CV |
| ------- | -------------- | ------------------ |
| **`application_review`** (LIVE) | Shown to recruiter in inbox | Not in inbox API |
| **`anonymized_talent_pool`** (LIVE opt-in) | Hidden — `public_id` only | Never shown |
| **`future_delegated_apply`** | NOT LIVE | NOT LIVE |

---

## Automation status

| Feature | Status |
| ------- | ------ |
| Auto-apply | **PAUSED** |
| Delegated apply | **NOT LIVE** |
| Public launch | **NO-GO** |
| External recruiter invitations | Deferred (founder decision) |

---

## Do not claim

Same as `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md` §4 — including:

- “Fully anonymized recruiter inbox”
- “Auto-apply live on production”
- “Delegated apply live”
- “TWIN / AI makes hiring decisions”
- “Public launch GO”
- Legal / AI Act compliance certification

---

## Limitations (current)

- Static copy — no per-application timestamp or audit trail yet
- No downloadable consent receipt PDF
- No granular field-level receipt from backend metadata on candidate side (recruiter inbox has API metadata)
- Visual dashboard smoke requires authenticated candidate session (founder optional)

---

## Future improvements

1. Per-application **shared-at** timestamp when backend exposes it
2. Granular consent receipt from inbox `candidate_data_visible[]` / `candidate_data_hidden[]`
3. Downloadable receipt (PDF/ICS-style export)
4. Candidate-side audit trail of visibility events

---

## Verification

```bash
cd frontend
npm run test:candidate-transparency
npm run test:pii-data-visibility
npm run lint
npx tsc --noEmit
npm run build
```

---

## Related

- `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md`
- `docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`
- `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`

---

## Launch stance

Public launch **NO-GO**. Recruiter pilot **founder-decision only**. Auto-apply **PAUSED**. Delegated apply **NOT LIVE**.
