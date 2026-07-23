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

## Send rules

1. Org must be `FOUNDER_APPROVED` and non-synthetic.  
2. Pack prepared → `READY_UNSENT` (no email sent yet).  
3. Send requires `founder_send_approval_ref` (≥8 chars).  
4. Outbox rows created as **draft** then marked pack `SENT`.  
5. Never auto-send from CI or smoke.
