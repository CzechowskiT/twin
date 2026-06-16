import type { Brand } from "@/lib/brand-logo-urls";

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

/** Two segments × brand count must stay within 12–18 DOM logo nodes. */
export const PERFORMANCE_SAFE_MARQUEE_SEGMENTS = 2;

export const PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES =
  PERFORMANCE_SAFE_MARQUEE_BRANDS.length * PERFORMANCE_SAFE_MARQUEE_SEGMENTS;
