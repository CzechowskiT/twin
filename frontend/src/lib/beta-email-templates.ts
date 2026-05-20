/** Pre-launch Resend-ready bodies — replace `{{link}}`, `{{position}}`, `{{referrals}}` in your sender. */

export const betaEmailSequence = [
  {
    day: 0,
    subject: "You're in — waitlist {{position}} · one link moves you up",
    text: `You're on the TWIN waitlist.

Your spot: about {{position}}

While you wait, TWIN ranks roles for an acceptance-ready pipeline — not random interview spam.

Next (≈2 min):
1) Dashboard + referral link: {{link}}
2) Share your link — each friend bumps your priority
3) Optional: CV preview from live scraped boards (dashboard)

Tip: LinkedIn featured section — referrals compound.

— TWIN Career Agent`,
  },
  {
    day: 2,
    subject: "Your waitlist position moved (here's how to climb faster)",
    text: `Quick pulse check: you're currently around position {{position}}.

Fastest lifts:
• Share on LinkedIn (one-time bonus on the server).
• Referrals: each friend who joins bumps your priority.

Open dashboard: {{link}}`,
  },
  {
    day: 5,
    subject: "Referral update — {{referrals}} joins via your link",
    text: `We tracked {{referrals}} signup(s) from your referral link since you joined.

Keep the link handy in your LinkedIn featured section or bio — it compounds.

Dashboard: {{link}}`,
  },
  {
    day: 7,
    subject: "Beta access window — one week out",
    text: `We're tightening the waitlist as we onboard the first cohort.

If you haven't uploaded a CV yet, it's the fastest way to see real matches from boards we already scrape.

Dashboard: {{link}}`,
  },
  {
    day: 14,
    subject: "Welcome to TWIN beta — your first batch of matches",
    text: `You're cleared for early access.

Log in, confirm consent settings, and open your match queue — we'll keep ranking fresh listings as scrapers run.

App: {{link}}`,
  },
] as const;
