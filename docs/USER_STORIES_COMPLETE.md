# 🎭 TWIN: Complete User Stories - All Personas

## 📊 OVERVIEW

**Total Stories: 110**
- Candidate (Job Seeker): 50 stories (US-C001 to US-C050)
- B2B Recruiter: 40 stories (US-R001 to US-R040)
- Investor: 20 stories (US-I001 to US-I020)

---

# 👤 PERSONA 1: CANDIDATE (50 Stories)

## 🎯 CATEGORY 1: ONBOARDING & REGISTRATION (5 stories)

### **US-C001: View Landing Page**
**As a** anonymous visitor  
**I want to** see TWIN's value proposition  
**So that** I can decide if I want to sign up

**Acceptance Criteria:**
- Given I visit twin.app
- When page loads
- Then I see hero section with clear value prop
- And I see "Get Started" CTA button
- And I see social proof (user count, success stories)
- And I can navigate to /about, /how-it-works, /pricing

**Priority:** Critical  
**Edge Cases:** Mobile layout, slow connection, ad blockers, GDPR banner

---

### **US-C002: Sign Up with Email/OAuth**
**As a** new user  
**I want to** create an account quickly  
**So that** I can start using TWIN

**Acceptance Criteria:**
- Given I'm on landing page
- When I click "Get Started"
- Then I see signup options: Email, Google, LinkedIn
- And I can complete signup with any method
- And I receive welcome email
- And I'm redirected to /onboarding

**Priority:** Critical  
**Edge Cases:** Email exists, weak password, OAuth fails, network error, email verification expires

---

### **US-C003: Complete Onboarding Flow**
**As a** newly signed up user  
**I want to** complete my profile setup  
**So that** TWIN can match me with jobs

**Acceptance Criteria:**
- Given I just signed up
- When redirected to /onboarding
- Then I see 5-step wizard: Welcome, Profile, Skills, Preferences, CV
- And I can navigate forward/backward
- And progress saves automatically
- And I can skip optional steps
- And completion redirects me to dashboard

**Priority:** Critical  
**Edge Cases:** Browser refresh, close tab mid-flow, skip validation, duplicate data, CV upload fails

---

### **US-C004: Complete Email Verification**
**As a** new user  
**I want to** verify my email address  
**So that** my account is fully activated

**Acceptance Criteria:**
- Given I signed up with email
- When I receive verification email
- Then I can click verification link
- And my email is marked as verified
- And I see confirmation message
- And I can access full features

**Priority:** High  
**Edge Cases:** Link expires, already verified, wrong user clicks link, email client blocks link

---

### **US-C005: Resume Incomplete Onboarding**
**As a** user who didn't complete onboarding  
**I want to** continue from where I left off  
**So that** I don't have to start over

**Acceptance Criteria:**
- Given I started but didn't finish onboarding
- When I log in again
- Then I'm redirected to last incomplete step
- And previous data is pre-filled
- And I can complete remaining steps

**Priority:** Medium  
**Edge Cases:** Multiple devices, data conflicts, expired session, cleared cookies

---

## 📝 CATEGORY 2: PROFILE & CV MANAGEMENT (8 stories)

### **US-C006: View My Profile**
**As a** logged-in candidate  
**I want to** view my complete profile  
**So that** I can see what information TWIN has about me

**Acceptance Criteria:**
- Given I'm logged in
- When I navigate to /dashboard/profile
- Then I see all profile fields: name, title, skills, experience, location, salary
- And I see my CV if uploaded
- And I see profile completeness percentage
- And I see last updated timestamp

**Priority:** High  
**Edge Cases:** Empty profile, partial data, very long skill list, special characters in name

---

### **US-C007: Edit Profile Information**
**As a** candidate  
**I want to** update my profile  
**So that** TWIN has accurate information for matching

**Acceptance Criteria:**
- Given I'm on my profile page
- When I click "Edit"
- Then all fields become editable
- And I can modify any field
- And changes save on blur
- And I see "Saved" indicator
- And match scores recalculate automatically

**Priority:** High  
**Edge Cases:** Concurrent edits, invalid data, field too long, emoji in text, SQL injection attempt

---

### **US-C008: Upload CV**
**As a** candidate  
**I want to** upload my CV  
**So that** TWIN can extract information automatically

**Acceptance Criteria:**
- Given I'm on profile page
- When I click "Upload CV"
- Then I can select PDF/DOC/DOCX file (max 10MB)
- And file uploads to secure storage
- And I see upload progress
- And upload completes with success message

**Priority:** Critical  
**Edge Cases:** File too large, wrong format, corrupted file, network interruption, no space on server

---

### **US-C009: Parse CV with AI**
**As a** candidate  
**I want to** TWIN to extract information from my CV  
**So that** I don't have to manually enter everything

**Acceptance Criteria:**
- Given I uploaded a CV
- When parsing completes
- Then I see extracted data: skills, experience, education, languages
- And I can review extracted data
- And I can correct mistakes
- And I can confirm or reject extraction

**Priority:** High  
**Edge Cases:** Scanned PDF (OCR needed), non-English CV, creative layout, missing info, hallucinated data

---

### **US-C010: View CV History**
**As a** candidate  
**I want to** see all CVs I've uploaded  
**So that** I can switch between versions or delete old ones

**Acceptance Criteria:**
- Given I uploaded multiple CVs
- When I view CV section
- Then I see list of all CVs with upload dates
- And I can mark one as "active"
- And I can download any CV
- And I can delete old CVs

**Priority:** Low  
**Edge Cases:** 50+ CVs uploaded, same filename, deleted CV still referenced, storage quota

---

### **US-C011: Generate AI-Enhanced CV**
**As a** candidate  
**I want to** generate an improved version of my CV  
**So that** I can use it for applications

**Acceptance Criteria:**
- Given I have profile data
- When I click "Generate Enhanced CV"
- Then TWIN creates polished PDF with my info
- And I can customize template
- And I can download result
- And I can use it for applications

**Priority:** Medium  
**Edge Cases:** Missing data, very long experience, special formatting, multilingual content

---

### **US-C012: Add Skills Manually**
**As a** candidate  
**I want to** add skills to my profile  
**So that** I can specify expertise not in my CV

**Acceptance Criteria:**
- Given I'm editing my profile
- When I go to skills section
- Then I can search and add skills from database
- And I can add custom skills if not found
- And I can set proficiency level (Beginner/Intermediate/Expert)
- And I can remove skills

**Priority:** High  
**Edge Cases:** Duplicate skills, typos, non-technical skills, 100+ skills added, offensive skill names

---

### **US-C013: Set Salary Expectations**
**As a** candidate  
**I want to** specify my desired salary range  
**So that** TWIN only shows jobs within my range

**Acceptance Criteria:**
- Given I'm editing preferences
- When I set salary range
- Then I specify min and max
- And I choose currency
- And I choose frequency (annual/monthly)
- And matches filter by this range

**Priority:** High  
**Edge Cases:** Unrealistic range, currency conversion, very wide range, negative values, equity preferences

---

## 🎯 CATEGORY 3: JOB MATCHING (10 stories)

### **US-C014: View Top Matches**
**As a** candidate  
**I want to** see jobs that match my profile  
**So that** I can find relevant opportunities quickly

**Acceptance Criteria:**
- Given I completed my profile
- When I visit /dashboard/matches
- Then I see jobs sorted by match score (highest first)
- And each job shows: title, company, location, salary, match %
- And I see "Why this matches you" explanation
- And I can click to view full details

**Priority:** Critical  
**Edge Cases:** No matches found, all low scores (<50%), duplicate jobs, stale job listings

---

### **US-C015: Filter Matches**
**As a** candidate  
**I want to** filter job matches  
**So that** I can focus on specific criteria

**Acceptance Criteria:**
- Given I'm viewing matches
- When I apply filters
- Then I can filter by: location, salary, job board, remote/hybrid/onsite, match score
- And results update in real-time
- And filter state persists across sessions
- And I can clear all filters

**Priority:** High  
**Edge Cases:** No results after filtering, conflicting filters, saved filter combinations

---

### **US-C016: Sort Matches**
**As a** candidate  
**I want to** sort matches by different criteria  
**So that** I can prioritize which jobs to review

**Acceptance Criteria:**
- Given I'm viewing matches
- When I select sort option
- Then I can sort by: match score, salary, posted date, company rating
- And sort order persists
- And I can toggle ascending/descending

**Priority:** Medium  
**Edge Cases:** Ties in sorting, missing data for sort field, very long list (1000+ matches)

