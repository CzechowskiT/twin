"use client";

import { useTranslation } from "@/components/language-provider";
import { trackDemoRoleSelect } from "@/lib/demo/demo-analytics";
import { SALES_ROLE_ORDER, type SalesDemoRole } from "@/lib/demo/sales-demo-config";
import type { TranslationKey } from "@/lib/i18n";

type RoleFlowCardsProps = {
  activeRole: SalesDemoRole | null;
  onSelect: (role: SalesDemoRole) => void;
  visible: boolean;
};

const ROLE_ICONS: Record<SalesDemoRole, string> = {
  candidate: "👤",
  recruiter: "📋",
  company: "🏢",
};

function cardKey(role: SalesDemoRole, field: "Title" | "Lead" | "Decision" | "Outcome"): TranslationKey {
  return `demoSales.role${field}_${role}` as TranslationKey;
}

export function RoleFlowCards({ activeRole, onSelect, visible }: RoleFlowCardsProps) {
  const { t, locale } = useTranslation();
  if (!visible) return null;

  return (
    <section className="sales-demo-roles" data-sales-demo-roles aria-label={t("demoSales.rolesAria")}>
      <h2 className="sales-demo-roles__heading">{t("demoSales.rolesHeading")}</h2>
      <p className="sales-demo-roles__lead">{t("demoSales.rolesLead")}</p>
      <div className="sales-demo-roles__grid">
        {SALES_ROLE_ORDER.map((role) => (
          <button
            key={role}
            type="button"
            className={`sales-demo-role-card ${activeRole === role ? "sales-demo-role-card--active" : ""}`}
            data-demo-role-card={role}
            onClick={() => {
              trackDemoRoleSelect({ role, locale });
              onSelect(role);
            }}
          >
            <span className="sales-demo-role-card__icon" aria-hidden>
              {ROLE_ICONS[role]}
            </span>
            <h3 className="sales-demo-role-card__title">{t(cardKey(role, "Title"))}</h3>
            <p className="sales-demo-role-card__lead">{t(cardKey(role, "Lead"))}</p>
            <p className="sales-demo-role-card__decision">
              <strong>{t("demoSales.keyDecision")}</strong> {t(cardKey(role, "Decision"))}
            </p>
            <p className="sales-demo-role-card__outcome">{t(cardKey(role, "Outcome"))}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
