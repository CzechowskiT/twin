"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import {
  FOUNDER_LED_DEMO_JOURNEY_STEPS,
  resolveFounderLedDemoHref,
} from "@/lib/founder-led-demo-routes";

export function DemoSurfaceCatalog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = FOUNDER_LED_DEMO_JOURNEY_STEPS.length;

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <section className="marketing-copy-rail space-y-4" id="surface-catalog" data-demo-surface-catalog>
          {!open ? (
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target text-sm"
              aria-expanded={false}
              onClick={() => setOpen(true)}
            >
              {t("interactiveDemoPlayer.catalogToggle")}
            </button>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--twin-fg)]">{t("interactiveDemoPlayer.catalogHeading")}</h2>
                <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">
                  {t("interactiveDemoPlayer.catalogLead").replace("35", String(count))}
                </p>
              </div>
              <button
                type="button"
                className="twin-btn-secondary twin-touch-target text-sm"
                aria-expanded
                onClick={() => setOpen(false)}
              >
                {t("interactiveDemoPlayer.catalogToggleHide")}
              </button>
            </div>
          )}
          {open ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FOUNDER_LED_DEMO_JOURNEY_STEPS.map((step) => (
                <li key={step.id}>
                  <Link
                    href={resolveFounderLedDemoHref(step)}
                    data-demo-catalog-link={step.id}
                    className="block rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-3 text-sm transition-colors hover:border-[var(--twin-accent)]/40"
                  >
                    <span className="font-medium text-[var(--twin-fg)]">{t(step.titleKey)}</span>
                    <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t(step.descKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </MarketingPageSurface>
    </Shell>
  );
}
