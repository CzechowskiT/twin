#!/usr/bin/env npx tsx
/** Validate stabilization evidence file — exit 0 only when LB-106 soak criteria met. */
import { validateStabilizationEvidenceFile } from "./lib/stabilization-evidence-validator";

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: validate:stabilization-evidence <path-to-json>");
    process.exit(2);
  }
  const strictDuration = !process.argv.includes("--relaxed-duration");
  const issues = validateStabilizationEvidenceFile(path, { strictDuration });
  if (issues.length === 0) {
    console.log(`PASS: ${path}`);
    process.exit(0);
  }
  console.log(`FAIL: ${path}`);
  for (const i of issues) console.log(`  [${i.path}] ${i.message}`);
  process.exit(1);
}

main();
