"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/components/language-provider";

export function HelpWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="help-widget-root" aria-live="polite">
      {open ? (
        <div className="help-widget-panel" role="dialog" aria-label={t("help.widgetTitle")}>
          <p className="mb-3 text-sm font-semibold">{t("help.widgetTitle")}</p>
          <ul className="twin-muted mb-3 space-y-2 text-sm">
            <li>
              <Link href="/onboarding" className="twin-link" onClick={() => setOpen(false)}>
                {t("help.onboarding")}
              </Link>
            </li>
            <li>
              <a href="/api/user-guide" className="twin-link" target="_blank" rel="noopener noreferrer">
                {t("help.userGuide")}
              </a>
            </li>
            <li>
              <Link href="/dashboard" className="twin-link" onClick={() => setOpen(false)}>
                {t("help.dashboard")}
              </Link>
            </li>
          </ul>
          <button type="button" className="twin-btn-secondary text-xs" onClick={() => setOpen(false)}>
            {t("help.close")}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="help-widget-fab twin-btn-solid"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
    </div>
  );
}
