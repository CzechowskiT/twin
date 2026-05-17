# Scraping compliance (operators)

TWIN ingests **public job listings** (URLs + metadata) to power matching. This is **not legal advice**:
your counsel should confirm posture for each jurisdiction and each job board.

## What the code enforces by default

1. **`robots.txt`** — Before Playwright opens a listing URL, the API checks `robots.txt` for that host
   using the same User-Agent string we send in the browser context (`SCRAPE_RESPECT_ROBOTS_TXT`,
   default `true`). If the path is disallowed, the fetch is skipped.

2. **Identifiable User-Agent** — Requests use a normal Chromium UA plus  
   `(TWIN-CareerAgent/1.0; +<FRONTEND_URL>/privacy)` so operators can publish contact / policy there.

3. **Volume caps** — `SCRAPE_JOBS_PER_BOARD` clamps how many listings each adapter keeps per run.

4. **Board allowlist** — `SCRAPE_ENABLED_BOARD_IDS` limits which adapters run (empty = all registered).

5. **Serial pacing** — `SCRAPE_BETWEEN_BOARDS_SEC` inserts a pause between boards in “scrape all” to
   avoid burst traffic.

6. **Authenticated scrape triggers** — `/api/v1/jobs/scrape/*` requires a logged-in user (abuse
   surface is reduced vs a public crawler endpoint).

## LinkedIn (important)

`https://www.linkedin.com/robots.txt` ends with `User-agent: *` / `Disallow: /` for generic crawlers,
and the header comment states that automated access without permission is prohibited.

With **`SCRAPE_RESPECT_ROBOTS_TXT=true` (default), the LinkedIn adapter will not fetch**. Treat
LinkedIn ingestion as **blocked until** you have explicit permission (e.g. crawl whitelist /
contract) or you switch to an **official LinkedIn / hiring API** you are entitled to use.

`SCRAPE_RESPECT_ROBOTS_TXT=false` is an **escape hatch for labs** with written clearance — not a
production default.

## Other boards

Each site has its own Terms of Use. Prefer **publisher APIs** or data licences where available.
`robots.txt` is necessary but not sufficient: some paths may be allowed in robots while still
forbidden by contract.

## Data minimisation in the product

Store listing fields needed for search and matching; link users out to the board for applications
unless you have separate automation consent and technical support for that board.
