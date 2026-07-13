import assert from "node:assert/strict";
import test from "node:test";

import { buildProbeUrls } from "./prod-public-probe-suite";

test("buildProbeUrls exceeds 100 probes at default repeat factor", () => {
  const urls = buildProbeUrls(5);
  assert.ok(urls.length >= 100, `expected >=100 probes, got ${urls.length}`);
});

test("buildProbeUrls only uses public GET paths", () => {
  const urls = buildProbeUrls(1);
  for (const url of urls) {
    assert.ok(url.startsWith("https://"));
    assert.ok(!url.includes("delete"), `mutation path leaked: ${url}`);
  }
});
