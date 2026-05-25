# Supported apply matrix

How TWIN applies per source — and what we promise in copy and metrics.

| Source / method | `supported_apply_mode` | Automation | Confirmed external submit |
|-----------------|------------------------|------------|---------------------------|
| pracuj.pl auto-apply | `verified_auto_apply` | Playwright fill + optional submit click | Only with evidence (not click alone) |
| indeed / assisted | `assisted_apply` | Partial fill; often CAPTCHA / login | Same |
| One-click / link open | `manual_only` | None | User completes on employer site |
| Demo jobs (`auto_apply_demo_simulated`) | `manual_only` | Simulated save in TWIN | Never counted as confirmed |
| LinkedIn / unsupported boards | `unsupported` | Not automated (compliance) | N/A |

## Do not promise

- “We submitted your application” after form fill or submit click without confirmation evidence.
- Verified auto-apply on boards marked `unsupported`.
- LinkedIn automation (explicitly out of scope).

## Investor / public metrics

See `/api/v1/public/mvp-stats` — `external_submit_confirmed` is evidence-backed; `total_applications` remains all rows for backward compatibility.
