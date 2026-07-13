# Hardening track — retention preview (2026-07-13)

> **PR scope:** dry-run lifecycle preview — no production deletes

## Intent

Preview candidate/recruiter data retention impact before purge jobs run (GDPR export-first contract).

## Guard

`frontend/scripts/hardening-retention-preview-guard.test.ts`  
Engine: `npm run test:data-lifecycle-dry-run-engine`

## Acceptance

- Export phase precedes all destructive steps
- `LIVE` / `PRODUCTION_WRITE` env blocks dry-run engine
- Tables for C3–C5 included in lifecycle plan

**Status:** guard on hardening branch; founder smoke PENDING.
