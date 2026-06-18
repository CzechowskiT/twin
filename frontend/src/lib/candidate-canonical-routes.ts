/**
 * Canonical candidate workspace routes — single map for tiles, nav, aliases, and QA guards.
 */

export const CANDIDATE_CANONICAL_ROUTES = {
  panel: "/dashboard",
  calendar: "/dashboard/calendar",
  jobs: "/dashboard/jobs",
  matches: "/dashboard/matches",
  profile: "/profile",
  cv: "/dashboard/cv",
  applications: "/dashboard/applications",
  evidence: "/dashboard/evidence",
  interviewPrep: "/dashboard/interview-prep",
  plan: "/dashboard/plan",
  identity: "/dashboard/identity",
  trust: "/dashboard/trust",
  trustControls: "/dashboard/trust/controls",
  trustExportPreview: "/dashboard/trust/export-preview",
  trustCorrections: "/dashboard/trust/corrections",
  trustIdentityVerification: "/dashboard/trust/identity-verification",
  trustPortability: "/dashboard/trust/portability",
  trustRevokeDelete: "/dashboard/trust/revoke-delete",
  trustAuditExport: "/dashboard/trust/audit-export",
  trustConsentReceipt: "/dashboard/trust/consent-receipt",
  referrals: "/dashboard/referrals",
  career: "/dashboard/career",
  billing: "/dashboard/billing",
} as const;
