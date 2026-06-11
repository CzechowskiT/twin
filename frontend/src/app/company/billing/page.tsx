import { Suspense } from "react";

import CompanyBillingClient from "./company-billing-client";

export default function CompanyBillingPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <CompanyBillingClient />
    </Suspense>
  );
}
