import type { ReactNode } from "react";

type MarketingPageSurfaceProps = {
  children: ReactNode;
  /** Wider max-width for dense layouts (e.g. ROI calculator). */
  wide?: boolean;
  /** When false, only the solid page band is applied — inner panels supply their own cards. */
  withCard?: boolean;
};

/**
 * Solid background band + optional high-contrast card so marketing copy stays readable
 * on top of the full-bleed nature wallpaper.
 */
export function MarketingPageSurface({ children, wide = false, withCard = true }: MarketingPageSurfaceProps) {
  const max = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <section className="bg-[var(--background)] py-10 sm:py-14 md:py-16">
      <div className={`mx-auto px-4 sm:px-6 ${max}`}>
        {withCard ? (
          <div className="rounded-[1.75rem] border-2 border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-8 shadow-[0_12px_40px_rgb(25_60_50_/0.12)] sm:px-8 sm:py-10">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
