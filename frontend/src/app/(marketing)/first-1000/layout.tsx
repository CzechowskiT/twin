import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TWIN — First 1,000 founders · free forever",
  description:
    "A live counter of founding seats. When the last seat is claimed, we launch. Join the wishlist — the first thousand never pay for TWIN.",
  openGraph: {
    title: "TWIN — First 1,000 founders",
    description: "Live founding seats. Claim yours before the counter hits zero.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TWIN — First 1,000 founders",
    description: "Live founding seats. Claim yours before the counter hits zero.",
  },
};

export default function First1000Layout({ children }: { children: ReactNode }) {
  return children;
}
