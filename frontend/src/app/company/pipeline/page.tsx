import { Suspense } from "react";

import CompanyPipelineClient from "./company-pipeline-client";

export default function CompanyPipelinePage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <CompanyPipelineClient />
    </Suspense>
  );
}
