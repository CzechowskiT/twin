/** Public beta waitlist API (same-origin `/api/v1/beta/...` → FastAPI). */

export type BetaStats = {
  total_signups: number;
  cap: number;
  spots_left: number;
  signups_today: number;
  validated_jobs: number;
  job_boards: number;
  recent: string[];
  campaign_ends_at: string | null;
};

export type BetaLeaderboardEntry = {
  rank: number;
  display_name: string;
  referrals: number;
  reward: string;
};

export type BetaMatchItem = {
  score: number;
  title: string;
  company: string;
  location: string | null;
  job_board: string;
  url: string;
};

export type BetaMatchPreview = { title_query: string; matches: BetaMatchItem[] };

export type BetaJoinResult = {
  referral_code: string;
  position: number;
  priority_points: number;
  spots_left: number;
  total_signups: number;
};

export type BetaDashboard = {
  referral_code: string;
  position: number;
  priority_points: number;
  spots_left: number;
  total_signups: number;
  referrals_count: number;
  linkedin_shared: boolean;
  cv_uploaded: boolean;
  voice_recorded: boolean;
  testimonial_posted: boolean;
  job_title: string | null;
  location: string | null;
  min_salary: number | null;
  campaign_ends_at: string | null;
};

async function parseErr(res: Response): Promise<string> {
  try {
    const b = (await res.json()) as { detail?: string };
    if (typeof b.detail === "string") return b.detail;
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`;
}

export async function betaFetchStats(): Promise<BetaStats> {
  const res = await fetch("/api/v1/beta/stats", { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<BetaStats>;
}

export async function betaFetchLeaderboard(limit = 10): Promise<BetaLeaderboardEntry[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`/api/v1/beta/leaderboard?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErr(res));
  const body = (await res.json()) as { leaderboard: BetaLeaderboardEntry[] };
  return body.leaderboard ?? [];
}

export async function betaMatchPreview(title: string): Promise<BetaMatchPreview> {
  const q = new URLSearchParams({ title });
  const res = await fetch(`/api/v1/beta/match-preview?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<BetaMatchPreview>;
}

export async function betaJoin(body: {
  email: string;
  name?: string;
  referred_by?: string | null;
  source?: string;
  accept_privacy_notice: true;
  consent_beta_email_updates: true;
}): Promise<BetaJoinResult> {
  if (!body.accept_privacy_notice || !body.consent_beta_email_updates) {
    throw new Error("Beta join requires privacy notice acceptance and email update consent.");
  }
  const res = await fetch("/api/v1/beta/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      name: body.name || null,
      referred_by: body.referred_by || null,
      source: body.source || "email",
      accept_privacy_notice: true,
      consent_beta_email_updates: true,
    }),
  });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<BetaJoinResult>;
}

export async function betaDashboard(code: string): Promise<BetaDashboard> {
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<BetaDashboard>;
}

export async function betaPatchProfile(
  code: string,
  patch: { job_title?: string | null; location?: string | null; min_salary?: number | null },
): Promise<BetaDashboard> {
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<BetaDashboard>;
}

export async function betaLinkedInShare(code: string): Promise<{ position: number; priority_points: number }> {
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}/linkedin-share`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<{ position: number; priority_points: number }>;
}

export async function betaUploadCv(
  code: string,
  file: File,
): Promise<{ position: number; priority_points: number; matches?: BetaMatchItem[] }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}/cv`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<{ position: number; priority_points: number; matches?: BetaMatchItem[] }>;
}

export async function betaUploadVoice(
  code: string,
  file: File,
): Promise<{ position: number; priority_points: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}/voice`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<{ position: number; priority_points: number }>;
}

export async function betaTestimonial(code: string): Promise<{ position: number; priority_points: number }> {
  const res = await fetch(`/api/v1/beta/waitlist/${encodeURIComponent(code)}/testimonial`, { method: "POST" });
  if (!res.ok) throw new Error(await parseErr(res));
  return res.json() as Promise<{ position: number; priority_points: number }>;
}

export const BETA_REFERRAL_STORAGE_KEY = "twin_beta_referral_code";
