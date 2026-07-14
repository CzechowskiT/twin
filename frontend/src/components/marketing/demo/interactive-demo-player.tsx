"use client";

/**
 * Legacy exports — cinematic rebuild lives in experience/demo-experience.tsx.
 * DemoAboveFoldSection wraps DemoExperience for guard compatibility.
 */
import { useTranslation } from "@/components/language-provider";
import { DemoExperience } from "@/components/marketing/demo/experience/demo-experience";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import { DEMO_SCENES } from "@/lib/demo/demo-scene-manifest";

export { DemoExperience, DemoExperience as DemoAboveFoldSection };

export function InteractiveDemoPlayer() {
  return <DemoExperience />;
}

export function InteractiveDemoSystemMap() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <section className="marketing-copy-rail space-y-4" id="system-map" data-demo-system-map>
          <h2 className="text-xl font-semibold text-[var(--twin-fg)]">{t("interactiveDemoPlayer.systemMapTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("interactiveDemoPlayer.systemMapLead")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["candidate", "recruiter", "company"] as const).map((persona) => (
              <div
                key={persona}
                className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-4"
              >
                <h3 className="font-semibold text-[var(--twin-fg)]">
                  {t(`interactiveDemoPlayer.systemMap_${persona}Title`)}
                </h3>
                <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">
                  {t(`interactiveDemoPlayer.systemMap_${persona}Body`)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </MarketingPageSurface>
    </Shell>
  );
}

export const DEMO_SCENE_COUNT = DEMO_SCENES.length;
