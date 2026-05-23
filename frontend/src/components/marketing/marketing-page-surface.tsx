import type { ReactNode } from "react";

type MarketingPageSurfaceProps = {
  children: ReactNode;
  /** Wider max-width for dense layouts (e.g. ROI calculator). */
  wide?: boolean;
  /** When false, only the solid page band is applied — no inner content wrapper. */
  withCard?: boolean;
};

/**
 * Solid background band + optional inner wrapper so long copy reads clearly
 * without a heavy bordered “postcard” on the wallpaper.
 */
export function MarketingPageSurface({ children, wide = false, withCard = true }: MarketingPageSurfaceProps) {
  const max = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <section className="marketing-section-page py-10 sm:py-14 md:py-16">
      <div className={`mx-auto w-full px-4 sm:px-6 ${max}`}>
        {withCard ? (
          <div className="marketing-copy-rail py-1 sm:py-2">{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
