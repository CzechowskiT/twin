import type { ReactNode } from "react";

import { RegisterLayoutClient } from "@/app/register/register-layout-client";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <RegisterLayoutClient>{children}</RegisterLayoutClient>;
}
