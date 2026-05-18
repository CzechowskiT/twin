# 🔐 TWIN - Security Issues - Detailed Analysis

## ISSUE #1: IDOR w `/placement/events/{application_id}` 

### Severity: HIGH (Data Exposure)

### Current Code:
```python
# File: backend/app/api/placement.py:168-190

@router.get("/events/{application_id}", response_model=list[PlacementEventOut])
def get_placement_events(
    application_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),  # ⚠️ Unused!
) -> list[PlacementEventOut]:
    """Audit trail of placement state changes (self-serve transparency)."""
    events = (
        db.query(PlacementEvent)
        .filter(PlacementEvent.application_id == application_id)
        .order_by(PlacementEvent.created_at.desc())
        .all()
    )
    # ⚠️ PROBLEM: No check if _current_user owns this application!
    return [
        PlacementEventOut(
            id=e.id,
            event_type=e.event_type,
            actor=e.actor,
            detail=json.loads(e.detail_json) if e.detail_json else None,
            created_at=e.created_at,
        )
        for e in events
    ]
```

### Exploit:
```bash
# User A (owns application_id=123)
curl -H "Authorization: Bearer USER_A_TOKEN" \
  https://api.twin.app/api/v1/placement/events/123
# → Returns User A's placement history ✅

# User B (DOESN'T own application_id=123)
curl -H "Authorization: Bearer USER_B_TOKEN" \
  https://api.twin.app/api/v1/placement/events/123
# → Returns User A's placement history ❌ IDOR!
```

### Impact:
- User B może zobaczyć placement history User A
- Zawiera sensitive data: work email, verification timestamps, company name
- PII leak → GDPR violation

### Fix:
```python
@router.get("/events/{application_id}", response_model=list[PlacementEventOut])
def get_placement_events(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Use it!
) -> list[PlacementEventOut]:
    """Audit trail of placement state changes (self-serve transparency)."""
    
    # ✅ ADD: Verify ownership
    application = (
        db.query(Application)
        .join(Candidate)
        .filter(
            Application.id == application_id,
            Candidate.user_id == current_user.id,  # ← Key check
        )
        .first()
    )
    
    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found or access denied"
        )
    
    # Now safe to query events
    events = (
        db.query(PlacementEvent)
        .filter(PlacementEvent.application_id == application_id)
        .order_by(PlacementEvent.created_at.desc())
        .all()
    )
    
    return [
        PlacementEventOut(
            id=e.id,
            event_type=e.event_type,
            actor=e.actor,
            detail=json.loads(e.detail_json) if e.detail_json else None,
            created_at=e.created_at,
        )
        for e in events
    ]
```

---

## ISSUE #2: Secrets Exposure w `/health/features`

### Severity: HIGH (Information Disclosure)

### Current Code:
```python
# File: backend/app/api/health.py:33-44

@router.get("/features")
def get_features_status() -> dict[str, Any]:
    """Which opt-in integrations are available in this environment."""
    return {
        "linkedin_oauth": is_linkedin_oauth_configured(),      # ⚠️ Leaks config
        "google_oauth": is_google_configured(),                # ⚠️ Leaks config
        "github_oauth": is_github_configured(),                # ⚠️ Leaks config
        "apple_oauth": is_apple_configured(),                  # ⚠️ Leaks config
        "google_calendar": is_google_calendar_configured(),    # ⚠️ Leaks config
        "smtp": bool(os.getenv("SMTP_HOST")),                  # ⚠️ Leaks config
    }
```

### Exploit:
```bash
curl https://api.twin.app/api/v1/health/features
# Returns:
{
  "linkedin_oauth": true,
  "google_oauth": true,
  "github_oauth": false,  # ← Attacker knows GitHub OAuth is disabled
  "apple_oauth": true,
  "google_calendar": true,
  "smtp": true
}
```

### Impact:
- **Reconnaissance:** Attacker zna które OAuth providers są aktywne
- **Targeted attacks:** Może skupić się na vulnerabilities w enabled providers
- **Social engineering:** "We noticed you use Google OAuth..." phishing
- **Competition intelligence:** Competitors widzą features

### Fix Option 1: Remove endpoint entirely
```python
# Delete /health/features endpoint
# Frontend should NOT depend on feature detection from backend
# Use environment variables on frontend side
```

### Fix Option 2: Move to authenticated endpoint
```python
@router.get("/features")
def get_features_status(
    current_user: User = Depends(get_current_user)  # ← Require auth
) -> dict[str, Any]:
    """Which opt-in integrations are available (authenticated)."""
    return {
        "linkedin_oauth": is_linkedin_oauth_configured(),
        "google_oauth": is_google_configured(),
        # ... rest
    }
```

### Fix Option 3: Frontend feature flags
```typescript
// frontend/.env.local
NEXT_PUBLIC_LINKEDIN_OAUTH_ENABLED=true
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
// etc.

// No need to query backend
```

