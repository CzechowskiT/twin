import type { Metadata } from "next";

import { TwinRoiCalculator } from "@/components/marketing/twin-roi-calculator";

export const metadata: Metadata = {
  title: "B2B ROI calculator — TWIN",
  description:
    "B2B-oriented illustrative model: traditional agency success fees vs a TWIN-style fee structure — company savings, HR time, and candidate upside (not a commercial offer).",
};

export default function CalculatorPage() {
  return <TwinRoiCalculator />;
}
