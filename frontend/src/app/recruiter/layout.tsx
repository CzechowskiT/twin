import type { ReactNode } from "react";

import { RecruiterLayoutClient } from "@/app/recruiter/recruiter-layout-client";

export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <RecruiterLayoutClient>{children}</RecruiterLayoutClient>;
}
