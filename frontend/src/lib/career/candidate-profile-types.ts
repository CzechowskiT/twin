export type CareerCandidateProfile = {
  name: string; skills: string[]; experienceYears: number;
  desiredSalary: number | null; location: string | null;
  preferredJobTitles: string[]; cvText: string | null;
};
export function emptyCareerProfile(): CareerCandidateProfile {
  return { name: "", skills: [], experienceYears: 0, desiredSalary: null, location: null, preferredJobTitles: [], cvText: null };
}
