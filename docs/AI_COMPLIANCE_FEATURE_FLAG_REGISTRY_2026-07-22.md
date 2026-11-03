# AI Compliance feature flags

| Flag | Default | Notes |
|------|---------|-------|
| CAREER_EVIDENCE_GRAPH_ENABLED | true | Graph persistence |
| CLAIM_PROVENANCE_ENABLED | true | Provenance statuses |
| CLAIM_DISPUTE_ENABLED | true | Disputes |
| AI_REGISTRY_ENABLED | true | System registry |
| AI_DECISION_LOG_ENABLED | true | Decision runs |
| AI_EXPLAINABILITY_ENABLED | true | Explanations |
| AI_HUMAN_OVERRIDE_ENABLED | true | Human review |
| AI_BIAS_MONITORING_ENABLED | true | Non-protected proxies |
| AI_PROTECTED_ATTRIBUTE_MONITORING_ENABLED | **false** | Legal hold |
| AI_PROHIBITED_USE_GUARD_ENABLED | true | Hard blocks |
| AI_PROMPT_REGISTRY_ENABLED | true | Prompt versions |
| AI_MODEL_LIFECYCLE_ENABLED | true | Rollback audit |
| AI_EXTERNAL_VERIFICATION_ENABLED | **false** | Provider hold |
| AI_AUTONOMOUS_EMPLOYMENT_DECISIONS | **false** | Hard ban (code + flag) |
