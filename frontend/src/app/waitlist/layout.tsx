import type { Metadata } from "next";

import "./waitlist.css";

function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return new URL(explicit.replace(/\/$/, ""));
  const v = process.env.VERCEL_URL?.trim();
  if (v) return new URL(`https://${v.replace(/\/$/, "")}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "TWIN Wishlist — join the first 1,000",
  description:
    "Your digital twin takes over job search. Join the waitlist — free lifetime access for early adopters.",
  openGraph: {
    title: "TWIN — stop chasing job boards",
    description: "Developer waitlist. No CVs. Interview invites on your calendar.",
    type: "website",
    url: "/waitlist",
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
