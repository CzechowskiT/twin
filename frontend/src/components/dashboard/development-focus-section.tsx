"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

import type { DevelopmentFocus } from "./dashboard-helpers";

type Props = {
  devFocus: DevelopmentFocus | null;
  hasData: boolean;
};

/**
 * Renders the development focus card: skill gaps, positioning, signals,
 * prioritized upskill actions, and per-role insights. Pure presentation
 * — all data comes from the parent page.
 */
export function DevelopmentFocusSection({ devFocus, hasData }: Props) {
  const { t } = useTranslation();

  return (
    <Card id="dashboard-development-focus" variant="soft">
      <h2 className="twin-section-title mb-2">{t("dashboard.developmentFocusTitle")}</h2>
      <p className="twin-muted mb-4 text-sm leading-relaxed">{t("dashboard.developmentFocusLead")}</p>
      {!hasData || !devFocus ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.developmentFocusEmpty")}</p>
      ) : (
        <div className="space-y-4 text-sm">
          {devFocus.skill_tool_gaps.length > 0 ? (
            <div>
              <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusSkills")}</p>
              <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                {devFocus.skill_tool_gaps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {devFocus.positioning_themes.length > 0 ? (
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                {t("dashboard.developmentFocusPositioning")}
              </p>
              <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                {devFocus.positioning_themes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {devFocus.stronger_candidate_signals.length > 0 ? (
            <div>
              <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusOthers")}</p>
              <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                {devFocus.stronger_candidate_signals.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {devFocus.upskill_actions_prioritized.length > 0 ? (
            <div>
              <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusActions")}</p>
              <ul className="mt-1 space-y-2 text-[var(--twin-muted-strong)]">
                {devFocus.upskill_actions_prioritized.map((a) => (
                  <li key={`${a.title}-${a.priority}`}>
                    <span className="font-medium text-[var(--foreground)]">[{a.priority}]</span> {a.title}
                    {a.rationale ? (
                      <span className="mt-0.5 block text-xs text-[var(--twin-muted)]">{a.rationale}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {devFocus.roles_with_insights.length > 0 ? (
            <div>
              <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusRoles")}</p>
              <ul className="mt-1 space-y-2 text-xs text-[var(--twin-muted-strong)]">
                {devFocus.roles_with_insights.map((r) => (
                  <li key={r.application_id}>
                    <span className="font-medium text-[var(--foreground)]">{r.title}</span> — {r.company}
                    {r.summary ? (
                      <span className="mt-0.5 block text-[var(--twin-muted)]">{r.summary}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
