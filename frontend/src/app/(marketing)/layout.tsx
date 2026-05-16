import type { Viewport } from "next";
import type { ReactNode } from "react";

export const viewport: Viewport = {
  themeColor: "#09090B",
};

/** Dark landing shell; other routes keep the default light app chrome. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="twin-marketing-root relative flex min-h-0 flex-1 flex-col text-zinc-100 antialiased">
      {children}
    </div>
  );
}