---

### **US-C017: Save Job for Later**
**As a** candidate  
**I want to** save interesting jobs  
**So that** I can review them later

**Acceptance Criteria:**
- Given I'm viewing a job
- When I click "Save"
- Then job is added to my saved list
- And I can view all saved jobs at /dashboard/saved
- And I can remove from saved list
- And I get notification if saved job expires

**Priority:** High  
**Edge Cases:** Save same job twice, job deleted by employer, 100+ saved jobs, saved job changes

---

### **US-C018: Reject/Hide Match**
**As a** candidate  
**I want to** remove jobs I'm not interested in  
**So that** I don't see them again

**Acceptance Criteria:**
- Given I'm viewing a job
- When I click "Not Interested"
- Then job is removed from my feed
- And I can provide optional reason
- And TWIN learns my preferences
- And I can view rejected jobs later

**Priority:** High  
**Edge Cases:** Accidentally reject, undo rejection, too many rejections affect algorithm

---

### **US-C019: View Job Details**
**As a** candidate  
**I want to** see complete job information  
**So that** I can make informed decision

**Acceptance Criteria:**
- Given I click on a job match
- When details page loads
- Then I see: full description, requirements, responsibilities, benefits
- And I see company info and ratings
- And I see how my profile matches each requirement
- And I see application method

**Priority:** Critical  
**Edge Cases:** Missing job data, company not found, very long description, special characters

---

### **US-C020: See Match Explanation**
**As a** candidate  
**I want to** understand why a job matches my profile  
**So that** I can trust TWIN's recommendations

**Acceptance Criteria:**
- Given I'm viewing a job
- When I click "Why this matches"
- Then I see breakdown: skill matches, title match, location match, salary match
- And I see which of my skills match requirements
- And I see confidence level for each factor

**Priority:** High  
**Edge Cases:** Low match with unclear reason, all factors low, contradictory signals

---

### **US-C021: Get Match Notifications**
**As a** candidate  
**I want to** receive alerts for new high matches  
**So that** I can apply quickly to best opportunities

**Acceptance Criteria:**
- Given I have notification preferences set
- When a new job matches me at ≥85%
- Then I receive email notification
- And I receive in-app notification
- And notification includes job summary
- And I can apply directly from notification

**Priority:** High  
**Edge Cases:** Too many notifications, notification fatigue, unsubscribe, spam folder

---

### **US-C022: Search Jobs Manually**
**As a** candidate  
**I want to** search for specific jobs  
**So that** I can find opportunities TWIN might have missed

**Acceptance Criteria:**
- Given I'm on dashboard
- When I use search bar
- Then I can search by: keywords, company name, job title
- And I see results with match scores
- And I can apply filters to search results
- And recent searches are saved

**Priority:** Medium  
**Edge Cases:** No search results, typos in search, very broad search (10k results), special characters

---

### **US-C023: View Similar Jobs**
**As a** candidate  
**I want to** see jobs similar to one I'm viewing  
**So that** I can find more opportunities in same category

**Acceptance Criteria:**
- Given I'm viewing a job detail page
- When I scroll to "Similar Jobs"
- Then I see 5-10 similar jobs
- And similarity is based on: title, skills, company
- And I can click to view each similar job

**Priority:** Low  
**Edge Cases:** No similar jobs, all similar jobs already applied to, circular recommendations

---

## 📤 CATEGORY 4: APPLICATIONS (12 stories)

### **US-C024: Apply Manually to Job**
**As a** candidate  
**I want to** apply to a job manually  
**So that** I can submit my application to the employer

**Acceptance Criteria:**
- Given I'm viewing a job I want to apply to
- When I click "Apply"
- Then I'm taken to application form
- And I can write custom cover letter
- And I can choose which CV version to submit
- And I can review before submitting
- And application is recorded in my dashboard

**Priority:** Critical  
**Edge Cases:** External redirect required, application link broken, cover letter too long, submit timeout

---

### **US-C025: Auto-Apply to Job (with consent)**
**As a** candidate  
**I want to** auto-apply to supported job boards  
**So that** I can save time on repetitive applications

**Acceptance Criteria:**
- Given job supports auto-apply (Pracuj.pl)
- When I click "Auto-Apply"
- Then TWIN fills out application automatically
- And generates custom cover letter
- And submits on my behalf
- And I receive confirmation
- And application is tracked

**Priority:** Critical  
**Edge Cases:** CAPTCHA blocks bot, form fields changed, submission fails, already applied, rate limited

---

### **US-C026: Enable Nightly Auto-Apply**
**As a** candidate  
**I want to** enable automatic applications while I sleep  
**So that** TWIN applies to best matches without my intervention

**Acceptance Criteria:**
- Given I'm on /dashboard/settings/auto-apply
- When I enable auto-apply
- Then I see consent modal with clear terms
- And I agree to terms
- And I set preferences (min score, daily limit)
- And TWIN applies nightly to top matches
- And I receive morning summary email

**Priority:** Critical  
**Edge Cases:** Change preferences mid-run, disable while running, hit rate limit, no matches found, job board errors

---

### **US-C027: View Application Status**
**As a** candidate  
**I want to** see status of all my applications  
**So that** I can track my job search progress

**Acceptance Criteria:**
- Given I have submitted applications
- When I visit /dashboard/applications
- Then I see all applications with statuses: Applied, Viewed, Interview, Rejected, Hired
- And I see timeline for each application
- And I can filter by status
- And I see response rate statistics

**Priority:** High  
**Edge Cases:** Status never updates, conflicting statuses, very old applications, bulk status changes

---

### **US-C028: Withdraw Application**
**As a** candidate  
**I want to** withdraw an application  
**So that** I can remove myself from consideration if I'm no longer interested

**Acceptance Criteria:**
- Given I have an active application
- When I click "Withdraw"
- Then I see confirmation dialog
- And I can optionally provide reason
- And application status changes to "Withdrawn"
- And employer is notified (if applicable)

**Priority:** Medium  
**Edge Cases:** Already received offer, mid-interview process, employer already rejected, can't undo withdrawal

---

### **US-C029: Track Application Analytics**
**As a** candidate  
**I want to** see statistics about my applications  
**So that** I can understand my job search effectiveness

**Acceptance Criteria:**
- Given I have application history
- When I view /dashboard/applications/analytics
- Then I see: total applications, response rate, average time to response
- And I see breakdown by job board
- And I see funnel: Applied → Viewed → Interview → Offer
- And I see trends over time

**Priority:** Medium  
**Edge Cases:** Insufficient data (<5 applications), outliers skew averages, seasonal trends

---

### **US-C030: Resend Application**
**As a** candidate  
**I want to** reapply to a job  
**So that** I can try again if previous attempt failed

**Acceptance Criteria:**
- Given I previously applied to a job
- When application failed or was withdrawn
- Then I can click "Reapply"
- And I can update my materials
- And I can resubmit application

**Priority:** Low  
**Edge Cases:** Job expired, duplicate detection, employer blocks reapplications, cooling period required

---

### **US-C031: Generate Cover Letter with AI**
**As a** candidate  
**I want to** generate custom cover letter for each job  
**So that** I can personalize applications without writing from scratch

**Acceptance Criteria:**
- Given I'm applying to a job
- When I click "Generate Cover Letter"
- Then AI creates personalized letter based on my profile + job description
- And I can edit generated content
- And I can save as template for similar jobs
- And tone matches my preferences

**Priority:** High  
**Edge Cases:** Hallucinated experience, too generic, too formal/casual, wrong company name, character limit

---

### **US-C032: Export Application History**
**As a** candidate  
**I want to** export my application data  
**So that** I can analyze it in spreadsheet or share with advisor

**Acceptance Criteria:**
- Given I have application history
- When I click "Export"
- Then I can download CSV with all application data
- And CSV includes: job title, company, date applied, status, outcome
- And I can choose date range
- And export includes notes I've added

**Priority:** Low  
**Edge Cases:** Very large export (1000+ apps), special characters in data, timezone confusion

---

### **US-C033: Add Notes to Application**
**As a** candidate  
**I want to** add personal notes to applications  
**So that** I can remember important details about each opportunity

**Acceptance Criteria:**
- Given I'm viewing an application
- When I add note
- Then note is saved and visible only to me
- And I can edit notes later
- And I can search notes
- And notes appear in application timeline

**Priority:** Medium  
**Edge Cases:** Very long notes, rich formatting, notes on deleted applications, search performance

---

