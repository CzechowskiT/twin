"use client";

import { useEffect } from "react";

import { setupAnalyticsListeners } from "@/lib/analytics";

/** Wires cookie-consent-gated Plausible/PostHog once per session. */
export function AnalyticsInit() {
  useEffect(() => setupAnalyticsListeners(), []);
  return null;
}
