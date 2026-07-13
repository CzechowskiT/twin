# Roadmap continuation — investor workspace data room S3 (post-stable)

> **Status:** SPEC ONLY · **Implementation:** blocked until workspace modules green + Gate F

## Intent

Secure document room for investor persona with S3/R2 presigned URLs — extends existing investor demo patterns.

## Preconditions

1. Investor workspace wave smoke PASS (#440+)  
2. S3/R2 founder credentials (see `docs/FOUNDER_SECRETS_WHERE.md`)  
3. CSP + presigned URL audit in security matrix

## Scope boundary

- Read-only investor artifacts in pilot  
- No candidate PII in investor exports  
- No merge before stable release tag
