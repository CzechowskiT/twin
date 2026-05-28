# Delegated Apply Engine — Guard Plan (2026-05-28)

## Goal

Design a delegated-apply path that is constrained, auditable, and evidence-driven.

## Explicit non-goals for this slice

- No real application submission.
- No autonomous live auto-apply execution.
- No scraping expansion.

## Guard chain

1. Candidate profile baseline exists.
2. Required consents are present and current.
3. Candidate Career Brief is present.
4. Skill evidence is present.
5. Do-not-apply rules are satisfied.
6. Application package can be prepared.
7. Delegated consent is explicit and valid.
8. Submission channel is allowed and auditable.

## Policy outcomes

- If any guard fails: block submit and return structured `blocked_reasons`.
- If guards 1-6 pass but delegated consent is missing: allow package preparation only.
- Never bypass explicit candidate do-not-apply constraints.

## Runtime contract for current branch

- `delegated_apply_allowed=false`
- `can_prepare_application_package` can be true when baseline verification passes.
- `can_submit_delegated_application=false`

## Migration-required later steps

- Dedicated delegated-consent model with versioned legal text and revocation.
- Event-sourced authorization trail for submit-level decisions.
- Rule-engine table for do-not-apply policy normalization.
