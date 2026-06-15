import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resolveDeployCommitFromEnv } from "../src/lib/deploy-commit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSrc = readFileSync(
  join(__dirname, "../src/app/api/public-health/route.ts"),
  "utf8",
);

test("resolveDeployCommitFromEnv prefers VERCEL_GIT_COMMIT_SHA", () => {
  const sha = resolveDeployCommitFromEnv({
    VERCEL_GIT_COMMIT_SHA: "0c8a44daebd1b825bdc550233ed35874a47b69ea",
    RAILWAY_GIT_COMMIT_SHA: "de2df4981678cc466024d27c4c7c86e64af6dcc2",
  });
  assert.equal(sha, "0c8a44daebd1b825bdc550233ed35874a47b69ea");
});

test("resolveDeployCommitFromEnv returns null when unset", () => {
  assert.equal(resolveDeployCommitFromEnv({}), null);
});

test("public-health route exposes frontend_commit and api_commit", () => {
  assert.match(routeSrc, /frontend_commit/);
  assert.match(routeSrc, /api_commit/);
  assert.match(routeSrc, /resolveDeployCommitFromEnv/);
});
