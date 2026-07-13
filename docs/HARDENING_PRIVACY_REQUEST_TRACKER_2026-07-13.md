# Hardening track — privacy request tracker (2026-07-13)

> **Overlap:** Trust Center + C2 trust review queue — tracker UI deferred

## Decision

Candidate privacy requests flow through existing Trust Center persistence (#450). Separate tracker UI **not duplicated** in C3–C5 to avoid dual source of truth.

## Hardening

- C4 saved views on `trust_review` surface only **filters** existing queue  
- C5 timeline projects audit events — no privacy payload in meta  
- Candidate timeline read-only on trust audit projection

**Status:** architectural hardening documented; dedicated tracker PR deferred.
