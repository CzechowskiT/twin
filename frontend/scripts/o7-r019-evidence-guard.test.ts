import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));

test("verify:o7-restore-drill passes on committed evidence", () => {
  const r = spawnSync("npx", ["--yes", "tsx", join(here, "verify-o7-restore-drill.ts")], {
    cwd: join(here, ".."),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("verify:prod-delete-account-smoke exits blocked (2) without fake PASS", () => {
  const r = spawnSync("npx", ["--yes", "tsx", join(here, "verify-prod-delete-account-smoke.ts")], {
    cwd: join(here, ".."),
    encoding: "utf8",
  });
  assert.equal(r.status, 2, r.stdout + r.stderr);
});
