# Application status truth table

TWIN separates **pipeline status** (what stage the candidate is in) from **submission status** (what happened on the employer site).

## Submission phases (`submission_status`)

| Phase | Meaning | Counts as external submit? |
|-------|---------|----------------------------|
| `application_created_in_twin` | Row saved in TWIN only | No |
| `application_prepared` | Package/form prepared (incl. demo, one-click, FORM_FILLED) | No |
| `external_submit_attempted` | Submit click/heuristic without proof | No |
| `external_submit_confirmed` | Evidence on file (`confirmation_type` ≠ `none` or proof fields) | **Yes** |
| `external_submit_failed` | Automation failed; see `failure_reason` | No |
| `manual_action_required` | User must finish on employer site (link open, CAPTCHA, unsupported board) | No |

## Legacy pipeline (`ApplicationStatus`)

| Status | Typical use |
|--------|-------------|
| `pending` | Saved / in progress |
| `applied` | Candidate or system believes employer has the application (confirmed submissions set this with evidence) |
| `interview` | Recruiter advanced |
| `rejected` / `hired` | Outcome |

UI should prefer **`display_status`** / **`submission_status`** from the API for badges — not the word “Applied” / “Wysłana” unless `external_submit_confirmed`.

## Evidence (`confirmation_type`)

`external_submit_confirmed` requires at least one of:

- `confirmation_type` other than `none`
- `confirmation_text`, `confirmation_url`, `external_application_id`, or `confirmation_email_detected`

## Mapping auto-apply outcomes

| `ApplyOutcome` | `submission_status` | `ApplicationStatus` |
|----------------|---------------------|---------------------|
| `form_filled` | `application_prepared` | `pending` |
| `submitted` (heuristic click) | `external_submit_attempted` | `pending` |
| `failed` | `external_submit_failed` | `pending` |
| `needs_human` / `unsupported` | `manual_action_required` | `pending` |
| Demo simulated | `application_prepared` | `pending` |

## User actions

| Action | `submission_status` |
|--------|---------------------|
| Open job link (“Apply”) | `manual_action_required` |
| One-click apply | `application_prepared` |
| User sets pipeline status to Applied in panel | `external_submit_confirmed` + `manual_user_confirmation` |
