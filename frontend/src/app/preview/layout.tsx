import type { ReactNode } from "react";

/**
 * Lean chrome for the public synthetic preview — no private dashboard shell.
 */
export default function PublicPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]"
      data-public-preview-layout="1"
    >
      {children}
    </div>
  );
}
