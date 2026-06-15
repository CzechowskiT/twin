import { Suspense } from "react";

import RecruiterTalentRadarClient from "./recruiter-talent-radar-client";

export default function RecruiterTalentRadarPage() {
  return (
    <Suspense fallback={null}>
      <RecruiterTalentRadarClient />
    </Suspense>
  );
}
