"use client";

import { useTranslation } from "@/components/language-provider";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";
import type { TranslationKey } from "@/lib/i18n";

type DemoChapterNavigationProps = {
  scenes: readonly DemoScene[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function DemoChapterNavigation({ scenes, activeIndex, onSelect }: DemoChapterNavigationProps) {
  const { t } = useTranslation();
  return (
    <nav className="space-y-1" aria-label={t("interactiveDemoPlayer.chaptersAria")} data-demo-chapters>
      {scenes.map((scene, i) => (
        <button
          key={scene.id}
          type="button"
          onClick={() => onSelect(i)}
          aria-current={i === activeIndex ? "step" : undefined}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            i === activeIndex
              ? "bg-[var(--twin-accent)]/10 font-medium text-[var(--twin-accent)]"
              : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-soft)]"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider text-[var(--twin-muted)]">
            {t(`interactiveDemoPlayer.roleLabel_${scene.role}` as TranslationKey)}
          </span>
          <span className="mt-0.5 block">{t(scene.titleKey)}</span>
        </button>
      ))}
    </nav>
  );
}
