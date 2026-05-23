import type { ReactNode } from "react";

type MarketingPageHeaderProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  className?: string;
};

/** Consistent mint eyebrow + gradient h1 for inner marketing pages. */
export function MarketingPageHeader({ eyebrow, title, lead, children, className = "" }: MarketingPageHeaderProps) {
  return (
    <header className={`marketing-section-page space-y-4 text-start ${className}`.trim()}>
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">{eyebrow}</p>
      ) : null}
      <h1 className="marketing-gradient-heading max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
        {title}
      </h1>
      {lead ? <p className="max-w-2xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{lead}</p> : null}
      {children}
    </header>
  );
}
