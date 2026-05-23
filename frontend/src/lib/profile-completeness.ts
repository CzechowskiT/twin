/** Minimal profile signals needed before matches and apply actions are useful. */

export type ProfileCompletenessInput = {
  name?: string;
  skills?: string[];
  preferred_job_titles?: string[];
};

export function profileIsComplete(profile: ProfileCompletenessInput | null | undefined): boolean {
  if (!profile) return false;
  const skills = profile.skills?.filter((s) => s.trim()) ?? [];
  const titles = profile.preferred_job_titles?.filter((t) => t.trim()) ?? [];
  return skills.length > 0 && titles.length > 0 && Boolean(profile.name?.trim());
}
