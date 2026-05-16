import type { Metadata } from "next";

import { TwinRoiCalculator } from "@/components/marketing/twin-roi-calculator";

export const metadata: Metadata = {
  title: "ROI calculator — TWIN",
  description:
    "Illustrative comparison of traditional agency success fees vs a TWIN-style fee model — company savings and candidate upside (not a commercial offer).",
};

export default function CalculatorPage() {
  return <TwinRoiCalculator />;
}
