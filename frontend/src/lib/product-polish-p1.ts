/**
 * Product Polish 1.0 P1 — frontend surface controls (no route deletion).
 */

/** Thin marketing pages hidden from main footer/nav — routes stay live. */
export const HIDE_THIN_MARKETING_NAV_LINKS = true;

export const THIN_MARKETING_PATHS = ["/partners", "/careers", "/media"] as const;

export type ThinMarketingPath = (typeof THIN_MARKETING_PATHS)[number];

/** Demo CTA visible in desktop header rail; mobile uses hamburger only. */
export const MOBILE_HEADER_DEMO_IN_MENU_ONLY = true;

/** Language picker in mobile hamburger — not top bar on phones. */
export const MOBILE_HEADER_LANG_IN_MENU = true;

/** Recruiter hub shows a single recommended next action when promos are off. */
export const SHOW_RECRUITER_HUB_NEXT_ACTION = true;

/** Company dashboard leads with guided onboarding before access fields. */
export const SHOW_COMPANY_ONBOARDING_EMPTY_STATE = true;

/** Trust center home is a single overview — advanced lanes in collapsible details. */
export const TRUST_CENTER_OVERVIEW_MODE = true;

export function isThinMarketingPath(path: string): path is ThinMarketingPath {
  return (THIN_MARKETING_PATHS as readonly string[]).includes(path);
}
