/** Canonical product funnel event names (mirror backend FUNNEL_EVENTS). */

export const PRODUCT_FUNNEL_EVENTS = [
  "signup_completed",
  "onboarding_completed",
  "first_match",
  "application_created",
  "first_application",
  "calendar_connected",
  "interview_scheduled",
  "placement_declared",
  "placement_verified",
  "activation_ttv_matches_view",
  "activation_matching_eligible",
  "activation_matching_not_eligible",
  "activation_matching_dispatched",
  "activation_matching_started",
  "activation_matching_completed",
  "activation_matching_failed",
  "activation_first_match_created",
] as const;

export type ProductFunnelEventName = (typeof PRODUCT_FUNNEL_EVENTS)[number];

export function isProductFunnelEvent(name: string): name is ProductFunnelEventName {
  return (PRODUCT_FUNNEL_EVENTS as readonly string[]).includes(name);
}
