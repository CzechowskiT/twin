/**
 * Edge-safe heuristics to cut obvious automated abuse (vuln scanners, mass crawlers).
 * Major search / link-preview crawlers are allow-listed.
 *
 * - `TWIN_ALLOW_SEO_CRAWLERS=true` — allow Ahrefs, Semrush, Common Crawl, etc.
 * - `TWIN_BLOCK_SCRIPT_HTTP_UAS=true` — also block generic script UAs (curl, python-requests,
 *   headless Chrome, …). **Off by default** — breaks uptime checks and local tooling.
 */

const SEO_CRAWLERS_ALLOWED = process.env.TWIN_ALLOW_SEO_CRAWLERS === "true";
const SCRIPT_HTTP_UAS_BLOCKED = process.env.TWIN_BLOCK_SCRIPT_HTTP_UAS === "true";

const CRAWLER_ALLOW_SUBSTRINGS = [
  "googlebot",
  "google-inspectiontool",
  "chrome-lighthouse",
  "bingbot",
  "msnbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "pinterest",
  "embedly",
  "vkshare",
  "outbrain",
  "flipboard",
  "tumblr",
  "redditbot",
  "snapchat",
  "opengraph",
] as const;

const SEO_SCRAPER_SUBSTRINGS = [
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
  "petalbot",
  "bytespider",
  "amazonbot",
  "ccbot",
  "dataforseo",
  "blexbot",
  "serpstatbot",
  "sistrix",
  "screaming frog",
  "screamingfrog",
] as const;

const SCANNER_OR_ABUSE_SUBSTRINGS = [
  "sqlmap",
  "nikto",
  "nessus",
  "openvas",
  "acunetix",
  "w3af",
  "dirbuster",
  "gobuster",
  "wfuzz",
  "nuclei",
  "masscan",
  "zgrab",
  "zmap",
  "shodan",
  "censys",
  "internetmeasurement",
  "netsystemsresearch",
  "netcraft",
  "l9tcpid",
  "l9explore",
  "scrapy",
  "xenu link sleuth",
] as const;

/** Only when TWIN_BLOCK_SCRIPT_HTTP_UAS=true — high false-positive risk. */
const GENERIC_SCRIPT_UA_SUBSTRINGS = [
  "wget/",
  "curl/",
  "libcurl",
  "python-requests/",
  "aiohttp/",
  "go-http-client",
  "axios/",
  "urllib",
  "java/",
  "httpclient",
  "phantomjs",
  "headlesschrome",
  "selenium",
  "puppeteer",
  "playwright",
  "mechanize",
  "libwww-perl",
] as const;

function normalizeUa(ua: string | null): string {
  return (ua ?? "").toLowerCase();
}

export function isAllowedSearchOrPreviewBot(uaLower: string): boolean {
  return CRAWLER_ALLOW_SUBSTRINGS.some((s) => uaLower.includes(s));
}

export function shouldBlockLikelyBot(userAgent: string | null): boolean {
  const ua = normalizeUa(userAgent);
  if (!ua.trim()) {
    return false;
  }
  if (isAllowedSearchOrPreviewBot(ua)) {
    return false;
  }
  if (SCANNER_OR_ABUSE_SUBSTRINGS.some((s) => ua.includes(s))) {
    return true;
  }
  if (SCRIPT_HTTP_UAS_BLOCKED && GENERIC_SCRIPT_UA_SUBSTRINGS.some((s) => ua.includes(s))) {
    return true;
  }
  if (!SEO_CRAWLERS_ALLOWED && SEO_SCRAPER_SUBSTRINGS.some((s) => ua.includes(s))) {
    return true;
  }
  return false;
}
