"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import {
  PRICING_ADDONS,
  PRICING_FAQ_ITEMS,
  PRICING_FEATURE_ROWS,
  PRICING_PLANS,
  PRICING_TRUST_BADGES,
  REGIONAL_PRICING_NOTES,
  ROLE_PRICING_EXAMPLES,
  type PricingPlanId,
} from "@/lib/employer-pricing-demo";
import { buildEmployerContactDemo } from "@/lib/job-employer-demo";
import type { JobEmployerMessageKey } from "@/lib/job-employer-messages";
import type { TranslationKey } from "@/lib/i18n";

function msg(t: (key: TranslationKey) => string, key: JobEmployerMessageKey): string {
  return t(`jobEmployer.${key}` as TranslationKey);
}

export function JobEmployerPricingTab({
  company,
  jobTitle,
}: {
  company: string;
  jobTitle: string;
}) {
  const { t } = useTranslation();
  const lead = msg(t, "pricingLead").replace("{company}", company);
  const openRolesLead = msg(t, "pricingOpenRolesLead").replace("{company}", company);
  const demo = useMemo(() => buildEmployerContactDemo(company, jobTitle), [company, jobTitle]);

  const salesMail = `mailto:sales@demo.invalid?subject=${encodeURIComponent(`Enterprise pricing — ${company}`)}`;
  const quoteMail = `mailto:procurement@demo.invalid?subject=${encodeURIComponent(`Quote request — ${company}`)}`;

  return (
    <div className="space-y-10 pb-2">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {msg(t, "pricingEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {msg(t, "pricingTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{lead}</p>
      </header>

      <EmployerTabSection title={msg(t, "pricingPlansTitle")} lead={msg(t, "pricingPlansLead")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--twin-border)]">
                <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  Plan
                </th>
                {PRICING_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                      plan.highlight ? "text-[var(--twin-accent)]" : "text-[var(--twin-muted-strong)]"
                    }`}
                  >
                    {msg(t, plan.nameKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--twin-border)]">
                <td className="py-3 pr-3 text-[var(--twin-muted)]">USD</td>
                {PRICING_PLANS.map((plan) => (
                  <td key={plan.id} className="px-2 py-3 text-center font-semibold tabular-nums text-[var(--foreground)]">
                    {plan.usd}
                    <span className="mt-0.5 block text-[10px] font-normal text-[var(--twin-muted)]">
                      {msg(t, plan.cadenceKey)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 pr-3 text-[var(--twin-muted)]">EUR</td>
                {PRICING_PLANS.map((plan) => (
                  <td key={plan.id} className="px-2 py-3 text-center font-medium tabular-nums text-[var(--twin-muted-strong)]">
                    {plan.eur}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              variant={plan.highlight ? "accent" : "soft"}
              className={`!mb-0 p-4 ${plan.highlight ? "ring-1 ring-[var(--twin-accent)]/40" : ""}`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {msg(t, plan.nameKey)}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{plan.usd}</p>
              <p className="text-sm text-[var(--twin-muted)]">
                {plan.eur} · {msg(t, plan.cadenceKey)}
              </p>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={msg(t, "pricingMatrixTitle")} lead={msg(t, "pricingMatrixLead")}>
        <div className="overflow-x-auto rounded-lg border border-[var(--twin-border)]">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--twin-surface-raised)]">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  Feature
                </th>
                {PRICING_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted-strong)]"
                  >
                    {msg(t, plan.nameKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_FEATURE_ROWS.map((row) => (
                <tr key={row.id} className="border-t border-[var(--twin-border)]">
                  <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{msg(t, row.labelKey)}</td>
                  {PRICING_PLANS.map((plan) => (
                    <td key={plan.id} className="px-2 py-2.5 text-center text-xs text-[var(--twin-muted-strong)]">
                      {msg(t, row.cells[plan.id as PricingPlanId])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={msg(t, "pricingRolesTitle")} lead={msg(t, "pricingRolesLead")}>
        <ul className="grid gap-3 md:grid-cols-2">
          {ROLE_PRICING_EXAMPLES.map((ex) => (
            <li key={ex.id}>
              <Card className="!mb-0 flex h-full flex-col p-4" variant="soft">
                <p className="text-sm font-semibold text-[var(--foreground)]">{msg(t, ex.roleKey)}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {msg(t, ex.metricKey)}
                </p>
                <p className="mt-2 text-xl font-bold tabular-nums text-[var(--twin-accent)]">{msg(t, ex.valueKey)}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{msg(t, ex.noteKey)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={msg(t, "pricingAddonsTitle")} lead={msg(t, "pricingAddonsLead")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PRICING_ADDONS.map((addon) => (
            <li key={addon.id}>
              <details className="group rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)]">
                <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{msg(t, addon.nameKey)}</p>
                      <p className="mt-0.5 text-xs font-medium text-[var(--twin-accent)]">{msg(t, addon.priceKey)}</p>
                    </div>
                    <span className="twin-muted text-xs group-open:rotate-180 transition-transform" aria-hidden>
                      ▾
                    </span>
                  </div>
                </summary>
                <p className="border-t border-[var(--twin-border)] px-4 py-3 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                  {msg(t, addon.blurbKey)}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={msg(t, "pricingRegionalTitle")} lead={msg(t, "pricingRegionalLead")}>
        <div className="grid gap-3 lg:grid-cols-3">
          {REGIONAL_PRICING_NOTES.map((region) => (
            <Card key={region.id} className="!mb-0 p-4" variant="soft">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {msg(t, region.regionKey)}
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {msg(t, region.multiplierKey)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{msg(t, region.noteKey)}</p>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <Card className="!mb-0 border-[var(--twin-accent)]/30 p-5" variant="accent">
        <EmployerTabSection title={msg(t, "pricingRoiTitle")} lead={msg(t, "pricingRoiLead")}>
          <Link
            href="/for-recruiters#persona-pricing"
            className="twin-btn-solid twin-touch-target inline-flex !w-auto items-center px-5 text-sm"
          >
            {msg(t, "pricingRoiCta")}
          </Link>
          <p className="text-xs italic text-[var(--twin-muted)]">{msg(t, "pricingRoiNote")}</p>
        </EmployerTabSection>
      </Card>

      <EmployerTabSection title={msg(t, "pricingFaqTitle")} lead={msg(t, "pricingFaqLead")}>
        <ul className="space-y-2">
          {PRICING_FAQ_ITEMS.map((item) => (
            <li key={item.id}>
              <details className="group rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {msg(t, item.qKey)}
                    <span className="twin-muted text-xs group-open:rotate-180 transition-transform" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <p className="border-t border-[var(--twin-border)] px-4 py-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                  {msg(t, item.aKey)}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="!mb-0 p-5">
          <EmployerTabSection title={msg(t, "pricingCtaSalesTitle")} lead={msg(t, "pricingCtaSalesLead")}>
            <a href={salesMail} className="twin-btn-solid twin-touch-target inline-flex !w-auto px-5 text-sm">
              {msg(t, "pricingCtaSalesButton")}
            </a>
          </EmployerTabSection>
        </Card>
        <Card className="!mb-0 p-5" variant="soft">
          <EmployerTabSection title={msg(t, "pricingCtaQuoteTitle")} lead={msg(t, "pricingCtaQuoteLead")}>
            <a href={quoteMail} className="twin-btn-secondary twin-touch-target inline-flex !w-auto px-5 text-sm">
              {msg(t, "pricingCtaQuoteButton")}
            </a>
            <p className="text-xs italic text-[var(--twin-muted)]">{msg(t, "pricingCtaNote")}</p>
          </EmployerTabSection>
        </Card>
      </div>

      <EmployerTabSection title={msg(t, "pricingTrustTitle")} lead={msg(t, "pricingTrustLead")}>
        <ul className="flex flex-wrap gap-3">
          {PRICING_TRUST_BADGES.map((badge) => (
            <li
              key={badge.id}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-4 py-3 text-center"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{msg(t, badge.nameKey)}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--twin-muted)]">
                {msg(t, badge.statusKey)}
              </p>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={msg(t, "pricingOpenRolesTitle")} lead={openRolesLead}>
        <ul className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {demo.openRoles.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-[var(--foreground)]">
                  {role.title}
                  {role.isCurrentJob ? (
                    <span className="ml-2 text-xs font-normal text-[var(--twin-accent)]">
                      · {msg(t, "contactRolesCurrent")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--twin-muted)]">
                  {role.team} · {role.location}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </EmployerTabSection>
    </div>
  );
}
