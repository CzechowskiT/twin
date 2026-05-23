"use client";

import type { ReactNode } from "react";

export function EmployerTabSection({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-4">
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">{eyebrow}</p>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">{title}</h3>
        {lead ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
