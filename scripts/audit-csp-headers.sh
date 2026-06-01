#!/usr/bin/env bash
# Read-only CSP header audit for TWIN production (or any FE base URL).
# No auth, no cookies, no deploy side-effects. Exits non-zero when required
# security headers are missing or enforce-mode CSP is present.
#
# Usage:
#   bash scripts/audit-csp-headers.sh
#   AUDIT_FE=https://preview.example.vercel.app bash scripts/audit-csp-headers.sh
#
# See docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md

set -euo pipefail

FE="${AUDIT_FE:-https://twin-sooty.vercel.app}"
UA="${AUDIT_UA:-Mozilla/5.0 (compatible; TWIN-CSP-Audit/1.0)}"

ROUTES=(
  "/"
  "/dashboard"
  "/login/candidate"
  "/register/candidate"
  "/demo"
  "/status"
  "/dashboard/calendar"
  "/api/public-health"
)

failures=0

header_value() {
  local name="$1"
  # Match header name case-insensitively; value may contain ':' (e.g. https:).
  awk -v want="$name" '
    BEGIN { IGNORECASE = 1 }
    index($0, ":") > 0 {
      key = substr($0, 1, index($0, ":") - 1)
      gsub(/^[ \t]+|[ \t\r]+$/, "", key)
      if (tolower(key) == tolower(want)) {
        val = substr($0, index($0, ":") + 1)
        gsub(/^[ \t]+|[ \t\r]+$/, "", val)
        print val
        exit
      }
    }
  '
}

printf "%-28s %-6s %-6s %-6s %-10s %-6s %-6s %s\n" \
  "Route" "Status" "CSP-RO" "CSP-E" "report-uri" "HSTS" "XFO" "Redirect"
printf "%s\n" "$(printf '%.0s-' {1..110})"

for path in "${ROUTES[@]}"; do
  headers="$(curl -sS -A "$UA" -I "${FE}${path}" 2>/dev/null || true)"
  status="$(printf '%s\n' "$headers" | awk 'toupper($0) ~ /^HTTP\// {gsub(/\r/,""); print $2; exit}')"
  csp_ro="$(printf '%s\n' "$headers" | header_value "content-security-policy-report-only")"
  csp_e="$(printf '%s\n' "$headers" | header_value "content-security-policy")"
  hsts="$(printf '%s\n' "$headers" | header_value "strict-transport-security")"
  xfo="$(printf '%s\n' "$headers" | header_value "x-frame-options")"
  location="$(printf '%s\n' "$headers" | header_value "location")"

  ro_flag="no"
  en_flag="no"
  uri_flag="no"
  hsts_flag="no"

  [[ -n "$csp_ro" ]] && ro_flag="yes"
  [[ -n "$csp_e" ]] && en_flag="yes"
  [[ "$csp_ro$csp_e" == *"report-uri"* ]] && uri_flag="yes"
  [[ -n "$hsts" ]] && hsts_flag="yes"

  if [[ "$ro_flag" != "yes" || "$en_flag" == "yes" || "$uri_flag" != "yes" ]]; then
    failures=$((failures + 1))
  fi

  printf "%-28s %-6s %-6s %-6s %-10s %-6s %-6s %s\n" \
    "$path" \
    "${status:-?}" \
    "$ro_flag" \
    "$en_flag" \
    "$uri_flag" \
    "$hsts_flag" \
    "${xfo:--}" \
    "${location:--}"
done

echo
echo "Base URL: $FE"
echo "Failures: $failures route(s) missing report-only CSP or carrying enforce CSP"

if [[ "$failures" -gt 0 ]]; then
  exit 1
fi

exit 0
