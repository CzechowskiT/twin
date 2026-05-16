/** LinkedIn / X copy helpers — pass `link` with ?ref= when available. */

export function betaShareTemplateCasual(link: string): string {
  return [
    "Just joined the waitlist for TWIN — it ranks real jobs from live boards and keeps the pipeline in one workspace.",
    "Limited beta spots; referrals move you up the queue.",
    `Join: ${link}`,
  ].join("\n\n");
}

export function betaShareTemplateProfessional(link: string, industry: string): string {
  return [
    `After years in ${industry}, I'm done with noisy job feeds.`,
    "TWIN aggregates validated listings and scores them with the same matcher as the product — automation rolls out in layers, consent-first.",
    `I'm on the beta waitlist: ${link}`,
  ].join("\n\n");
}

export function betaShareTemplateFomo(link: string, spotsLeft: number): string {
  return [
    `Only ${spotsLeft} beta spots left on the server cap I'm looking at.`,
    "TWIN:",
    "• Scrapes multiple boards into one DB",
    "• Shows match scores against your title",
    "• Waitlist perks for early cohorts",
    link,
  ].join("\n");
}