### **US-C034: Share Application with Advisor**
**As a** candidate  
**I want to** share application details with my career coach  
**So that** they can give me feedback

**Acceptance Criteria:**
- Given I have an application
- When I click "Share"
- Then I can generate unique shareable link
- And link expires after set time
- And shared view shows application + job details
- And I can revoke access anytime

**Priority:** Low  
**Edge Cases:** Link shared publicly, expired link clicked, too many shares, privacy concerns

---

### **US-C035: Set Application Reminders**
**As a** candidate  
**I want to** set reminders to follow up  
**So that** I don't forget about pending applications

**Acceptance Criteria:**
- Given I have an application without response
- When I set reminder
- Then I choose reminder date/time
- And I receive notification when due
- And I can snooze or dismiss
- And reminder shows in calendar

**Priority:** Medium  
**Edge Cases:** Past date selected, too many reminders, already received response, notification failed

---

## 📅 CATEGORY 5: CALENDAR & INTERVIEWS (6 stories)

### **US-C036: Connect Google Calendar**
**As a** candidate  
**I want to** sync my Google Calendar  
**So that** interview invites automatically appear in my calendar

**Acceptance Criteria:**
- Given I'm on /dashboard/settings/integrations
- When I click "Connect Google Calendar"
- Then OAuth flow completes
- And I grant calendar read/write access
- And TWIN can now create interview events
- And I see "Connected" status

**Priority:** High  
**Edge Cases:** OAuth denied, multiple Google accounts, calendar permission revoked, token expires

---

### **US-C037: Connect Outlook Calendar**
**As a** candidate  
**I want to** sync Microsoft Outlook calendar  
**So that** corporate users can integrate with their work calendar

**Acceptance Criteria:**
- Given I'm on integrations page
- When I connect Outlook
- Then Microsoft OAuth completes
- And I choose which calendar to sync
- And interview events sync both ways

**Priority:** Medium  
**Edge Cases:** Office 365 vs personal account, multi-calendar user, tenant restrictions

---

### **US-C038: Subscribe to WebCal Feed**
**As a** candidate  
**I want to** subscribe to interview calendar feed  
**So that** I can view in any calendar app without OAuth

**Acceptance Criteria:**
- Given I'm on calendar settings
- When I click "Get WebCal URL"
- Then I receive unique ICS subscription link
- And I can add to any calendar app
- And interviews appear automatically
- And I can regenerate URL if needed

**Priority:** High  
**Edge Cases:** URL leaked publicly, calendar not updating, very old calendar app, URL too long

---

### **US-C039: View Upcoming Interviews**
**As a** candidate  
**I want to** see all scheduled interviews  
**So that** I can prepare and manage my time

**Acceptance Criteria:**
- Given I have interview invites
- When I visit /dashboard/calendar
- Then I see chronological list of upcoming interviews
- And each shows: job title, company, date/time, interview type, location/link
- And I can click to view job details
- And I see countdown to next interview

**Priority:** High  
**Edge Cases:** Past interviews showing, time zone confusion, overlapping interviews, cancelled but not removed

---

### **US-C040: Receive Interview Reminders**
**As a** candidate  
**I want to** get reminded before interviews  
**So that** I'm never late or unprepared

**Acceptance Criteria:**
- Given I have interview scheduled
- When interview is 24h away
- Then I receive email reminder
- And I receive in-app notification 1h before
- And reminder includes: prep tips, interviewer names, meeting link
- And I can adjust reminder timing

**Priority:** High  
**Edge Cases:** Wrong timezone, email in spam, too many reminders, interview rescheduled last minute

---

### **US-C041: Reschedule or Cancel Interview**
**As a** candidate  
**I want to** reschedule or cancel interviews  
**So that** I can manage conflicts

**Acceptance Criteria:**
- Given I have scheduled interview
- When I need to change time
- Then I can request reschedule with reason
- And employer receives notification
- And calendar updates when confirmed
- Or I can cancel with reason

**Priority:** Medium  
**Edge Cases:** Too close to interview time, employer already en route, multiple reschedule requests

---

## 🔔 CATEGORY 6: NOTIFICATIONS & FEEDBACK (4 stories)

### **US-C042: Configure Notification Preferences**
**As a** candidate  
**I want to** control what notifications I receive  
**So that** I'm not overwhelmed but stay informed

**Acceptance Criteria:**
- Given I'm on /dashboard/settings/notifications
- When I configure preferences
- Then I can toggle: new matches, applications, interviews, messages, promotions
- And I can choose channels: email, in-app, SMS
- And I can set quiet hours
- And I can unsubscribe from all non-critical

**Priority:** High  
**Edge Cases:** Unsubscribe from everything, conflicting preferences, legal notifications always sent

---

### **US-C043: Rate Job Matches**
**As a** candidate  
**I want to** rate how good matches are  
**So that** TWIN learns my preferences

**Acceptance Criteria:**
- Given I'm viewing a job
- When I rate it (👍👎 or 1-5 stars)
- Then rating is saved
- And future matches improve based on feedback
- And I can change rating later
- And I see "Why are you rating this way?" optional feedback

**Priority:** Medium  
**Edge Cases:** Rate everything negative, inconsistent ratings, spam ratings, rating deleted jobs

---

### **US-C044: Report Issues**
**As a** candidate  
**I want to** report problems with jobs or the platform  
**So that** TWIN team can fix issues

**Acceptance Criteria:**
- Given I encounter a problem
- When I click "Report Issue"
- Then I can select category: incorrect job data, broken link, spam, bug, other
- And I can add description
- And I can attach screenshot
- And I receive ticket number
- And I get updates on resolution

**Priority:** Medium  
**Edge Cases:** Duplicate reports, malicious reports, report without description, screenshot too large

---

### **US-C045: Provide Platform Feedback**
**As a** candidate  
**I want to** suggest improvements  
**So that** TWIN can build features I need

**Acceptance Criteria:**
- Given I have an idea
- When I submit feedback
- Then I describe my suggestion
- And I can see other users' suggestions
- And I can upvote suggestions I like
- And I see status: under review, planned, shipped

**Priority:** Low  
**Edge Cases:** Inappropriate suggestions, duplicate ideas, feature already exists, very popular but impossible request

---

## 🎁 CATEGORY 7: REFERRALS & GROWTH (4 stories)

### **US-C046: Invite Friends**
**As a** candidate  
**I want to** refer friends to TWIN  
**So that** they can benefit and I can earn rewards

**Acceptance Criteria:**
- Given I'm on /dashboard/referrals
- When I generate referral link
- Then I get unique tracking URL
- And I can share via email, social, or copy link
- And I see how many friends signed up
- And I earn bonus when friend gets hired

**Priority:** Medium  
**Edge Cases:** Self-referral attempt, referral loop (A→B→A), spam referrals, expired referrals

---

### **US-C047: Track Referral Rewards**
**As a** candidate  
**I want to** see my referral earnings  
**So that** I know what I've earned

**Acceptance Criteria:**
- Given I've referred users
- When I view referrals dashboard
- Then I see: total referred, active users, rewards earned, pending rewards
- And I see reward breakdown per friend
- And I can cash out or apply to subscription

**Priority:** Medium  
**Edge Cases:** Fraud detection, friend refund/churn, reward disputes, minimum cashout not met

---

### **US-C048: View Referral Leaderboard**
**As a** candidate  
**I want to** see top referrers  
**So that** I can compete and get motivated

**Acceptance Criteria:**
- Given public leaderboard exists
- When I visit /referrals/leaderboard
- Then I see top 100 referrers by count
- And I see my rank if I've referred anyone
- And I see prizes for top performers
- And leaderboard updates weekly

**Priority:** Low  
**Edge Cases:** Gaming the system, tied ranks, removed users still on leaderboard, privacy concerns

---

### **US-C049: Join Beta Program**
**As a** engaged candidate  
**I want to** access early features  
**So that** I can try new functionality first

**Acceptance Criteria:**
- Given beta program is open
- When I apply to join
- Then I fill out survey about my usage
- And I accept beta terms
- And I'm added to beta cohort if accepted
- And I see "Beta" badge + access to experimental features

**Priority:** Low  
**Edge Cases:** Beta full, features break for beta users, leave beta program, beta features removed

---

## ⚙️ CATEGORY 8: SETTINGS & ACCOUNT (2 stories)

### **US-C050: Manage Account Settings**
**As a** candidate  
**I want to** control my account preferences  
**So that** I can customize TWIN to my needs

