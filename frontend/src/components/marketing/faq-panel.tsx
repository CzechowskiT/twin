"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  FAQ_INVESTOR_ANCHOR_ID,
  faqSectionFromLocation,
  scrollToFaqAnchor,
} from "@/lib/faq-anchor";
import {
  FAQ_SECTIONS,
  faqAnswerKey,
  faqPairKey,
  faqSectionLabelKey,
  type FaqSectionId,
} from "@/lib/faq-messages";

export type FaqPanelItem = {
  id: string;
  q: string;
  a: string;
  showPrivacyLink?: boolean;
};

function useFaqSectionItems(section: FaqSectionId, limit?: number): FaqPanelItem[] {
  const { t } = useTranslation();
  const meta = FAQ_SECTIONS.find((s) => s.id === section)!;
  const count = limit != null ? Math.min(limit, meta.count) : meta.count;

  return useMemo(() => {
    const items: FaqPanelItem[] = [];
    for (let i = 1; i <= count; i += 1) {
      const num = String(i).padStart(2, "0");
      items.push({
        id: `${section.slice(0, 1).toUpperCase()}${num}`,
        q: t(`faq.${faqPairKey(section, i)}`),
        a: t(`faq.${faqAnswerKey(section, i)}`),
        showPrivacyLink: section === "general" && i === 5,
      });
    }
    return items;
  }, [t, section, count]);
}

export function useMarketingFaqItems(options?: {
  section?: FaqSectionId;
  limit?: number;
}): FaqPanelItem[] {
  const section = options?.section ?? "general";
  return useFaqSectionItems(section, options?.limit);
}

/** Shared FAQ disclosure list (marketing sections). */
export function FaqPanel({
  className = "",
  layout = "stack",
  section = "general",
  limit,
}: {
  className?: string;
  /** `row`: cards in one row from `md` (home); `stack`: single column list (/faq). */
  layout?: "stack" | "row";
  section?: FaqSectionId;
  limit?: number;
}) {
  const { t } = useTranslation();
  const items = useFaqSectionItems(section, limit);
  const rowLayout = layout === "row";

  const itemShell = (item: FaqPanelItem) => (
    <details
      key={item.id}
      className={
        rowLayout
          ? "group overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)] shadow-[var(--twin-shadow)]"
          : "group border-0 border-[var(--twin-border)] bg-transparent"
      }
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--twin-accent-muted)]/60 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="font-mono text-xs font-semibold text-[var(--twin-accent)]">{item.id}</span>
          <span className="mt-1 block text-base font-semibold text-[var(--foreground)] sm:text-lg">{item.q}</span>
        </span>
        <span
          className="mt-1 shrink-0 text-lg leading-none text-[var(--twin-muted)] transition group-open:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="border-t border-[var(--twin-border)]/80 px-5 pb-5 pt-3 text-sm leading-relaxed text-[var(--foreground)] sm:px-6 sm:text-[15px]">
        <p>{item.a}</p>
        {item.showPrivacyLink ? (
          <p className="mt-3">
            <Link href="/privacy" className="twin-link font-medium">
              {t("home.faqPrivacyLink")}
            </Link>
          </p>
        ) : null}
      </div>
    </details>
  );

  return (
    <div className={className}>
      {rowLayout ? (
        <div className="grid gap-4 md:grid-cols-3">{items.map(itemShell)}</div>
      ) : (
        <div className="divide-y divide-[var(--twin-border)] overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)] shadow-[var(--twin-shadow)]">
          {items.map(itemShell)}
        </div>
      )}
    </div>
  );
}

function faqScrollAnchorId(section: FaqSectionId | null, hash: string): string | null {
  const bareHash = hash.replace(/^#/, "");
  if (bareHash === FAQ_INVESTOR_ANCHOR_ID) return FAQ_INVESTOR_ANCHOR_ID;
  if (section) return "faq-sections";
  return null;
}

/** Section tabs + accordion for /faq. Honors `?section=` and `#investor-faq`. */
export function FaqPageSections({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<FaqSectionId>("general");

  const applyLocation = useCallback(() => {
    const sectionParam = searchParams.get("section");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const fromUrl = faqSectionFromLocation(sectionParam, hash);
    if (fromUrl) setActive(fromUrl);
    const anchorId = faqScrollAnchorId(fromUrl, hash);
    if (!anchorId) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToFaqAnchor(anchorId));
    });
  }, [searchParams]);

  useEffect(() => {
    queueMicrotask(() => applyLocation());
  }, [applyLocation]);

  useEffect(() => {
    const onHashChange = () => applyLocation();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [applyLocation]);

  const selectSection = (sec: FaqSectionId) => {
    setActive(sec);
    if (sec === "investors" && typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${FAQ_INVESTOR_ANCHOR_ID}`);
    }
  };

  return (
    <div id="faq-sections" className={`scroll-mt-24 ${className}`}>
      <div
        className="flex flex-wrap gap-2 border-b border-[var(--twin-border)] pb-4"
        role="tablist"
        aria-label={t("home.faqTitle")}
      >
        {FAQ_SECTIONS.map((sec) => {
          const selected = active === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "rounded-full border border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] px-4 py-2 text-sm font-semibold text-[var(--twin-accent)]"
                  : "rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-4 py-2 text-sm font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/40 hover:text-[var(--foreground)]"
              }
              onClick={() => selectSection(sec.id)}
            >
              {t(`faq.${faqSectionLabelKey(sec.id)}`)}
            </button>
          );
        })}
      </div>
      <div id={FAQ_INVESTOR_ANCHOR_ID} className="mt-8 scroll-mt-24" role="tabpanel">
        <FaqPanel section={active} layout="stack" />
      </div>
    </div>
  );
}
