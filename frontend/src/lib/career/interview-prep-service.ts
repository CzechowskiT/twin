import { deterministicAiService } from "@/lib/career/ai-service";
export async function generateInterviewPrep(jobTitle: string, company: string) {
  return deterministicAiService.interviewPrep(jobTitle, company);
}
