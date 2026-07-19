import type { ReactNode } from "react";

/**
 * Dedicated admin shell: solid readable surface, no marketing ambient wallpaper.
 * SiteChrome skips ambient for `/admin/*` via performance-route classification.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="twin-admin-surface min-h-[100dvh] w-full bg-[var(--background)] text-[var(--foreground)]">
      {children}
    </div>
  );
}
