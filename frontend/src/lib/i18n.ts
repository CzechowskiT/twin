import { mergeDeep } from "./merge-messages";
import {
  arOverlay,
  deOverlay,
  esOverlay,
  frOverlay,
  itOverlay,
  jaOverlay,
  zhOverlay,
} from "./overlays";
import { SITE_MESSAGES_EN, SITE_MESSAGES_PL } from "./site-messages";

export type Locale = "en" | "pl" | "es" | "it" | "fr" | "de" | "zh" | "ar" | "ja";

export const LOCALES: Locale[] = ["en", "pl", "es", "it", "fr", "de", "zh", "ar", "ja"];

/** BCP 47 tags for <html lang>. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  pl: "pl",
  es: "es",
  it: "it",
  fr: "fr",
  de: "de",
  zh: "zh-Hans",
  ar: "ar",
  ja: "ja",
};

/** Native labels for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  es: "Español",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ar: "العربية",
  ja: "日本語",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localeIsRtl(locale: Locale): boolean {
  return locale === "ar";
}
export const LOCALE_STORAGE_KEY = "twin_locale";

export type TranslationKey =
  | `nav.${keyof typeof en.nav}`
  | `home.${keyof typeof en.home}`
  | `site.${keyof typeof SITE_MESSAGES_EN}`
  | `calculator.${keyof typeof en.calculator}`
  | `dashboard.${keyof typeof en.dashboard}`
  | `login.${keyof typeof en.login}`
  | `forgotPassword.${keyof typeof en.forgotPassword}`
  | `resetPassword.${keyof typeof en.resetPassword}`
  | `register.${keyof typeof en.register}`
  | `authCallback.${keyof typeof en.authCallback}`
  | `profile.${keyof typeof en.profile}`
  | `onboarding.${keyof typeof en.onboarding}`
  | `common.${keyof typeof en.common}`;

const en = {
  nav: {
    login: "Log in",
    register: "Register",
    profile: "Profile",
    dashboard: "Dashboard",
    calculator: "ROI calculator",
    menu: "Menu",
    about: "About",
    cases: "Case studies",
    contact: "Contact",
    faq: "FAQ",
    careers: "Careers",
    media: "Media",
    partners: "Partners",
  },
  home: {
    tagline: "Global career platform, powered by AI",
    title: "Your AI career twin works the market around the clock",
    description:
      "TWIN is an autonomous career agent for professionals everywhere: it aggregates roles from the job boards and regions your workspace enables, scores them against your profile, and keeps your pipeline in one place — with auto-apply and interview scheduling on the roadmap.",
    getStarted: "Start free",
    logIn: "Sign in",
    scrape: "Discover",
    scrapeDesc: "Boards and regions you configure — expandable as you grow",
    match: "Match",
    matchDesc: "Scored to your skills, seniority, and goals",
    track: "Track",
    trackDesc: "One workspace for search, saves, and applications",
    featuresTitle: "From signal to pipeline",
    featuresSubtitle: "A calm workspace that mirrors how you already think about the market — with automation arriving step by step.",
    footerHint: "Create a profile after sign-up so matching can use your skills, titles, and goals.",
    twinForYourJob: "Twin for your job",
    focusTitle: "What should TWIN prioritize for you first?",
    focusSubtitle:
      "Choose what matters most right now — after sign-up you land in the dashboard with profile, feeds, and tracking wired together.",
    focusPickLabel: "Pick a starting focus",
    focusChipDiscover: "Fresh listings in one feed",
    focusChipMatch: "Ranked matches to my profile",
    focusChipTrack: "Save & track applications",
    focusChipAuto: "Auto-apply (on the roadmap)",
    focusCta: "Start with these goals",
    focusFootnote:
      "Today’s MVP aggregates roles, scores them when you add a profile, and centralizes application status. Heavier automation ships in stages — same calm surface, more autonomy behind it.",
    journeyScrollHint: "Scroll the page to move through the story chapters.",
    journeyRailsAria: "Story chapters on this page",
    storyEyebrow: "Story",
    storyCh1Kicker: "01 — The signal",
    storyCh1Title: "The market never stands still.",
    storyCh1Body:
      "Postings scatter across boards and time zones. Candidates lose threads between tabs and screenshots. Teams re-run the same sourcing work in spreadsheets. TWIN starts where that noise becomes expensive.",
    storyCh2Kicker: "02 — The surface",
    storyCh2Title: "One calm workspace that follows you.",
    storyCh2Body:
      "Aggregate what your workspace allows, score roles when your profile exists, and keep every application in one pipeline. When automation lands, it stays inside boundaries you set — never a black box on your career.",
    storyCh3Kicker: "03 — The arc",
    storyCh3Title: "Ship the story before the feature.",
    storyCh3Body:
      "Like a product film, each chapter earns the next beat. Phase 1 is a disciplined pipeline you can trust. What follows is autonomy that proves itself in audit trails, exports, and quiet hours — not hype.",
    timelineEyebrow: "Roadmap",
    timelineTitle: "A timeline you can feel",
    timelineSubtitle: "Milestones are ordered to remove drag before adding autonomy.",
    timeline1When: "Phase 1 · Now",
    timeline1Title: "Discover · Match · Track",
    timeline1Body:
      "Public listings, profile-aware ranking, and application status in one place — consent-first, built for GDPR from day one.",
    timeline2When: "Phase 2",
    timeline2Title: "Smarter motion",
    timeline2Body:
      "Bulk actions, richer match explanations, and nudges that respect the geographies and quiet hours you configure.",
    timeline3When: "Phase 3",
    timeline3Title: "Autonomous loops",
    timeline3Body:
      "Auto-apply where boards allow it, interview windows that sync to your calendar, and exports compliance teams can audit.",
    faqEyebrow: "FAQ",
    faqTitle: "Questions & answers",
    faqPrivacyLink: "Privacy Policy",
    faq01Q: "What is TWIN today?",
    faq01A:
      "A pipeline workspace: listings from boards your workspace enables, optional scoring against your profile, and a single place for saves and applications. Deeper auto-apply and interview scheduling are on the roadmap.",
    faq02Q: "Who is it for?",
    faq02A:
      "People who already juggle multiple job sites and notes and want fewer tabs — one place to scan, compare, and move applications forward without losing context.",
    faq03Q: "How is this different from using one job board?",
    faq03A:
      "Boards remain where postings live; TWIN is the layer that normalizes discovery, match signals, and follow-up in one UX. You still apply on the employer’s flow where required.",
    faq04Q: "What about my data?",
    faq04A:
      "You explicitly consent when you register. We use profile data to rank jobs and run the product. For retention, exports, and GDPR rights, read the policy linked below.",
  },
  site: SITE_MESSAGES_EN,
  dashboard: {
    title: "Dashboard",
    logout: "Log out",
    signedInAs: "Signed in as",
    addProfileHint: "Add a profile so TWIN can rank jobs for you.",
    setupProfile: "Set up profile",
    edit: "Edit",
    years: "yrs",
    scrapeJobs: "Job feeds",
    scrapeAll: "Auto scrap",
    scrapeAllHint:
      "The board list in the dashboard and this action respect SCRAPE_ENABLED_BOARD_IDS on the API (empty = all boards). Celery workers handle async jobs; this button uses sync=true and waits in the browser session.",
    scrapingAll: "Auto scrap running…",
    scraping: "Scraping…",
    keepApiOpen: "Keep the API terminal open while scraping.",
    lastUpdated: "Last updated",
    regionPoland: "Poland",
    regionEurope: "Europe",
    regionUk: "United Kingdom",
    regionAmericas: "Americas",
    regionAsiaPacific: "Asia-Pacific",
    regionGlobal: "Global",
    topMatches: "Top matches",
    jobs: "Jobs",
    noJobs: "No jobs yet — run Auto scrap above (if enabled) or ask an admin to seed listings.",
    noJobsNoScrapeUi:
      "No jobs in the database yet. Listings show up after data is scraped on the server (admin / backend) or imported. Your profile is for ranking and filters once jobs exist — it does not crawl the web by itself.",
    noJobsFiltered: "No jobs match these filters.",
    filterSearch: "Search",
    filterSearchPlaceholder: "Title, company, keywords…",
    filterTitleTerms: "Target titles (comma = any match)",
    filterTitlePlaceholder: "e.g. Account Executive, SDR",
    filterLocation: "Location",
    filterBoard: "Job board",
    filterMinSalary: "Min. salary (PLN/mo)",
    filterSort: "Sort by",
    filterAll: "All",
    filterApply: "Apply filters",
    sortNewest: "Newest",
    sortSalary: "Highest salary",
    sortCompany: "Company A–Z",
    trackJob: "Track",
    applyJob: "Apply",
    autoApplyJob: "Auto-apply",
    autoApplyRunning: "Opening browser…",
    saveJob: "Save",
    dismissJob: "Not for me",
    applications: "My applications",
    noApplications: "No tracked applications yet — use Save or Apply on a job.",
    applicationStatus: "Application status",
    removeApplication: "Remove",
    appStatusPending: "Saved",
    appStatusApplied: "Applied",
    appStatusInterview: "Interview",
    appStatusRejected: "Rejected",
    appStatusHired: "Hired",
    scrapeFailed: "Scrape failed",
    scrapeFinished: "Scrape finished",
    twinScrapePanelTitle: "Bring listings into TWIN",
    twinForYourJob: "Twin for your job",
    twinForYourJobHint:
      "Runs the full TWIN board registry (Poland: pracuj.pl, rocketjobs.pl, justjoin.it, praca.pl; then LinkedIn; then global boards such as Indeed, Glassdoor, StepStone, Reed, SEEK, …). Respect SCRAPE_ENABLED_BOARD_IDS on the API to trim the list. Sync mode waits for the API — use a short allowlist on demos.",
    twinForYourJobRunning: "Running Twin for your job…",
    roadmapSummary: "Target job boards & company career sites (roadmap)",
    roadmapPortalsTitle: "50 global job boards",
    roadmapCompaniesTitle: "Top employers (careers pages)",
    roadmapLiveBadge: "Live",
    roadmapPlannedBadge: "Planned",
    roadmapFootnote:
      "Today “Twin for your job” ingests implemented sources in the TWIN registry; more portals and employer career-site adapters roll out iteratively behind the same button.",
    welcomeBack: "Welcome back",
    welcomeBackNamed: "Welcome back, {name}",
    welcomePrompt:
      "Use the shortcuts below or scroll to your feed — TWIN keeps ranked matches and applications in one calm workspace.",
    quickBrowseFeed: "Browse job feed",
    quickUpdateProfile: "Update profile",
    quickTopMatches: "Top matches",
    quickApplications: "Applications",
    quickWorkspaceTour: "Workspace tour",
    quickRefreshListings: "Refresh listings",
    statFeedTitle: "In your feed",
    statFeedCta: "Jump to listings",
    statMatchesTitle: "Strong matches",
    statMatchesCta: "Review matches",
    statMatchesSetup: "Set up profile to match",
    statPipelineTitle: "Pipeline",
    statPipelineCta: "Open tracker",
    statPipelineHint: "Save or apply on a job to populate your pipeline.",
    applyPromptTitle: "Ready for the next move?",
    applyPromptLead:
      "Fresh listings are in — your best matches are sorted above. Want a nudge when a top role looks apply-ready?",
    applyPromptYes: "Yes, nudge me",
    applyPromptNo: "Not now",
    applyPromptLater: "Later",
    billingLink: "Plan & billing",
    billingPageTitle: "Plan & billing",
    billingPageLead:
      "Free keeps a focused pipeline; Premium unlocks unlimited tracked applications and auto-apply. Checkout uses Stripe — cards, Apple Pay, and Google Pay show when your browser supports them.",
    billingCurrentPlan: "Current plan",
    billingSubscriptionStatus: "Subscription status",
    billingPeriodEnds: "Current period ends",
    billingNotActive: "—",
    billingPlansTitle: "Available plans",
    billingUpgradePremium: "Upgrade to Premium",
    billingUpgradePro: "Upgrade to Pro",
    billingManagePortal: "Manage subscription & invoices",
    billingNotConfigured: "Billing is not configured on this API (missing Stripe env vars).",
    billingCheckoutSuccess: "Thanks — your subscription should activate within a minute after Stripe confirms payment.",
    billingCheckoutCancelled: "Checkout was cancelled. You can try again whenever you are ready.",
    billingPortalHint: "Use the customer portal to update payment method, cancel, or download invoices.",
    billingTrackedCap: "Up to {n} active tracked applications (rejected do not count).",
    billingTrackedUnlimited: "Unlimited active tracked applications.",
  },
  login: {
    title: "Log in",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    submit: "Log in",
    forgotPassword: "Forgot password?",
    noAccount: "No account?",
    register: "Register",
    failed: "Login failed",
    orContinue: "or continue with",
    linkedIn: "Continue with LinkedIn",
    linkedInComingSoon:
      "LinkedIn sign-in is off until the API has Client ID, Secret, and LINKEDIN_REDIRECT_URI (see yellow box). Use email below.",
    linkedInSetupTitle: "Enable LinkedIn login (one-time setup)",
    linkedInSetupStep1: "Create an app at linkedin.com/developers → add “Sign In with OpenID Connect”.",
    linkedInSetupStep2Intro:
      "In LinkedIn → Auth → Authorized redirect URLs, add each line below exactly (must match API env).",
    linkedInSetupCallbackProd: "Production API (NEXT_PUBLIC_API_URL on Vercel / Railway):",
    linkedInSetupCallbackLocal: "Local API (development):",
    linkedInSetupStep3:
      "On the API host (e.g. Railway), set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI to exactly the production callback URL above (or localhost for dev), then redeploy the API.",
    linkedInSetupDoc: "Full guide: docs/LINKEDIN_KONFIGURACJA_PL.md in the project folder.",
    errorLinkedinNotConfigured:
      "LinkedIn is not fully configured on the server (missing credentials or redirect URI). Use email or fix Railway env vars.",
    errorOAuthNotConfigured:
      "That sign-in provider is not set up on the server yet. Use email or ask an admin.",
    oauthGoogle: "Continue with Google",
    oauthGithub: "Continue with GitHub",
    oauthApple: "Continue with Apple",
  },
  forgotPassword: {
    title: "Reset password",
    email: "Email",
    submit: "Send reset link",
    sending: "Sending…",
    backToLogin: "Back to log in",
    sentTitle: "Check your email",
    sentBody:
      "If an account exists for that address, we sent instructions to reset your password. The link expires in about an hour.",
  },
  resetPassword: {
    title: "Choose a new password",
    password: "New password",
    passwordConfirm: "Confirm new password",
    mismatch: "Passwords do not match.",
    missingToken: "This reset link is invalid or incomplete. Request a new link from the log in page.",
    submit: "Update password",
    updating: "Saving…",
    success: "Your password was updated. You can log in now.",
    backToLogin: "Log in",
    failed: "Could not reset password",
  },
  authCallback: {
    title: "Signing you in",
    signingIn: "Completing sign-in…",
    errorLinkedinDenied: "LinkedIn sign-in was cancelled.",
    errorLinkedinNotConfigured:
      "LinkedIn sign-in is not set up on the server yet. Use email below or ask an admin.",
    errorInvalidState: "Sign-in session expired. Please try again.",
    errorLinkedinFailed: "LinkedIn sign-in failed. Check API configuration.",
    errorInactive: "This account is inactive.",
    errorUnknown: "Sign-in could not be completed.",
    errorOAuthDenied: "Sign-in was cancelled.",
    errorOAuthFailed: "Sign-in failed. Check the provider configuration on the API.",
  },
  register: {
    title: "Create account",
    email: "Email",
    password: "Password",
    gdprBefore: "I accept the",
    privacyPolicy: "Privacy Policy",
    gdprAfter: "and consent to processing my data for job matching (GDPR).",
    creating: "Creating…",
    submit: "Register",
    hasAccount: "Already have an account?",
    login: "Log in",
    gdprRequired: "You must accept the privacy policy.",
    failed: "Registration failed",
    orContinue: "or continue with",
    errorLinkedinNotConfigured:
      "LinkedIn sign-up is not set up on the server yet. Use the form below or ask an admin.",
    errorOAuthNotConfigured:
      "That sign-up provider is not set up on the server yet. Use the form below or ask an admin.",
    linkedIn: "Sign up with LinkedIn",
    linkedInComingSoon:
      "LinkedIn sign-up is off until the API has Client ID, Secret, and LINKEDIN_REDIRECT_URI (see yellow box). Use the form below.",
    linkedInSetupTitle: "Enable LinkedIn sign-up (one-time setup)",
  },
  profile: {
    title: "Your career profile",
    subtitle:
      "Add your CV for contextual matching — TWIN reads experience and skills from the document.",
    cvSection: "Your CV",
    cvHint: "PDF, DOCX or TXT (max 5 MB). We update skills from your CV automatically.",
    cvCurrent: "Uploaded",
    cvUpload: "Upload CV",
    cvReplace: "Replace CV",
    cvRemove: "Remove CV",
    cvUploading: "Reading CV…",
    cvUploaded: "CV saved — matching will use full context from your experience.",
    cvRemoved: "CV removed.",
    cvFailed: "Could not upload CV",
    cvSaveProfileFirst: "Save your profile below first, then upload a CV.",
    fullName: "Full name",
    skills: "Skills (comma-separated)",
    skillsPlaceholder: "e.g. Python, stakeholder management, GTM, UX research",
    yearsExperience: "Years of experience",
    desiredSalary: "Desired salary (PLN / month, gross)",
    salaryPlaceholder: "15000",
    preferredLocation: "Preferred city / region",
    locationPlaceholder: "Warszawa",
    saving: "Saving…",
    submit: "Save profile",
    loading: "Loading profile…",
    backToDashboard: "Back to dashboard",
    failed: "Could not save profile",
    preferredJobTitles: "Target job titles (comma-separated)",
    preferredJobTitlesPlaceholder: "Account Executive, Business Development Manager",
    introAudioSection: "Voice intro (optional)",
    introAudioHint:
      "Short recording for future “tell me about yourself” matching. Stored securely; transcription is Phase 2.",
    introAudioUpload: "Upload audio",
    introAudioUploading: "Uploading…",
    introAudioUploaded: "Audio saved.",
    introAudioFailed: "Could not upload audio",
  },
  onboarding: {
    title: "Assistant onboarding",
    body:
      "A Fluently-style guided flow (voice + chat) will orchestrate goals, languages, and seniority here. Today: use Profile for skills and CV, Dashboard for matches.",
    profileLink: "Open profile",
    dashboardLink: "Back to dashboard",
  },
  calculator: {
    title: "ROI calculator",
    subtitle:
      "Illustrative comparison: a traditional agency success fee vs a TWIN-style monthly fee model — company savings and a candidate bonus pool (not a commercial offer).",
    disclaimer: "Numbers are examples only. Real fees depend on contract, region, and scope.",
    paramsTitle: "Parameters",
    annualSalary: "Candidate annual salary (amounts in selected currency)",
    agencyFee: "Agency success fee (%)",
    placementsPerYear: "Placements per year",
    hrHoursSaved: "HR hours saved per month",
    hrHourlyRate: "Blended HR hourly rate (same currency as salary)",
    currency: "Currency",
    traditionalTitle: "Traditional agency",
    traditionalBadge: "Higher per-hire fee",
    twinTitle: "TWIN-style model (example)",
    twinBadge: "Aligned incentives",
    costPerHire: "Cost per hire",
    agencyFeeDetail: "{{annual}} × {{pct}}%",
    twinFeeDetail: "{{monthly}} monthly × 50% (example)",
    bonusForCandidate: "Candidate bonus pool (example)",
    bonusAfter: "After 6–12 months (illustrative)",
    retention: "Retention guarantee",
    retentionNo: "No",
    retentionYes: "Yes (illustrative)",
    totalAnnualCost: "Total annual placement cost",
    savingsTitle: "Company savings",
    savingsPerHire: "Per hire vs agency",
    cheaperBy: "{{pct}}% lower than agency fee per hire",
    savingsAnnual: "Annual savings (placements × per hire)",
    roiVsAgency: "Savings vs agency fee",
    candidateCardTitle: "Candidate upside (illustrative)",
    candidateCardSub: "Example bonus funded from the success-fee structure.",
    candidateB1: "Less manual application work (automation roadmap)",
    candidateB2: "Stronger match signals when a profile exists",
    candidateB3: "Clearer pipeline status in one workspace",
    companyCardTitle: "Company upside",
    companyCardSub: "Per hire vs traditional agency fee (same assumptions).",
    companyB1: "Lower success-fee pressure per hire (example)",
    companyB2: "Pre-vetted flow as matching matures",
    companyB3: "Operational time back for HR (see below)",
    enterpriseTitle: "Enterprise integration (illustrative)",
    costsTitle: "Costs",
    valueTitle: "Modeled value",
    integrationFee: "Integration fee (annual example)",
    perYear: "/yr",
    timeSavings: "Time savings (annual)",
    timeSavingsSub: "{{hours}} h/mo × {{rate}}/h ({{code}}) × 12 months",
    hireCostSavings: "Hire fee savings (annual)",
    hireCostSavingsSub: "{{perHire}} × {{hires}} placements",
    totalValue: "Total modeled value",
    netBenefit: "Net benefit (value − integration fee)",
    roiLabel: "ROI on integration fee (illustrative)",
    enterpriseFoot:
      "Where modeled value exceeds the integration line item, the surplus is shown as net benefit. This block does not describe TWIN revenue.",
    footerNote:
      "Illustrative model for discussion: companies and candidates can both win when fees align to outcomes. Not pricing, not tax or legal advice.",
  },
  common: {
    language: "Language",
    switchToPl: "Polski",
    switchToEn: "English",
  },
} as const;

type MessageTree = {
  [K in keyof typeof en]: {
    [P in keyof (typeof en)[K]]: string;
  };
};

const pl: MessageTree = {
  nav: {
    login: "Zaloguj się",
    register: "Rejestracja",
    profile: "Profil",
    dashboard: "Panel",
    calculator: "Kalkulator ROI",
    menu: "Menu",
    about: "O nas",
    cases: "Studia przypadków",
    contact: "Kontakt",
    faq: "FAQ",
    careers: "Kariera",
    media: "Media",
    partners: "Partnerzy",
  },
  home: {
    tagline: "Globalna platforma kariery napędzana sztuczną inteligencją",
    title: "Twój bliźniak AI pracuje na rynku przez całą dobę",
    description:
      "TWIN to autonomiczny agent kariery dla profesjonalistów na całym świecie: agreguje oferty z portali i regionów włączonych w Twoim środowisku, ocenia je względem profilu i prowadzi pipeline w jednym miejscu — z auto-aplikacją i umawianiem rozmów w planie rozwoju produktu.",
    getStarted: "Zacznij za darmo",
    logIn: "Zaloguj się",
    scrape: "Odkrywaj",
    scrapeDesc: "Portale i regiony wg konfiguracji — gotowe na rozszerzanie",
    match: "Dopasuj",
    matchDesc: "Ocena pod umiejętności, poziom i cele",
    track: "Śledź",
    trackDesc: "Jedna przestrzeń: wyszukiwanie, zapisane oferty, aplikacje",
    featuresTitle: "Od sygnału do pipeline’u",
    featuresSubtitle:
      "Spokojna przestrzeń pracy zgodna z tym, jak już myślisz o rynku — automatyzacja dołącza etapami.",
    footerHint: "Po rejestracji uzupełnij profil, żeby dopasowanie mogło uwzględnić umiejętności, stanowiska i cele.",
    twinForYourJob: "Twin for your job",
    focusTitle: "Od czego TWIN ma zacząć w Twoim imieniu?",
    focusSubtitle:
      "Wybierz, co jest teraz najważniejsze — po rejestracji trafisz na panel z profilem, feedem i śledzeniem aplikacji w jednym miejscu.",
    focusPickLabel: "Wybierz punkt startu",
    focusChipDiscover: "Świeże oferty w jednym feedzie",
    focusChipMatch: "Ranking pod mój profil",
    focusChipTrack: "Zapis i śledzenie aplikacji",
    focusChipAuto: "Auto-aplikacja (w planie)",
    focusCta: "Zacznij z tymi celami",
    focusFootnote:
      "MVP dziś: agregacja ofert, ocena po uzupełnieniu profilu, statusy aplikacji w jednym UI. Głębsza automatyzacja dochodzi etapami — ta sama spokojna powierzchnia, więcej pracy za kulisami.",
    journeyScrollHint: "Przewiń stronę, żeby przejść przez kolejne rozdziały narracji.",
    journeyRailsAria: "Rozdziały historii na tej stronie",
    storyEyebrow: "Historia",
    storyCh1Kicker: "01 — Sygnał",
    storyCh1Title: "Rynek pracy nie zatrzymuje się w miejscu.",
    storyCh1Body:
      "Oferty rozlatują się po portalach i strefach czasowych. Kandydaci gubią wątek między kartami i zrzutami ekranu. Zespoły powtarzają ten sam sourcing w arkuszach. TWIN zaczyna tam, gdzie ten szum staje się kosztowny.",
    storyCh2Kicker: "02 — Powierzchnia",
    storyCh2Title: "Jedna spokojna przestrzeń, która idzie z Tobą.",
    storyCh2Body:
      "Agreguj to, co pozwala Twoje środowisko, oceniaj role przy profilu i trzymaj każdą aplikację w jednym pipeline. Gdy pojawi się automatyzacja, zostaje w granicach, które ustawiasz — nigdy czarna skrzynka na Twojej karierze.",
    storyCh3Kicker: "03 — Łuk narracji",
    storyCh3Title: "Opowiedz historię, zanim pokażesz funkcję.",
    storyCh3Body:
      "Jak w filmie produktowym: każdy rozdział zasługuje na następny. Faza 1 to dyscyplinowany pipeline, któremu można zaufać. Potem autonomia, która udowadnia się w logach, eksportach i ciszy nocnej — nie w hasełkach marketingowych.",
    timelineEyebrow: "Roadmapa",
    timelineTitle: "Oś czasu, którą czuć",
    timelineSubtitle: "Kolejność kamieni milowych usuwa tarcie, zanim dołożymy autonomię.",
    timeline1When: "Faza 1 · Teraz",
    timeline1Title: "Odkrywaj · Dopasuj · Śledź",
    timeline1Body:
      "Publiczne ogłoszenia, ranking przy profilu i status aplikacji w jednym miejscu — zgoda na start, RODO od pierwszego dnia.",
    timeline2When: "Faza 2",
    timeline2Title: "Mądrzejszy ruch",
    timeline2Body:
      "Akcje zbiorcze, bogatsze wyjaśnienia dopasowania i sygnały, które szanują geografie i godziny ciszy z konfiguracji.",
    timeline3When: "Faza 3",
    timeline3Title: "Pętle autonomiczne",
    timeline3Body:
      "Auto-aplikacja tam, gdzie portale na to pozwalają, okna rozmów zsynchronizowane z kalendarzem i eksporty pod zespół compliance.",
    faqEyebrow: "FAQ",
    faqTitle: "Pytania i odpowiedzi",
    faqPrivacyLink: "Polityka prywatności",
    faq01Q: "Czym jest TWIN dziś?",
    faq01A:
      "Przestrzeń pipeline’u: oferty z portali włączonych w Twoim środowisku, opcjonalna ocena względem profilu oraz jedno miejsce na zapisane i wysłane aplikacje. Pełniejsze auto-aplikacje i kalendarz rozmów są w roadmapie.",
    faq02Q: "Dla kogo to jest?",
    faq02A:
      "Dla osób, które i tak przeszukują kilka portali i notatek i chcą mniej kart — jedno miejsce na przegląd, porównanie i dalsze kroki bez gubienia kontekstu.",
    faq03Q: "Czym to różni się od jednego portalu pracy?",
    faq03A:
      "Portale zostają źródłem ofert; TWIN to warstwa, która porządkuje odkrywanie, sygnały dopasowania i follow-up w jednym UX. Tam, gdzie trzeba, nadal aplikujesz w flow pracodawcy.",
    faq04Q: "Co z moimi danymi?",
    faq04A:
      "Wyrażasz zgodę przy rejestracji. Dane profilu służą do rankingu ofert i działania produktu. O retencji, eksporcie i prawach RODO przeczytasz w polityce — link poniżej.",
  },
  site: SITE_MESSAGES_PL,
  dashboard: {
    title: "Panel",
    logout: "Wyloguj",
    signedInAs: "Zalogowano jako",
    addProfileHint: "Dodaj profil, aby TWIN mógł oceniać oferty pracy.",
    setupProfile: "Utwórz profil",
    edit: "Edytuj",
    years: "lat dośw.",
    scrapeJobs: "Źródła ofert",
    scrapeAll: "Auto scrap",
    scrapeAllHint:
      "Lista portali w panelu i to polecenie respektują SCRAPE_ENABLED_BOARD_IDS na Railway (puste = wszystkie). Worker Celery + Redis obsługuje tryb asynchroniczny; tutaj używany jest sync=true.",
    scrapingAll: "Trwa auto scrap…",
    scraping: "Pobieranie…",
    keepApiOpen: "Podczas pobierania zostaw włączony terminal API.",
    lastUpdated: "Ostatnia aktualizacja",
    regionPoland: "Polska",
    regionEurope: "Europa",
    regionUk: "Wielka Brytania",
    regionAmericas: "Ameryki",
    regionAsiaPacific: "Azja i Pacyfik",
    regionGlobal: "Globalne",
    topMatches: "Najlepsze dopasowania",
    jobs: "Oferty",
    noJobs: "Brak ofert — uruchom Auto scrap powyżej (jeśli włączone) lub poproś administratora o dane.",
    noJobsNoScrapeUi:
      "Brak ofert w bazie — pojawią się po pobraniu danych na serwerze (scrap przez administratora / backend) lub imporcie. Profil służy do dopasowania i filtrów, gdy oferty już są; sam z siebie nie przeszukuje internetu.",
    noJobsFiltered: "Brak ofert dla wybranych filtrów.",
    filterSearch: "Szukaj",
    filterSearchPlaceholder: "Stanowisko, firma, słowa kluczowe…",
    filterTitleTerms: "Docelowe stanowiska (przecinek = dowolne dopasowanie)",
    filterTitlePlaceholder: "np. Account Executive, SDR",
    filterLocation: "Lokalizacja",
    filterBoard: "Portal",
    filterMinSalary: "Min. wynagrodzenie (PLN/mies.)",
    filterSort: "Sortowanie",
    filterAll: "Wszystkie",
    filterApply: "Zastosuj filtry",
    sortNewest: "Najnowsze",
    sortSalary: "Najwyższe wynagrodzenie",
    sortCompany: "Firma A–Z",
    trackJob: "Śledź",
    applyJob: "Aplikuj",
    autoApplyJob: "Auto-aplikuj",
    autoApplyRunning: "Otwieram przeglądarkę…",
    saveJob: "Zapisz",
    dismissJob: "Nie dla mnie",
    applications: "Moje aplikacje",
    noApplications: "Brak śledzonych aplikacji — użyj Zapisz lub Aplikuj przy ofercie.",
    applicationStatus: "Status aplikacji",
    removeApplication: "Usuń",
    appStatusPending: "Zapisana",
    appStatusApplied: "Wysłana",
    appStatusInterview: "Rozmowa",
    appStatusRejected: "Odrzucona",
    appStatusHired: "Zatrudnienie",
    scrapeFailed: "Pobieranie nie powiodło się",
    scrapeFinished: "Pobieranie zakończone",
    twinScrapePanelTitle: "Wciągnij oferty do TWIN",
    twinForYourJob: "Twin for your job",
    twinForYourJobHint:
      "Uruchamia pełny rejestr TWIN (PL: pracuj.pl, rocketjobs.pl, justjoin.it, praca.pl; potem LinkedIn; potem globalnie: Indeed, Glassdoor, StepStone, Reed, SEEK itd.). Lista może być przycięta przez SCRAPE_ENABLED_BOARD_IDS na API. Tryb synchroniczny czeka na API — na demo ustaw krótką listę.",
    twinForYourJobRunning: "Twin for your job — trwa…",
    roadmapSummary: "Docelowe portale i kariery firm (roadmapa)",
    roadmapPortalsTitle: "50 globalnych portali pracy",
    roadmapCompaniesTitle: "Najwięksi pracodawcy (strony kariery)",
    roadmapLiveBadge: "Wdrożone",
    roadmapPlannedBadge: "W planie",
    roadmapFootnote:
      "Dziś „Twin for your job” pobiera źródła z rejestru TWIN; kolejne portale i adaptery stron kariery firm dojdą iteracyjnie pod tym samym przyciskiem.",
    welcomeBack: "Witaj ponownie",
    welcomeBackNamed: "Witaj ponownie, {name}",
    welcomePrompt:
      "Skróty poniżej lub przewiń do listy — TWIN trzyma dopasowania i aplikacje w jednym spokojnym miejscu.",
    quickBrowseFeed: "Przeglądaj oferty",
    quickUpdateProfile: "Profil i preferencje",
    quickTopMatches: "Najlepsze dopasowania",
    quickApplications: "Aplikacje",
    quickWorkspaceTour: "Krótki przewodnik",
    quickRefreshListings: "Odśwież listingi",
    statFeedTitle: "W feedzie",
    statFeedCta: "Przejdź do listy",
    statMatchesTitle: "Silne dopasowania",
    statMatchesCta: "Przejrzyj listę",
    statMatchesSetup: "Uzupełnij profil, by dopasować",
    statPipelineTitle: "Pipeline",
    statPipelineCta: "Otwórz tracker",
    statPipelineHint: "Zapisz lub aplikuj przy ofercie, by zbudować pipeline.",
    applyPromptTitle: "Co robimy dalej?",
    applyPromptLead:
      "Świeże oferty są w bazie — najlepsze dopasowania masz wyżej. Mam przypominać, gdy wierzch listy wygląda na gotowy do aplikacji?",
    applyPromptYes: "Tak, przypominaj",
    applyPromptNo: "Nie teraz",
    applyPromptLater: "Później",
    billingLink: "Plan i płatności",
    billingPageTitle: "Plan i płatności",
    billingPageLead:
      "Wersja Free utrzymuje uporządkowany pipeline; Premium daje nielimitowane śledzenie aplikacji i auto-apply. Płatności przez Stripe Checkout — karty, Apple Pay i Google Pay pojawiają się, gdy przeglądarka je obsługuje.",
    billingCurrentPlan: "Obecny plan",
    billingSubscriptionStatus: "Status subskrypcji",
    billingPeriodEnds: "Koniec bieżącego okresu",
    billingNotActive: "—",
    billingPlansTitle: "Dostępne plany",
    billingUpgradePremium: "Przejdź na Premium",
    billingUpgradePro: "Przejdź na Pro",
    billingManagePortal: "Zarządzaj subskrypcją i fakturami",
    billingNotConfigured: "Płatności nie są skonfigurowane na tym API (brak zmiennych Stripe).",
    billingCheckoutSuccess: "Dziękujemy — subskrypcja powinna aktywować się w ciągu ok. minuty po potwierdzeniu płatności przez Stripe.",
    billingCheckoutCancelled: "Płatność anulowana. Możesz spróbować ponownie w dowolnym momencie.",
    billingPortalHint: "W portalu klienta zmienisz kartę, anulujesz subskrypcję lub pobierzesz faktury.",
    billingTrackedCap: "Do {n} aktywnie śledzonych aplikacji (odrzucone się nie liczą).",
    billingTrackedUnlimited: "Nielimitowane aktywne aplikacje w trackerze.",
  },
  login: {
    title: "Zaloguj się",
    email: "E-mail",
    password: "Hasło",
    signingIn: "Logowanie…",
    submit: "Zaloguj się",
    forgotPassword: "Nie pamiętasz hasła?",
    noAccount: "Nie masz konta?",
    register: "Zarejestruj się",
    failed: "Logowanie nie powiodło się",
    orContinue: "lub kontynuuj przez",
    linkedIn: "Kontynuuj z LinkedIn",
    linkedInComingSoon:
      "Logowanie LinkedIn jest wyłączone, dopóki API nie ma Client ID, Secret i LINKEDIN_REDIRECT_URI (żółta ramka). Użyj e-mail poniżej.",
    linkedInSetupTitle: "Włącz logowanie LinkedIn (jednorazowo)",
    linkedInSetupStep1: "Załóż aplikację na linkedin.com/developers → „Sign In with OpenID Connect”.",
    linkedInSetupStep2Intro:
      "W LinkedIn → Auth → Authorized redirect URLs dodaj dokładnie każdy adres poniżej (zgodny z konfiguracją API).",
    linkedInSetupCallbackProd: "API produkcyjne (NEXT_PUBLIC_API_URL na Vercel / Railway):",
    linkedInSetupCallbackLocal: "API lokalne (development):",
    linkedInSetupStep3:
      "Na hoście API (np. Railway) ustaw LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET i LINKEDIN_REDIRECT_URI dokładnie na adres callback powyżej (lub localhost w dev), potem redeploy API.",
    linkedInSetupDoc: "Instrukcja: docs/LINKEDIN_KONFIGURACJA_PL.md w folderze projektu.",
    errorLinkedinNotConfigured:
      "Logowanie przez LinkedIn jest niedostępne. Użyj formularza e-mail poniżej.",
    errorOAuthNotConfigured:
      "Ten sposób logowania nie jest jeszcze skonfigurowany na serwerze. Użyj e-mail lub poproś administratora.",
    oauthGoogle: "Kontynuuj z Google",
    oauthGithub: "Kontynuuj z GitHub",
    oauthApple: "Kontynuuj z Apple",
  },
  forgotPassword: {
    title: "Reset hasła",
    email: "E-mail",
    submit: "Wyślij link resetujący",
    sending: "Wysyłanie…",
    backToLogin: "Wróć do logowania",
    sentTitle: "Sprawdź skrzynkę",
    sentBody:
      "Jeśli istnieje konto dla tego adresu, wysłaliśmy instrukcję resetu hasła. Link wygasa po ok. godzinie.",
  },
  resetPassword: {
    title: "Ustaw nowe hasło",
    password: "Nowe hasło",
    passwordConfirm: "Potwierdź hasło",
    mismatch: "Hasła nie są takie same.",
    missingToken:
      "Link resetujący jest niepoprawny lub niekompletny. Poproś o nowy link na stronie logowania.",
    submit: "Zapisz hasło",
    updating: "Zapisywanie…",
    success: "Hasło zostało zmienione. Możesz się zalogować.",
    backToLogin: "Zaloguj się",
    failed: "Nie udało się zresetować hasła",
  },
  authCallback: {
    title: "Logowanie",
    signingIn: "Kończenie logowania…",
    errorLinkedinDenied: "Logowanie przez LinkedIn zostało anulowane.",
    errorLinkedinNotConfigured:
      "Logowanie przez LinkedIn nie jest jeszcze skonfigurowane na serwerze. Użyj e-mail poniżej lub poproś administratora.",
    errorInvalidState: "Sesja wygasła. Spróbuj ponownie.",
    errorLinkedinFailed:
      "Logowanie przez LinkedIn nie powiodło się. Sprawdź konfigurację API.",
    errorInactive: "To konto jest nieaktywne.",
    errorUnknown: "Nie udało się dokończyć logowania.",
    errorOAuthDenied: "Logowanie zostało anulowane.",
    errorOAuthFailed: "Logowanie nie powiodło się. Sprawdź konfigurację dostawcy na API.",
  },
  register: {
    title: "Utwórz konto",
    email: "E-mail",
    password: "Hasło",
    gdprBefore: "Akceptuję",
    privacyPolicy: "Politykę prywatności",
    gdprAfter:
      "i wyrażam zgodę na przetwarzanie danych w celu dopasowania ofert pracy (RODO).",
    creating: "Tworzenie konta…",
    submit: "Zarejestruj się",
    hasAccount: "Masz już konto?",
    login: "Zaloguj się",
    gdprRequired: "Musisz zaakceptować politykę prywatności.",
    failed: "Rejestracja nie powiodła się",
    orContinue: "lub kontynuuj przez",
    errorLinkedinNotConfigured:
      "Rejestracja przez LinkedIn nie jest jeszcze skonfigurowana na serwerze. Użyj formularza poniżej lub poproś administratora.",
    errorOAuthNotConfigured:
      "Ta metoda rejestracji nie jest jeszcze skonfigurowana na serwerze. Użyj formularza poniżej lub poproś administratora.",
    linkedIn: "Zarejestruj się przez LinkedIn",
    linkedInComingSoon:
      "Rejestracja przez LinkedIn jest wyłączona, dopóki API nie ma Client ID, Secret i LINKEDIN_REDIRECT_URI (żółta ramka). Użyj formularza poniżej.",
    linkedInSetupTitle: "Włącz rejestrację przez LinkedIn (jednorazowo)",
  },
  profile: {
    title: "Twój profil zawodowy",
    subtitle:
      "Dodaj CV, aby dopasować oferty kontekstowo — TWIN odczyta doświadczenie i umiejętności z dokumentu.",
    cvSection: "Twoje CV",
    cvHint: "PDF, DOCX lub TXT (max 5 MB). Umiejętności uzupełnimy automatycznie z CV.",
    cvCurrent: "Wgrane",
    cvUpload: "Wgraj CV",
    cvReplace: "Zmień CV",
    cvRemove: "Usuń CV",
    cvUploading: "Odczytuję CV…",
    cvUploaded: "CV zapisane — dopasowanie uwzględnia pełny kontekst Twojego doświadczenia.",
    cvRemoved: "CV usunięte.",
    cvFailed: "Nie udało się wgrać CV",
    cvSaveProfileFirst: "Najpierw zapisz profil poniżej, potem wgraj CV.",
    fullName: "Imię i nazwisko",
    skills: "Umiejętności (oddzielone przecinkami)",
    skillsPlaceholder: "np. Python, zarządzanie interesariuszami, GTM, badania UX",
    yearsExperience: "Lata doświadczenia",
    desiredSalary: "Oczekiwane wynagrodzenie (PLN / mies., brutto)",
    salaryPlaceholder: "15000",
    preferredLocation: "Preferowane miasto / region",
    locationPlaceholder: "Warszawa",
    saving: "Zapisywanie…",
    submit: "Zapisz profil",
    loading: "Ładowanie profilu…",
    backToDashboard: "Wróć do panelu",
    failed: "Nie udało się zapisać profilu",
    preferredJobTitles: "Docelowe stanowiska (oddzielone przecinkami)",
    preferredJobTitlesPlaceholder: "Account Executive, Business Development Manager",
    introAudioSection: "Nagranie głosowe (opcjonalnie)",
    introAudioHint:
      "Krótkie nagranie pod przyszłe dopasowanie „opowiedz o sobie”. Przechowywane bezpiecznie; transkrypcja w fazie 2.",
    introAudioUpload: "Wgraj nagranie",
    introAudioUploading: "Wgrywanie…",
    introAudioUploaded: "Nagranie zapisane.",
    introAudioFailed: "Nie udało się wgrać nagrania",
  },
  onboarding: {
    title: "Onboarding asystenta",
    body:
      "Tutaj powstanie prowadzony przepływ (głos + czat) w stylu Fluently: cele, języki, poziom. Na dziś: uzupełnij Profil (umiejętności, CV) i wróć do Panelu po dopasowania.",
    profileLink: "Otwórz profil",
    dashboardLink: "Wróć do panelu",
  },
  calculator: {
    title: "Kalkulator ROI",
    subtitle:
      "Model przykładowy: success fee agencji tradycyjnej vs model opłaty miesięcznej w stylu TWIN — oszczędności firmy i pula bonusu dla kandydata (nie jest ofertą handlową).",
    disclaimer: "To liczby ilustracyjne. Realne stawki zależą od umowy, regionu i zakresu.",
    paramsTitle: "Parametry",
    annualSalary: "Roczna pensja kandydata (kwoty w wybranej walucie)",
    agencyFee: "Success fee agencji (%)",
    placementsPerYear: "Liczba zatrudnień rocznie",
    hrHoursSaved: "Zaoszczędzone godziny HR / miesiąc",
    hrHourlyRate: "Średnia stawka godzinowa HR (ta sama waluta co pensja)",
    currency: "Waluta",
    traditionalTitle: "Agencja tradycyjna",
    traditionalBadge: "Wyższy koszt per hire",
    twinTitle: "Model w stylu TWIN (przykład)",
    twinBadge: "Spójne incentywy",
    costPerHire: "Koszt per hire",
    agencyFeeDetail: "{{annual}} × {{pct}}%",
    twinFeeDetail: "{{monthly}} miesięcznie × 50% (przykład)",
    bonusForCandidate: "Pula bonusu dla kandydata (przykład)",
    bonusAfter: "Po 6–12 miesiącach (ilustracja)",
    retention: "Gwarancja retencji",
    retentionNo: "Nie",
    retentionYes: "Tak (ilustracja)",
    totalAnnualCost: "Łączny roczny koszt zatrudnień",
    savingsTitle: "Oszczędności firmy",
    savingsPerHire: "Per hire vs agencja",
    cheaperBy: "{{pct}}% taniej niż success fee agencji per hire",
    savingsAnnual: "Oszczędności rocznie (zatrudnienia × per hire)",
    roiVsAgency: "Oszczędność vs fee agencji",
    candidateCardTitle: "Korzyść kandydata (ilustracja)",
    candidateCardSub: "Przykładowy bonus finansowany ze struktury success fee.",
    candidateB1: "Mniej ręcznej pracy przy aplikacjach (roadmapa automatyzacji)",
    candidateB2: "Silniejsze sygnały dopasowania przy uzupełnionym profilu",
    candidateB3: "Czytelniejszy status pipeline’u w jednym miejscu",
    companyCardTitle: "Korzyść firmy",
    companyCardSub: "Per hire względem agencji przy tych samych założeniach.",
    companyB1: "Niższe ciśnienie success fee per hire (przykład)",
    companyB2: "Lepszy przepływ weryfikacji w miarę dojrzewania dopasowania",
    companyB3: "Czas operacyjny HR z powrotem (sekcja enterprise)",
    enterpriseTitle: "Integracja enterprise (ilustracja)",
    costsTitle: "Koszty",
    valueTitle: "Modelowana wartość",
    integrationFee: "Opłata integracyjna (roczny przykład)",
    perYear: "/rok",
    timeSavings: "Oszczędność czasu (rocznie)",
    timeSavingsSub: "{{hours}} h/mies. × {{rate}}/h ({{code}}) × 12 mies.",
    hireCostSavings: "Oszczędność na fee od zatrudnień (rocznie)",
    hireCostSavingsSub: "{{perHire}} × {{hires}} zatrudnień",
    totalValue: "Łączna zamodelowana wartość",
    netBenefit: "Korzyść netto (wartość − opłata integracyjna)",
    roiLabel: "ROI od opłaty integracyjnej (ilustracja)",
    enterpriseFoot:
      "Gdy zamodelowana wartość przewyższa linię integracji, nadwyżka jest pokazana jako korzyść netto. Ten blok nie opisuje przychodu TWIN.",
    footerNote:
      "Model dyskusyjny: firma i kandydat mogą wygrać, gdy opłaty wiążą się z efektem. To nie cennik ani porada prawno-podatkowa.",
  },
  common: {
    language: "Język",
    switchToPl: "PL",
    switchToEn: "EN",
  },
};

function messagesFromEnOverlay(overlay: Record<string, unknown>): typeof en {
  return mergeDeep(
    structuredClone(en) as unknown as Record<string, unknown>,
    overlay,
  ) as typeof en;
}

const es = messagesFromEnOverlay(esOverlay);
const it = messagesFromEnOverlay(itOverlay);
const fr = messagesFromEnOverlay(frOverlay);
const de = messagesFromEnOverlay(deOverlay);
const zh = messagesFromEnOverlay(zhOverlay);
const ar = messagesFromEnOverlay(arOverlay);
const ja = messagesFromEnOverlay(jaOverlay);

export const dictionaries: Record<Locale, typeof en> = {
  en,
  pl: pl as typeof en,
  es,
  it,
  fr,
  de,
  zh,
  ar,
  ja,
};

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const raw = navigator.language?.toLowerCase() ?? "en";
  const primary = raw.split("-")[0] ?? "en";
  if (raw.startsWith("zh") || primary === "zh") return "zh";
  if (raw.startsWith("ar") || primary === "ar") return "ar";
  const byPrimary: Record<string, Locale> = {
    pl: "pl",
    es: "es",
    it: "it",
    fr: "fr",
    de: "de",
    ja: "ja",
  };
  return byPrimary[primary] ?? "en";
}

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

export function translate(locale: Locale, key: TranslationKey): string {
  return getNestedValue(dictionaries[locale] as unknown as Record<string, unknown>, key);
}
