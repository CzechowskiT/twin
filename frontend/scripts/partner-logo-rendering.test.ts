/**
 * Static guard for the partner/company logo chip renderers — locks in the
 * NVIDIA rendering fix (was a lone cropped green line + text) and protects
 * the general chip contract (no missing `<img>` src, no overflow clipping,
 * no unofficial/AI-generated assets, frontend-only scope).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const MARK_FILE = "src/components/marketing/performance-safe-logo-mark.tsx";
const MOVING_MARQUEE_FILE = "src/components/marketing/performance-safe-moving-logo-marquee.tsx";
const CURATED_LOGOS_FILE = "src/lib/performance-safe-curated-logos.ts";
const SAFE_COMPANY_LOGO_FILE = "src/components/marketing/safe-company-logo.tsx";
const COMPANY_MARQUEE_FILE = "src/components/marketing/company-logo-marquee.tsx";

/** Mark viewBox is fixed at `0 0 88 16` — content must stay inside these bounds. */
const VIEWBOX_WIDTH = 88;
const VIEWBOX_HEIGHT = 16;

function extractCaseBlock(source: string, caseName: string): string {
  const re = new RegExp(`case "${caseName}":([\\s\\S]*?)case "|case "${caseName}":([\\s\\S]*?)default:`);
  const match = source.match(re);
  const block = match?.[1] ?? match?.[2];
  assert.ok(block, `expected a "case \"${caseName}\":" block in ${MARK_FILE}`);
  return block as string;
}

test("1 nvidia renders a readable NVIDIA text label, not just a mark", () => {
  const mark = read(MARK_FILE);
  const nvidiaCase = extractCaseBlock(mark, "nvidia");
  assert.match(nvidiaCase, />\s*NVIDIA\s*</, "nvidia case must render literal NVIDIA text");
  assert.match(nvidiaCase, /fontWeight=\{700\}/);
});

test("2 nvidia is text-only — no pseudo-icon/accent shape (no thin cropped line)", () => {
  const mark = read(MARK_FILE);
  assert.doesNotMatch(mark, /NvidiaAccent/);
  const nvidiaCase = extractCaseBlock(mark, "nvidia");
  assert.doesNotMatch(nvidiaCase, /<rect/);
  assert.doesNotMatch(nvidiaCase, /<path/);
  assert.doesNotMatch(nvidiaCase, /<g\s/);
  assert.match(nvidiaCase, /<text/);
  assert.match(nvidiaCase, />\s*NVIDIA\s*</);
});

test("3 nvidia text wordmark stays inside the mark viewBox (no overflow clipping)", () => {
  const mark = read(MARK_FILE);
  const nvidiaCase = extractCaseBlock(mark, "nvidia");
  const textMatch = nvidiaCase.match(/<text[^>]*x=\{([0-9.]+)\}[^>]*y=\{([0-9.]+)\}/);
  assert.ok(textMatch, "nvidia case must position text with x/y inside viewBox");
  const x = Number(textMatch![1]);
  const y = Number(textMatch![2]);
  assert.ok(x >= 0 && x <= VIEWBOX_WIDTH, `text x=${x} must be within viewBox width ${VIEWBOX_WIDTH}`);
  assert.ok(y >= 0 && y <= VIEWBOX_HEIGHT, `text y=${y} must be within viewBox height ${VIEWBOX_HEIGHT}`);
});

test("4 nvidia has a non-empty aria label and verified-curated quality status", () => {
  const curated = read(CURATED_LOGOS_FILE);
  const nvidiaBlockMatch = curated.match(/nvidia:\s*\{([\s\S]*?)\},/);
  assert.ok(nvidiaBlockMatch, "expected an nvidia entry in PERFORMANCE_SAFE_CURATED_LOGO_VISUALS");
  const block = nvidiaBlockMatch![1];
  assert.match(block, /ariaLabel:\s*"NVIDIA"/);
  assert.match(block, /qualityStatus:\s*"verified-curated"/);
});

