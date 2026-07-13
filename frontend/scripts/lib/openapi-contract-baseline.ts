/**
 * OpenAPI contract baseline for Wave B/C persistence endpoints.
 * Snapshot paths relative to repo root.
 */

export const WAVE_API_CONTRACTS = {
  B1: {
    slice: "Career Compass",
    methods: ["GET", "PUT", "PATCH"] as const,
    path: "/api/v1/candidates/me/career-compass",
    responseFields: ["target_role", "skill_gaps", "learning_actions", "updated_at"],
  },
  B2: {
    slice: "Trust Center",
    methods: ["GET", "POST"] as const,
    pathPrefix: "/api/v1/candidates/me/trust",
    paths: [
      "/api/v1/candidates/me/trust-center",
      "/api/v1/candidates/me/privacy-requests",
    ],
    responseFields: ["privacy_requests", "consent_receipts"],
  },
  B3: {
    slice: "Referrals",
    methods: ["GET", "POST"] as const,
    path: "/api/v1/candidates/me/referrals",
    responseFields: ["referral_code", "referrals", "stats"],
    pr: 448,
  },
  C1: {
    slice: "Recruiter Activation",
    methods: ["GET"] as const,
    path: "/api/v1/recruiter/activation",
    queryParams: ["company_slug"],
    responseFields: ["activation_complete", "steps", "first_decision_at"],
  },
  C2: {
    slice: "Talent Pool + Trust Review",
    methods: ["GET", "POST", "PATCH", "DELETE"] as const,
    pathPrefixes: [
      "/api/v1/recruiter/talent-pool",
      "/api/v1/recruiter/trust-review-queue",
    ],
    responseFields: ["records", "items", "decisions"],
  },
} as const;

export type ContractDrift = {
  contract: string;
  field: string;
  expected: string;
  actual: string;
};

export function diffContractFields(
  contract: keyof typeof WAVE_API_CONTRACTS,
  actualFields: string[],
): ContractDrift[] {
  const spec = WAVE_API_CONTRACTS[contract];
  const expected = "responseFields" in spec ? spec.responseFields : [];
  const drifts: ContractDrift[] = [];
  for (const f of expected) {
    if (!actualFields.includes(f)) {
      drifts.push({ contract, field: f, expected: "present", actual: "missing" });
    }
  }
  return drifts;
}
