"use client";

import dynamic from "next/dynamic";

const InvestorRoomPage = dynamic(
  () => import("@/components/investor/investor-room-page").then((m) => m.InvestorRoomPage),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse px-4 py-16 sm:px-6">
        <div className="mx-auto h-8 max-w-md rounded bg-[var(--twin-surface-soft)]" />
        <div className="mx-auto mt-4 h-4 max-w-xl rounded bg-[var(--twin-surface-soft)]" />
      </div>
    ),
  },
);

/** Canonical public investor room — honest executive view (not gated workspace tools). */
export default function InvestorRootPage() {
  return <InvestorRoomPage />;
}
