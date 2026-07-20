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
] as const;

export type ProductFunnelEventName = (typeof PRODUCT_FUNNEL_EVENTS)[number];

export function isProductFunnelEvent(name: string): name is ProductFunnelEventName {
  return (PRODUCT_FUNNEL_EVENTS as readonly string[]).includes(name);
}
