/**
 * Founder smoke evidence schema validator — structured frontmatter/JSON.
 * Rejects fake PASS (missing required fields, placeholder dates, agent-only claims).
 */

export type SmokeSliceResult = "PASS" | "FAIL" | "SKIP" | "PENDING";

export type SmokeEvidenceSlice = {
  id: string;
  pr?: string;
  result: SmokeSliceResult;
  notes?: string;
};

export type SmokeEvidenceRecord = {
  schemaVersion: "1";
  tester: string;
  date: string;
  environment: "prod" | "preview-448" | "preview-449" | "preview-450" | string;
  deploySha: string;
  slices: SmokeEvidenceSlice[];
  consoleErrors?: string;
  founderSmokePass?: boolean;
};

export type ValidationIssue = { path: string; message: string };

const PLACEHOLDER_TESTER = /^(|tbd|n\/a|agent|cursor|auto)$/i;
const PLACEHOLDER_DATE = /^(|YYYY-MM-DD|tbd|n\/a)$/i;
const PLACEHOLDER_SHA = /^(|tbd|n\/a|\.\.\.)$/i;
const FAKE_PASS_LINE = /FOUNDER_SMOKE:\s*PASS/i;

export function parseSmokeEvidenceFrontmatter(raw: string): SmokeEvidenceRecord | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const block = match[1];
  const get = (key: string): string | undefined => {
    const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m?.[1]?.trim().replace(/^["']|["']$/g, "");
  };
  const slicesRaw = block.match(/slices:\s*\n([\s\S]*?)(?:\n[a-z_]+:|$)/i)?.[1] ?? "";
  const slices: SmokeEvidenceSlice[] = [];
  for (const line of slicesRaw.split("\n")) {
    const sm = line.match(/^\s*-\s*id:\s*(\S+).*result:\s*(\S+)/);
    if (sm) slices.push({ id: sm[1], result: sm[2] as SmokeSliceResult });
  }
  return {
    schemaVersion: "1",
    tester: get("tester") ?? "",
    date: get("date") ?? "",
    environment: get("environment") ?? "",
    deploySha: get("deploy_sha") ?? get("deploySha") ?? "",
    slices,
    consoleErrors: get("console_errors"),
    founderSmokePass: get("founder_smoke_pass") === "true" || FAKE_PASS_LINE.test(raw),
  };
}

export function validateSmokeEvidence(
  record: SmokeEvidenceRecord,
  opts?: { allowPass?: boolean },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (record.schemaVersion !== "1") {
    issues.push({ path: "schemaVersion", message: "must be 1" });
  }
  if (PLACEHOLDER_TESTER.test(record.tester.trim())) {
    issues.push({ path: "tester", message: "tester must be a real person — not placeholder/agent" });
  }
  if (PLACEHOLDER_DATE.test(record.date.trim())) {
    issues.push({ path: "date", message: "date must be filled (ISO YYYY-MM-DD)" });
  } else if (!/^\d{4}-\d{2}-\d{2}/.test(record.date)) {
    issues.push({ path: "date", message: "date must start with YYYY-MM-DD" });
  }
  if (!record.environment) {
    issues.push({ path: "environment", message: "environment is required" });
  }
  if (PLACEHOLDER_SHA.test(record.deploySha.trim())) {
    issues.push({ path: "deploySha", message: "deploy SHA must be from /api/public-health git_commit" });
  } else if (record.deploySha.length < 7) {
    issues.push({ path: "deploySha", message: "deploy SHA too short" });
  }
  if (record.slices.length === 0) {
    issues.push({ path: "slices", message: "at least one slice result required" });
  }
  for (const s of record.slices) {
    if (!["PASS", "FAIL", "SKIP", "PENDING"].includes(s.result)) {
      issues.push({ path: `slices.${s.id}`, message: `invalid result ${s.result}` });
    }
  }
  const claimsPass =
    record.founderSmokePass === true ||
    record.slices.every((s) => s.result === "PASS" || s.result === "SKIP");
  if (claimsPass && !opts?.allowPass) {
    if (record.slices.some((s) => s.result === "PENDING" || s.result === "FAIL")) {
      issues.push({ path: "founderSmokePass", message: "cannot claim PASS with FAIL/PENDING slices" });
    }
    if (issues.length > 0) {
      issues.push({ path: "founderSmokePass", message: "cannot claim PASS with validation errors" });
    }
  }
  return issues;
}

export function docContainsFakePass(doc: string): boolean {
  if (!FAKE_PASS_LINE.test(doc)) return false;
  const record = parseSmokeEvidenceFrontmatter(doc);
  if (!record) return true;
  return validateSmokeEvidence(record).length > 0;
}
