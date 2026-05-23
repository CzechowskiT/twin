"use client";

import { useWaitlistCopy } from "@/lib/waitlist/use-waitlist-copy";

type Variant = "hero" | "compact" | "inline" | "waitlist";

/** Founding offer badge + benefit pills — shared by `/` hero and `/waitlist`. */
export function FoundingOfferPreview({ variant = "hero" }: { variant?: Variant }) {
  const copy = useWaitlistCopy();
  const isCompact = variant === "compact";
  const isInline = variant === "inline";
  const isWaitlist = variant === "waitlist";

  if (isInline) {
    return (
      <ul className="marketing-founding-value-strip" aria-label={copy.heroOfferBadge}>
        {copy.valueStrip.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }

  if (isWaitlist) {
    return (
      <>
        <p className="wl-hero-badge">{copy.heroOfferBadge}</p>
        <p className="wl-hero-offer-sub">{copy.heroOfferSub}</p>
        <ul className="wl-value-strip" aria-label={copy.heroOfferBadge}>
          {copy.valueStrip.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div
      className={
        isCompact
          ? "marketing-founding-offer marketing-founding-offer--compact"
          : "marketing-founding-offer"
      }
    >
      <p className="marketing-founding-badge">{copy.heroOfferBadge}</p>
      {!isCompact ? <p className="marketing-founding-offer-sub">{copy.heroOfferSub}</p> : null}
      <ul className="marketing-founding-value-strip" aria-label={copy.heroOfferBadge}>
        {copy.valueStrip.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
