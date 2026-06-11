"use client";
import Link from "next/link"; import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
const NAV=[{href:COMPANY_ROLES_ROUTE,key:"navRoles"},{href:"/recruiter/inbox",key:"navInbox"},{href:"/for-companies",key:"navForCompanies"}] as const;
export function CompanyWorkspaceNav(){const{t}=useTranslation();const pathname=usePathname();return(<nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--twin-border)] pb-4" aria-label={t("companyJobs.navAria")}>{NAV.map((item)=>{const active=pathname===item.href||(item.href!=="/for-companies"&&pathname.startsWith(item.href+"/"));return(<Link key={item.href} href={item.href} className={active?"rounded-full bg-[var(--twin-accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--twin-accent)]":"rounded-full px-3 py-1.5 text-sm text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-soft)]"}>{t(`companyJobs.${item.key}`)}</Link>);})}</nav>);}
