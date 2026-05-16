/** Pre-launch Resend-ready bodies — replace `{{link}}`, `{{position}}`, `{{referrals}}` in your sender. */

export const betaEmailSequence = [
  {
    day: 0,
    subject: "You're on the TWIN beta waitlist — here's what happens next",
    text: `You're in.

Next steps:
1) Open your dashboard and copy your referral link.
2) Optional: upload a CV for an instant top-3 preview from live scraped jobs.
3) Optional: record a short voice note so we can tune matching later.

Your spot moves up when friends join via your link.

Dashboard: {{link}}`,
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
