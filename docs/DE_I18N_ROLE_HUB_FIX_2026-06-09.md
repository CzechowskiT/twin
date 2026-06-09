# DE i18n — role hub fix — 2026-06-09

**Issue:** `/login?locale=de` showed English role cards (Candidate, Companies, Open workspace, …).

**Fix:** `authRoles.*` keys + German premium overlay. See `docs/ZERO_ENGLISH_LEAKAGE_I18N_FIX_2026-06-09.md`.

## Expected German copy (role hub)

| Surface | Key | DE |
| ------- | --- | -- |
| Hub title | `login.hubTitle` | Wählen Sie Ihre Rolle |
| Register hub | `register.hubTitle` | Wählen Sie, wie Sie beginnen möchten |
| Candidate card | `authRoles.candidateTitle` | Kandidat |
| Recruiter card | `authRoles.recruiterTitle` | Personalvermittler |
| Company card | `authRoles.companyTitle` | Unternehmen |
| Investor card | `authRoles.investorTitle` | Anleger |
| Card CTA | `authRoles.enterZone` | Arbeitsbereich öffnen |

## Guard

`npm run test:i18n-visual-copy-guard` — rejects founder-reported English leaks in German role hub aggregate copy.
