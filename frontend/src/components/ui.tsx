import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Shell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full min-w-0 flex-col ${wide ? "max-w-5xl" : "max-w-md"}`}
      style={{
        paddingInline: "var(--twin-page-x)",
        paddingBlock: "var(--twin-page-y)",
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`twin-card-panel mb-4 p-4 text-[var(--foreground)] sm:mb-6 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-[var(--twin-muted-strong)]">
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

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`twin-touch-target w-full max-w-full rounded border-0 bg-[var(--twin-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--twin-accent-hover)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function ButtonCta(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`twin-touch-target w-full max-w-full rounded border-0 bg-[var(--twin-cta)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--twin-cta-hover)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
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
