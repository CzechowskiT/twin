# First Customer Invitation Pack — bilingual template (PL/EN)

**Status:** Content ready · lifecycle default `READY_UNSENT`  
**Canonical URL:** https://twin-sooty.vercel.app  
**Stance:** Launch NO-GO · Enrollment OFF · invite-only · no auto-send

Machine source: `first_customer_success.bilingual_invitation_pack()`  
Embedded on pack prepare as `FCS_PACK=` note fragment (subjects + forbidden claims).

## Lifecycle

`DRAFT` → `READY_UNSENT` → `SEND_AUTHORIZED` → `QUEUED` → `SENT` → `DELIVERED` / `OPENED` / `ACTIVATED` · or `EXPIRED` / `FAILED` / `REVOKED`

Send requires: Founder-approved non-synthetic org + pack `READY_UNSENT` + separate `founder_send_approval_ref` (≥8) + enrollment OFF + invite-only.

## EN — subject

TWIN controlled pilot invite (invite-only)

### Intro

You are invited to TWIN’s controlled pilot — not a public launch.

### Available

- Company roles and recruiter inbox  
- Candidate import (manual/CSV/approved upload)  
- Explainable Candidate Intelligence (human review required)  
- Pipeline decisions and company visibility  
- Feedback and support  

### Unavailable

- Automatic hiring or rejection  
- Live ATS write  
- Live Microsoft calendar write  
- Public billing / mass enrollment  
- Automated outreach  

### AI disclosure

AI assists screening with evidence and confidence bands. Humans make all employment decisions. Protected attributes are excluded.

### First 30 minutes

1. Open invite on twin-sooty.vercel.app  
2. Activate account (invite-only)  
3. Accept privacy / AI disclosure  
4. Complete short onboarding  
5. Create or open first role  
6. Add first candidate  
7. Review Candidate Intelligence brief + evidence  
8. Record a human decision  
9. Leave feedback if friction  

Support: contact@twin.care

## PL — temat

Zaproszenie do kontrolowanego pilota TWIN (tylko zaproszenia)

### Wstęp

Zapraszamy do kontrolowanego pilota TWIN — to nie jest publiczny launch.

### Dostępne / niedostępne / AI

Jak w EN (treść PL w API). Support: contact@twin.care

## Forbidden claims (never in pack or support replies)

- bias-free AI / fully automated hiring  
- guaranteed placement / guaranteed interview  
- live ATS or Microsoft write in pilot  
- public launch / open enrollment  
- CAPTCHA bypass  

## Ops note

Do **not** send until Founder completes intake + org approval + separate send authorization. Synthetic orgs (`nova-hiring-pl`, schema probes) never receive real packs.
