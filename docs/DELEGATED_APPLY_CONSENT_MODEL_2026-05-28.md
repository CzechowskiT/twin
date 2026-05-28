# Delegated Apply Consent Model — 2026-05-28

## Purpose

Define the future persistence model for delegated apply authorization.
This slice is documentation only — no production migration and no live delegated submit.

## Why a separate model

`auto_apply_consents` covers nightly autonomous apply with score thresholds.
Delegated apply requires a distinct consent scope, legal text version, and revocation trail.

## Proposed table: `delegated_apply_consents`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | PK | |
| `candidate_id` | FK unique | One active row per candidate |
| `policy_version` | string | e.g. `delegated_apply_v1` |
| `legal_text_hash` | string | SHA-256 of rendered consent copy shown to user |
| `accepted_at` | datetime | When candidate acknowledged |
| `revoked_at` | datetime nullable | Explicit withdrawal |
| `is_active` | bool | Derived or stored; false when revoked |
| `representation_scope_json` | text | Channels, geography, salary bounds |
| `do_not_apply_rules_hash` | string | Fingerprint of active exclusion rules |
| `created_at` / `updated_at` | datetime | Audit |

## Append-only event table: `delegated_apply_consent_events`

| Field | Notes |
| --- | --- |
| `consent_id` | FK |
| `event_type` | `accepted`, `revoked`, `scope_updated`, `policy_upgraded` |
| `actor` | `candidate`, `system`, `ops` |
| `detail_json` | No secrets; policy version + diff summary |
| `created_at` | Immutable timestamp |

## Evidence trail linkage

Each delegated submit attempt should reference:

- `consent_id` + `policy_version` at submit time
- application package artifact id
- submission status from truth table (`APPLICATION_STATUS_TRUTH_TABLE.md`)
- optional confirmation artifact refs (screenshot, ATS id, email)

## Gateway integration (future)

- `delegated_apply_allowed=true` only when:
  - `verification_status` in (`verified_basic`, `delegated_apply_enabled`)
  - active `delegated_apply_consents` row exists
  - no blocking disputes/suspensions
- `can_submit_delegated_application=true` only when guard plan chain passes end-to-end

## Migration gate

Do not ship migration until:

1. Legal copy finalized in i18n
2. Revocation UX defined
3. Contract tests for accept/revoke
4. No-secret regression on consent endpoints
