"use client";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import { employerDisplayName } from "@/lib/job-employer-demo";
import {
  CO_MARKETED_ROLES,
  INTEGRATION_MARKETPLACE,
  PARTNER_CASE_STUDIES,
  PARTNER_HERO_STATS,
  PARTNER_ORG_OPEN_ROLES,
  PARTNER_TIERS,
  SI_PARTNERS_BY_REGION,
  STRATEGIC_PARTNERS,
  TECH_ALLIANCE_BADGES,
  type PartnerEcosystemCategory,
  type StrategicPartner,
} from "@/lib/job-employer-partners-demo";
import type { JobEmployerMessageKey } from "@/lib/job-employer-messages";

const ECOSYSTEM_CATEGORY_LABEL: Record<PartnerEcosystemCategory, JobEmployerMessageKey> = {
  cloud: "partnersEcosystemCloud",
  ats: "partnersEcosystemAts",
  universities: "partnersEcosystemUniversities",
  staffing: "partnersEcosystemStaffing",
};

function partnersByCategory(category: PartnerEcosystemCategory): StrategicPartner[] {
  return STRATEGIC_PARTNERS.filter((p) => p.category === category);
}

export function JobEmployerPartnersTab({ company }: { company: string }) {
  const { t } = useTranslation();
  const displayCompany = employerDisplayName(company);
  const je = (key: JobEmployerMessageKey) => t(`jobEmployer.${key}`);
  const lead = je("partnersLead").replace("{company}", displayCompany);

  return (
    <div className="space-y-10 pb-2">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {je("partnersEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {je("partnersTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{lead}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PARTNER_HERO_STATS.map((stat) => (
          <li key={stat.id}>
            <Card className="!mb-0 p-4 text-center" variant="soft">
              <p className="text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted)]">{je(stat.labelKey)}</p>
            </Card>
          </li>
        ))}
      </ul>

      <EmployerTabSection title={je("partnersEcosystemTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["cloud", "ats", "universities", "staffing"] as PartnerEcosystemCategory[]).map((cat) => (
            <Card key={cat} className="!mb-0 p-4" variant="soft">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                {je(ECOSYSTEM_CATEGORY_LABEL[cat])}
              </p>
              <ul className="mt-3 space-y-3">
                {partnersByCategory(cat).map((partner) => (
                  <li key={partner.id} className="border-t border-[var(--twin-border)] pt-3 first:border-0 first:pt-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{partner.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--twin-muted)]">
                      {je(partner.blurbKey as JobEmployerMessageKey)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersAllianceTitle")} lead={je("partnersAllianceLead")}>
        <div className="flex flex-wrap gap-2">
          {TECH_ALLIANCE_BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--twin-muted-strong)]"
            >
              {badge}
            </span>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersTiersTitle")} lead={je("partnersTiersLead")}>
        <div className="grid gap-4 md:grid-cols-2">
          {PARTNER_TIERS.map((tier) => (
            <Card key={tier.id} className="!mb-0 p-5" variant={tier.id === "platinum" ? "accent" : "default"}>
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tier.badgeClass}`}
              >
                {je(tier.nameKey as JobEmployerMessageKey)}
              </span>
              <ul className="mt-4 space-y-2 text-sm text-[var(--twin-muted-strong)]">
                {tier.benefitKeys.map((key) => (
                  <li key={key} className="flex gap-2">
                    <span className="text-[var(--twin-accent)]" aria-hidden>
                      ✓
                    </span>
                    {je(key as JobEmployerMessageKey)}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersCoRolesTitle")} lead={je("partnersCoRolesLead")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CO_MARKETED_ROLES.map((role) => (
            <li key={role.id}>
              <Card className="!mb-0 flex h-full flex-col p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{role.title}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted)]">
                  {role.partnerOrg} · {role.location}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
                  {role.type}
                </p>
                <button type="button" className="twin-link mt-auto pt-3 text-left text-xs font-medium">
                  {je("partnersCoRolesApply")} →
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersSiTitle")} lead={je("partnersSiLead")}>
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["emea", "partnersSiEmea"],
              ["americas", "partnersSiAmericas"],
              ["apac", "partnersSiApac"],
            ] as const
          ).map(([region, labelKey]) => (
            <Card key={region} className="!mb-0 p-4" variant="soft">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{je(labelKey)}</p>
              <ul className="mt-3 space-y-3">
                {SI_PARTNERS_BY_REGION[region].map((si) => (
                  <li key={si.id}>
                    <p className="text-sm font-semibold">{si.name}</p>
                    <p className="text-xs text-[var(--twin-muted)]">{si.focus}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersMarketplaceTitle")} lead={je("partnersMarketplaceLead")}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_MARKETPLACE.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.vendor}</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--twin-muted)]">{item.category}</p>
              </div>
              <span className="shrink-0 rounded bg-[var(--twin-accent-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-accent-hover)]">
                {je(item.statusKey as JobEmployerMessageKey)}
              </span>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={je("partnersCasesTitle")} lead={je("partnersCasesLead")}>
        <ul className="grid gap-4 md:grid-cols-3">
          {PARTNER_CASE_STUDIES.map((cs) => (
            <li key={cs.id}>
              <Card className="!mb-0 flex h-full flex-col p-4" variant="soft">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {cs.industry}
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-[var(--foreground)]">
                  {je(cs.headlineKey as JobEmployerMessageKey)}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {cs.metricKeys.map((mk) => (
                    <li
                      key={mk}
                      className="rounded-md border border-[var(--twin-border)] px-2 py-1 text-xs font-medium text-[var(--twin-accent)]"
                    >
                      {je(mk as JobEmployerMessageKey)}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <Card className="!mb-0 border-[var(--twin-accent)]/30 p-5" variant="accent">
        <EmployerTabSection title={je("partnersCtaTitle")} lead={je("partnersCtaLead")}>
          <button type="button" className="twin-btn-solid twin-touch-target !w-auto px-5 text-sm">
            {je("partnersCtaButton")}
          </button>
          <p className="text-xs italic text-[var(--twin-muted)]">{je("partnersCtaNote")}</p>
        </EmployerTabSection>
      </Card>

      <EmployerTabSection title={je("partnersOpenRolesTitle")} lead={je("partnersOpenRolesLead")}>
        <ul className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {PARTNER_ORG_OPEN_ROLES.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{role.title}</p>
                <p className="text-xs text-[var(--twin-muted)]">
                  {role.org} · {role.location}
                </p>
              </div>
              <span className="text-xs text-[var(--twin-muted)]">
                {je("partnersOpenRolesPosted").replace("{when}", role.posted)}
              </span>
            </li>
          ))}
        </ul>
      </EmployerTabSection>
    </div>
  );
}
