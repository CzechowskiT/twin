# Pilot invitation pack template (UNSENT by default)

**Status default:** `DRAFT` → `READY_UNSENT` → (`SENT` only with Founder send approval ref)

## Subject (EN)

TWIN controlled pilot — invite (invite-only)

## Body (EN, placeholders)

Hello {{recipient_name}},

You are invited to TWIN’s **controlled pilot** (not a public launch).

- App: {{canonical_url}} (temporary operational URL)
- Role: {{role}}
- Org: {{org_display_name}}
- Support: contact@twin.care (escalates to on-call)

This is invite-only. Public registration and mass enrollment remain **OFF**.

## Body (PL, placeholders)

Cześć {{recipient_name}},

Zapraszamy do **kontrolowanego pilota** TWIN (to nie jest publiczny launch).

- Aplikacja: {{canonical_url}}
- Rola: {{role}}
- Organizacja: {{org_display_name}}
- Wsparcie: contact@twin.care

Rejestracja publiczna i masowa enrollment pozostają **WYŁĄCZONE**.

## AI Candidate Intelligence section (EN)

TWIN includes **explainable CV screening** during this pilot:

**It does:** structure CV facts (profile, timeline, skills, missing info); produce a recruiter brief separating facts from inferences; compare to a specific role with MATCH / NO_MATCH / UNKNOWN; link material conclusions to evidence; let you correct facts and override match (audited).

**It does not:** make hire/reject decisions; auto-send candidate messages; infer protected attributes; claim bias-free or AI Act certification; guarantee perfect parsing or time savings; sync live to ATS.

Humans make all employment decisions. Feedback and support are available. Candidate correction requests remain available via product trust paths.

Unavailable in this pilot: ATS live write, mass outreach, autonomous apply, public enrollment.

## Send rules

1. Org must be `FOUNDER_APPROVED` and non-synthetic.  
2. Pack prepared → `READY_UNSENT` (no email sent yet). AI section is attached but **unsent**.  
3. Send requires `founder_send_approval_ref` (≥8 chars).  
4. Outbox rows created as **draft** then marked pack `SENT`.  
5. Never auto-send from CI or smoke.
