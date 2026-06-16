"use client";

import dynamic from "next/dynamic";

const TwinRoiCalculator = dynamic(
  () => import("@/components/marketing/twin-roi-calculator").then((m) => m.TwinRoiCalculator),
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

export function CalculatorB2bClient() {
  return <TwinRoiCalculator />;
}
