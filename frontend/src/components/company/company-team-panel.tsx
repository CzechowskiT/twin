"use client";

import { useTranslation } from "@/components/language-provider";
import { NonLiveMutationBanner } from "@/components/workspace/non-live-mutation-banner";
import {
  COMPANY_TEAM_ROLE_IDS,
  COMPANY_TEAM_VISUAL_MARKERS,
  companyTeamRoleLeadKey,
  companyTeamRolePermKeys,
  companyTeamRoleTitleKey,
  type CompanyTeamRoleId,
} from "@/lib/company-team-permissions";
import type { TranslationKey } from "@/lib/i18n";

export type CompanyTeamAccessToken = {
  id: number;
  label: string;
  created_at: string | null;
  is_current_session: boolean;
};

export type CompanyTeamPayload = {
  company_slug: string;
  readiness: {
    invites_live: boolean;
    rbac_live: boolean;
    membership_model_live: boolean;
  };
  session: {
    authenticated: boolean;
    kind: string;
    label: string | null;
    company_slug: string;
  };
  access_tokens: CompanyTeamAccessToken[];
};

type CompanyTeamPanelProps = {
  data: CompanyTeamPayload | null;
  loading: boolean;
};

function sessionKindLabel(kind: string, t: (key: TranslationKey) => string): string {
  if (kind === "global_pilot") return t("companyTeam.sessionKindGlobal");
  if (kind === "company_token") return t("companyTeam.sessionKindCompany");
  if (kind === "none") return t("companyTeam.sessionKindUnknown");
  return t("companyTeam.sessionKindUnknown");
}

function RoleCard({ roleId }: { roleId: CompanyTeamRoleId }) {
  const { t } = useTranslation();
  const titleKey = companyTeamRoleTitleKey(roleId);
  const leadKey = companyTeamRoleLeadKey(roleId);
  const permKeys = companyTeamRolePermKeys(roleId);

  return (
    <article
      className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-4"
      data-company-team-role-card={roleId}
      data-testid={COMPANY_TEAM_VISUAL_MARKERS.roleCard}
    >
      <h3 className="text-sm font-semibold text-slate-100">{t(titleKey)}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{t(leadKey)}</p>
      <ul className="mt-3 space-y-1 text-xs text-slate-300">
        {permKeys.map((key) => (
          <li key={key} className="flex gap-2">
            <span aria-hidden className="text-slate-500">
              ·
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">
        {t("companyTeam.rolePreviewNotLive")}
      </p>
    </article>
  );
}

export function CompanyTeamPanel({ data, loading }: CompanyTeamPanelProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <p className="text-sm text-slate-400" data-company-team-loading="true">
        {t("common.loading")}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
        {t("companyTeam.loadFailed")}
      </p>
    );
  }

  const readiness = data.readiness;

  return (
    <div
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-inner"
      data-company-team-panel="true"
      data-testid={COMPANY_TEAM_VISUAL_MARKERS.panelRoot}
    >
      <NonLiveMutationBanner kind="preview_only" />
      <section
        className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3"
        data-testid={COMPANY_TEAM_VISUAL_MARKERS.readinessBanner}
      >
        <h2 className="text-sm font-semibold text-amber-100">{t("companyTeam.readinessTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{t("companyTeam.readinessLead")}</p>
        <ul className="mt-3 space-y-1 text-xs text-amber-50/90">
          <li>
            {t("companyTeam.readinessInvites")}:{" "}
            {readiness.invites_live ? t("companyTeam.flagLive") : t("companyTeam.flagNotLive")}
          </li>
          <li>
            {t("companyTeam.readinessRbac")}:{" "}
            {readiness.rbac_live ? t("companyTeam.flagLive") : t("companyTeam.flagNotLive")}
          </li>
          <li>
            {t("companyTeam.readinessMembership")}:{" "}
            {readiness.membership_model_live
              ? t("companyTeam.flagLive")
              : t("companyTeam.flagNotLive")}
          </li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        data-testid={COMPANY_TEAM_VISUAL_MARKERS.sessionCard}
      >
        <h2 className="text-sm font-semibold text-slate-100">{t("companyTeam.sessionTitle")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("companyTeam.sessionLead")}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{t("companyTeam.sessionKindLabel")}</dt>
            <dd className="text-slate-200">{sessionKindLabel(data.session.kind, t)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{t("companyTeam.sessionSlugLabel")}</dt>
            <dd className="font-mono text-slate-200">{data.session.company_slug}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{t("companyTeam.sessionTokenLabel")}</dt>
            <dd className="text-slate-200">
              {data.session.label === "global_pilot"
                ? t("companyTeam.tokenGlobalPilot")
                : data.session.label ?? t("companyTeam.sessionKindUnknown")}
            </dd>
          </div>
        </dl>
      </section>

      <section data-testid={COMPANY_TEAM_VISUAL_MARKERS.tokensList}>
        <h2 className="text-sm font-semibold text-slate-100">{t("companyTeam.tokensTitle")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("companyTeam.tokensLead")}</p>
        {data.access_tokens.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t("companyTeam.tokensEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.access_tokens.map((token) => (
              <li
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-100">{token.label}</span>
                {token.is_current_session ? (
                  <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    {t("companyTeam.tokenCurrentSession")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-4 opacity-90"
        data-testid={COMPANY_TEAM_VISUAL_MARKERS.inviteDisabled}
      >
        <h2 className="text-sm font-semibold text-slate-200">{t("companyTeam.inviteTitle")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("companyTeam.inviteLead")}</p>
        <p className="mt-2 text-xs text-amber-200/90">{t("companyTeam.inviteNotLive")}</p>
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-500"
        >
          {t("companyTeam.inviteDisabledCta")}
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-100">{t("companyTeam.rolesTitle")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("companyTeam.rolesLead")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {COMPANY_TEAM_ROLE_IDS.map((roleId) => (
            <RoleCard key={roleId} roleId={roleId} />
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">{t("companyTeam.trustBody")}</p>
      </section>
    </div>
  );
}
