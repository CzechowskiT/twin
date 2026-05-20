/** Public waitlist / beta dashboard URLs (share + lifecycle email). */

export function waitlistReferralLandingUrl(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/waitlist?ref=${encodeURIComponent(referralCode)}`;
}

export function betaDashboardUrl(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/beta/dashboard?code=${encodeURIComponent(referralCode)}`;
}

export function registerFromWaitlistUrl(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({
    utm_source: "waitlist",
    utm_medium: "email",
    ref: referralCode,
  });
  return `${base}/register?${params.toString()}`;
}
