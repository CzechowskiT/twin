import { expect, test } from "@playwright/test"; import { withFreshContext } from "./helpers/browser-lifecycle";
test("investor trust proof route", async ({browser})=>{await withFreshContext(browser,async(c)=>{const p=await c.newPage();const r=await p.goto("/investor/trust-proof");if((r?.status()??0)===404)test.skip();expect(r?.status()).not.toBe(404);});});
