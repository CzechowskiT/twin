import Link from "next/link";

type MarketingSectionCtasProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

/** Standard primary + optional secondary CTAs on inner marketing pages. */
export function MarketingSectionCtas({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className = "",
}: MarketingSectionCtasProps) {
  return (
    <div className={`flex flex-wrap gap-3 pt-2 ${className}`.trim()}>
      <Link href={primaryHref} className="section-cta-primary marketing-btn-primary-shadow twin-touch-target">
        {primaryLabel}
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className="section-cta-secondary twin-touch-target">
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
