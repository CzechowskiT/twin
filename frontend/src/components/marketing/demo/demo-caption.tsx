"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

type DemoCaptionProps = {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  highlightKeys: readonly TranslationKey[];
};

export function DemoCaption({ titleKey, descriptionKey, highlightKeys }: DemoCaptionProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" data-demo-caption>
      <h3 className="text-lg font-semibold text-[var(--twin-fg)] sm:text-xl">{t(titleKey)}</h3>
      <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{t(descriptionKey)}</p>
      {highlightKeys.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-[var(--twin-muted-strong)]">
          {highlightKeys.map((key) => (
            <li key={key} className="flex gap-2">
              <span className="text-[var(--twin-accent)]" aria-hidden>
                •
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
