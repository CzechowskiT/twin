# 🧪 TWIN MVP - Comprehensive Manual Test Plan

## Test Environment Setup

### Prerequisites:
- [ ] Backend running (Railway prod lub `docker-compose up`)
- [ ] Frontend running (Vercel prod lub `npm run dev`)
- [ ] PostgreSQL accessible
- [ ] Test accounts:
  - User A (test email 1)
  - User B (test email 2)  
  - Gmail account (for OAuth)
  - LinkedIn account (for OAuth)
- [ ] Tools:
  - Browser DevTools (Network tab)
  - Postman/curl (for API testing)
  - DB client (pgAdmin/psql)

---

## TEST SUITE 1: AUTHENTICATION & AUTHORIZATION (30 min)

### TC-AUTH-001: Email/Password Registration
**Priority:** P0 (Critical)
**Estimated time:** 5 min

**Steps:**
1. Navigate to `/register`
2. Fill form:
   - Email: `testuser1@example.com`
   - Password: `SecureP@ssw0rd123`
   - ✅ Check all GDPR consent checkboxes
3. Click "Register"

**Expected:**
- ✅ Redirect to `/dashboard`
- ✅ Auth token stored (check localStorage/cookies)
- ✅ User in DB with `gdpr_consent_at` NOT NULL
- ✅ User in DB with `terms_of_service_accepted_at` NOT NULL

**Actual:**
- [ ] PASS / [ ] FAIL

**SQL Verification:**
```sql
SELECT id, email, gdpr_consent_at, terms_of_service_accepted_at, created_at
FROM users
WHERE email = 'testuser1@example.com';
```

---

### TC-AUTH-002: Login with Valid Credentials
**Priority:** P0
**Estimated time:** 2 min

**Steps:**
1. Logout (if logged in)
2. Navigate to `/login`
3. Enter: `testuser1@example.com` / `SecureP@ssw0rd123`
4. Click "Sign In"

**Expected:**
- ✅ Redirect to `/dashboard`
- ✅ Auth token refreshed

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-AUTH-003: Login with Invalid Credentials
**Priority:** P1
**Estimated time:** 2 min

**Steps:**
1. Navigate to `/login`
2. Enter: `testuser1@example.com` / `WrongPassword123`
3. Click "Sign In"

**Expected:**
- ✅ Stay on `/login`
- ✅ Error message displayed: "Invalid credentials" (or similar)
- ❌ NO redirect

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-AUTH-004: OAuth LinkedIn Login
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. Logout
2. Navigate to `/login`
3. Click "Sign in with LinkedIn"
4. Complete LinkedIn authorization
5. Return to app

**Expected:**
- ✅ Redirect to `/auth/callback?code=...`
- ✅ Then redirect to `/dashboard`
- ✅ User in DB with `linkedin_id` populated

**SQL Verification:**
```sql
SELECT u.email, u.linkedin_id, oa.provider, oa.subject
FROM users u
LEFT JOIN oauth_accounts oa ON oa.user_id = u.id
WHERE u.email = 'your-linkedin-email@example.com';
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-AUTH-005: Password Reset Flow
**Priority:** P1
**Estimated time:** 5 min

**Steps:**
1. Navigate to `/forgot-password`
2. Enter: `testuser1@example.com`
3. Click "Send Reset Link"
4. Check email inbox
5. Click reset link in email
6. Enter new password: `NewP@ssw0rd456`
7. Submit

**Expected:**
- ✅ Email received within 1 minute
- ✅ Link format: `/reset-password?token=...`
- ✅ Password reset form displays
- ✅ After submit: redirect to `/login`
- ✅ Can login with new password

**SQL Verification (token expiry):**
```sql
SELECT token_hash, expires_at > NOW() as is_valid
FROM password_reset_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'testuser1@example.com')
ORDER BY expires_at DESC
LIMIT 1;
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-AUTH-006: GDPR Consent Required
**Priority:** P0 (Legal requirement)
**Estimated time:** 3 min

**Steps:**
1. Register new user WITHOUT checking GDPR consents
2. Attempt to submit

**Expected:**
- ✅ Form validation prevents submission
- ✅ Error message: "You must accept the privacy policy"

