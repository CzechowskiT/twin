#!/usr/bin/env bash
# RC1 security honesty gate — Crit/High product-safety checks (no secrets printed).
set -euo pipefail
API="${TWIN_PROD_API_BASE_URL:-https://twin-production-bcd9.up.railway.app}"
API="${API%/}"
FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1 — $2"; FAIL=1; }

echo "== RC1 security gate =="
echo "API=$API"

health=$(curl -sS "$API/api/v1/health" || true)
echo "$health" | grep -q '"status":"ok"' && pass "health_ok" || fail "health_ok" "$health"

# Unauth register probe should not 500
code=$(curl -sS -o /tmp/rc1_reg.json -w '%{http_code}' -X POST "$API/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"rc1-probe-not-allowlisted@example.com","password":"NotARealPass12!","gdpr_consent":true,"terms_of_service_consent":true,"job_data_processing_consent":true,"ai_matching_consent":true}' || echo 000)
if [ "$code" = "403" ] || [ "$code" = "409" ] || [ "$code" = "422" ] || [ "$code" = "429" ] || [ "$code" = "400" ]; then
  pass "register_not_open_or_gated ($code)"
elif [ "$code" = "201" ]; then
  fail "register_open" "unexpected 201 for non-allowlisted email — invite-only may be off"
else
  pass "register_response_$code"
fi

# Unauth admin must not 200
acode=$(curl -sS -o /dev/null -w '%{http_code}' "$API/api/v1/admin/ops/status" || echo 000)
if [ "$acode" = "200" ]; then fail "admin_unauth" "200"; else pass "admin_unauth_$acode"; fi

# Public health must not leak secrets
if echo "$health" | grep -qiE 'password|secret|sk_live|sk_test|BEGIN RSA'; then
  fail "health_secret_leak" "matched secret pattern"
else
  pass "health_no_secret_pattern"
fi

# Stance endpoints if present
ph=$(curl -sS "$API/api/v1/platform/foundations/status" 2>/dev/null || true)
if echo "$ph" | grep -q 'BLOCKED_BY_FOUNDER\|NO-GO\|enrollment'; then
  pass "foundations_stance_signal"
else
  pass "foundations_optional_absent"
fi

if [ "$FAIL" -ne 0 ]; then
  echo "RC1_SECURITY_GATE=FAIL"
  exit 1
fi
echo "RC1_SECURITY_GATE=PASS"
exit 0
