"use client";

import { useId, useState } from "react";

import {
  PUBLIC_PREVIEW_AREAS,
  type PreviewLocale,
} from "@/lib/public-preview-fixture";
import {
  PUBLIC_PREVIEW_MESSAGES_EN,
  PUBLIC_PREVIEW_MESSAGES_PL,
} from "@/lib/public-preview-messages";

function copy(locale: PreviewLocale) {
  return locale === "pl" ? PUBLIC_PREVIEW_MESSAGES_PL : PUBLIC_PREVIEW_MESSAGES_EN;
}

/**
 * Isolated public preview UI — ephemeral React state only.
 * No fetch, no forms with free text, no storage APIs, no OAuth links.
 */
export function PublicPreviewSurface() {
  const [locale, setLocale] = useState<PreviewLocale>("en");
  const [flash, setFlash] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState(PUBLIC_PREVIEW_AREAS[0].id);
  const titleId = useId();
  const m = copy(locale);
  const area = PUBLIC_PREVIEW_AREAS.find((a) => a.id === activeArea) ?? PUBLIC_PREVIEW_AREAS[0];

  function onSimulate() {
    setFlash(m.simulatedFlash);
  }

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6"
      data-testid="public-preview-root"
      data-public-preview="read-only-synthetic"
      data-kpi-excluded="true"
      data-fixture-version="demo_scenario_v1"
    >
      <header className="flex flex-col gap-3" aria-labelledby={titleId}>
        <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]" data-testid="public-preview-brand">
          {m.brand}
        </p>
        <h1 id={titleId} className="text-xl font-medium text-[var(--foreground)]">
          {m.title}
        </h1>
        <p className="max-w-prose text-sm text-[var(--twin-muted-strong)]">{m.lead}</p>
        <ul
          className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]"
          aria-label="Preview markers"
          data-testid="public-preview-markers"
        >
          <li className="rounded border border-[var(--twin-border)] px-2 py-1">{m.markerSynthetic}</li>
          <li className="rounded border border-[var(--twin-border)] px-2 py-1">{m.markerReadOnly}</li>
          <li className="rounded border border-[var(--twin-border)] px-2 py-1">{m.markerFictional}</li>
          <li className="rounded border border-[var(--twin-border)] px-2 py-1">{m.markerNoAccount}</li>
        </ul>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Language">
          <button
            type="button"
            className="rounded border border-[var(--twin-border)] px-3 py-1.5 text-sm"
            aria-pressed={locale === "en"}
            data-testid="public-preview-locale-en"
            onClick={() => setLocale("en")}
          >
            {m.localeEn}
          </button>
          <button
            type="button"
            className="rounded border border-[var(--twin-border)] px-3 py-1.5 text-sm"
            aria-pressed={locale === "pl"}
            data-testid="public-preview-locale-pl"
            onClick={() => setLocale("pl")}
          >
            {m.localePl}
          </button>
        </div>
      </header>

      <section aria-labelledby="preview-areas-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="preview-areas-heading" className="text-lg font-medium">
            {m.areasHeading}
          </h2>
          <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{m.areasLead}</p>
        </div>
        <nav aria-label="Preview areas" className="flex flex-wrap gap-2">
          {PUBLIC_PREVIEW_AREAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded border px-3 py-1.5 text-sm ${
                activeArea === item.id
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--twin-border)]"
              }`}
              aria-pressed={activeArea === item.id}
              data-testid={`public-preview-area-${item.id}`}
              onClick={() => setActiveArea(item.id)}
            >
              {item.title[locale]}
            </button>
          ))}
        </nav>
        <article
          className="flex flex-col gap-3 rounded border border-[var(--twin-border)] p-4"
          data-testid={`public-preview-panel-${area.id}`}
          aria-live="polite"
        >
          <h3 className="text-base font-medium">{area.title[locale]}</h3>
          <p className="text-sm text-[var(--twin-muted-strong)]">{area.body[locale]}</p>
          <p className="text-sm" data-testid="public-preview-sample">
            {area.sample[locale]}
          </p>
          <button
            type="button"
            className="w-fit rounded border border-[var(--twin-border)] px-3 py-2 text-sm font-medium"
            data-testid="public-preview-simulate"
            onClick={onSimulate}
          >
            {area.simulatedAction[locale]}
          </button>
          {flash ? (
            <p
              className="text-sm font-medium text-[var(--foreground)]"
              role="status"
              data-testid="public-preview-simulated-flash"
            >
              {flash}
            </p>
          ) : null}
        </article>
      </section>

      <footer className="flex flex-col gap-2 border-t border-[var(--twin-border)] pt-4 text-xs text-[var(--twin-muted-strong)]">
        <p data-testid="public-preview-refresh-note">{m.refreshNote}</p>
        <p>{m.noSignup}</p>
        <p data-testid="public-preview-kpi-note">{m.kpiNote}</p>
        <p data-testid="public-preview-cdn-limitation">{m.limitationCdn}</p>
        <a className="w-fit underline" href="/" data-testid="public-preview-home-link">
          {m.backHome}
        </a>
      </footer>
    </div>
  );
}
