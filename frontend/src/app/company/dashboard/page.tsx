import { Suspense } from "react";

import CompanyDashboardClient from "./company-dashboard-client";

export default function CompanyDashboardPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <CompanyDashboardClient />
    </Suspense>
  );
}
