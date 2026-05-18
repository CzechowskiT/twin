"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Card, Shell } from "@/components/ui";

const quotes = [
  {
    quote:
      "I stopped drowning in listings I would never book. TWIN surfaces a short list that actually respects my salary band and city.",
    name: "Product lead",
    detail: "Warsaw · B2B SaaS",
  },
  {
    quote:
      "The win is not more applications — it is fewer, better moments on the calendar. That is the only metric my team cared about.",
    name: "Engineering manager",
    detail: "Remote EU",
  },
  {
    quote:
      "We piloted with strict consent settings. Candidates arrived pre-matched; recruiters spent time on conversations, not sifting.",
    name: "Head of talent",
    detail: "Scale-up · hybrid",
  },
  {
    quote:
      "ICS export and interview holds landed in tools people already use. No forced switch to yet another calendar product.",
    name: "Operations director",
    detail: "Kraków",
  },
];

export default function TestimonialsPage() {
  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
          <h1>What teams say</h1>
          <p className="lead">
            TWIN is early; these voices describe the product intent — acceptance-ready scheduling, consent-first automation,
            and less noise for both sides. Replace with verified customer quotes as pilots graduate.
          </p>
        </article>
        <div className="not-prose mt-10 grid gap-5 sm:grid-cols-2">
          {quotes.map((q) => (
            <Card key={q.name + q.quote.slice(0, 12)} className="!p-5 sm:!p-6">
              <blockquote className="text-sm leading-relaxed text-[var(--foreground)]">&ldquo;{q.quote}&rdquo;</blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--twin-accent)]">{q.name}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{q.detail}</p>
            </Card>
          ))}
        </div>
        <p className="not-prose mt-12 text-center text-sm text-[var(--twin-muted-strong)]">
          <Link href="/companies/signup" className="twin-link font-medium">
            Company signup
          </Link>
          {" · "}
          <Link href="/compare/linkedin" className="twin-link font-medium">
            TWIN vs LinkedIn
          </Link>
          {" · "}
          <Link href="/for-candidates" className="twin-link font-medium">
            For candidates
          </Link>
        </p>
      </MarketingPageSurface>
    </Shell>
  );
}
