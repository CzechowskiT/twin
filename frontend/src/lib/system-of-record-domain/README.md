# TWIN System-of-Record Domain Kernel

Local domain kernel for recruiter/company system-of-record modules. Provides canonical types, deterministic demo seed, resolvers, and backward-compatible adapters.

## Layout

| File | Purpose |
|------|---------|
| `constants.ts` | Canonical demo IDs (`demo-candidate-001`, `demo-role-001`, …) |
| `types.ts` | Strict domain entity types (no `any`, no PII) |
| `demo-seed.ts` | Unified internally consistent pilot seed |
| `adapters.ts` | Map kernel → existing `*-demo-data.ts` record shapes |
| `resolvers.ts` | `resolveTwin*` / `resolve*` — never throw for invalid IDs |
| `index.ts` | Public API |

## Usage

```typescript
import {
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  resolveTwinCandidate,
  resolveJobPipeline,
  resolveSystemOfRecordLinks,
} from "@/lib/system-of-record-domain";

const candidate = resolveTwinCandidate("demo-candidate-001");
const pipeline = resolveJobPipeline("demo-role-001");
const links = resolveSystemOfRecordLinks("recruiter", {
  candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  role_id: "demo-role-001",
});
```

## Migration path

1. Import canonical IDs from `constants.ts` in `*-demo-data.ts` files (done for profile, pipeline, ATS).
2. Call kernel resolvers from module `resolve*` functions when ready.
3. Keep workspace components unchanged — adapters preserve existing record shapes.

## Tests

```bash
npm run test:system-of-record-domain-kernel
npm run test:system-of-record-route-consistency
```

See `docs/TWIN_SYSTEM_OF_RECORD_DOMAIN_KERNEL_2026-06-17.md` for full spec.
