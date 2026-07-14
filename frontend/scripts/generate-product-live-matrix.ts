#!/usr/bin/env npx tsx
/**
 * Generate canonical PRODUCT_LIVE_MATRIX from all-workspace-modules-activation.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORKSPACE_MODULE_ACTIVATION,
  type WorkspaceModuleActivationEntry,
  type WorkspaceModuleActivationStatus,
} from "../src/lib/all-workspace-modules-activation";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outPath = join(repoRoot, "docs/PRODUCT_LIVE_MATRIX_2026-07-14.md");

const STATUSES: WorkspaceModuleActivationStatus[] = [
  "LIVE",
  "PILOT",
  "PREVIEW",
  "COMING_SOON",
  "PAUSED",
  "INTERNAL",
];

function repoStatus(entry: WorkspaceModuleActivationEntry): string {
  if (entry.activationStatus === "INTERNAL") return "INTERNAL";
  if (entry.green) return "LIVE";
  if (entry.activationStatus === "COMING_SOON") return "BLOCKED";
  if (entry.activationStatus === "PAUSED") return "BLOCKED";
  if (entry.gapsSummary.includes("NEEDS_FOUNDER_AUTH_SMOKE")) return "PILOT_PENDING_SMOKE";
  if (entry.activationStatus === "PREVIEW") return "PREVIEW";
  return entry.activationStatus;
}

function prodStatus(entry: WorkspaceModuleActivationEntry, repoHead: string): string {
  const base = repoStatus(entry);
  if (base === "BLOCKED" || base === "INTERNAL") return base;
  return `${base} (repo=${repoHead.slice(0, 8)})`;
}

function tableForWorkspace(
  workspace: string,
  entries: WorkspaceModuleActivationEntry[],
  repoHead: string,
): string {
  const rows = entries
    .filter((e) => e.workspace === workspace)
    .sort((a, b) => a.route.localeCompare(b.route));
  const lines = [
    `| Module | Route | Repo | Prod | Green | Visible | Next action |`,
    `|--------|-------|------|------|-------|---------|-------------|`,
  ];
  for (const e of rows) {
    lines.push(
      `| ${e.id} | ${e.route} | ${repoStatus(e)} | ${prodStatus(e, repoHead)} | ${e.green ? "yes" : "no"} | ${e.visible ? "yes" : "no"} | ${e.nextAction.replace(/\|/g, "/")} |`,
    );
  }
  return lines.join("\n");
}

function summaryCounts(entries: WorkspaceModuleActivationEntry[]): string {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    WorkspaceModuleActivationStatus,
    number
  >;
  for (const e of entries) {
    byStatus[e.activationStatus] += 1;
  }
  const green = entries.filter((e) => e.green).length;
  const visible = entries.filter((e) => e.visible).length;
  return [
    `| Metric | Count |`,
    `|--------|-------|`,
    ...STATUSES.map((s) => `| ${s} | ${byStatus[s]} |`),
    `| GREEN_WORKING | ${green} |`,
    `| Visible in hub | ${visible} |`,
    `| Total modules | ${entries.length} |`,
  ].join("\n");
}

function main(): void {
  const repoHead = process.env.REPO_HEAD ?? "9cb96e30";
  const prodFe = process.env.PROD_FE_SHA ?? "9cb96e30";
  const prodApi = process.env.PROD_API_SHA ?? "ae14bfb5";
  const dbRev = process.env.PROD_DB_REV ?? "077";
  const generatedUtc = new Date().toISOString();

  const workspaces = ["candidate", "recruiter", "company", "investor"] as const;
  const body = [
    `# PRODUCT LIVE MATRIX — 2026-07-14`,
    ``,
    `> **Canonical.** Supersedes \`PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md\` for module status tracking.`,
    `> **Stance:** Launch NO-GO · Gate F PENDING · P0 CLOSED`,
    ``,
    `## Deploy alignment`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| repo_head | ${repoHead} |`,
    `| prod_frontend_commit | ${prodFe} |`,
    `| prod_api_commit | ${prodApi} |`,
    `| db_revision | ${dbRev} |`,
    `| alignment_status | ${repoHead.startsWith(prodFe.slice(0, 8)) ? "ALIGNED" : "DRIFT"} |`,
    `| generated_utc | ${generatedUtc} |`,
    ``,
    `## Product live summary`,
    ``,
    summaryCounts([...WORKSPACE_MODULE_ACTIVATION]),
    ``,
    `## Legend`,
    ``,
    `| Status | Meaning |`,
    `|--------|---------|`,
    `| LIVE | GREEN_WORKING — smoke-verified MVP scope |`,
    `| PILOT | Visible, persistence shipped, honest pilot badge |`,
    `| PILOT_PENDING_SMOKE | Persistence shipped — founder browser smoke pending |`,
    `| PREVIEW | Read-only / invite-only shell |`,
    `| BLOCKED | COMING_SOON / PAUSED — hard-ban or not shipped |`,
    `| INTERNAL | Hidden from hub — security-sensitive |`,
    `| NOT IMPLEMENTED | No route or API — not in registry |`,
    ``,
    ...workspaces.flatMap((ws) => [
      `## ${ws.charAt(0).toUpperCase() + ws.slice(1)} workspace`,
      ``,
      tableForWorkspace(ws, [...WORKSPACE_MODULE_ACTIVATION], repoHead),
      ``,
    ]),
    `## Public marketing routes`,
    ``,
    `| Route | Status | Notes |`,
    `|-------|--------|-------|`,
    `| / | LIVE | Homepage + demo CTA |`,
    `| /demo | LIVE | Interactive walkthrough (#462) |`,
    `| /for-candidates | LIVE | Persona marketing |`,
    `| /for-recruiters | LIVE | Persona marketing |`,
    `| /for-companies | LIVE | CTAs → /company/dashboard, /company/talent-pool, /company/integrations |`,
    `| /for-investors | LIVE | Fundraising lane |`,
    `| /waitlist | LIVE | Signup form |`,
    `| /status | LIVE | Public health mirror |`,
    ``,
    `## Superseded`,
    ``,
    `- \`docs/PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md\` — module rows superseded by this matrix`,
    `- \`docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md\` — historical; see this doc for current module status`,
    ``,
    `## Source`,
    ``,
    `- Registry: \`frontend/src/lib/all-workspace-modules-activation.ts\``,
    `- Generator: \`frontend/scripts/generate-product-live-matrix.ts\``,
    ``,
  ].join("\n");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body, "utf8");
  console.log(`Wrote ${outPath}`);
}

main();
