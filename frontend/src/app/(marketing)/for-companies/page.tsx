"use client";

import Link from "next/link";

import { PersonaMarketingPage } from "@/components/marketing/persona-marketing-page";

export default function ForCompaniesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PersonaMarketingPage persona="companies" />
      <section className="border-t border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/25 py-10 text-center sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm text-[var(--twin-muted-strong)]">
            <Link href="/companies/signup" className="twin-link font-semibold text-[var(--foreground)]">
              Company signup
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/testimonials" className="twin-link font-semibold text-[var(--foreground)]">
              Testimonials
            </Link>
            <span className="mx-2 text-[var(--twin-border)]">·</span>
            <Link href="/compare/agencies" className="twin-link font-semibold text-[var(--foreground)]">
              TWIN vs agencies
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
