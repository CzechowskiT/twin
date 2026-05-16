export type Locale = "en" | "pl";

export const LOCALES: Locale[] = ["en", "pl"];
export const LOCALE_STORAGE_KEY = "twin_locale";

export type TranslationKey =
  | `nav.${keyof typeof en.nav}`
  | `home.${keyof typeof en.home}`
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
    menu: "Menu",
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
  },
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
    scrapeAllHint: "Runs all job sources configured on the server (see SCRAPE_ENABLED_BOARD_IDS).",
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
    oauthMicrosoft: "Continue with Microsoft",
    oauthMicrosoftSoon:
      "Microsoft sign-in off — set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI (and optional MICROSOFT_TENANT=common) on the API, then redeploy.",
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
    menu: "Menu",
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
  },
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
      "Uruchamia wszystkie źródła skonfigurowane na serwerze (patrz SCRAPE_ENABLED_BOARD_IDS).",
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
    oauthMicrosoft: "Kontynuuj z Microsoft",
    oauthMicrosoftSoon:
      "Logowanie Microsoft wyłączone — ustaw MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI (opcjonalnie MICROSOFT_TENANT=common) na API i zrób redeploy.",
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
  common: {
    language: "Język",
    switchToPl: "PL",
    switchToEn: "EN",
  },
};

export const dictionaries: Record<Locale, typeof en> = { en, pl: pl as typeof en };

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  return lang.startsWith("pl") ? "pl" : "en";
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
