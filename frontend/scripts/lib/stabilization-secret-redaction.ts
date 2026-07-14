/** Redact secrets from stabilization evidence strings — never leak tokens/passwords. */

const SECRET_ENV_KEYS = [
  "DEMO_USER_PASSWORD",
  "RECRUITER_TOKEN",
  "TWIN_RECRUITER_TOKEN",
  "RECRUITER_INBOX_TOKEN",
  "TWIN_ACCESS_TOKEN",
  "BETA_ADMIN_TOKEN",
  "OPS_ADMIN_TOKEN",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
] as const;

const PATTERN_REDACTIONS: RegExp[] = [
  /token=[^&\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /sk_live_[A-Za-z0-9]+/gi,
  /password[=:]\s*["']?[^"'\s&]+/gi,
];

export function redactSecrets(text: string, envValues: string[] = []): string {
  let out = text;
  for (const pattern of PATTERN_REDACTIONS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  for (const value of envValues) {
    if (value.length >= 8) {
      out = out.split(value).join("[REDACTED]");
    }
  }
  return out;
}

export function collectSecretValuesFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const values: string[] = [];
  for (const key of SECRET_ENV_KEYS) {
    const v = env[key]?.trim();
    if (v && v.length >= 8) values.push(v);
  }
  return values;
}

export function assertNoSecretsLeaked(text: string, envValues: string[] = []): string[] {
  const leaks: string[] = [];
  for (const value of envValues) {
    if (value.length >= 8 && text.includes(value)) {
      leaks.push("raw secret value detected in output");
      break;
    }
  }
  for (const pattern of [/eyJ[A-Za-z0-9_-]{20,}/, /sk_live_[A-Za-z0-9]{10,}/]) {
    if (pattern.test(text)) leaks.push(`pattern leak: ${pattern}`);
  }
  if (/token=[A-Za-z0-9%._-]{12,}/i.test(text)) {
    leaks.push("token query param not redacted");
  }
  return leaks;
}