**Acceptance Criteria:**
- Given I'm on /dashboard/settings
- When I view settings
- Then I can change: email, password, language, timezone, theme
- And I can connect/disconnect integrations
- And I can manage billing
- And I can delete account

**Priority:** High  
**Edge Cases:** Email change requires verification, password requirements, theme persists across devices, delete with active subscription

---

# 🏢 PERSONA 2: B2B RECRUITER (40 Stories)

## 🎯 CATEGORY 1: COMPANY REGISTRATION (5 stories)

### **US-R001: Register Company Account**
**As a** recruiter  
**I want to** create company account  
**So that** I can post jobs and hire candidates

**Acceptance Criteria:**
- Given I visit /recruiter/signup
- When I fill out company info: name, website, industry, size
- Then company account is created
- And I'm primary admin
- And I'm redirected to onboarding
- And I can invite team members

**Priority:** Critical  
**Edge Cases:** Company already exists, invalid domain, free email (Gmail), company verification needed

---

### **US-R002: Verify Company Domain**
**As a** company admin  
**I want to** verify domain ownership  
**So that** my company is marked as verified

**Acceptance Criteria:**
- Given I registered company
- When I add DNS TXT record or upload HTML file
- Then verification process runs
- And company gets "Verified" badge
- And trust score increases

**Priority:** High  
**Edge Cases:** DNS propagation delay, wrong record, multiple subdomains, verification expires

---

### **US-R003: Complete Company Profile**
**As a** recruiter  
**I want to** add company details  
**So that** candidates can learn about us

**Acceptance Criteria:**
- Given I have company account
- When I edit company profile
- Then I can add: logo, description, benefits, culture, photos, videos
- And I can add social media links
- And changes publish immediately

**Priority:** High  
**Edge Cases:** Very large logo, inappropriate content, broken links, content moderation needed

---

### **US-R004: Set Hiring Preferences**
**As a** recruiter  
**I want to** configure hiring settings  
**So that** TWIN matches candidates appropriately

**Acceptance Criteria:**
- Given I'm setting up account
- When I configure preferences
- Then I set: typical response time, interview process length, hiring urgency
- And I set communication preferences
- And I set which notifications I want

**Priority:** Medium  
**Edge Cases:** Unrealistic expectations (1h response time), conflicting preferences

---

### **US-R005: Connect Payment Method**
**As a** company admin  
**I want to** add payment information  
**So that** I can pay for placements

**Acceptance Criteria:**
- Given I'm on billing settings
- When I add payment method
- Then I can choose: credit card, ACH, invoice
- And payment info is stored securely (Stripe)
- And I see "Payment method added" confirmation
- And I can set billing contact

**Priority:** High  
**Edge Cases:** Card declined, expired card, fraud prevention blocks, international payment

---

## 📋 CATEGORY 2: JOB POSTING (8 stories)

### **US-R006: Create Job Posting**
**As a** recruiter  
**I want to** post a new job  
**So that** candidates can find and apply

**Acceptance Criteria:**
- Given I'm on /recruiter/jobs
- When I click "Create Job"
- Then I fill out: title, description, requirements, salary range, location, type
- And I can preview how it looks to candidates
- And I can save as draft or publish immediately
- And published job appears in candidate feeds

**Priority:** Critical  
**Edge Cases:** Missing required fields, very long description, special characters, duplicate job

---

### **US-R007: Edit Existing Job**
**As a** recruiter  
**I want to** update job details  
**So that** information stays accurate

**Acceptance Criteria:**
- Given I have posted jobs
- When I edit a job
- Then I can modify any field
- And changes publish immediately
- And candidates see updated info
- And applications already received stay valid

**Priority:** High  
**Edge Cases:** Job has applicants mid-edit, major changes (title change), edit while applications come in

---

### **US-R008: Pause or Close Job**
**As a** recruiter  
**I want to** temporarily stop accepting applications  
**So that** I can manage application volume

**Acceptance Criteria:**
- Given I have active job
- When I pause job
- Then it's hidden from new candidate searches
- And existing applicants can still proceed
- And I can reopen anytime
- Or I can close permanently when position is filled

**Priority:** High  
**Edge Cases:** Pause with pending interviews, close with offers out, auto-close after 90 days

---

### **US-R009: Duplicate Job Template**
**As a** recruiter  
**I want to** copy existing job posting  
**So that** I can quickly create similar roles

**Acceptance Criteria:**
- Given I have existing job
- When I click "Duplicate"
- Then new draft is created with same details
- And I can modify before publishing
- And original job is unchanged

**Priority:** Medium  
**Edge Cases:** Duplicate already-filled job, duplicate from another company (if multi-company admin)

---

### **US-R010: Use Job Templates**
**As a** recruiter  
**I want to** save job templates  
**So that** I can standardize similar roles

**Acceptance Criteria:**
- Given I'm creating job
- When I save as template
- Then template is saved for reuse
- And I can create job from template
- And template variables auto-fill

**Priority:** Medium  
**Edge Cases:** 50+ templates, organize by category, share templates with team, outdated templates

---

### **US-R011: Set Application Questions**
**As a** recruiter  
**I want to** add screening questions  
**So that** I can pre-qualify candidates

**Acceptance Criteria:**
- Given I'm creating/editing job
- When I add questions
- Then I can choose: multiple choice, text, yes/no, disqualifying questions
- And questions appear in application form
- And I can mark required vs optional
- And answers appear with application

**Priority:** High  
**Edge Cases:** Too many questions (20+), confusing questions, answers too long, skip logic needed

---

### **US-R012: Boost Job Visibility**
**As a** recruiter  
**I want to** promote urgent jobs  
**So that** I get more applications faster

**Acceptance Criteria:**
- Given I have active job
- When I boost it
- Then it appears higher in candidate feeds
- And more candidates see it
- And I pay boost fee
- And boost lasts for set duration

**Priority:** Medium  
**Edge Cases:** Boost multiple jobs, boost limit reached, boost during low traffic period

---

### **US-R013: View Job Analytics**
**As a** recruiter  
**I want to** see job posting performance  
**So that** I can optimize future postings

**Acceptance Criteria:**
- Given I have posted jobs
- When I view analytics
- Then I see: views, applications, conversion rate, avg match score
- And I see funnel: Viewed → Saved → Applied → Interviewed → Hired
- And I can compare jobs
- And I see time-to-fill

**Priority:** High  
**Edge Cases:** No views yet, very old jobs, seasonal variations, outlier job (viral)

---

## 👥 CATEGORY 3: CANDIDATE MANAGEMENT (10 stories)

### **US-R014: Browse Candidate Database**
**As a** recruiter  
**I want to** search for candidates proactively  
**So that** I can find talent even if they didn't apply

**Acceptance Criteria:**
- Given I have recruiter account
- When I visit /recruiter/candidates
- Then I can search by: skills, title, location, experience
- And I see match scores for my open jobs
- And I can view candidate profiles
- And I can reach out if they're open to opportunities

**Priority:** High  
**Edge Cases:** Candidate set profile to private, very broad search (10k results), location ambiguity

---

### **US-R015: View Candidate Profile**
**As a** recruiter  
**I want to** see complete candidate information  
**So that** I can evaluate fit

**Acceptance Criteria:**
- Given I'm reviewing candidates
- When I click on profile
- Then I see: CV, skills, experience, portfolio, match scores for my jobs
- And I see application history with my company
- And I can see public info only (privacy protected)
- And I can download their CV

**Priority:** High  
**Edge Cases:** Candidate deleted account, CV not uploaded, profile incomplete, blocked my company

---

### **US-R016: Shortlist Candidates**
**As a** recruiter  
**I want to** create shortlist of top candidates  
**So that** I can focus on best matches

**Acceptance Criteria:**
- Given I'm reviewing applicants
- When I click "Add to Shortlist"
- Then candidate is added to job's shortlist
- And I can organize into pipeline stages: Screen, Interview, Offer
- And I can drag-drop to reorder
- And team members see shortlist

**Priority:** High  
**Edge Cases:** Shortlist across multiple jobs, candidate in multiple shortlists, archive shortlist

---

### **US-R017: Message Candidates**
**As a** recruiter  
**I want to** communicate with applicants  
**So that** I can coordinate interviews and updates

**Acceptance Criteria:**
- Given I have applicants
- When I send message
- Then candidate receives email + in-app notification
- And conversation is threaded
- And I can send templates for common messages
- And team members see conversation history

**Priority:** High  
**Edge Cases:** Candidate doesn't respond, spam detection, message length, attachments, mass message

