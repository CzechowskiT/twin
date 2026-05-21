import { Suspense } from "react";

import RecruiterInboxClient from "./recruiter-inbox-client";

export default function RecruiterInboxPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">Loading…</p>}>
      <RecruiterInboxClient />
    </Suspense>
  );
}
