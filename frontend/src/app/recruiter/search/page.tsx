import { Suspense } from "react";

import RecruiterSearchClient from "./recruiter-search-client";

export default function RecruiterSearchPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <RecruiterSearchClient />
    </Suspense>
  );
}
