import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/** OG routes stay English-only bundles — do not wire locale overlays into static metadata. */
test("first-1000 OG metadata remains static English bundle", () => {
  const src = read("src/app/(marketing)/first-1000/layout.tsx");
  assert.match(src, /First 1,000 founders/);
  assert.match(src, /founding wishlist/);
  assert.doesNotMatch(src, /dictionaries\[/);
  assert.doesNotMatch(src, /MARKETING_HOME_OVERLAYS/);
});

test("beta OG metadata remains static English bundle", () => {
  const src = read("src/app/beta/layout.tsx");
  assert.match(src, /TWIN Beta — waitlist/);
  assert.doesNotMatch(src, /dictionaries\[/);
});

test("waitlist OG image route exists and uses locale-aware waitlist messages only", () => {
  const image = read("src/app/waitlist/opengraph-image.tsx");
  const layout = read("src/app/waitlist/layout.tsx");
  assert.match(image, /WAITLIST_MESSAGES/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /\/waitlist\/opengraph-image/);
  assert.doesNotMatch(layout, /MARKETING_HOME_OVERLAYS/);
});
