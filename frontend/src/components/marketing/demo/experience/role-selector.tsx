"use client";

import { useTranslation } from "@/components/language-provider";
import { DEMO_ROLE_ORDER, type DemoRole } from "@/lib/demo/demo-scene-manifest";

type RoleSelectorProps = {
  activeRole: DemoRole;
  onSelect: (role: DemoRole) => void;
  disabled?: boolean;
  variant?: "hero" | "inline";
};

export function RoleSelector({ activeRole, onSelect, disabled, variant = "inline" }: RoleSelectorProps) {
  const { t } = useTranslation();
  const sizeClass =
    variant === "hero"
      ? "demo-role-selector demo-role-selector--hero"
      : "flex flex-wrap gap-2";

  return (
    <div
      className={sizeClass}
      data-demo-role-selector
      role="tablist"
      aria-label={t("demoExperience.roleSelectorAria")}
    >
      {DEMO_ROLE_ORDER.map((role) => (
        <button
          key={role}
          type="button"
          role="tab"
          aria-selected={activeRole === role}
          disabled={disabled}
          onClick={() => onSelect(role)}
          className={
            variant === "hero"
              ? `demo-role-pill ${activeRole === role ? "demo-role-pill--active" : ""}`
              : `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeRole === role
                    ? "bg-[var(--twin-accent)] text-[var(--twin-on-accent)]"
                    : "border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] text-[var(--twin-muted-strong)] hover:border-[var(--twin-accent)]/40"
                }`
          }
        >
          {t(`demoExperience.roleLabel_${role}`)}
        </button>
      ))}
    </div>
  );
}
