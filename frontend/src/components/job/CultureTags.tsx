"use client";

import { useTranslation } from "@/components/language-provider";

export function CultureTags({ tags }: { tags: string[] }) {
  const { t } = useTranslation();
  if (!tags.length) return null;
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide twin-muted">{t("jobBoard.cultureTags")}</h4>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <li key={tag} className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs">
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}