**Alternative test (DB manipulation):**
1. Create user with `gdpr_consent_at = NULL`
2. Try to login
3. **Expected:** Redirect to `/consent/gdpr` page

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-AUTH-007: OAuth Status Exposure
**Priority:** P0 (Security - Issue #2)
**Estimated time:** 2 min

**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to `/login`
3. Observe network requests

**Expected (CURRENT - VULNERABLE):**
- ⚠️ Request to `/api/v1/health/features`
- ⚠️ Response exposes: `{"linkedin_oauth": true, "google_oauth": true, ...}`

**Expected (AFTER FIX):**
- ✅ NO request to `/health/features` OR
- ✅ Request returns 401 Unauthorized OR
- ✅ Frontend uses env vars instead

**Actual:**
- [ ] PASS / [ ] FAIL (vulnerable if exposed)

**Manual API Test:**
```bash
curl https://api.twin.app/api/v1/health/features
# Should return 401 or be removed entirely
```

---

## TEST SUITE 2: DASHBOARD & JOBS (25 min)

### TC-DASH-001: Feed Ofert Display
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. Login as `testuser1`
2. Navigate to `/dashboard`
3. Observe jobs feed

**Expected:**
- ✅ List of jobs displays
- ✅ Each job shows: title, company, location, salary (if available)
- ✅ "Apply" button visible
- ✅ Pagination controls (if >20 jobs)

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-DASH-002: Job Filters (Skills)
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. On `/dashboard`, use skills filter
2. Enter: "Python"
3. Apply filter

**Expected:**
- ✅ Jobs list updates
- ✅ Only jobs with "Python" in requirements show
- ✅ URL updates with `?skills=Python`

**DevTools Check:**
```
Network → XHR
Request: GET /api/v1/jobs?skills=Python
Response: jobs array filtered
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-DASH-003: Persistent Filters (localStorage)
**Priority:** P1
**Estimated time:** 4 min

**Steps:**
1. Set filters: Skills="React", Location="Warsaw"
2. Apply
3. Reload page (F5)

**Expected:**
- ✅ Filters persist (still "React" and "Warsaw")
- ✅ Jobs list matches filters

**DevTools Check:**
```javascript
// Console
localStorage.getItem('job-filters')
// Should return: {"skills":"React","location":"Warsaw"}
```

**Edge Case Test:**
4. Open Incognito/Private mode
5. Navigate to `/dashboard`

**Expected:**
- ✅ NO crash (localStorage might fail in private mode)
- ✅ Default filters applied

**Actual:**
- [ ] PASS / [ ] FAIL

**Known Issue:** ⚠️ Missing error handling (Issue #7)

---

### TC-DASH-004: Create Application
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. On jobs feed, click "Apply" on any job
2. Observe result

**Expected:**
- ✅ Success message displayed
- ✅ Job card shows "Applied" badge/button
- ✅ Application appears in "My Applications" tab

**SQL Verification:**
```sql
SELECT a.id, a.status, j.title, j.company
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE a.candidate_id = (
  SELECT id FROM candidates WHERE user_id = (
    SELECT id FROM users WHERE email = 'testuser1@example.com'
  )
)
ORDER BY a.applied_at DESC
LIMIT 1;
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-DASH-005: Applications List
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. Navigate to `/dashboard` → "Applications" tab
2. Observe list

**Expected:**
- ✅ All user's applications display
- ✅ Columns: Company, Position, Status, Applied Date
- ✅ Sortable by date
- ✅ Filterable by status

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-DASH-006: Export Applications CSV
**Priority:** P1
**Estimated time:** 5 min

**Steps:**
1. Create 3+ applications
2. Click "Export CSV" button
3. Download CSV file
4. Open in Excel/Sheets

**Expected:**
- ✅ File downloads: `applications.csv`
- ✅ Contains header row
- ✅ Contains all YOUR applications (not other users')
- ✅ UTF-8 encoding (Polish characters display correctly)

**Security Test:**
5. Login as `testuser2` (different user)
6. Export CSV

**Expected:**
- ✅ Different CSV (User 2's applications only)
- ❌ NO User 1 applications visible

**Known Issue:** ⚠️ Memory bomb risk with 10k+ applications (Issue #3)

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-DASH-007: Change Application Status
**Priority:** P1
**Estimated time:** 2 min

**Steps:**
1. Select an application with status "pending"
2. Change status to "interview"
3. Save

**Expected:**
- ✅ Status updates in UI
- ✅ DB reflects change

**SQL Verification:**
```sql
SELECT status, updated_at
FROM applications
WHERE id = <application_id>;
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

## TEST SUITE 3: CALENDAR INTEGRATION (20 min)

### TC-CAL-001: Connect Google Calendar
**Priority:** P0
**Estimated time:** 4 min

**Steps:**
1. Navigate to `/dashboard/calendar`
2. Click "Connect Google Calendar"
3. Complete Google OAuth flow
4. Return to TWIN

**Expected:**
- ✅ Redirect to Google authorization page
- ✅ After authorization: redirect to `/dashboard/calendar`
- ✅ Status shows "Connected"
- ✅ Google email displayed

**SQL Verification:**
```sql
SELECT user_id, google_email, created_at
FROM user_google_calendar
WHERE user_id = (SELECT id FROM users WHERE email = 'testuser1@example.com');
```

**Expected:** 1 row with `refresh_token_encrypted` NOT NULL

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-002: Disconnect Google Calendar
**Priority:** P1
**Estimated time:** 2 min

**Steps:**
1. On `/dashboard/calendar` (already connected)
2. Click "Disconnect"
3. Confirm

**Expected:**
- ✅ Status changes to "Not Connected"
- ✅ DB row deleted

**SQL Verification:**
```sql
SELECT COUNT(*) FROM user_google_calendar
WHERE user_id = (SELECT id FROM users WHERE email = 'testuser1@example.com');
```

**Expected:** 0 rows

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-003: View Scheduled Interviews
**Priority:** P1
**Estimated time:** 3 min

**Preparation:**
```sql
-- Manually insert test interview
INSERT INTO scheduled_interviews (
  user_id, company_name, job_title,
  interview_start, interview_end, timezone,
  meeting_link, status
) VALUES (
  (SELECT id FROM users WHERE email = 'testuser1@example.com'),
  'Acme Corp', 'Senior Developer',
  '2026-05-20 14:00:00', '2026-05-20 15:00:00', 'Europe/Warsaw',
  'https://zoom.us/j/123456789', 'scheduled'
);
```

**Steps:**
1. Navigate to `/dashboard/calendar`
2. View interviews list

**Expected:**
- ✅ Interview displays
- ✅ Shows: Company, Position, Date/Time, Meeting Link
- ✅ Meeting link is clickable
- ✅ Status badge: "Scheduled"

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-004: Cancel Interview (DB Only)
**Priority:** P1
**Estimated time:** 3 min

**Steps:**
1. On interview in list, click "Cancel"
2. Confirm cancellation

**Expected:**
- ✅ Status changes to "Cancelled" in UI
- ✅ DB updated

**SQL Verification:**
```sql
SELECT status, updated_at
FROM scheduled_interviews
WHERE id = <interview_id>;
```

**Known Issue:** ⚠️ Google Calendar event NOT cancelled (Issue #5)

**Manual Verification:**
3. Open Google Calendar (web)
4. Find the event

**Expected (AFTER FIX):**
- ✅ Event deleted or marked cancelled

**Actual (CURRENT - BUG):**
- ⚠️ Event still shows as scheduled

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-005: Export ICS File
**Priority:** P1
**Estimated time:** 3 min

**Steps:**
1. Navigate to `/dashboard/calendar`
2. Click "Export .ics"
3. Save file
4. Import to Apple Calendar or Google Calendar

**Expected:**
- ✅ File downloads: `twin_interviews.ics`
- ✅ File opens in calendar app
- ✅ Events imported with correct:
  - Date/time
  - Title (company + position)
  - Location (meeting link)
  - Description (interview type, timezone)

**Content Verification:**
```bash
cat twin_interviews.ics
# Should contain:
# BEGIN:VCALENDAR
# BEGIN:VEVENT
# DTSTART:20260520T140000Z
# SUMMARY:Interview with Acme Corp - Senior Developer
# DESCRIPTION:Interview Type: video\nTimezone: Europe/Warsaw
# END:VEVENT
# END:VCALENDAR
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-006: ICS include_cancelled Parameter
**Priority:** P2
**Estimated time:** 2 min

**Preparation:**
1. Have 1 scheduled interview
2. Have 1 cancelled interview

**Steps:**
1. Export ICS WITHOUT `include_cancelled` param
2. Count events in file
3. Export ICS WITH `?include_cancelled=true`
4. Count events

**Expected:**
- Without param: 1 event (scheduled only)
- With param: 2 events (both)

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-CAL-007: ICS Security (IDOR Test)
**Priority:** P0 (Security)
**Estimated time:** 3 min

**Steps:**
1. Login as User A
2. Create interview for User A
3. Export ICS → note User A's interviews
4. Logout
5. Login as User B
6. Export ICS

**Expected:**
- ✅ User B's ICS contains ONLY User B's interviews
- ❌ NO User A interviews visible

**API Test (advanced):**
```bash
# Get User A's token
TOKEN_A="user_a_token"

# Try to access User B's interviews (if API exposed)
curl -H "Authorization: Bearer $TOKEN_A" \
  "https://api.twin.app/api/v1/calendar/interviews"
  
# Should return ONLY User A's interviews
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

## TEST SUITE 4: PLACEMENT VERIFICATION (20 min)

### TC-PLACE-001: Declare Placement
**Priority:** P0
**Estimated time:** 3 min

**Preparation:**
1. Have 1 application with status "hired"

**Steps:**
1. Navigate to application details
2. Click "I got the job!" (or similar)
3. Enter work email: `your-name@company.com`
4. Submit

**Expected:**
- ✅ Success message
- ✅ Status changes to "placement_declared"
- ✅ Email sent to work address

**SQL Verification:**
```sql
SELECT placement_state, placement_reported_at, placement_work_email
FROM applications
WHERE id = <application_id>;
```

**Expected:**
- `placement_state` = "reported" (or similar)
- `placement_work_email` = "your-name@company.com"
- `placement_reported_at` NOT NULL

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-PLACE-002: Email Verification
**Priority:** P0
**Estimated time:** 5 min

**Steps:**
1. Check email inbox (work email from TC-PLACE-001)
2. Open verification email
3. Click verification link

**Expected:**
- ✅ Email received within 1 minute
- ✅ Link format: `/placement/confirm/{token}`
- ✅ After click: "Placement verified!" message
- ✅ Status changes to "verified"

**SQL Verification:**
```sql
SELECT placement_state, placement_verified_at
FROM applications
WHERE id = <application_id>;
```

**Expected:**
- `placement_state` = "verified"
- `placement_verified_at` NOT NULL

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-PLACE-003: Token Expiry
**Priority:** P1
**Estimated time:** 2 min

**Preparation:**
```sql
-- Manually expire token
UPDATE applications
SET placement_verification_expires_at = NOW() - INTERVAL '1 hour'
WHERE id = <application_id>;
```

**Steps:**
1. Try to use verification link (from TC-PLACE-002)

**Expected:**
- ✅ Error message: "Token expired" (or similar)
- ✅ Offer to resend verification email

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-PLACE-004: Placement Events History
**Priority:** P1
**Estimated time:** 3 min

**Steps:**
1. Navigate to application with placement verified
2. View placement history/audit trail

**Expected:**
- ✅ List of events displays
- ✅ Events include:
  - "placement_declared" with timestamp
  - "verification_sent" with email
  - "placement_verified" with timestamp

**SQL Verification:**
```sql
SELECT event_type, actor, created_at, detail_json
FROM placement_events
WHERE application_id = <application_id>
ORDER BY created_at DESC;
```

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-PLACE-005: IDOR Vulnerability Test
**Priority:** P0 (Security - Issue #1)
**Estimated time:** 5 min

**Steps:**
1. Login as User A
2. Create application (note application_id = 123)
3. Declare placement for app 123
4. Logout
5. Login as User B
6. Try to access placement events:

```bash
# Use User B's token
curl -H "Authorization: Bearer USER_B_TOKEN" \
  "https://api.twin.app/api/v1/placement/events/123"
```

**Expected (AFTER FIX):**
- ✅ 403 Forbidden or 404 Not Found

**Actual (CURRENT - VULNERABLE):**
- ⚠️ 200 OK with User A's placement data

**THIS IS A CRITICAL SECURITY BUG**

**Actual:**
- [ ] PASS (fixed) / [ ] FAIL (vulnerable)

---

### TC-PLACE-006: Timestampy in UI
**Priority:** P2
**Estimated time:** 2 min

**Steps:**
1. View application with placement verified
2. Check UI

**Expected:**
- ✅ "Declared at: 2026-05-19 14:30"
- ✅ "Verified at: 2026-05-19 14:35"
- ✅ Timestamps in correct timezone

**Actual:**
- [ ] PASS / [ ] FAIL

---

## TEST SUITE 5: SECURITY & EDGE CASES (20 min)

### TC-SEC-001: Rate Limiting Login
**Priority:** P0
**Estimated time:** 3 min

**Steps:**
1. Attempt login with WRONG password 10 times rapidly

**Expected (AFTER FIX):**
- ✅ After 5 attempts: "Too many attempts. Try again in 15 minutes"
- ✅ Further attempts blocked

**Actual (CURRENT - NO RATE LIMIT):**
- ⚠️ All 10 attempts process (vulnerable to brute force)

**THIS IS A SECURITY VULNERABILITY**

**Actual:**
- [ ] PASS (fixed) / [ ] FAIL (vulnerable)

---

### TC-SEC-002: CORS Configuration
**Priority:** P1
**Estimated time:** 3 min

**Test:**
```bash
# Try to access API from unauthorized origin
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     "https://api.twin.app/api/v1/auth/login"
```

**Expected:**
- ✅ No `Access-Control-Allow-Origin` header for malicious-site.com
- ✅ Only allowed origins in CORS_ORIGINS env var

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-SEC-003: SQL Injection Test
**Priority:** P0
**Estimated time:** 3 min

**Test cases:**
```bash
# Skills filter
GET /api/v1/jobs?skills=Python' OR '1'='1

# Job ID
GET /api/v1/jobs/1' OR '1'='1

# Search
GET /api/v1/applications?search=test' UNION SELECT * FROM users--
```

**Expected:**
- ✅ All queries return normal results or validation error
- ❌ NO SQL error messages exposed
- ❌ NO unauthorized data leaked

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-SEC-004: XSS Test
**Priority:** P1
**Estimated time:** 3 min

**Test:**
1. Create application with malicious note:
```javascript
<script>alert('XSS')</script>
```

2. View application in UI

**Expected:**
- ✅ Script NOT executed
- ✅ Text displayed as plain text: `<script>alert('XSS')</script>`

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-SEC-005: Unauthorized Access to Applications
**Priority:** P0
**Estimated time:** 4 min

**Steps:**
1. Login as User A
2. Create application (note ID = 456)
3. Logout
4. Login as User B
5. Try to access:

```bash
# Direct API access
curl -H "Authorization: Bearer USER_B_TOKEN" \
  "https://api.twin.app/api/v1/applications/456"

# Frontend (manual)
Navigate to /dashboard → manually construct URL /applications/456
```

**Expected:**
- ✅ 403 Forbidden or 404 Not Found
- ❌ NO User A's application data visible

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-EDGE-001: Large Dataset Performance
**Priority:** P1
**Estimated time:** 5 min

**Preparation:**
```sql
-- Create 1000 applications for test user
-- (Use script or loop)
```

**Test:**
1. Load `/dashboard` with 1000 applications
2. Measure page load time
3. Try CSV export

**Expected:**
- ✅ Page loads in <3 seconds
- ✅ CSV export completes (may take 10-30 seconds)
- ❌ NO browser crash
- ❌ NO API timeout

**Known Issue:** ⚠️ CSV may fail with 10k+ applications (Issue #3)

**Actual:**
- [ ] PASS / [ ] FAIL

---

### TC-EDGE-002: Unicode/Special Characters
**Priority:** P1
**Estimated time:** 2 min

**Test:**
1. Create job with special characters:
   - Company: "Złoty Paw™"
   - Position: "Developer – Full-stack (React/Node.js)"
   - Description: "Emoji test: 🚀 ✨ 💡"

**Expected:**
- ✅ Saves correctly
- ✅ Displays correctly in UI
- ✅ Exports correctly in CSV (UTF-8)

**Actual:**
- [ ] PASS / [ ] FAIL

---

## SUMMARY CHECKLIST

### Critical (P0) Tests: ___/21 PASSED
- [ ] Email/Password Registration
- [ ] Login Valid Credentials
- [ ] OAuth LinkedIn
- [ ] GDPR Consent Required
- [ ] OAuth Status Exposure
- [ ] Feed Ofert Display
- [ ] Job Filters
- [ ] Create Application
- [ ] Applications List
- [ ] Connect Google Calendar
- [ ] Declare Placement
- [ ] Email Verification
- [ ] Placement IDOR Test
- [ ] Rate Limiting Login
- [ ] CORS Configuration
- [ ] SQL Injection Test
- [ ] Unauthorized Access Applications
- [ ] ...

### High Priority (P1) Tests: ___/16 PASSED
### Medium Priority (P2) Tests: ___/3 PASSED

---

## TEST RESULTS SUMMARY

**Date:** __________
**Tester:** __________
**Environment:** [ ] Local [ ] Staging [ ] Production

**Overall Status:** [ ] PASS [ ] FAIL

**Critical Issues Found:** ____

**Notes:**
_______________________________
_______________________________
_______________________________

