# Founder Demo Checklist — 2026-06-28

**Purpose:** Controlled founder-led demo path for investors/diligence.  
**Evidence index:** [LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

**This is not public launch. No live external actions.**

---

## 1. Purpose

- Run a **bounded**, evidence-backed product walkthrough on production (`https://twin-sooty.vercel.app`).
- Show honest previews: navigation IA, investor room, product proof, interactive demo, trust surfaces.
- Stay within **NO-GO** launch stance — demo confidence without overclaims.
- Founder present for auth boundaries, fallback decisions, and gap explanations.

---

## 2. Pre-Demo Checks

Complete before sharing screen:

| Check | Expected | How |
|-------|----------|-----|
| public-health `status` | `ok` | `GET /api/public-health` |
| public-health `db_ok` | `true` | same |
| `frontend_commit` | Known SHA (note in evidence index) | same |
| `api_commit` | Known SHA (`6d6d1e5…` expected lag OK) | same |
| Safe HTTP smoke | **10/10 × 200** | curl routes in evidence index §3 |
| Launch stance | **NO-GO** | `LAUNCH_STANCE = "noGo"` |
| P0 | **OPEN** | Do not claim closed |
| Gate D | **PENDING** — prod browser not run | [preflight runbook](./gate-d-prod-browser-smoke-preflight-2026-06-28.md) |
| Gate E | **PENDING** — Phase 3B not run | |
| Auto-apply | **PAUSED** | public-health / ops context |
| Browser tab discipline | Single-tab demo path | No multitab stress |

If any HTTP route is non-200 or health is not `ok` → **stop** and use §7 fallback.

---

## 3. Recommended Demo Path (10 steps)

| Step | Surface | Notes |
|------|---------|-------|
| 1 | `/` | Homepage — positioning, north star |
| 2 | `/#explore-twin` | **Explore TWIN / Poznaj TWIN** — 10-card quick entry |
| 3 | `/for-investors` | Fundraising / diligence page — **not** the executive room |
| 4 | `/investor` | Executive **Investor Room** — read-only preview |
| 5 | `/investor/product-proof` | Bounded **Product Proof** evidence |
| 6 | `/demo` | Interactive simulation — no live apply |
| 7 | `/how-it-works` | Product narrative + crosslinks |
| 8 | `/faq` | Bounded FAQ |
| 9 | `/dashboard/trust` | Trust center preview (may show auth shell without session — OK) |
| 10 | `/status` | Ops / health transparency |

Optional deep dives (only if time + audience fit): candidate dashboard preview, recruiter inbox with demo token — see [launch plan §16](./TWIN_PUBLIC_LAUNCH_READINESS_PLAN_2026-06-27.md).

---

## 4. What To Say

- “This is a **controlled demo and evidence path** — not a public launch.”
- “**Product Proof** is bounded diligence evidence, not a live external workflow.”
- “**Investor Room** is a controlled executive preview room.”
- “**Trust Center** shows privacy, consent, and data-readiness surfaces — preview/pilot badges apply.”
- “**P0 is still open** until gated prod browser, Phase 3B evidence (if unblocked), and re-audit.”
- “Auto-apply is **paused**; we optimize for a **calendar of acceptance**, not inbox spam.”
- “API deploy may lag frontend on docs-only batches — we track SHAs on `/status` and public-health.”

---

## 5. What Not To Say

**Forbidden claims:**

| Do not say | Why |
|------------|-----|
| launch-ready / production-ready for everyone | Launch **NO-GO** |
| P0 closed / performance signed off | P0 **OPEN**; Gate D not run |
| Phase 3B passed / multitab verified | Phase 3B **NOT RUN** |
| live ATS writeback / ATS sync | **NOT LIVE** |
| live outreach / email sent / campaigns running | **NOT LIVE** |
| calendar writes / automatic scheduling sync | **NOT LIVE** in prod |
| payment / revenue / placement fee active | **NOT LIVE** for demo |
| placement confirmed / externally verified | Preview only |
| “we apply while you sleep” | Auto-apply **PAUSED** |
| public launch GO / “we’re live” marketing | Founder decision pending |

---

## 6. Known Boundaries

| Boundary | Status |
|----------|--------|
| **Gate D** | **PENDING** — no prod browser smoke yet |
| **Gate E** | **PENDING** — Phase 3B **HARD BLOCKED** |
| **Launch** | **NO-GO** |
| **P0** | **OPEN** |
| **Phase 3B** | **NOT RUN** — do not demo multitab proof |
| **Default CI browser** | **DISABLED** — not evidence of prod browser PASS |
| **Microsoft calendar write** | **OFF** in prod |
| **H5c/H5d external invites** | **HOLD** |
| **Hiring Journey engine** | Preview / `readiness_preview` — not live workflow |

Full gate table: [LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md) §2.

---

## 7. Fallback If Something Looks Wrong

1. **Stop the demo** — do not improvise live fixes in prod.
2. **Capture route URL** and screenshot if possible.
3. **Capture public-health** JSON (`/api/public-health`) — note `frontend_commit`.
4. **Do not claim launch readiness** or blame “already fixed in staging” without SHA proof.
5. **Pivot** to adjacent step in §3 if one surface fails (e.g. skip to `/status` for transparency).
6. **Open targeted fix branch** after demo — docs/static or bounded FE only per operating context.
7. **No live-action debugging** — no enabling auto-apply, calendar write, email, ATS, or outreach in prod.

---

## Verification

Static guard: `npm run test:launch-readiness-evidence-guard`

**Public launch: NO-GO · P0: OPEN · Gate D/E: PENDING · Phase 3B: NOT RUN**
