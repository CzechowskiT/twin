# Candidate-First support ops (Phase 2 executable runbooks)

Mailbox: **contact@twin.care** (escalates to on-call).  
In-product: feedback API + `/dashboard/trust/controls`.  
Roles: PILOT_ON_CALL_PRIMARY / SECONDARY / ESCALATION (CONFIGURED).  
Do not invent human names. Prefer ticket category `candidate_pilot`.

Frozen: no mass outreach, no CAPTCHA bypass, no autonomous employment replies, Launch NO-GO, Enrollment OFF.

---

## 1) First login / invite not working

1. Confirm invite-only + Enrollment OFF (expected).
2. Candidate must use **invited email** or `?invite=` token from Founder-authorized send.
3. If `registration_invite_only` → explain invite-only (not a bug).
4. If token expired/revoked → Founder: revoke old + re-send (mint new token) after send auth.
5. Recovery: password reset flow; never share ops Bearer.

## 2) CV upload / processing failed

1. Check file type PDF/DOCX/TXT and size limit.
2. Magic mismatch → ask for re-export as PDF.
3. If AI outage / kill switch: profile still uses **rules_v1** fallback — honest UX, no fabricated Claude output.
4. Worker: Celery retries (3); `extraction_status=failed` must be visible — ask candidate to re-upload or Founder force re-run.
5. Escalate if queue stuck >30m with backlog.

## 3) Bad profile / poor match

1. Candidate corrects profile fields + Career Compass.
2. Fit band may be UNKNOWN — do not claim certainty or bias-free.
3. Log unsupported claim if AI copy overpromised.

## 4) Consent withdraw

1. Trust controls → withdraw matching/processing consents.
2. Confirm matching/CV processing stops for revoked bases.
3. Ticket + audit note; no sales outreach.

## 5) Export / deletion

1. Self-serve: export JSON + delete account routes (customer-usable).
2. Ops DSR queue for complex cases — acknowledge within SLA; do not paste CV text into Slack/tickets.

## 6) Expired invite / account access

1. Check token status (ACTIVE/USED/REVOKED/EXPIRED) via Pilot OS revoke list / DB (masked only).
2. Re-mint only after Founder send auth; never invent recipients.
3. Lockout after validate fail threshold — revoke + reissue.

## 7) AI / privacy incident

1. Engage `AI_INTEL_KILL_SWITCH=true` (degrades to rules; journey continues).
2. Preserve evidence without PII/CV text in logs.
3. Notify contact@twin.care + in-product notice if user-facing.
4. Do not claim AI Act certification or bias-free remediation.

## 8) Application draft loss

1. Drafts persist as Application records; auto-submit OFF.
2. If missing: check auth session + applications list; restore from last prepared package if present.

## SLA

- P0 acknowledge within on-call window  
- P1 same business day  
- Synthetic traffic `kpi_excluded` — never count as real pilot success
