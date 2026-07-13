# Stabilization window — release train #448–#460 (2026-07-13)

> **Path:** B+ (credentials UNSET) · **Product merges:** BLOCKED · **Hardening PRs:** eligible per policy

## Window rules

| Gate | Product PRs (#448–#455) | Tooling (#451) | Hardening (#456–#460) |
|------|-------------------------|----------------|------------------------|
| Credentials UNSET | **BLOCKED** | CI-only merge candidate | Docs + guards only |
| Founder smoke PASS | Eligible per merge order | Eligible | Parallel after scaffold |
| Gate F PENDING | **NO-GO** launch | — | — |

## Tooling

- `evaluateStabilizationWindow()` in `frontend/scripts/lib/stabilization-window.ts`
- Guard: `npm run test:stabilization-window`

## Exit criteria

1. `DEMO_USER_PASSWORD` SET + recruiter token SET  
2. Founder smoke evidence filed per `docs/schemas/FOUNDER_SMOKE_EVIDENCE_SCHEMA.md`  
3. Full merge train #449→#450→#448→#451→#452–#455 with per-PR smoke PASS  
4. Gate F founder decision ≠ PENDING

**Status:** ACTIVE — stabilization window blocks product merges until credentials + smoke.
