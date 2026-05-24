export type AiService = {
  analyzeCv(cvText: string, jobTitle: string): Promise<{ summary: string; gaps: string[] }>;
  interviewPrep(jobTitle: string, company: string): Promise<{ questions: string[]; star: string[] }>;
  parseNaturalLanguageQuery(query: string): Promise<Record<string, string>>;
};
export const deterministicAiService: AiService = {
  async analyzeCv(cvText, jobTitle) {
    const words = cvText.toLowerCase().split(/\W+/).filter(Boolean);
    const titleTokens = jobTitle.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    const gaps = titleTokens.filter((t) => !words.includes(t)).slice(0, 5);
    return { summary: gaps.length ? `CV may be missing keywords for ${jobTitle}: ${gaps.join(", ")}.` : `CV aligns with common tokens for ${jobTitle}.`, gaps };
  },
  async interviewPrep(jobTitle, company) {
    return { questions: [`Why ${company} and this ${jobTitle} role?`, "Walk through a recent project you owned end-to-end.", "How do you prioritize when deadlines collide?"], star: ["Situation: production incident — Task: restore service — Action: … — Result: …"] };
  },
  async parseNaturalLanguageQuery(query) {
    const out: Record<string, string> = {}; const lower = query.toLowerCase();
    if (lower.includes("remote")) out.workFormat = "remote";
    if (lower.includes("senior")) out.seniority = "senior";
    const pln = lower.match(/(\d{4,6})\s*pln/); if (pln) out.minSalary = pln[1];
    const loc = lower.match(/(?:in|w)\s+([a-ząćęłńóśźż]+)/i); if (loc) out.location = loc[1];
    if (!Object.keys(out).length) out.q = query; return out;
  },
};
