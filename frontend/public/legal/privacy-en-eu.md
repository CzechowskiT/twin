# TWIN — Privacy Policy (EU / EEA)

**Version:** MVP · **Last updated:** May 2026

---

**Not legal advice.** This notice is for transparency. **Mandatory EU/EEA and national consumer and employment law** applies where it conflicts with anything below.

---

## Who this is for

If we estimate you are in the **European Union or European Economic Area**, this text highlights **GDPR**-aligned processing. Your **local** supervisory authority and **non-waivable** national rules still apply.

---

## What we collect

- Account **email** and **password** (stored hashed).
- **Career profile** data you choose to provide (skills, experience, salary expectations, location).
- **Application and match history** inside TWIN.
- If you upload a **CV** or **voice intro**: file contents and **derived signals** (e.g. extracted skills, summaries) used to run the product, including automated parsing where enabled.
- **Approximate country / region** from IP and CDN headers, or from **browser geolocation** if you opt in, so we can show **jurisdiction-aware** notices and consent text. We do **not** use this for continuous tracking.

---

## Why we process (legal bases)

For core product features we rely on your **explicit consent** where required (**GDPR Art. 6(1)(a)** and, where applicable, **Art. 9** for special categories you voluntarily add to your profile). We may also rely on **contract** (Art. 6(1)(b)) for steps clearly necessary to provide the service you request.

---

## Your GDPR rights

Depending on circumstances you may have rights of **access**, **rectification**, **erasure**, **restriction**, **objection**, **data portability**, and rules on **automated decision-making**. Contact the TWIN operator to exercise rights. You may **withdraw consent**; where processing is consent-based we will stop unless another lawful basis applies.

---

## Retention

Data is retained while your account is active and deleted or anonymised when no longer needed for the purposes collected, unless a **longer retention** is required by law.

---

## Third parties and transfers

We use **Anthropic Claude** for matching and drafting assistance. Job listings are aggregated from public boards (e.g. pracuj.pl, rocketjobs.pl). **Subprocessors** and **international transfers** (including to countries without an adequacy decision) are covered by appropriate safeguards such as **Standard Contractual Clauses** where required. Details can be expanded in the Data Processing Annex as the product matures.

---

## Cookies & local storage {#cookies}

We use **strictly necessary** storage for sign-in, security, and language. If you accept **optional** analytics or marketing cookies, we may load those tags when the features ship. Your choice is stored on this device and can be changed from the **site footer**.

---

## Contact

Use the contact channel published on the site for privacy requests.

---

## Custom GPT Actions (founder / operator) {#custom-gpt-actions}

TWIN may expose a **private Custom GPT** (“TWIN Product Operator”) that calls our HTTPS Actions API with a long-lived **API key** stored only in the operator’s ChatGPT GPT configuration and in our backend secret store (Railway). This is **not** a public GPT Store app and is **not** an MCP connector.

**What the Actions API may process:** founder command text (goals/directions), command and decision identifiers, redacted project status (e.g. deployment SHAs, counters, Gate/Launch stance), and links to existing engineering surfaces (e.g. pull requests). The API is designed to **omit** secrets, full Product Agent prompts, and raw execution logs from Action responses.

**What we do not put in the OpenAPI document or frontend:** the Actions API key. Rotation is supported by replacing the Railway secret (and optionally keeping a short dual-key window).

**Your control:** keep the Custom GPT private; revoke or rotate the API key in Railway to cut off access. OAuth for Actions may be added later; the current MVP is API-key Bearer auth scoped only to the `/api/v1/chatgpt/twin` namespace.