**Recommendation:** **Option 3** (frontend env vars) - najczyściej

---

## ISSUE #3: CSV Export Memory Bomb

### Severity: HIGH (DoS / Memory Exhaustion)

### Current Code:
```python
# File: backend/app/api/applications.py:157-185

@router.get("/export/csv")
def export_applications_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Export all applications to CSV."""
    candidate = (
        db.query(Candidate)
        .filter(Candidate.user_id == current_user.id)
        .first()
    )
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # ⚠️ PROBLEM: Loads ALL applications into memory at once!
    applications = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id)
        .options(joinedload(Application.job))
        .all()  # ← Memory bomb if 10k+ applications
    )
    
    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Company", "Position", "Status", "Applied At"])
    
    for app in applications:  # ← All in memory
        writer.writerow([
            app.id,
            app.job.company,
            app.job.title,
            app.status.value,
            app.applied_at.isoformat() if app.applied_at else "",
        ])
    
    # ⚠️ Entire CSV in memory before sending
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )
```

### Attack Scenario:
```python
# User ma 15,000 applications (realistic dla heavy user)
# Każda application record ~500 bytes (with joined job data)
# Total memory: 15000 * 500 = 7.5 MB per request

# 10 concurrent requests = 75 MB
# 100 concurrent requests = 750 MB → Railway instance crashes (512 MB limit)
```

### Fix: Streaming Response
```python
from fastapi.responses import StreamingResponse
from sqlalchemy import text

@router.get("/export/csv")
def export_applications_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Export all applications to CSV (streaming)."""
    candidate = (
        db.query(Candidate)
        .filter(Candidate.user_id == current_user.id)
        .first()
    )
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    def generate_csv():
        """Stream CSV in chunks of 1000 rows."""
        # Send CSV header first
        yield "ID,Company,Position,Status,Applied At\n"
        
        offset = 0
        batch_size = 1000
        
        while True:
            # Fetch chunk
            applications = (
                db.query(Application)
                .filter(Application.candidate_id == candidate.id)
                .options(joinedload(Application.job))
                .offset(offset)
                .limit(batch_size)
                .all()
            )
            
            if not applications:
                break  # No more data
            
            # Stream chunk
            for app in applications:
                row = f"{app.id},{app.job.company},{app.job.title},"
                row += f"{app.status.value},"
                row += f"{app.applied_at.isoformat() if app.applied_at else ''}\n"
                yield row
            
            offset += batch_size
            
            # Small memory cleanup
            db.expunge_all()
    
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )
```

**Memory usage po fix:**
- Before: 7.5 MB per request (wszystko naraz)
- After: ~500 KB per request (1000 rows max w pamięci)
- **95% reduction in memory usage**

---

## ISSUE #4: Auto-Apply PDF w Ephemeral Storage

### Severity: HIGH (Feature Broken on Railway)

### Current Code:
```python
# File: backend/app/services/application_package_pdf.py:15-30

def generate_application_pdf(
    candidate: Candidate,
    job: Job,
    pitch: str,
) -> str:
    """Generate application package PDF."""
    
    # ⚠️ PROBLEM: Railway ma ephemeral filesystem!
    pdf_dir = "/tmp/twin-applications"  # ← Znika po restart
    os.makedirs(pdf_dir, exist_ok=True)
    
    filename = f"application_{candidate.id}_{job.id}.pdf"
    pdf_path = os.path.join(pdf_dir, filename)
    
    # Generate PDF...
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
    
    # ⚠️ Returns local path - NIE DZIAŁA gdy Railway restartuje!
    return pdf_path
```

### Problem:
1. Railway/Render mają **ephemeral filesystem**
2. `/tmp` jest czyszczony przy każdym deploy/restart
3. Auto-apply tworzy PDF → zapisuje w `/tmp` → restart → **PDF ZNIKNĄŁ**
4. Użytkownik próbuje pobrać PDF → 404 Not Found

### Fix: Cloud Storage (S3 / R2 / Cloud Storage)
```python
import boto3
from botocore.exceptions import ClientError

def generate_application_pdf(
    candidate: Candidate,
    job: Job,
    pitch: str,
) -> str:
    """Generate application package PDF (cloud storage)."""
    
    # Generate PDF bytes
    pdf_bytes = _generate_pdf_bytes(candidate, job, pitch)
    
    # ✅ Upload to S3 / R2
    s3_client = boto3.client(
        's3',
        endpoint_url=os.getenv("S3_ENDPOINT"),  # Cloudflare R2 lub AWS S3
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
    )
    
    bucket = os.getenv("S3_BUCKET", "twin-applications")
    key = f"applications/{candidate.id}/{job.id}/package.pdf"
    
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            # ✅ Presigned URL valid 7 days
            Expires=datetime.utcnow() + timedelta(days=7),
        )
        
        # ✅ Return public URL (lub presigned URL)
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=7 * 24 * 3600,  # 7 days
        )
        
        return url
        
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate application PDF. Please try again."
        )
```

