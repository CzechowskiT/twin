import type { Metadata } from "next";

import { InvestorCalculator } from "@/components/marketing/investor-calculator";

export const metadata: Metadata = {
  title: "Investor calculator — TWIN",
  description:
    "Illustrative investor model: subscriptions, success-fee economics, team and infrastructure costs, referral incentives, break-even and five-year projection — not disclosed actuals or investment advice.",
};

export default function CalculatorPage() {
  return <InvestorCalculator />;
}
