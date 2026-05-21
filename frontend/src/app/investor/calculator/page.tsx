import type { Metadata } from "next";

import { InvestorCalculator } from "@/components/marketing/investor-calculator";

export const metadata: Metadata = {
  title: "Investor calculator — TWIN",
  description:
    "Illustrative investor model: subscriptions, success-fee economics, team and infrastructure costs — internal scenario tool.",
};

export default function InvestorCalculatorPage() {
  return <InvestorCalculator />;
}