**Alternative: Database BLOB Storage (simple but not recommended for scale)**
```python
# Add column to Application model
pdf_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

# Store in DB
application.pdf_data = pdf_bytes
db.commit()

# Download endpoint
@router.get("/applications/{id}/pdf")
def download_pdf(id: int, ...):
    app = db.query(Application).filter(...).first()
    return Response(content=app.pdf_data, media_type="application/pdf")
```

---

## ISSUE #5: Calendar Cancel Brak Google Sync

### Severity: MEDIUM (UX / Reliability)

### Current Code:
```python
# File: backend/app/api/calendar.py:186-199

@router.patch("/interviews/{interview_id}")
def update_interview(
    interview_id: int,
    status: str,  # "scheduled" | "cancelled" | "completed"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cancel or update interview status."""
    interview = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.user_id == current_user.id,
        )
        .first()
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # ✅ Update DB
    interview.status = status
    interview.updated_at = datetime.utcnow()
    db.commit()
    
    # ⚠️ PROBLEM: Nie aktualizuje Google Calendar event!
    # Interviewer dalej widzi event jako "scheduled" w swoim kalendarzu
    
    return {"message": "Interview updated", "status": status}
```

### Impact:
- Candidate anuluje rozmowę w TWIN → status = "cancelled"
- **Interviewer NIE WIE** bo Google Calendar event dalej jest active
- Interviewer czeka na Zoom call → candidate nie przychodzi → wasted time

### Fix: Add Google Calendar API Call
```python
from app.services.google_calendar_api import cancel_calendar_event

@router.patch("/interviews/{interview_id}")
def update_interview(
    interview_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cancel or update interview status."""
    interview = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.id == interview_id,
            ScheduledInterview.user_id == current_user.id,
        )
        .first()
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # ✅ Update DB
    old_status = interview.status
    interview.status = status
    interview.updated_at = datetime.utcnow()
    db.commit()
    
    # ✅ ADD: Sync with Google Calendar
    if status == "cancelled" and old_status != "cancelled":
        if interview.calendar_event_id:
            try:
                # Get user's calendar credentials
                calendar_creds = (
                    db.query(UserGoogleCalendar)
                    .filter(UserGoogleCalendar.user_id == current_user.id)
                    .first()
                )
                
                if calendar_creds:
                    cancel_calendar_event(
                        credentials=calendar_creds,
                        event_id=interview.calendar_event_id,
                    )
                    logger.info(f"Cancelled Google Calendar event {interview.calendar_event_id}")
                else:
                    logger.warning(f"No calendar credentials for user {current_user.id}")
                    
            except Exception as e:
                logger.error(f"Failed to cancel Google Calendar event: {e}")
                # Don't fail entire request if Google API fails
                # Status is already updated in DB
    
    return {"message": "Interview updated", "status": status}
```

**Function in `google_calendar_api.py`:**
```python
def cancel_calendar_event(credentials: UserGoogleCalendar, event_id: str):
    """Cancel (delete) a Google Calendar event."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    
    # Decrypt refresh token
    refresh_token = decrypt_token(credentials.refresh_token_encrypted)
    
    # Build Google Calendar API client
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )
    
    service = build("calendar", "v3", credentials=creds)
    
    # Delete event (marks as cancelled in Google Calendar)
    service.events().delete(
        calendarId="primary",
        eventId=event_id,
    ).execute()
```

---

## Summary Security Issues

| Issue | Severity | CVSS | Fix Time | Status |
|-------|----------|------|----------|--------|
| IDOR placement events | HIGH | 7.5 | 1h | ❌ Not fixed |
| Secrets exposure /health/features | HIGH | 6.5 | 30min | ❌ Not fixed |
| CSV memory bomb | HIGH | 7.0 | 4h | ❌ Not fixed |
| PDF ephemeral storage | HIGH | 8.0 | 6h | ❌ Not fixed |
| Calendar sync missing | MEDIUM | 5.0 | 8h | ❌ Not fixed |
| Rate limiting auth | MEDIUM | 6.0 | 3h | ❌ Not fixed |
| localStorage error handling | MEDIUM | 4.0 | 1h | ❌ Not fixed |

**Total fix time: ~23.5 hours** (3 robocze dni)

**Priority order:**
1. IDOR (1h) - immediate data leak
2. Secrets exposure (30min) - easy quick win
3. localStorage (1h) - prevents crashes
4. Rate limiting (3h) - prevents brute force
5. PDF storage (6h) - Railway deployment blocker
6. CSV streaming (4h) - DoS prevention
7. Calendar sync (8h) - UX improvement

