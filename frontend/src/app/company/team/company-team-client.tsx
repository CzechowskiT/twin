"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyTeamPanel, type CompanyTeamPayload } from "@/components/company/company-team-panel";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

export function CompanyTeamClient() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<CompanyTeamPayload | null>(null);
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
    if (!tkn || !slug) {
      setPayload(null);
      return;
    }
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/team?${q}`, { cache: "no-store" });
      if (!res.ok) {
        setPayload(null);
        return;
      }
      setPayload((await res.json()) as CompanyTeamPayload);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <Shell wide>
      <Card>
        <CompanyWorkspaceNav />
        <div data-company-team-page="true">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("companyTeam.eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{t("companyTeam.title")}</h1>
          <p className="twin-muted mb-6 mt-2 text-sm">{t("companyTeam.lead")}</p>
          <RecruiterAccessFields
            idPrefix="company-team"
            token={token}
            onTokenChange={setToken}
            companySlug={companyRaw}
            onCompanySlugChange={setCompanyRaw}
            companyOptions={companyOptions}
          />
          <div className="mt-6">
            <CompanyTeamPanel data={payload} loading={loading} />
          </div>
        </div>
      </Card>
    </Shell>
  );
}