---

### **US-R018: Schedule Interview**
**As a** recruiter  
**I want to** schedule interviews with candidates  
**So that** process moves forward efficiently

**Acceptance Criteria:**
- Given I selected candidate for interview
- When I send interview invite
- Then candidate receives calendar invite
- And I can suggest multiple time slots
- And candidate confirms availability
- And interview appears in both calendars
- And automatic reminders are sent

**Priority:** Critical  
**Edge Cases:** Timezone mismatch, candidate declines all times, calendar conflict, video link broken

---

### **US-R019: Reject Application**
**As a** recruiter  
**I want to** decline candidates professionally  
**So that** they have closure

**Acceptance Criteria:**
- Given I reviewed application
- When I reject candidate
- Then I select rejection reason
- And I can customize rejection email
- And candidate receives notification
- And application status updates
- And candidate can't reapply for 6 months (optional)

**Priority:** High  
**Edge Cases:** Mass rejection, reject after interview, candidate already accepted elsewhere

---

### **US-R020: Move Candidate Through Pipeline**
**As a** recruiter  
**I want to** track candidates through hiring stages  
**So that** nothing falls through cracks

**Acceptance Criteria:**
- Given I have applicants
- When I move candidate between stages
- Then stage updates: Applied → Screening → Interview → Offer → Hired
- And candidate receives status update
- And I can add notes at each stage
- And I see time spent in each stage

**Priority:** High  
**Edge Cases:** Skip stages, move backwards, stuck in stage for months, automated stage transitions

---

### **US-R021: Export Candidate Data**
**As a** recruiter  
**I want to** export applicant information  
**So that** I can analyze in external tools

**Acceptance Criteria:**
- Given I have applicants
- When I export
- Then I can download CSV with candidate data
- And I choose which fields to include
- And export respects privacy settings
- And I can export for specific job or all jobs

**Priority:** Medium  
**Edge Cases:** Very large export (5000 candidates), PII handling, GDPR compliance, encrypted export

---

### **US-R022: Tag and Categorize Candidates**
**As a** recruiter  
**I want to** organize candidates with tags  
**So that** I can group by characteristics

**Acceptance Criteria:**
- Given I'm viewing candidate
- When I add tags
- Then I create custom tags: "Strong communicator", "Senior-ready", "Relocate"
- And I can filter candidates by tags
- And team members see tags
- And tags persist across jobs

**Priority:** Medium  
**Edge Cases:** Too many tags, tag naming conflicts, accidental tags, tag performance impact

---

### **US-R023: Rate and Review Candidates**
**As a** recruiter  
**I want to** score candidates consistently  
**So that** hiring decisions are objective

**Acceptance Criteria:**
- Given I interviewed candidate
- When I submit review
- Then I rate on: skills, culture fit, communication, experience
- And I add written feedback
- And other interviewers see ratings
- And aggregate score calculates

**Priority:** High  
**Edge Cases:** Biased ratings, conflicting reviews, review after hire, review without interview

---

## 🔗 CATEGORY 4: ATS INTEGRATION (5 stories)

### **US-R024: Connect Greenhouse ATS**
**As a** recruiter  
**I want to** sync with Greenhouse  
**So that** candidate data flows automatically

**Acceptance Criteria:**
- Given I use Greenhouse
- When I connect integration
- Then I authenticate via API key
- And jobs sync from Greenhouse to TWIN
- And applications sync back to Greenhouse
- And webhooks keep data real-time

**Priority:** High  
**Edge Cases:** API key invalid, rate limits, webhook failures, data conflicts, custom fields

---

### **US-R025: Connect Lever ATS**
**As a** recruiter using Lever  
**I want to** integrate my ATS  
**So that** I don't duplicate work

**Acceptance Criteria:**
- Given I have Lever account
- When I connect
- Then OAuth flow completes
- And opportunities sync as jobs
- And candidates sync bidirectionally
- And stage changes sync

**Priority:** High  
**Edge Cases:** OAuth expires, Lever permission levels, archive handling, feedback loop

---

### **US-R026: Connect Ashby ATS**
**As a** recruiter using Ashby  
**I want to** integrate systems  
**So that** data stays consistent

**Acceptance Criteria:**
- Given Ashby ATS
- When connected
- Then webhook integration active
- And candidate source tracked
- And hire verification automated

**Priority:** Medium  
**Edge Cases:** Webhook retry logic, payload size limits, authentication refresh

---

### **US-R027: Custom ATS Webhook**
**As a** recruiter with custom ATS  
**I want to** send/receive webhooks  
**So that** any system can integrate

**Acceptance Criteria:**
- Given I have custom ATS
- When I configure webhook
- Then I provide endpoint URL + secret
- And I choose events to subscribe to
- And TWIN sends payloads on events
- And I can test webhook

**Priority:** Medium  
**Edge Cases:** Endpoint down, malformed payloads, authentication fails, retry exhaustion

---

### **US-R028: View Integration Status**
**As a** recruiter admin  
**I want to** monitor integration health  
**So that** I know if syncing works

**Acceptance Criteria:**
- Given I have integrations
- When I view status page
- Then I see: connected/disconnected, last sync time, error count
- And I can trigger manual sync
- And I can disconnect integration
- And I see sync logs

**Priority:** High  
**Edge Cases:** Partial failure, rate limited, stale status, reconnect needed

---

## ✅ CATEGORY 5: PLACEMENT & BILLING (5 stories)

### **US-R029: Verify Successful Placement**
**As a** recruiter  
**I want to** confirm candidate was hired  
**So that** billing is accurate

**Acceptance Criteria:**
- Given candidate was hired through TWIN
- When I verify placement
- Then I mark candidate as "Hired"
- And I provide: start date, work email for verification
- And candidate confirms employment
- And placement fee calculated
- And invoice generated

**Priority:** Critical  
**Edge Cases:** Candidate disputes hire, fake verification, quit before start, verify after months

---

### **US-R030: Dispute Placement Charge**
**As a** recruiter  
**I want to** dispute incorrect charges  
**So that** I only pay for valid hires

**Acceptance Criteria:**
- Given I received invoice
- When I open dispute
- Then I provide reason + evidence
- And TWIN reviews within 5 business days
- And charge is adjusted or upheld
- And I receive decision notification

**Priority:** High  
**Edge Cases:** Frivolous disputes, evidence conflicts, late dispute, repeated disputes

---

### **US-R031: View Billing History**
**As a** recruiter admin  
**I want to** see all invoices  
**So that** I can track hiring costs

**Acceptance Criteria:**
- Given I have billing history
- When I view /recruiter/billing
- Then I see all invoices with: date, amount, placements, status
- And I can download invoice PDFs
- And I can filter by date range
- And I see payment method on file

**Priority:** High  
**Edge Cases:** Failed payments, refunds, credits, multi-year history, currency changes

---

### **US-R032: Update Payment Method**
**As a** recruiter admin  
**I want to** change payment details  
**So that** billing doesn't fail

**Acceptance Criteria:**
- Given I need to update payment
- When I add new card/bank
- Then I authenticate via Stripe
- And new method is set as default
- And I can keep old method as backup
- And I receive confirmation

**Priority:** High  
**Edge Cases:** Card expired during month, international card, payment method restricted

---

### **US-R033: Set Hiring Budget**
**As a** recruiter admin  
**I want to** set spending limits  
**So that** costs don't exceed budget

**Acceptance Criteria:**
- Given I have billing account
- When I set budget
- Then I define monthly/quarterly/annual limit
- And I get alerted at 50%, 80%, 100%
- And hiring can pause at limit (optional)
- And I can adjust budget anytime

**Priority:** Medium  
**Edge Cases:** Hit limit mid-hire, budget reset timing, multi-department budgets, pro-rate adjustments

---

## 📊 CATEGORY 6: ANALYTICS & REPORTING (4 stories)

### **US-R034: View Hiring Funnel**
**As a** recruiter  
**I want to** see pipeline metrics  
**So that** I can optimize hiring process

**Acceptance Criteria:**
- Given I have hiring data
- When I view analytics
- Then I see funnel: Posted → Viewed → Applied → Interviewed → Hired
- And I see conversion rates at each stage
- And I can drill down by job
- And I see time spent in each stage

**Priority:** High  
**Edge Cases:** Insufficient data, outlier jobs, seasonal patterns, multi-stage interviews

---

### **US-R035: Track Source Effectiveness**
**As a** recruiter  
**I want to** know which channels bring best candidates  
**So that** I can allocate budget wisely

