"use client";

import { useTranslation } from "@/components/language-provider";
import { DEMO_ROLE_ORDER, type DemoRole } from "@/lib/demo/demo-scene-manifest";

type DemoRoleSelectorProps = {
  activeRole: DemoRole;
  onSelect: (role: DemoRole) => void;
  disabled?: boolean;
};

export function DemoRoleSelector({ activeRole, onSelect, disabled }: DemoRoleSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2" data-demo-role-selector role="tablist" aria-label={t("interactiveDemoPlayer.roleSelectorAria")}>
      {DEMO_ROLE_ORDER.map((role) => (
        <button
          key={role}
          type="button"
          role="tab"
          aria-selected={activeRole === role}
          disabled={disabled}
          onClick={() => onSelect(role)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeRole === role
              ? "bg-[var(--twin-accent)] text-white"
              : "border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] text-[var(--twin-muted-strong)] hover:border-[var(--twin-accent)]/40"
          }`}
        >
          {t(`interactiveDemoPlayer.roleLabel_${role}`)}
        </button>
      ))}
    </div>
  );
}
