/** Onboarding / profile completeness for dashboard and onboarding UI. */

export type ProfileProgressInput = {
  name?: string | null;
  skills?: string | null;
  preferred_job_titles?: string | null;
  experience_years?: number | null;
  location?: string | null;
  cv_text?: string | null;
  resume_path?: string | null;
  cv_filename?: string | null;
};

function parseJsonList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function computeProfileProgressPercent(input: ProfileProgressInput): number {
  const checks = [
    Boolean((input.name ?? "").trim()),
    parseJsonList(input.skills).length > 0,
    parseJsonList(input.preferred_job_titles).length > 0,
    (input.experience_years ?? 0) > 0,
    Boolean((input.location ?? "").trim()),
    Boolean((input.cv_text ?? "").trim()) ||
      Boolean((input.resume_path ?? "").trim()) ||
      Boolean((input.cv_filename ?? "").trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
