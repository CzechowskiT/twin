#!/usr/bin/env node
/**
 * TWIN Agent Dispatcher CLI — no API keys on argv.
 * Auth: AGENT_DISPATCH_TOKEN or TWIN_AGENT_DISPATCH_TOKEN from env.
 * Base: TWIN_API_BASE_URL (default http://localhost:8000)
 *
 * Usage:
 *   node scripts/twin-agent-dispatch.mjs dispatch --prompt-file ./prompt.md
 *   node scripts/twin-agent-dispatch.mjs status <runId>
 *   node scripts/twin-agent-dispatch.mjs wait <runId>
 *   node scripts/twin-agent-dispatch.mjs cancel <runId>
 *   node scripts/twin-agent-dispatch.mjs report <runId>
 *   node scripts/twin-agent-dispatch.mjs canary
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE = (process.env.TWIN_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN =
  process.env.AGENT_DISPATCH_TOKEN ||
  process.env.TWIN_AGENT_DISPATCH_TOKEN ||
  "";

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function authHeaders() {
  if (!TOKEN) {
    die(
      "Set AGENT_DISPATCH_TOKEN (or TWIN_AGENT_DISPATCH_TOKEN) in the environment. Do not pass API keys on the CLI.",
    );
  }
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function api(method, p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    die(`HTTP ${res.status}: ${JSON.stringify(data)}`, 2);
  }
  return data;
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function cmdDispatch() {
  const promptFile = argValue("--prompt-file");
  const promptInline = argValue("--prompt");
  let prompt = promptInline || "";
  if (promptFile) {
    prompt = fs.readFileSync(path.resolve(promptFile), "utf8");
  }
  if (!prompt.trim()) die("Provide --prompt or --prompt-file");

  const repository_url =
    argValue("--repo") ||
    process.env.TWIN_AGENT_DISPATCH_REPO ||
    "https://github.com/CzechowskiT/twin";
  const base_branch =
    argValue("--base") ||
    process.env.TWIN_AGENT_DISPATCH_BASE ||
    "cursor/phase1-monorepo-scaffold";
  const idempotency_key = argValue("--idempotency-key") || undefined;
  const model_id = argValue("--model") || undefined;
  const dispatch_now = !hasFlag("--no-dispatch");

  const data = await api("POST", "/api/internal/agent-dispatch/runs", {
    prompt,
    repository_url,
    base_branch,
    auto_create_pr: !hasFlag("--no-pr"),
    model_id,
    idempotency_key,
    dispatch_now,
  });
  console.log(JSON.stringify(data, null, 2));
}

async function cmdStatus(runId) {
  if (!runId) die("usage: status <runId>");
  const refresh = hasFlag("--refresh") ? "?refresh=true" : "";
  const data = await api("GET", `/api/internal/agent-dispatch/runs/${runId}${refresh}`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdWait(runId) {
  if (!runId) die("usage: wait <runId>");
  const terminal = new Set([
    "succeeded",
    "failed",
    "timed_out",
    "cancelled",
    "needs_attention",
  ]);
  const timeoutMs = Number(argValue("--timeout-ms") || 3_600_000);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await api(
      "GET",
      `/api/internal/agent-dispatch/runs/${runId}?refresh=true`,
    );
    process.stderr.write(`status=${data.status}\n`);
    if (terminal.has(data.status)) {
      console.log(JSON.stringify(data, null, 2));
      process.exit(data.status === "succeeded" ? 0 : 3);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  die("wait timed out", 4);
}

async function cmdCancel(runId) {
  if (!runId) die("usage: cancel <runId>");
  const data = await api("POST", `/api/internal/agent-dispatch/runs/${runId}/cancel`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdReport(runId) {
  if (!runId) die("usage: report <runId>");
  const data = await api("GET", `/api/internal/agent-dispatch/runs/${runId}/report`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdCanary() {
  const data = await api("GET", "/api/internal/agent-dispatch/canary");
  console.log(JSON.stringify(data, null, 2));
  if (data.status === "BLOCKED") process.exit(5);
  if (data.status !== "OK") process.exit(6);
}

async function main() {
  const cmd = process.argv[2];
  const runId = process.argv[3];
  switch (cmd) {
    case "dispatch":
      return cmdDispatch();
    case "status":
      return cmdStatus(runId);
    case "wait":
      return cmdWait(runId);
    case "cancel":
      return cmdCancel(runId);
    case "report":
      return cmdReport(runId);
    case "canary":
      return cmdCanary();
    case "health": {
      const res = await fetch(`${BASE}/api/internal/agent-dispatch/health`);
      console.log(await res.text());
      return;
    }
    default:
      die(
        "commands: dispatch | status | wait | cancel | report | canary | health",
      );
  }
}

main().catch((err) => die(String(err)));
