"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { CompanyRoleCard } from "@/components/company/company-role-card";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  type CompanyRole,
  companyRoleNewHref,
} from "@/lib/company-jobs-roles";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import { COLLAPSE_COMPANY_DEMO_JOURNEYS, COMPANY_ROLES_SHIP_STATUS } from "@/lib/seven-day-d4-company";

export default function CompanyRolesPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  useEffect(() => {
    const session = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(session.token);
      setCompanyRaw(session.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/roles?${q}`, { cache: "no-store" });
      if (res.status === 503) {
        setReadOnly(true);
        setRoles([]);
        return;
      }
      if (!res.ok) return;
      setReadOnly(false);
      const data = (await res.json()) as { items: CompanyRole[] };
      setRoles(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <Shell wide data-wave2b-company-roles-green={COMPANY_ROLES_SHIP_STATUS}>
      <Card>
        <CompanyWorkspaceNav />
        <div data-company-roles-page="true">
          <h1 className="text-2xl font-semibold">{t("companyJobs.title")}</h1>
          <p className="twin-muted mb-2 mt-2 text-sm">{t("companyJobs.lead")}</p>
          <p className="mb-6 max-w-2xl rounded-md border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/50 px-3 py-2 text-xs text-[var(--twin-muted-strong)]">
            {t("companyJobs.boundaryNote")}
          </p>
          <RecruiterAccessFields
            idPrefix="company-roles"
            token={token}
            onTokenChange={setToken}
            companySlug={companyRaw}
            onCompanySlugChange={setCompanyRaw}
            companyOptions={companyOptions}
          />
          {readOnly ? (
            <p
              className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-2 text-sm"
              data-company-roles-readonly="true"
            >
              {t("companyJobs.readOnlyUnavailable")}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={companyRoleNewHref()}
              className="twin-btn-solid twin-touch-target"
              onClick={(e) => {
                if (readOnly) {
                  e.preventDefault();
                  toast.error(t("companyJobs.readOnlyBlocked"));
                  return;
                }
                const tkn = token.trim();
                const slug = companySlug;
                if (tkn && slug) writeRecruiterInboxSession(tkn, slug);
              }}
            >
              {t("companyJobs.createRole")}
            </Link>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={loading}
              onClick={() => void load()}
            >
              {loading ? t("common.loading") : t("companyJobs.refresh")}
            </button>
          </div>
          <h2 className="mt-8 text-lg font-semibold">{t("companyJobs.listTitle")}</h2>
          {roles.length === 0 ? (
            <div className="mt-3">
              <GuidedEmptyState
                title={t("companyJobs.emptyTitle")}
                message={t("companyJobs.emptyMessage")}
                steps={[
                  t("companyJobs.emptyStep1"),
                  t("companyJobs.emptyStep2"),
                  t("companyJobs.emptyStep3"),
                ]}
                actionLabel={t("companyJobs.emptyCta")}
                onAction={() => {
                  if (!readOnly) window.location.assign(companyRoleNewHref());
                }}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <CompanyRoleCard key={role.id} role={role} />
              ))}
            </div>
          )}
          <p className="mt-6 text-sm">
            <Link href="/company/talent-pool" className="twin-link font-medium">
              {t("companyTalentPool.navLink")}
            </Link>
          </p>
          <div className="mt-6 rounded-lg border border-[var(--twin-border)]/80 p-4">
            {COLLAPSE_COMPANY_DEMO_JOURNEYS ? (
              <details data-seven-day-company-demo-journeys-collapsed>
                <summary className="twin-link cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {t("companyJobs.demoJourneysToggle")}
                </summary>
                <p className="twin-muted mt-3 text-sm leading-relaxed">{t("companyJobs.demoJourneysBoundary")}</p>
                <Link
                  href="/company/roles/demo-role-001/pipeline"
                  className="twin-link mt-3 inline-block text-sm font-medium"
                  data-testid="company-roles-demo-pipeline-link"
                >
                  {t("jobPipeline.openPipeline")}
                </Link>
              </details>
            ) : null}
          </div>
        </div>
      </Card>
    </Shell>
  );
}