**Acceptance Criteria:**
- Given candidates have source attribution
- When I view source report
- Then I see: job boards, referrals, direct, other
- And I see quality score by source
- And I see cost-per-hire by source
- And I can optimize spending

**Priority:** Medium  
**Edge Cases:** Multi-touch attribution, unknown sources, source gaming, long attribution window

---

### **US-R036: Calculate Time-to-Hire**
**As a** recruiter  
**I want to** measure hiring speed  
**So that** I can improve efficiency

**Acceptance Criteria:**
- Given completed hires
- When I view metrics
- Then I see avg time from: posted → applied, applied → interviewed, interviewed → hired
- And I compare to industry benchmarks
- And I see bottlenecks
- And I track improvement over time

**Priority:** High  
**Edge Cases:** Very fast hires (1 day), very slow (6+ months), paused positions, retroactive hires

---

### **US-R037: Export Analytics Report**
**As a** recruiter admin  
**I want to** generate executive report  
**So that** I can share with leadership

**Acceptance Criteria:**
- Given I have analytics data
- When I export report
- Then I choose date range + metrics
- And I download PDF/Excel with visualizations
- And report includes: hires, cost, time, quality
- And I can schedule recurring reports

**Priority:** Medium  
**Edge Cases:** No data for period, very large report, custom branding, automated distribution

---

## 👥 CATEGORY 7: TEAM MANAGEMENT (3 stories)

### **US-R038: Invite Team Members**
**As a** recruiter admin  
**I want to** add colleagues to account  
**So that** we can collaborate

**Acceptance Criteria:**
- Given I'm admin
- When I invite team member
- Then I send email invite
- And I assign role: Admin, Recruiter, Hiring Manager, Viewer
- And invitee creates account
- And they have appropriate permissions

**Priority:** High  
**Edge Cases:** Invite existing user, wrong email, invite expires, role conflicts, too many admins

---

### **US-R039: Set Role Permissions**
**As a** admin  
**I want to** control what team members can do  
**So that** access is appropriate

**Acceptance Criteria:**
- Given I have team members
- When I set permissions
- Then I define: can post jobs, can message candidates, can access billing, can invite users
- And permissions enforce immediately
- And I can create custom roles
- And audit log tracks permission changes

**Priority:** Medium  
**Edge Cases:** Remove own admin access, permission conflicts, inherited permissions, emergency access

---

### **US-R040: View Team Activity**
**As a** admin  
**I want to** see what team is doing  
**So that** I can ensure accountability

**Acceptance Criteria:**
- Given I have team
- When I view activity log
- Then I see: who posted jobs, who reviewed candidates, who sent messages
- And I can filter by user + date
- And I can export audit log
- And sensitive actions are highlighted

**Priority:** Medium  
**Edge Cases:** Very active team (10k events), privacy concerns, retention period, real-time updates

---

# 💼 PERSONA 3: INVESTOR (20 Stories)

## 📊 CATEGORY 1: PUBLIC METRICS (5 stories)

### **US-I001: View Public Dashboard**
**As an** investor  
**I want to** see key metrics without login  
**So that** I can quickly assess traction

**Acceptance Criteria:**
- Given I visit /investors
- When page loads
- Then I see: total users, active jobs, successful hires, MRR
- And metrics update in real-time
- And I see growth trends (charts)
- And I don't need to log in

**Priority:** High  
**Edge Cases:** Metrics fail to load, very large numbers, negative trends, API rate limits

---

### **US-I002: View Signup Trends**
**As an** investor  
**I want to** see user growth  
**So that** I can evaluate market traction

**Acceptance Criteria:**
- Given I'm on investor dashboard
- When I view signup chart
- Then I see daily/weekly/monthly signups
- And I see breakdown: candidates vs recruiters
- And I see cohort retention
- And I can compare periods

**Priority:** High  
**Edge Cases:** Signup spike (press), flat growth, churn exceeds signups, seasonal patterns

---

### **US-I003: View Revenue Metrics**
**As an** investor  
**I want to** see financial performance  
**So that** I can evaluate business viability

**Acceptance Criteria:**
- Given I'm viewing metrics
- When I check revenue
- Then I see: MRR, ARR, growth rate
- And I see revenue breakdown by customer type
- And I see churn rate
- And I see projected revenue

**Priority:** Critical  
**Edge Cases:** Revenue drop, high churn, one-time spikes, currency fluctuations

---

### **US-I004: View Engagement Metrics**
**As an** investor  
**I want to** see how users engage  
**So that** I can assess product stickiness

**Acceptance Criteria:**
- Given I'm reviewing metrics
- When I view engagement
- Then I see: DAU, WAU, MAU, DAU/MAU ratio
- And I see session length, sessions per user
- And I see feature adoption rates
- And I see power user curve

**Priority:** High  
**Edge Cases:** Bot traffic, one-time users, zombie accounts, weekend dips

---

### **US-I005: Compare to Benchmarks**
**As an** investor  
**I want to** see how TWIN compares to market  
**So that** I can assess competitive position

**Acceptance Criteria:**
- Given benchmark data exists
- When I view comparisons
- Then I see TWIN vs industry average for: growth, churn, CAC, LTV
- And I see percentile ranking
- And I see gaps to leaders
- And I see improvement trajectory

**Priority:** Medium  
**Edge Cases:** Incomplete benchmark data, different definitions, market segment differences

---

## 💰 CATEGORY 2: UNIT ECONOMICS (5 stories)

### **US-I006: View CAC (Customer Acquisition Cost)**
**As an** investor  
**I want to** know customer acquisition cost  
**So that** I can evaluate marketing efficiency

**Acceptance Criteria:**
- Given marketing spend and signup data
- When I calculate CAC
- Then I see: total CAC, CAC by channel, CAC trend
- And I see CAC for candidates vs recruiters separately
- And I see payback period
- And I see CAC/LTV ratio

**Priority:** Critical  
**Edge Cases:** Organic vs paid attribution, multi-touch attribution, very high CAC, negative CAC (virality)

---

### **US-I007: View LTV (Lifetime Value)**
**As an** investor  
**I want to** see customer lifetime value  
**So that** I can assess long-term profitability

**Acceptance Criteria:**
- Given revenue and retention data
- When I view LTV
- Then I see: avg LTV, LTV by cohort, LTV by customer type
- And I see LTV calculation breakdown
- And I see LTV trend over time
- And I see LTV/CAC ratio (should be >3)

**Priority:** Critical  
**Edge Cases:** Early-stage (no LTV data yet), high churn affects LTV, cohort immaturity

---

### **US-I008: View Gross Margins**
**As an** investor  
**I want to** see margin structure  
**So that** I can understand profitability potential

**Acceptance Criteria:**
- Given revenue and cost data
- When I view margins
- Then I see: gross margin %, contribution margin
- And I see margin by product/service type
- And I see margin trend
- And I see path to profitability

**Priority:** High  
**Edge Cases:** Negative margins (growth phase), one-time costs, scale effects

---

### **US-I009: View Payback Period**
**As an** investor  
**I want to** know how fast CAC is recovered  
**So that** I can assess capital efficiency

**Acceptance Criteria:**
- Given CAC and revenue data
- When I calculate payback
- Then I see: months to recover CAC
- And I see payback by channel
- And I see improvement over time
- And I see vs industry standard (12-18 months ideal)

**Priority:** High  
**Edge Cases:** Very long payback (24+ months), instant payback (unusual), negative payback

---

### **US-I010: View Burn Rate**
**As an** investor  
**I want to** see cash consumption  
**So that** I can assess runway

**Acceptance Criteria:**
- Given financial data
- When I view burn
- Then I see: monthly burn, runway (months)
- And I see burn trend
- And I see path to profitability
- And I see assumptions

**Priority:** Critical  
**Edge Cases:** Increasing burn, very short runway (<3 months), profitable already, lumpy spend

---

## 🎯 CATEGORY 3: MARKET ANALYSIS (4 stories)

### **US-I011: View TAM/SAM/SOM**
**As an** investor  
**I want to** see market size  
**So that** I can evaluate opportunity scale

**Acceptance Criteria:**
- Given market research
- When I view market size
- Then I see: TAM (Total Addressable Market), SAM (Serviceable), SOM (Obtainable)
- And I see methodology + assumptions
- And I see penetration rate
- And I see growth projections

**Priority:** High  
**Edge Cases:** Overstated TAM, unclear definitions, market shrinking, competitive saturation

