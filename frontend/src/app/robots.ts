import type { MetadataRoute } from "next";

/** Discourage indexing of auth, app shell, and API — complements UA filtering in `middleware.ts`. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/profile",
        "/login",
        "/register",
        "/auth/",
        "/consent/",
        "/forgot-password",
        "/reset-password",
        "/onboarding-assistant",
        "/admin",
        "/preview",
      ],
    },
  };
}
