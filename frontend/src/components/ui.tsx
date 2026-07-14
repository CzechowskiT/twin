import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import { PageMomentumRail } from "@/components/page-momentum-rail";

type PageMomentumRailProps = ComponentProps<typeof PageMomentumRail>;

/** Two-column rail + main row (sticky left on `lg+`). Use inside `Shell` with `rail`. */
export function ShellRailLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`twin-shell-rail-layout marketing-copy-rail ${className}`.trim()}>{children}</div>
  );
}

/** Sticky stats / tips column; pairs with `ShellRailMain`. */
export function ShellRailAside({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`twin-shell-rail-aside ${className}`.trim()}>{children}</div>;
}

/** Primary pane beside `ShellRailAside` (scrolls with the page). */
export function ShellRailMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`twin-shell-rail-main ${className}`.trim()}>{children}</div>;
}

export function Shell({
  children,
  wide = false,
  /** Editorial rail: tips/CTAs; on large screens a sticky column beside main content. */
  rail = false,
  /** Passed through to `PageMomentumRail` (e.g. dashboard snapshot counts). */
  pageMomentumRailProps,
  ...rest
}: {
  children: ReactNode;
  wide?: boolean;
  rail?: boolean;
  pageMomentumRailProps?: Omit<PageMomentumRailProps, "variant">;
} & HTMLAttributes<HTMLDivElement>) {
  // Narrow (28rem) + side-by-side rail crushes the main column; full wide (80rem) stretches auth forms.
  // `twin-shell--rail` is an intermediate max width for two-column rail layouts.
  const shellWidthClass = wide ? "twin-shell--wide" : rail ? "twin-shell--rail" : "twin-shell--narrow";
  return (
    <div className={`twin-shell flex min-h-0 min-w-0 flex-1 flex-col ${shellWidthClass}`} {...rest}>
      {rail ? (
        <ShellRailLayout>
          <ShellRailAside>
            <PageMomentumRail variant="app" {...pageMomentumRailProps} />
          </ShellRailAside>
          <ShellRailMain>{children}</ShellRailMain>
        </ShellRailLayout>
      ) : (
        <div className="flex w-full min-w-0 flex-1 flex-col">
          {children}
          <PageMomentumRail />
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
  variant = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "soft" | "accent";
  id?: string;
}) {
  const variantClass =
    variant === "accent"
      ? "twin-card-panel--accent"
      : variant === "soft"
        ? "twin-card-panel--soft"
        : "";
  return (
    <div
      id={id}
      className={`twin-card-panel mb-4 scroll-mt-24 p-4 text-[var(--foreground)] sm:mb-6 sm:p-6 ${variantClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-semibold text-[var(--twin-muted-strong)]"
    >
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`twin-touch-target mb-4 w-full max-w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--twin-muted)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20 sm:text-sm ${props.className ?? ""}`}
    />
  );
}

export function Button({ type = "button", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`twin-touch-target w-full max-w-full rounded border-0 bg-[var(--twin-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--twin-on-accent)] transition hover:bg-[var(--twin-accent-hover)] hover:text-[var(--twin-on-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

export function ButtonCta({ type = "button", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`marketing-cta-filled-pill twin-touch-target w-full max-w-full rounded-full border-0 bg-[var(--twin-cta)] px-4 py-2.5 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] hover:text-[var(--twin-on-cta)] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

export function ButtonChip(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`twin-btn-chip twin-touch-target !w-auto disabled:cursor-not-allowed ${props.className ?? ""}`}
    />
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="twin-nav-link text-sm font-medium">
      {children}
    </Link>
  );
}
