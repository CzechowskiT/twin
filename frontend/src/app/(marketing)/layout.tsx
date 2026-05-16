import type { ReactNode } from "react";

/** Marketing pages share the same shell and CSS variables as the rest of the app. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>;
}