test("5 mark renderer never emits <img> — inline vector/text only, no broken src risk", () => {
  const mark = read(MARK_FILE);
  assert.doesNotMatch(mark, /<img/);
});

test("6 SafeCompanyLogo (full marquee) never renders an <img> with a missing/empty src", () => {
  const safe = read(SAFE_COMPANY_LOGO_FILE);
  assert.match(safe, /const src = exhausted \? undefined : urls\[step\]/);
  assert.match(safe, /showImg = Boolean\(src\) && !imgBroken/);
  assert.match(safe, /\{showImg && src \?/, "img must only render when a resolved, non-empty src exists");
  assert.doesNotMatch(safe, /src=""/);
});

test("7 chip card has fixed box + centering classes so content cannot overflow or clip", () => {
  const marquee = read(MOVING_MARQUEE_FILE);
  assert.match(marquee, /MARK_CARD_CLASS\s*=\s*PARTNER_LOGO_CARD_CLASS/);
  assert.match(marquee, /from "@\/lib\/partner-logo-styles"/);
  const css = read("src/app/globals.css");
  assert.match(css, /\.partner-logo-card\s*\{[\s\S]{0,200}min-height:/);
  assert.match(marquee, /items-center justify-center rounded-md/);
  assert.match(marquee, /relative flex shrink-0 items-center justify-center/);
});

test("8 mark svg keeps a fixed height and bounded width so the plate never reshapes per brand", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.performance-safe-logo-mark\s*\{[\s\S]{0,300}\}/);
  const ruleMatch = css.match(/\.performance-safe-logo-mark\s*\{([\s\S]{0,300}?)\}/);
  assert.ok(ruleMatch, ".performance-safe-logo-mark rule must exist");
  const rule = ruleMatch![1];
  assert.match(rule, /height:\s*1\.75rem/, "fixed height prevents vertical layout shift");
  assert.match(rule, /width:\s*(100%|[\d.]+rem)/, "width must be explicitly bounded, not auto");
  assert.match(rule, /flex-shrink:\s*0/, "must not get squeezed by flex siblings");
});

test("9 no new NVIDIA raster/vector asset file added — inline text/vector fix only", () => {
  const mark = read(MARK_FILE);
  assert.doesNotMatch(mark, /nvidia[-_].*\.(png|jpg|jpeg|svg|webp)/i);
  assert.doesNotMatch(mark, /generated|midjourney|dall-?e|stable-?diffusion/i);
});

test("10 fix stays inside frontend marketing/logo files — no backend/api/auth/db footprint", () => {
  const touched = [MARK_FILE, CURATED_LOGOS_FILE].map(read).join("\n");
  assert.doesNotMatch(touched, /\/api\//);
  assert.doesNotMatch(touched, /fetch\(/);
  assert.doesNotMatch(touched, /process\.env/);
  assert.doesNotMatch(touched, /prisma|drizzle|supabase|postgres|DATABASE_URL/i);
  assert.doesNotMatch(touched, /getServerSession|next-auth|jwt|bcrypt/i);
});

test("11 other curated brand chips are untouched by the nvidia fix (still render their wordmarks)", () => {
  const mark = read(MARK_FILE);
  for (const [slug, label] of [
    ["apple", "Apple"],
    ["microsoft", "Microsoft"],
    ["amazon", "amazon"],
    ["meta", "Meta"],
    ["visa", "VISA"],
    ["salesforce", "salesforce"],
    ["netflix", "NETFLIX"],
  ] as const) {
    const block = extractCaseBlock(mark, slug);
    assert.match(block, new RegExp(`>\\s*${label}\\s*<`), `${slug} wordmark text preserved`);
  }
});

test("12 company-logo-marquee (public marketing rail) still uses SafeCompanyLogo, not a raw <img>", () => {
  const companyMarquee = read(COMPANY_MARQUEE_FILE);
  assert.match(companyMarquee, /SafeCompanyLogo/);
  assert.match(companyMarquee, /getPublicMarqueeLogos/);
  assert.doesNotMatch(companyMarquee, /<img/);
});
