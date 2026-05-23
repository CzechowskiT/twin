"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import {
  EMPLOYER_FAQ_CATEGORY_DEFS,
  EMPLOYER_FAQ_TOTAL,
  employerFaqAKey,
  employerFaqQKey,
  employerFaqSectionLabelKey,
  type EmployerFaqCategoryId,
} from "@/lib/employer-faq-messages";
import { buildEmployerContactDemo, EMPLOYER_FAQ_GLOBAL_STATS } from "@/lib/job-employer-demo";
import type { TranslationKey } from "@/lib/i18n";

type FaqItem = {
  id: string;
  category: EmployerFaqCategoryId;
  q: string;
  a: string;
};

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase();
}

export function JobEmployerFaqTab({
  company,
  jobTitle,
  onGoToContact,
}: {
  company: string;
  jobTitle: string;
  onGoToContact: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<EmployerFaqCategoryId>>(
    () => new Set(["applying"]),
  );

  const contactDemo = useMemo(() => buildEmployerContactDemo(company, jobTitle), [company, jobTitle]);

  const items = useMemo((): FaqItem[] => {
    const list: FaqItem[] = [];
    for (const cat of EMPLOYER_FAQ_CATEGORY_DEFS) {
      for (let i = 1; i <= cat.count; i += 1) {
        const qKey = `jobEmployer.${employerFaqQKey(cat.id, i)}` as TranslationKey;
        const aKey = `jobEmployer.${employerFaqAKey(cat.id, i)}` as TranslationKey;
        list.push({
          id: `${cat.id}-${i}`,
          category: cat.id,
          q: t(qKey),
          a: t(aKey),
        });
      }
    }
    return list;
  }, [t]);

  const needle = normalizeSearch(query);
  const filtered = needle
    ? items.filter((item) => normalizeSearch(`${item.q} ${item.a}`).includes(needle))
    : items;

  const categoriesWithMatches = useMemo(() => {
    if (!needle) return EMPLOYER_FAQ_CATEGORY_DEFS;
    const ids = new Set(filtered.map((f) => f.category));
    return EMPLOYER_FAQ_CATEGORY_DEFS.filter((c) => ids.has(c.id));
  }, [filtered, needle]);

  const toggleCategory = (id: EmployerFaqCategoryId) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8 pb-2">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("jobEmployer.faqEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {t("jobEmployer.faqTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{t("jobEmployer.faqLead")}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {EMPLOYER_FAQ_GLOBAL_STATS.map((stat) => {
          const value =
            "valueMessageKey" in stat
              ? t(`jobEmployer.${stat.valueMessageKey}` as TranslationKey)
              : stat.value;
          return (
            <li key={stat.id}>
              <Card className="!mb-0 p-4 text-center" variant="soft">
                <p className="text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted)]">
                  {t(`jobEmployer.${stat.labelKey}` as TranslationKey)}
                </p>
              </Card>
            </li>
          );
        })}
        <li>
          <Card className="!mb-0 p-4 text-center" variant="soft">
            <p className="text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">{EMPLOYER_FAQ_TOTAL}</p>
            <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("jobEmployer.faqStatArticles")}</p>
          </Card>
        </li>
      </ul>

      <label className="block">
        <span className="sr-only">{t("jobEmployer.faqSearchPlaceholder")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("jobEmployer.faqSearchPlaceholder")}
          className="twin-input w-full max-w-md text-sm"
          autoComplete="off"
        />
      </label>

      {needle && filtered.length === 0 ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("jobEmployer.faqSearchEmpty")}</p>
      ) : null}

      <div className="space-y-3">
        {categoriesWithMatches.map((cat) => {
          const catItems = filtered.filter((item) => item.category === cat.id);
          if (!catItems.length) return null;
          const isOpen = openCategories.has(cat.id) || Boolean(needle);
          const labelKey = `jobEmployer.${employerFaqSectionLabelKey(cat.id)}` as TranslationKey;

          return (
            <details
              key={cat.id}
              open={isOpen}
              className="group overflow-hidden rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)]"
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden"
                onClick={(e) => {
                  if (!needle) {
                    e.preventDefault();
                    toggleCategory(cat.id);
                  }
                }}
              >
                <span className="text-sm font-semibold text-[var(--foreground)]">{t(labelKey)}</span>
                <span className="shrink-0 text-xs text-[var(--twin-muted)]">
                  {catItems.length} · <span className="group-open:rotate-45 inline-block transition-transform">+</span>
                </span>
              </summary>
              <div className="divide-y divide-[var(--twin-border)] border-t border-[var(--twin-border)]">
                {catItems.map((item) => (
                  <details key={item.id} className="group/item px-4 sm:px-5">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 py-3 text-left [&::-webkit-details-marker]:hidden">
                      <span className="text-sm font-medium text-[var(--foreground)]">{item.q}</span>
                      <span className="mt-0.5 shrink-0 text-[var(--twin-muted)] group-open/item:rotate-45">+</span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{item.a}</p>
                  </details>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <Card className="!mb-0 flex flex-col gap-3 border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{t("jobEmployer.faqStillTitle")}</p>
          <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("jobEmployer.faqStillLead")}</p>
        </div>
        <button type="button" className="twin-btn-primary !w-auto shrink-0 px-5" onClick={onGoToContact}>
          {t("jobEmployer.faqStillCta")}
        </button>
      </Card>

      <EmployerTabSection title={t("jobEmployer.faqRelatedTitle")} lead={t("jobEmployer.faqRelatedLead")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {contactDemo.openRoles.map((role) => (
            <li
              key={role.id}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4 text-sm"
            >
              <p className="font-semibold text-[var(--foreground)]">{role.title}</p>
              <p className="twin-muted mt-1 text-xs">
                {role.location} · {role.team}
              </p>
              {role.isCurrentJob ? (
                <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">
                  {t("jobEmployer.faqRelatedCurrent")}: {jobTitle}
                </p>
              ) : (
                <button type="button" className="twin-link mt-2 text-xs" disabled>
                  {t("jobEmployer.faqRelatedView")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <p className="text-xs text-[var(--twin-muted)]">{t("jobEmployer.demoDisclaimer")}</p>
    </div>
  );
}
