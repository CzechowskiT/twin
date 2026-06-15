import { Suspense } from "react";

import CompanyTalentPoolClient from "./company-talent-pool-client";

export default function CompanyTalentPoolPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <CompanyTalentPoolClient />
    </Suspense>
  );
}
