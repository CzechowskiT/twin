#!/usr/bin/env node
/**
 * Start Next standalone with static assets — required for Playwright after `output: standalone` builds.
 */
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next/standalone");
const serverEntry = join(standalone, "server.js");

if (!existsSync(serverEntry)) {
  console.error("Missing .next/standalone/server.js — run `npm run build` first.");
  process.exit(1);
}

cpSync(join(root, ".next/static"), join(standalone, ".next/static"), { recursive: true });
cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });

const port = process.env.PORT ?? "3000";
const child = spawn("node", ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1" },
});

child.on("exit", (code) => process.exit(code ?? 1));
