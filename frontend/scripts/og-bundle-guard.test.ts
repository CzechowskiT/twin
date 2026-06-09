import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "src/app");

/** Imports that bloat Edge OG bundles — must not appear in opengraph/twitter image routes. */
const FORBIDDEN_IMPORTS = [
  '@/lib/i18n',
  '@/lib/i18n.ts',
  '@/lib/waitlist-messages',
  '@/lib/overlays/premium',
  '@/lib/overlays/premium/generated',
  '@/lib/overlays',
  '@/lib/faq-messages',
  '@/lib/site-messages',
] as const;

function findOgImageRoutes(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      findOgImageRoutes(full, acc);
      continue;
    }
    if (/^(opengraph|twitter)-image\.(tsx|ts|jsx|js)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

test("OG image routes avoid heavy i18n / overlay imports", () => {
  const routes = findOgImageRoutes(appDir);
  assert.ok(routes.length > 0, "expected at least one opengraph-image route");

  for (const routePath of routes) {
    const rel = routePath.slice(root.length + 1);
    const src = readFileSync(routePath, "utf8");

    for (const forbidden of FORBIDDEN_IMPORTS) {
      assert.doesNotMatch(
        src,
        new RegExp(`from\\s+["']${forbidden.replace(/\//g, "\\/")}["']`),
        `${rel} must not import ${forbidden}`,
      );
    }

    assert.match(
      src,
      /from\s+["']@\/lib\/og\//,
      `${rel} should use @/lib/og/* for locale-aware copy`,
    );
  }
});
