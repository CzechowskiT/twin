import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import type { JobListing } from "@/lib/career/job-types";

export type MatchResult = { score: number; band: "excellent" | "good" | "fair" | "weak" };

function bandFromScore(score: number): MatchResult["band"] {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "weak";
}

export function computeMatchScore(
  job: JobListing,
  profile: CareerCandidateProfile | null | undefined,
): MatchResult {
  if (!profile?.skills.length && !profile?.preferredJobTitles.length) {
    return { score: 0, band: "weak" };
  }
  let score = 30;
  const overlap = profile.skills.filter((s) =>
    job.skills.some((j) => j.toLowerCase().includes(s.toLowerCase())),
  );
  score += Math.min(40, overlap.length * 10);
  if (profile.preferredJobTitles.some((t) => job.title.toLowerCase().includes(t.toLowerCase()))) {
    score += 15;
  }
  if (profile.location && job.location?.toLowerCase().includes(profile.location.toLowerCase())) {
    score += 10;
  }
  if (job.isValidated) score += 5;
  const clamped = Math.min(100, Math.max(0, score));
  return { score: clamped, band: bandFromScore(clamped) };
}
