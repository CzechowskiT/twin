import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { en, dictionaries, LOCALES } from "../src/lib/i18n";
import { githubDocHref, INVESTOR_DATA_ROOM_PUBLIC_DOCS, INVESTOR_DATA_ROOM_ROUTE, TWIN_GITHUB_REPO } from "../src/lib/investor-data-room-request-access";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function read(p: string){return readFileSync(join(root,p),"utf8");}
test("route",()=>{assert.equal(INVESTOR_DATA_ROOM_ROUTE,"/investor/data-room");assert.ok(read("src/app/investor/data-room/page.tsx").includes("investorDataRoom.title"));});
test("panel",()=>{const panel=read("src/components/investor/investor-data-room-panel.tsx");assert.ok(panel.includes("INVESTOR_DATA_ROOM_VISUAL_MARKERS.requestAccessCta"));assert.doesNotMatch(panel,/apiFetch/);});
test("github",()=>{for(const d of INVESTOR_DATA_ROOM_PUBLIC_DOCS){assert.ok(githubDocHref(d.path).startsWith(`${TWIN_GITHUB_REPO}/blob/main/docs/`));}});
test("locales",()=>{for(const l of LOCALES){const s=dictionaries[l].investorDataRoom;assert.ok(s?.title&&s.requestAccessCta&&s.transparencyBody,l);}});
test("traction",()=>{const blob=JSON.stringify(en.investorDataRoom);assert.doesNotMatch(blob,/\\braising\\b/i);});
console.log("investor-data-room-request-access: ok");
