export type Locale = "en" | "pl";

export const LOCALES: Locale[] = ["en", "pl"];
export const LOCALE_STORAGE_KEY = "twin_locale";

export type TranslationKey =
  | `nav.${keyof typeof en.nav}`
  | `home.${keyof typeof en.home}`
  | `dashboard.${keyof typeof en.dashboard}`
  | `login.${keyof typeof en.login}`
  | `register.${keyof typeof en.register}`
  | `authCallback.${keyof typeof en.authCallback}`
  | `profile.${keyof typeof en.profile}`
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
    tagline: "For sales & commercial professionals",
    title: "The right roles. Less manual search.",
    description:
      "TWIN monitors Polish job boards, scores openings against your profile, and keeps your pipeline organised — built for managers and B2B careers.",
    getStarted: "Start free",
    logIn: "Sign in",
    scrape: "Discover",
    scrapeDesc: "Curated listings from top boards",
    match: "Match",
    matchDesc: "Scored to your skills and goals",
    track: "Track",
    trackDesc: "One dashboard for your search",
  },
  dashboard: {
    title: "Dashboard",
    logout: "Log out",
    signedInAs: "Signed in as",
    addProfileHint: "Add a profile so TWIN can rank jobs for you.",
    setupProfile: "Set up profile",
    edit: "Edit",
    years: "yrs",
    scrapeJobs: "Scrape jobs",
    scrapeAll: "Scrape all boards",
    scrapeAllHint: "Any button scrapes every board below. This may take several minutes.",
    scrapingAll: "Scraping all boards…",
    scraping: "Scraping…",
    keepApiOpen: "Keep the API terminal open while scraping.",
    autoRefresh: "Auto-refresh every 2 min",
    lastUpdated: "Last updated",
    regionPoland: "Poland",
    regionEurope: "Europe",
    regionUk: "United Kingdom",
    regionAmericas: "Americas",
    regionAsiaPacific: "Asia-Pacific",
    regionGlobal: "Global",
    topMatches: "Top matches",
    jobs: "Jobs",
    noJobs: "No jobs yet — use the buttons above to scrape.",
    noJobsFiltered: "No jobs match these filters.",
    filterSearch: "Search",
    filterSearchPlaceholder: "Title, company, keywords…",
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
    noAccount: "No account?",
    register: "Register",
    failed: "Login failed",
    orContinue: "or continue with",
    linkedIn: "Continue with LinkedIn",
    linkedInComingSoon: "LinkedIn login coming soon — use email below",
    linkedInSetupTitle: "Enable LinkedIn login (one-time setup)",
    linkedInSetupStep1: "Create an app at linkedin.com/developers → add “Sign In with OpenID Connect”.",
    linkedInSetupStep2: "Add redirect URL: http://localhost:8000/api/v1/auth/linkedin/callback",
    linkedInSetupStep3: "Paste Client ID and Secret into .env, restart API (make api).",
    linkedInSetupDoc: "Full guide: docs/LINKEDIN_KONFIGURACJA_PL.md in the project folder.",
    errorLinkedinNotConfigured: "LinkedIn login is not available yet. Please use email below.",
  },
  authCallback: {
    title: "Signing you in",
    signingIn: "Completing sign-in…",
    errorLinkedinDenied: "LinkedIn sign-in was cancelled.",
    errorInvalidState: "Sign-in session expired. Please try again.",
    errorLinkedinFailed: "LinkedIn sign-in failed. Check API configuration.",
    errorInactive: "This account is inactive.",
    errorUnknown: "Sign-in could not be completed.",
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
    linkedIn: "Sign up with LinkedIn",
    linkedInComingSoon: "LinkedIn login coming soon — use email below",
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
    skillsPlaceholder: "sales, B2B, CRM, negotiation, key account",
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
    tagline: "Dla sprzedawców i menedżerów B2B",
    title: "Właściwe oferty. Mniej ręcznego szukania.",
    description:
      "TWIN monitoruje polskie portale pracy, ocenia oferty względem Twojego profilu i porządkuje proces rekrutacji — dla menedżerów i karier B2B.",
    getStarted: "Zacznij za darmo",
    logIn: "Zaloguj się",
    scrape: "Odkrywaj",
    scrapeDesc: "Oferty z wiodących portali",
    match: "Dopasuj",
    matchDesc: "Ocena pod Twoje umiejętności",
    track: "Śledź",
    trackDesc: "Jeden panel całego procesu",
  },
  dashboard: {
    title: "Panel",
    logout: "Wyloguj",
    signedInAs: "Zalogowano jako",
    addProfileHint: "Dodaj profil, aby TWIN mógł oceniać oferty pracy.",
    setupProfile: "Utwórz profil",
    edit: "Edytuj",
    years: "lat dośw.",
    scrapeJobs: "Pobierz oferty",
    scrapeAll: "Pobierz ze wszystkich portali",
    scrapeAllHint:
      "Każdy przycisk pobiera oferty ze wszystkich portali poniżej. Może to potrwać kilka minut.",
    scrapingAll: "Pobieranie ze wszystkich portali…",
    scraping: "Pobieranie…",
    keepApiOpen: "Podczas pobierania zostaw włączony terminal API.",
    autoRefresh: "Odświeżanie co 2 min",
    lastUpdated: "Ostatnia aktualizacja",
    regionPoland: "Polska",
    regionEurope: "Europa",
    regionUk: "Wielka Brytania",
    regionAmericas: "Ameryki",
    regionAsiaPacific: "Azja i Pacyfik",
    regionGlobal: "Globalne",
    topMatches: "Najlepsze dopasowania",
    jobs: "Oferty",
    noJobs: "Brak ofert — użyj przycisków powyżej, aby pobrać dane.",
    noJobsFiltered: "Brak ofert dla wybranych filtrów.",
    filterSearch: "Szukaj",
    filterSearchPlaceholder: "Stanowisko, firma, słowa kluczowe…",
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
    noAccount: "Nie masz konta?",
    register: "Zarejestruj się",
    failed: "Logowanie nie powiodło się",
    orContinue: "lub kontynuuj przez",
    linkedIn: "Kontynuuj z LinkedIn",
    linkedInComingSoon: "Logowanie przez LinkedIn wkrótce — użyj formularza e-mail poniżej",
    linkedInSetupTitle: "Włącz logowanie LinkedIn (jednorazowo)",
    linkedInSetupStep1: "Załóż aplikację na linkedin.com/developers → „Sign In with OpenID Connect”.",
    linkedInSetupStep2: "Redirect URL: http://localhost:8000/api/v1/auth/linkedin/callback",
    linkedInSetupStep3: "Wklej Client ID i Secret do pliku .env, zrestartuj API (make api).",
    linkedInSetupDoc: "Instrukcja: docs/LINKEDIN_KONFIGURACJA_PL.md w folderze projektu.",
    errorLinkedinNotConfigured:
      "Logowanie przez LinkedIn jest niedostępne. Użyj formularza e-mail poniżej.",
  },
  authCallback: {
    title: "Logowanie",
    signingIn: "Kończenie logowania…",
    errorLinkedinDenied: "Logowanie przez LinkedIn zostało anulowane.",
    errorInvalidState: "Sesja wygasła. Spróbuj ponownie.",
    errorLinkedinFailed:
      "Logowanie przez LinkedIn nie powiodło się. Sprawdź konfigurację API.",
    errorInactive: "To konto jest nieaktywne.",
    errorUnknown: "Nie udało się dokończyć logowania.",
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
    linkedIn: "Zarejestruj się przez LinkedIn",
    linkedInComingSoon: "Logowanie przez LinkedIn wkrótce — użyj formularza e-mail poniżej",
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
    skillsPlaceholder: "sales, B2B, CRM, negotiation, key account",
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
