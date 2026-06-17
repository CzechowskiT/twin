import type { Brand } from "@/lib/brand-logo-urls";
import { PERFORMANCE_SAFE_CURATED_LOGO_SLUGS } from "@/lib/performance-safe-curated-logos";

/**
 * Compact marquee subset for workspace/auth — kept separate from the 89-brand
 * marketing array so light chrome never eagerly pulls the full logo catalog.
 */
export const PERFORMANCE_SAFE_MARQUEE_BRANDS: Brand[] = [
  { slug: "apple", name: "Apple", domain: "apple.com" },
  { slug: "microsoft", name: "Microsoft", domain: "microsoft.com" },
  { slug: "google", name: "Google", domain: "google.com" },
  { slug: "amazon", name: "Amazon", domain: "amazon.com" },
  { slug: "nvidia", name: "NVIDIA", domain: "nvidia.com" },
  { slug: "meta", name: "Meta", domain: "meta.com" },
  { slug: "visa", name: "Visa", domain: "visa.com" },
  { slug: "salesforce", name: "Salesforce", domain: "salesforce.com" },
  { slug: "netflix", name: "Netflix", domain: "netflix.com" },
];

/** Three identical segments for ultrawide seamless loop (9×3=27 nodes). */
export const PERFORMANCE_SAFE_MARQUEE_SEGMENTS = 3;

export const PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES =
  PERFORMANCE_SAFE_MARQUEE_BRANDS.length * PERFORMANCE_SAFE_MARQUEE_SEGMENTS;

/** Hard ceiling for light chrome — never exceed 30 logo nodes. */
export const PERFORMANCE_SAFE_MARQUEE_HARD_MAX_DOM_NODES = 30;

/** CSS translate fraction: exactly one segment width per animation cycle. */
export const PERFORMANCE_SAFE_MARQUEE_LOOP_TRANSLATE_PERCENT =
  100 / PERFORMANCE_SAFE_MARQUEE_SEGMENTS;

/** Every curated subset slug must have a self-hosted wordmark SVG. */
export const PERFORMANCE_SAFE_MARQUEE_CURATED_SLUGS = PERFORMANCE_SAFE_CURATED_LOGO_SLUGS;
