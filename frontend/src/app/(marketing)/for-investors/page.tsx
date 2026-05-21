"use client";

import { PersonaMarketingPage } from "@/components/marketing/persona-marketing-page";

export default function ForInvestorsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PersonaMarketingPage persona="investors" />
    </div>
  );
}
