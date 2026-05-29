import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TWIN — First 1,000 founders · founding wishlist",
  description:
    "Live founding-seat counter. Free wishlist signup — no card. Ranked pipeline, honest application statuses, ~30 source adapters today.",
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