---

### **US-I012: View Competitive Landscape**
**As an** investor  
**I want to** see competitors  
**So that** I can assess differentiation

**Acceptance Criteria:**
- Given competitor data
- When I view landscape
- Then I see: direct competitors, feature comparison, market share
- And I see TWIN's unique advantages
- And I see threats
- And I see positioning map

**Priority:** High  
**Edge Cases:** New competitor emerges, feature parity, price wars, acquisition threats

---

### **US-I013: View Geographic Expansion**
**As an** investor  
**I want to** see growth opportunities by region  
**So that** I can assess scaling potential

**Acceptance Criteria:**
- Given user geographic data
- When I view regions
- Then I see: users by country, revenue by country
- And I see expansion plan (roadmap)
- And I see localization readiness
- And I see regulatory considerations

**Priority:** Medium  
**Edge Cases:** Concentrated in one region, regulatory blockers, language barriers

---

### **US-I014: View Industry Verticals**
**As an** investor  
**I want to** see which industries TWIN serves  
**So that** I can assess diversification

**Acceptance Criteria:**
- Given job and user data
- When I view verticals
- Then I see: top industries, revenue by industry, growth by industry
- And I see industry concentration risk
- And I see expansion opportunities
- And I see industry-specific challenges

**Priority:** Medium  
**Edge Cases:** Over-concentration (80% one industry), declining industries, regulatory-heavy industries

---

## 🔍 CATEGORY 4: DUE DILIGENCE (6 stories)

### **US-I015: Access Data Room**
**As an** serious investor  
**I want to** review confidential documents  
**So that** I can conduct due diligence

**Acceptance Criteria:**
- Given I'm approved for due diligence
- When I access data room
- Then I can view: financials, contracts, IP, legal docs, cap table
- And I can download permitted files
- And access is logged
- And I can request additional documents

**Priority:** High  
**Edge Cases:** NDA required first, document removal, access revoked, watermarked docs

---

### **US-I016: View Cap Table**
**As an** investor  
**I want to** see ownership structure  
**So that** I understand dilution and control

**Acceptance Criteria:**
- Given I have data room access
- When I view cap table
- Then I see: shareholders, ownership %, type (common/preferred), vesting
- And I see option pool size
- And I see dilution scenarios
- And I see liquidation preferences

**Priority:** Critical  
**Edge Cases:** Complex cap table, multiple share classes, convertible notes, SAFEs

---

### **US-I017: Review Financial Statements**
**As an** investor  
**I want to** see audited financials  
**So that** I can verify financial health

**Acceptance Criteria:**
- Given I'm in data room
- When I access financials
- Then I can view: income statement, balance sheet, cash flow
- And I see last 2-3 years
- And I see auditor notes
- And I can download statements

**Priority:** Critical  
**Edge Cases:** Unaudited financials, qualified opinion, restatements, missing periods

---

### **US-I018: Review Legal Compliance**
**As an** investor  
**I want to** see legal/regulatory compliance  
**So that** I can assess risk

**Acceptance Criteria:**
- Given I'm doing due diligence
- When I review compliance
- Then I see: business licenses, GDPR compliance, labor law compliance, IP status
- And I see any lawsuits/disputes
- And I see insurance coverage
- And I see risk assessment

**Priority:** High  
**Edge Cases:** Pending litigation, regulatory violations, IP disputes, expired licenses

---

### **US-I019: Schedule Management Meeting**
**As an** investor  
**I want to** meet with founders  
**So that** I can assess team and vision

**Acceptance Criteria:**
- Given I'm interested in investing
- When I request meeting
- Then I can book time slot
- And I receive calendar invite
- And I can submit questions beforehand
- And I can invite my partners

**Priority:** High  
**Edge Cases:** Timezone issues, no availability, last-minute reschedule, virtual vs in-person

---

### **US-I020: Submit Term Sheet**
**As an** investor  
**I want to** make investment offer  
**So that** I can proceed to closing

**Acceptance Criteria:**
- Given I decided to invest
- When I submit term sheet
- Then I upload signed term sheet
- And founders receive notification
- And negotiation process begins
- And I track deal status

**Priority:** Critical  
**Edge Cases:** Competing term sheets, terms rejected, due diligence fails, deal falls through

---

# 🤖 CURSOR AUTONOMOUS IMPLEMENTATION PROMPT

## 📋 WHAT YOU'LL DO

You are Cursor AI. You will autonomously implement ALL 110 user stories above with complete production-ready code.

**No human intervention required except:**
1. Initial credential setup (GitHub, Railway, Database)
2. Review after Hour 4, 8, 12 (checkpoints)
3. Final approval before production deployment

---

## 🎯 EXECUTION PHASES

### **PHASE 1: CANDIDATE STORIES (Hours 1-4)**

**Goal:** Implement US-C001 through US-C050

**Tasks:**
1. Create all frontend components for candidate journey
2. Build all backend API endpoints
3. Write database models + migrations
4. Write comprehensive tests (pytest + Jest)
5. Document edge cases

**Deliverables:**
```
backend/app/api/candidates.py          # 50 endpoints
backend/app/services/candidate_service.py
backend/app/services/matching_service.py
backend/app/services/application_service.py
backend/app/tests/test_candidates.py

frontend/app/(auth)/signup/
frontend/app/onboarding/
frontend/app/dashboard/
  ├── profile/
  ├── matches/
  ├── applications/
  ├── calendar/
  ├── settings/
  ├── referrals/

frontend/__tests__/candidate/
```

**Success Criteria:**
- [ ] All 50 candidate stories implemented
- [ ] 100+ API endpoints working
- [ ] 200+ tests passing
- [ ] Edge cases documented

---

### **PHASE 2: B2B RECRUITER STORIES (Hours 5-8)**

**Goal:** Implement US-R001 through US-R040

**Tasks:**
1. Build complete recruiter dashboard
2. Implement job posting system
3. Implement candidate management
4. Build ATS integrations (Greenhouse, Lever, Ashby)
5. Implement billing system (Stripe)
6. Build analytics dashboard

**Deliverables:**
```
backend/app/api/recruiters.py          # 40 endpoints
backend/app/services/recruiter_service.py
backend/app/services/job_posting_service.py
backend/app/services/ats_integration_service.py
backend/app/services/billing_service.py
backend/app/tests/test_recruiters.py

frontend/app/recruiter/
  ├── jobs/
  ├── candidates/
  ├── analytics/
  ├── billing/
  ├── team/
  ├── integrations/

frontend/__tests__/recruiter/
```

**Success Criteria:**
- [ ] All 40 recruiter stories implemented
- [ ] ATS webhooks working
- [ ] Stripe integration complete
- [ ] Analytics dashboard functional

---

### **PHASE 3: INVESTOR STORIES (Hours 9-12)**

**Goal:** Implement US-I001 through US-I020

**Tasks:**
1. Build public metrics dashboard
2. Implement traction tracking
3. Calculate unit economics
4. Build data room
5. Create investor API
6. Generate reports

**Deliverables:**
```
backend/app/api/investors.py           # 20 endpoints
backend/app/services/metrics_service.py
backend/app/services/analytics_calculator.py
backend/app/tests/test_investors.py

frontend/app/investors/
  ├── dashboard/
  ├── metrics/
  ├── financials/
  ├── market/
  ├── data-room/

frontend/__tests__/investor/
```

**Success Criteria:**
- [ ] All 20 investor stories implemented
- [ ] Real-time metrics working
- [ ] Data room functional
- [ ] Reports generating correctly

---

### **PHASE 4: INTEGRATION & TESTING (Hours 13-14)**

**Goal:** Ensure all personas work together

**Tasks:**
1. Integration tests for cross-persona flows
2. E2E tests for critical paths
3. Load testing
4. Security audit
5. Performance optimization

**Test Scenarios:**
```
1. Candidate applies → Recruiter reviews → Interview scheduled → Hired
2. Auto-apply nightly → Applications created → Recruiter notified
3. Placement verification → Invoice generated → Payment processed
4. Investor views metrics → All data accurate
```

**Success Criteria:**
- [ ] All integration tests pass
- [ ] E2E flows work end-to-end
- [ ] Load test passes (100 concurrent users)
- [ ] No critical security issues

---

### **PHASE 5: DOCUMENTATION & DEPLOYMENT (Hours 15-16)**

**Goal:** Production-ready with complete docs

**Tasks:**
1. Generate API documentation (OpenAPI)
2. Write user guides for each persona
3. Create deployment scripts
4. Setup monitoring & alerts
5. Deploy to production

