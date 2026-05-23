# TWIN: 100 zadań — AUTONOMOUS EXECUTION (sanitized)

**Source:** founder plan pasted 2026-05-23 · **Branch:** `cursor/phase1-monorepo-scaffold`  
**No secrets in this file.** Passwords, Stripe keys, and OAuth client secrets are set only in Railway/Vercel or via one-off terminal export.

**Canonical checklist:** [ROADMAP_100_ACCEPTANCE.md](./ROADMAP_100_ACCEPTANCE.md)  
**Live progress:** [EXECUTION_PROGRESS.md](../EXECUTION_PROGRESS.md)

---

## Execution rules (agent)

1. Code + docs + verify locally (`npm run build`, targeted `pytest`).
2. Commit + push to `cursor/phase1-monorepo-scaffold` per slice.
3. Skip tasks that need founder-only secrets (document checklist only).
4. North star: calendar of acceptance — reduce noise, not volume.

---

## Phase 0 — Demo blockers

| ID | Task | Owner |
|----|------|--------|
| 0a | Seed investor demo on production DB (`scripts/seed-investor-demo.py --reset-password`) | Dev / founder with `DATABASE_PUBLIC_URL` |
| 0a | Verify `GET /api/v1/demo/snapshot` → `live_db`, `demo_user_configured` | Agent / `./scripts/verify-investor-demo-ready.sh` |
| 0b | Railway API: `DEMO_MODE_ENABLED=true`, `DEMO_USER_EMAIL=demo@twin.career` | Founder / [RAILWAY_DEMO_ENV_CHECKLIST.md](./RAILWAY_DEMO_ENV_CHECKLIST.md) |
| 0b | Founder login doc PL: [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md) | Done in repo |

---

## Phase 1 — Calendar (no Microsoft secrets)

| Roadmap # | Task |
|-----------|------|
| 10 | WebCal regenerate + copy URL |
| 11 | ICS download one-click |
| 12 | Meet / Teams / Zoom metadata on events |
| 13 | Mobile “next interview” strip |

---

## Phase 2 — Auto-apply & matching

| Roadmap # | Task |
|-----------|------|
| 18 | Nightly auto-apply prod proof (02:00 UTC) — ops |
| 19 | Dashboard last-sweep strip |
| 22 | Match explanation in UI |
| 20–21, 23–27 | Premium gate, ranking weights, filters, limits — backlog |

---

## Phase 3 — Profile & onboarding

| Roadmap # | Task |
|-----------|------|
| 31 | Career assistant PL empty states |
| 33 | Onboarding % progress |
| 28–30, 32, 34–35 | Stripe E2E, CV upload, tailoring, LinkedIn import — mixed |

---

## Phase 4 — Marketing

| Roadmap # | Task |
|-----------|------|
| 36 | Waitlist funnel + analytics events |
| 37–43 | Founding counter, batches, case studies — backlog |

---

## Phase 5 — Recruiter inbox

| Roadmap # | Task |
|-----------|------|
| 44 | Inbox on prod with demo seed |
| 45 | Filters (status, search) |
| 49 | Decline internal note |
| 46–48, 50–51 | Propose slots, SLA, delegation — backlog |

---

## Phase 6 — E2E & infra

| Roadmap # | Task |
|-----------|------|
| 84 | Playwright smoke (+ `/demo` snapshot) |
| 85–90 | i18n audit, OpenAPI, rate limits — backlog |

---

## Phases 7–12 (summary)

- **ATS / employer (52–65):** OAuth live = founder secrets; stubs in repo.
- **Placement (66–75):** state machine partial; disputes backlog.
- **Scraping (76–83):** worker service + board stability.
- **Investor / compliance (91–100):** S3 data room bytes = founder; metrics partial.

---

## Founder-only (never commit)

- `STRIPE_*`, `LINKEDIN_CLIENT_*`, `MICROSOFT_CLIENT_*`
- `DATABASE_URL` / `DEMO_USER_PASSWORD` for seed
- Vercel production branch switch (UI)
- `twin-worker` Railway service creation

---

*Sanitized copy for autonomous execution — update [EXECUTION_PROGRESS.md](../EXECUTION_PROGRESS.md) as slices land.*
