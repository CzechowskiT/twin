import type { Metadata } from "next";

import { CalculatorB2bClient } from "@/app/(marketing)/calculator/b2b/calculator-b2b-client";

export const metadata: Metadata = {
  title: "B2B ROI calculator — TWIN",
  description:
    "B2B-oriented illustrative model: traditional agency success fees vs a TWIN-style fee structure — company savings, HR time, and candidate upside (not a commercial offer).",
};

export default function CalculatorB2BPage() {
  return <CalculatorB2bClient />;
}
