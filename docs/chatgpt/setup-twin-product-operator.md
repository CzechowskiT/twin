# Setup: Private Custom GPT — TWIN Product Operator

Non-technical founder checklist. When finished, the only remaining work is inside the ChatGPT GPT editor (paste Instructions, import OpenAPI, paste API key).

## What you are building
A **private** Custom GPT that talks to TWIN over HTTPS Actions (Bearer API key + OpenAPI).  
**Not** MCP. **Not** ChatGPT Business connectors. Works with Actions-capable models (not Pro mode).

## Prerequisites
- Access to ChatGPT that supports **Create a GPT** + **Actions**
- Railway access to the TWIN API service (to confirm the secret exists — do not put the key in git, Vercel, or this doc)
- Production API host: `https://twin-production-bcd9.up.railway.app`

## One-time Railway secret (already for ops)
On the **Railway API** (and worker if it reads the same env) set:

- `CHATGPT_TWIN_ACTIONS_API_KEY` — generate with  
  `python -c "import secrets; print(secrets.token_urlsafe(48))"`  
  Must be at least 32 characters (≥256-bit).
- Optional rotation: `CHATGPT_TWIN_ACTIONS_API_KEYS=oldkey,newkey`
- `CHATGPT_TWIN_ACTIONS_ENABLED=true`

Do **not** put this key on Vercel / frontend / repo / OpenAPI examples.

Fingerprint of the active key appears in API logs / Actions responses as `auth_fingerprint` (16 hex chars) — safe to share; the raw key is not.

## Create the Custom GPT
1. ChatGPT → **Explore GPTs** → **Create a GPT** → **Configure**.
2. Name: `TWIN Product Operator`. Description: founder command interface for TWIN (private).
3. Open `docs/chatgpt/twin-product-operator-instructions.md` and paste the Instructions block (below the horizontal rule) into **Instructions**.
4. Add the conversation starters listed at the bottom of that file.
5. **Actions** → **Import from URL**:  
   `https://twin-production-bcd9.up.railway.app/api/v1/chatgpt/twin/openapi.json`  
   (or paste the JSON from that URL).
6. Authentication → **API Key** → Auth Type **Bearer** → paste `CHATGPT_TWIN_ACTIONS_API_KEY` from Railway (only here).
7. Privacy policy URL (required by Actions):  
   `https://twin-sooty.vercel.app/privacy#custom-gpt-actions`
8. Keep the GPT **private**. Do **not** publish to the Store.
9. Save.

## Smoke after setup
In a new chat with the GPT:

1. Ask: *Przeanalizuj aktualny stan TWIN. Bez zmian w kodzie.*  
   Expect: Actions call `getTwinProjectState` + `createTwinCommand` (analyze), then poll result. Counters should trend to idle zeros. No code changes.
2. Optional mutating: ask for a small admin-panel diagnostic/copy fix through to production. Approve high-risk decisions when asked. Manual merge only.

## Fallback
If Actions are unavailable, use FCC: `https://twin-sooty.vercel.app/admin/founder-command`.

## Links (bookmark)
| What | URL |
|------|-----|
| OpenAPI | https://twin-production-bcd9.up.railway.app/api/v1/chatgpt/twin/openapi.json |
| Setup hint API | https://twin-production-bcd9.up.railway.app/api/v1/chatgpt/twin/setup |
| Privacy (Actions section) | https://twin-sooty.vercel.app/privacy#custom-gpt-actions |
| FCC fallback | https://twin-sooty.vercel.app/admin/founder-command |
| Instructions (repo) | `docs/chatgpt/twin-product-operator-instructions.md` |
