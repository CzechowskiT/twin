import type { ReactNode } from "react";

import { LoginLayoutClient } from "@/app/login/login-layout-client";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <LoginLayoutClient>{children}</LoginLayoutClient>;
}
