/**
 * Epic 2.20 — FE guard: Access Center in Settings/Privacy, no 8th primary nav.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ia = read("src/lib/candidate-ia.ts");
const primary = ia.split("CANDIDATE_SECONDARY_IA")[0];
assert.equal((primary.match(/href:/g) || []).length, 7, "primary IA must stay 7");

const page = read("src/app/dashboard/settings/access/page.tsx");
assert.match(page, /AccessControlCenterWorkspace/);

const ws = read("src/components/candidate/access-control-center-workspace.tsx");
assert.match(ws, /data-access-control-center/);
assert.match(ws, /access-inventory/);
assert.match(ws, /connected_services/);
assert.match(ws, /private_links_and_feeds/);
assert.match(ws, /temporary_files/);
assert.doesNotMatch(ws, /recipient_activity|urgency|score/);
assert.doesNotMatch(ws, /#key=|share_url_once|Bearer /);

const privacy = read("src/app/dashboard/privacy-center/page.tsx");
assert.match(privacy, /settings\/access/);
assert.match(privacy, /data-access-center-link/);

const msgs = read("src/lib/access-center-messages.ts");
assert.match(msgs, /ACCESS_CENTER_MESSAGES_EN/);
assert.match(msgs, /ACCESS_CENTER_MESSAGES_PL/);

console.log("epic-220-access-control-guard: ok");
