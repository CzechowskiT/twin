import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Career Pack",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
  referrer: "no-referrer",
};

export default function ShareCareerPackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
