# Recruiter candidate message drafts MVP — 2026-06-11

## Summary

Copy-only message drafts for recruiters **after** accepting a candidate (`interview` status) or when pipeline marks `to_contact`. No email send, no provider integration, no hidden PII.

## UX

| Element | PL | EN |
| ------- | -- | -- |
| CTA | Przygotuj wiadomość | Prepare message |
| Trust banner | Szkic wiadomości — nie wysłano automatycznie | Message draft — not sent automatically |
| Copy | Skopiuj | Copy |
| Edit hint | Edytuj przed wysłaniem | Edit before sending |
| No auto-send | TWIN nie wysyła tej wiadomości samodzielnie | TWIN does not send this message on your behalf |

### Templates (4)

1. Invitation to first conversation
2. Request missing information
3. Clarify availability
4. Polite hold / follow-up

Placeholders: `{candidateName}` (first name only), `{role}`, `{company}`, `{recruiterName}`.

### Contact tracking (local)

- **Oznacz jako skontaktowany** / Mark as contacted
- **Przenieś do do kontaktu** / Move back to to contact
- **Oznacz jako zaproszony** / Mark as invited

Stored in `localStorage` key `twin_recruiter_message_drafts_v1` — not synced to email or ATS.

## Integration

- **Surface:** `/recruiter/inbox` — button on accepted (`interview`) rows in decision rail
- **Pipeline MVP:** `to_contact` status supported in eligibility helper; backend still uses `interview` on accept until pipeline ships
- **Accept/decline:** unchanged — same API routes and buttons

## Files

| Path | Role |
| ---- | ---- |
| `frontend/src/lib/recruiter-message-drafts.ts` | Eligibility, templates, PII guard, localStorage |
| `frontend/src/components/recruiter/recruiter-message-draft-panel.tsx` | Modal UI |
| `frontend/src/app/recruiter/inbox/recruiter-inbox-client.tsx` | Inbox integration |
| `frontend/scripts/recruiter-candidate-message-drafts.test.ts` | Guard tests |
| `frontend/src/lib/overlays/premium/recruiter-message-drafts-overlays.ts` | es–ja i18n |

## Tests

```bash
cd frontend
npm run test:recruiter-candidate-message-drafts
```

Checks: eligibility, not-sent labels, copy button, no hidden PII, accept/decline unchanged, no auto-send/email deps, no forbidden claims.

## Hard bans (unchanged)

- NO automatic sending
- NO Gmail / Microsoft / SMTP / email providers
- NO hidden PII in draft body
- NO public launch GO
- NO auto-apply / delegated apply claims
- NO calendar sync from this feature

## Launch stance

**Public launch NO-GO unchanged.** Safe-lane recruiter productivity only.
