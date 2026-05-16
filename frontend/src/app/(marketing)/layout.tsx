import type { ReactNode } from "react";

/** Dark landing shell; other routes keep the default light app chrome. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="twin-marketing-root relative flex flex-1 flex-col">{children}</div>;
}