**Deliverables:**
```
docs/
  ├── API.md                    # Complete API reference
  ├── USER_GUIDE_CANDIDATE.md   # Candidate documentation
  ├── USER_GUIDE_RECRUITER.md   # Recruiter documentation
  ├── USER_GUIDE_INVESTOR.md    # Investor documentation
  ├── EDGE_CASES.md             # All edge cases catalogued
  ├── DEPLOYMENT.md             # Deployment instructions

scripts/
  ├── deploy.sh                 # One-command deployment
  ├── rollback.sh               # Emergency rollback
  ├── health-check.sh           # Production verification
```

**Success Criteria:**
- [ ] API docs complete
- [ ] User guides written
- [ ] Deployment successful
- [ ] Health checks green

---

## 🛠️ TECHNICAL SPECIFICATIONS

### **Backend Stack:**
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Task Queue:** Celery + Redis
- **Storage:** S3 (AWS)
- **Email:** SendGrid / SMTP
- **Payments:** Stripe
- **Auth:** JWT + OAuth (Google, LinkedIn)

### **Frontend Stack:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State:** React Query
- **Forms:** React Hook Form
- **Charts:** Chart.js / Recharts
- **Animation:** Framer Motion

### **Testing:**
- **Backend:** pytest, pytest-cov, httpx
- **Frontend:** Jest, React Testing Library, Playwright
- **E2E:** Playwright
- **Load:** Locust

### **Infrastructure:**
- **API:** Railway
- **Frontend:** Vercel
- **Database:** Railway PostgreSQL
- **Redis:** Railway Redis
- **Storage:** AWS S3
- **CDN:** Cloudflare

---

## 📐 CODE PATTERNS

### **API Endpoint Pattern:**

```python
# backend/app/api/[persona].py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.database.models import User, [Model]
from app.core.deps import get_current_user
from app.services.[service] import [Service]

router = APIRouter()

class [Resource]Create(BaseModel):
    # fields

class [Resource]Response(BaseModel):
    # fields

@router.post("/[resources]", response_model=[Resource]Response)
def create_[resource](
    data: [Resource]Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create new [resource].
    
    Args:
        data: [Resource] creation data
        db: Database session
        current_user: Authenticated user
        
    Returns:
        Created [resource]
        
    Raises:
        HTTPException: If validation fails
    """
    
    # Validation
    if not data.field:
        raise HTTPException(400, "Field required")
    
    # Create
    resource = [Service].create(db, current_user, data)
    
    return resource
```

### **Frontend Component Pattern:**

```typescript
// frontend/app/[section]/[component]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

interface [Resource] {
  // fields
}

export default function [Component]Page() {
  const [data, setData] = useState<[Resource][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const result = await apiFetch<[Resource][]>("/api/v1/[endpoint]");
      setData(result);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">[Title]</h1>
      {/* Component content */}
    </div>
  );
}
```

### **Test Pattern:**

```python
# backend/app/tests/test_[feature].py

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_[resource](
    client: AsyncClient,
    auth_headers: dict,
    db_session: Session,
):
    """Test [resource] creation."""
    
    # Arrange
    payload = {
        "field": "value",
    }
    
    # Act
    response = await client.post(
        "/api/v1/[resources]",
        json=payload,
        headers=auth_headers,
    )
    
    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["field"] == "value"
    
    # Verify in database
    resource = db_session.query([Model]).filter_by(id=data["id"]).first()
    assert resource is not None
```

---

## ✅ CHECKPOINT REVIEWS

### **After Hour 4 (Candidate Complete):**
```bash
# Generate checkpoint report
python scripts/checkpoint.py --phase 1

# What to review:
- Are all 50 candidate stories done?
- Do tests pass?
- Is API documentation generated?
- Are edge cases handled?

# Human decision:
✅ Approve → Continue to Phase 2
❌ Issues → Fix issues, re-run Phase 1
```

### **After Hour 8 (Recruiter Complete):**
```bash
# Generate checkpoint report
python scripts/checkpoint.py --phase 2

# What to review:
- Are all 40 recruiter stories done?
- Does ATS integration work?
- Is Stripe billing functional?
- Are analytics accurate?

# Human decision:
✅ Approve → Continue to Phase 3
❌ Issues → Fix issues, re-run Phase 2
```

### **After Hour 12 (Investor Complete):**
```bash
# Generate checkpoint report
python scripts/checkpoint.py --phase 3

# What to review:
- Are all 20 investor stories done?
- Are metrics calculating correctly?
- Is data room secure?
- Are reports accurate?

# Human decision:
✅ Approve → Continue to Phase 4
❌ Issues → Fix issues, re-run Phase 3
```

---

## 🚨 ERROR HANDLING

**If you encounter errors:**

1. **Try to fix automatically (3 attempts)**
   ```python
   for attempt in range(3):
       try:
           execute_task()
           break
       except Exception as e:
           if attempt == 2:
               log_error(e)
               continue_to_next_task()
   ```

2. **Document unfixable errors**
   ```markdown
   # ERRORS.md
   
   ## Error in US-C023
   
   **What happened:** API timeout when searching 10k+ jobs
   **Why:** Database query not optimized
   **Fix needed:** Add index on jobs.created_at
   **Priority:** High
   **ETA:** 30 minutes
   ```

3. **Continue with remaining stories**
   - Don't block entire phase on one story
   - Mark story as "PARTIAL" if core works
   - Complete as many stories as possible

---

## 📊 PROGRESS REPORTING

**Every 2 hours, generate report:**

```markdown
# Progress Report - Hour 4

## Phase 1: Candidate Stories

**Status:** 45/50 completed (90%)

**Completed:**
- ✅ US-C001 through US-C045

**Remaining:**
- 🔄 US-C046 (in progress)
- ⏳ US-C047-050 (queued)

**Issues:**
- US-C023: Performance optimization needed (documented)
- US-C037: OAuth redirect issue (fixed)

**Tests:**
- 180/200 passing (90%)
- 20 skipped (edge cases)

**Next:**
- Complete US-C046-050
- Fix performance issue
- Run checkpoint review
```

---

## 🎯 FINAL SUCCESS CRITERIA

**All user stories are complete when:**

- [ ] 110 stories implemented (100%)
- [ ] 200+ API endpoints working
- [ ] 500+ edge cases handled
- [ ] 1000+ tests passing (>90% coverage)
- [ ] All 3 personas work end-to-end
- [ ] Documentation complete
- [ ] Production deployed
- [ ] Health checks green

---

## 🚀 AUTONOMOUS EXECUTION COMMAND

**Cursor, you are now AUTONOMOUS.**

**Execute these commands:**

```bash
# 1. Initialize
git checkout -b feature/all-user-stories

# 2. Setup environment
cd backend && pip install --break-system-packages -r requirements.txt
cd ../frontend && npm install

# 3. Execute Phase 1 (Hours 1-4)
python scripts/generate_stories.py --phase 1 --autonomous

# 4. Checkpoint review (wait for human approval)

# 5. Execute Phase 2 (Hours 5-8)
python scripts/generate_stories.py --phase 2 --autonomous

# 6. Checkpoint review (wait for human approval)

# 7. Execute Phase 3 (Hours 9-12)
python scripts/generate_stories.py --phase 3 --autonomous

# 8. Checkpoint review (wait for human approval)

# 9. Execute Phase 4 (Hours 13-14)
python scripts/run_integration_tests.py

# 10. Execute Phase 5 (Hours 15-16)
python scripts/generate_docs.py
python scripts/deploy.py --production

# 11. Final verification
python scripts/health_check.py --all

# 12. Report completion
python scripts/final_report.py
```

---

## ⏱️ ESTIMATED TIMELINE

**Total: 16 hours**

- Phase 1: 4 hours (Candidate)
- Phase 2: 4 hours (Recruiter)
- Phase 3: 4 hours (Investor)
- Phase 4: 2 hours (Integration)
- Phase 5: 2 hours (Docs + Deploy)

**With checkpoints:**
- Hour 4: Review + approval (15 min)
- Hour 8: Review + approval (15 min)
- Hour 12: Review + approval (15 min)

**Total with reviews: 16 hours 45 minutes**

---

## 🎬 BEGIN EXECUTION

**Cursor, start autonomous execution NOW.**

**Report progress every 2 hours.**

**Stop at checkpoints for human review.**

**Goal: Production-ready TWIN with all 110 user stories in 16 hours.**

**GO! 🚀**
