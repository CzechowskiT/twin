"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { trackDemoCtaClicked } from "@/lib/demo/demo-analytics";
import type { DemoRole } from "@/lib/demo/demo-scene-manifest";

type RoleCtaProps = {
  role: DemoRole;
};

const CTA_ROUTES: Record<Exclude<DemoRole, "overview">, { href: string; ctaId: string; labelKey: "ctaCandidate" | "ctaRecruiter" | "ctaCompany" }> = {
  candidate: { href: "/for-candidates", ctaId: "demo_cta_candidate", labelKey: "ctaCandidate" },
  recruiter: { href: "/for-recruiters", ctaId: "demo_cta_recruiter", labelKey: "ctaRecruiter" },
  company: { href: "/for-companies", ctaId: "demo_cta_company", labelKey: "ctaCompany" },
};

export function RoleCta({ role }: RoleCtaProps) {
  const { t } = useTranslation();
  if (role === "overview") return null;

  const config = CTA_ROUTES[role];
  return (
    <Link
      href={config.href}
      className="twin-btn-primary twin-touch-target inline-flex text-sm"
      data-demo-role-cta={role}
      onClick={() => trackDemoCtaClicked({ cta_id: config.ctaId, role })}
    >
      {t(`demoExperience.${config.labelKey}`)}
    </Link>
  );
}
