import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { BOARD_PERSISTENCE_SHIPPED_MARKER } from "../src/lib/board-persistence-state";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BOARD_ROUTES = [
  "src/components/board/board-implementation-tracker-workspace.tsx",
  "src/components/board/first-working-persistence-plan-workspace.tsx",
  "src/components/board/working-data-readiness-workspace.tsx",
  "src/components/board/working-features-readiness-workspace.tsx",
] as const;

test("1 all four board routes include shipped/blocked sections", () => {
  for (const rel of BOARD_ROUTES) {
    const ws = readFileSync(join(root, rel), "utf8");
    assert.match(ws, /BoardPersistenceStateSections/);
    assert.match(ws, /boardPersistenceState\.shippedTitle/);
  }
});

test("2 shipped marker constant", () => {
  assert.equal(BOARD_PERSISTENCE_SHIPPED_MARKER, "board-persistence-shipped-state");
});

test("3 i18n EN and PL", () => {
  assert.ok(en.boardPersistenceState.shippedVisibilityPreferences);
  assert.ok(dictionaries.pl.boardPersistenceState.blockedPublicLaunch);
});
