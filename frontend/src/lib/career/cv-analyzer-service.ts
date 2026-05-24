import { deterministicAiService } from "@/lib/career/ai-service";
export async function analyzeCvForJob(cvText: string | null | undefined, jobTitle: string) {
  if (!cvText?.trim()) return { summary: "", gaps: [] as string[] };
  return deterministicAiService.analyzeCv(cvText, jobTitle);
}
