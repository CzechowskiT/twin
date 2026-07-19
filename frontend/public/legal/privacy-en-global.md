# TWIN — Privacy Policy (global)

**Version:** MVP · **Last updated:** May 2026

---

**Not legal advice.** This is a **general** privacy notice when we do **not** place you in a dedicated regional bucket (EU/EEA, Poland, or UAE) or when detection is uncertain. **Mandatory laws where you live** still apply.

---

## What we collect

- Account **email** and **password** (stored hashed).
- **Career profile** data you provide.
- **Application and match history** inside TWIN.
- Optional **CV** or **voice** uploads and **derived** product signals.
- **Approximate country / region** from IP / CDN or optional **geolocation** to show jurisdiction-aware notices — **not** for continuous tracking.

---

## Why we process

To operate the career agent product (matching, applications, communications). Legal bases may include **consent**, **contract**, or **legitimate interests** depending on your location and feature.

---

## Your rights

Contact the operator through the site’s published channel to exercise access, correction, deletion, or other rights available in your jurisdiction.

---

## Cookies & local storage {#cookies}

Strictly necessary storage for login and settings; optional analytics/marketing when enabled. Manage from the **footer** link on the site.

---

## Third parties

We use **Anthropic Claude** and aggregate listings from public job boards. Subprocessor and transfer details will expand as the product matures.

---

## Custom GPT Actions (founder / operator) {#custom-gpt-actions}

TWIN may expose a **private Custom GPT** (“TWIN Product Operator”) that calls our HTTPS Actions API with a long-lived **API key** stored only in the operator’s ChatGPT GPT configuration and in our backend secret store (Railway). This is **not** a public GPT Store app and is **not** an MCP connector.

**What the Actions API may process:** founder command text, command/decision identifiers, redacted project status, and engineering links. Responses are designed to **omit** secrets, full Product Agent prompts, and raw logs.

**Control:** keep the GPT private; rotate the Railway API key to revoke access. The key is never placed in the OpenAPI document or frontend.
