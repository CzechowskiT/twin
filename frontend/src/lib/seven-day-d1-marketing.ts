/**
 * Seven-day D1 marketing slice — public honesty on homepage, for-* pages, thin routes, social proof.
 * Frontend/UI only; builds on Product Polish P1 (thin pages) and P4 (logo + illustrative proof).
 */

export {
  FOOTER_SOCIAL_PROOF_ILLUSTRATIVE_LABELS,
  MARK_ILLUSTRATIVE_SOCIAL_PROOF,
  SUBTLE_MARQUEE_LOGO_DISCLAIMER,
} from "@/lib/product-polish-p4";
export { HIDE_THIN_MARKETING_NAV_LINKS, THIN_MARKETING_PATHS } from "@/lib/product-polish-p1";

/** Homepage primary funnel — waitlist pill; register stays a text link. */
export const HOMEPAGE_PRIMARY_CTA_HREF = "/waitlist";

/** Header keeps dedicated Demo CTA on the account rail. */
export const HEADER_DEMO_CTA_HREF = "/demo";
