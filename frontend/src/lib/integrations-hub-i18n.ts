/** Integration hub copy — merged into i18n.ts (EN + PL). */

export const INTEGRATIONS_HUB_MESSAGES_EN = {
  title: "Integrations hub",
  lead:
    "Connect Pracuj.pl ecosystem tools, LinkedIn Hiring, and global ATS — filtered to your workspace role.",
  leadRecruiter:
    "ATS, sourcing, and hire confirmation for recruiters — Pracuj.pl featured for Poland.",
  leadCompany:
    "Employer branding, multiposting, HR SaaS, and salary tools — without candidate admin noise.",
  leadCandidate:
    "Job sources TWIN scans for you — not employer ATS admin panels.",
  tabPracuj: "Pracuj.pl ecosystem",
  tabLinkedin: "LinkedIn Hiring",
  tabOtherAts: "Other ATS",
  providerPracuj: "Grupa Pracuj",
  providerLinkedin: "LinkedIn",
  providerTwin: "TWIN",
  providerOther: "Partner",
  category: {
    ats: "ATS & recruitment",
    jobboard: "Job boards",
    employer_branding: "Employer branding",
    hr_saas: "HR SaaS",
    data_tools: "Data & calculators",
    ads: "Advertising",
    services: "Services",
  },
  actionConnect: "Connect",
  actionConfigure: "Configure",
  actionLearnMore: "Learn more",
  actionComingSoon: "Coming soon",
  actionConnected: "Connected",
  actionOfficialSite: "Official site",
  badgeAvailable: "Available",
  badgeBeta: "Beta",
  badgeComingSoon: "Coming soon",
  badgeConnected: "Connected",
  gdprNote:
    "Strefa Pracuj.pl and eRecruiter may process candidate CV data. TWIN stores credentials encrypted and only syncs with your explicit GDPR consent.",
  connectModalLead:
    "Enter partner credentials from your Pracuj / eRecruiter account manager. TWIN encrypts keys at rest.",
  connectAccountId: "Account / company ID",
  connectAccountIdPlaceholder: "e.g. employer slug or eRecruiter client ID",
  connectApiKey: "API key",
  connectApiKeyPlaceholder: "Paste partner API key",
  connectGdprConsent:
    "I confirm lawful basis and candidate consent to sync applications and CV data from Strefa Pracuj.pl / eRecruiter into TWIN.",
  cancelButton: "Cancel",
  toastConnected: "Integration saved.",
  toastFailed: "Could not save integration.",
  toastComingSoon: "Partner API not public yet — we recorded your interest.",
  backRecruiter: "Recruiter workspace",
  backCompany: "Companies hub",
  backCandidate: "Candidate dashboard",
  items: {
    pracujErecruiter: {
      name: "eRecruiter",
      description:
        "Leading Polish ATS — sync applications, stages, and hire signals into TWIN placement verification.",
    },
    pracujSoftgarden: {
      name: "softgarden",
      description: "European ATS used by Pracuj.pl multiposting — connect when partner API is available.",
    },
    pracujStrefa: {
      name: "Strefa Pracuj.pl",
      description:
        "Employer zone for Pracuj.pl listings — link account to import applicants with GDPR consent.",
    },
    pracujExternalAts: {
      name: "External ATS redirect",
      description: "Pracuj.pl listings that redirect candidates to your own ATS — configure apply URLs in TWIN jobs.",
    },
    pracujErecruiterForm: {
      name: "Integrated eRecruiter form",
      description: "Embedded eRecruiter apply form on Pracuj.pl — auto-match applicants when API ships.",
    },
    pracujPl: {
      name: "Pracuj.pl",
      description: "Poland's largest job board — listings, apply flows, and TWIN scraper coverage.",
    },
    pracujTheprotocol: {
      name: "the:protocol",
      description: "IT job board in the Grupa Pracuj portfolio — multipost alongside Pracuj.pl.",
    },
    pracujRobota: {
      name: "robota.ua",
      description: "Ukraine job board in the ecosystem — for cross-border hiring teams.",
    },
    pracujMultiposting: {
      name: "Multiposting partners",
      description: "Publish once across Pracuj.pl network boards — OAuth connect coming soon.",
    },
    pracujEmployerProfile: {
      name: "Profile Pracodawców",
      description: "Employer brand pages on Pracuj.pl — showcase culture, benefits, and open roles.",
    },
    pracujAds: {
      name: "Pracuj ADS",
      description: "Paid visibility on Pracuj.pl — sponsored listings and display placements.",
    },
    pracujJobicon: {
      name: "JOBICON",
      description: "Employer branding events and awards in the Grupa Pracuj network.",
    },
    pracujSponsored: {
      name: "Sponsored content",
      description: "Editorial and content marketing packages for employer brand reach.",
    },
    pracujWorksmile: {
      name: "worksmile",
      description: "Employee benefits platform — HR SaaS integration stub for benefits-aware job posts.",
    },
    pracujAbsence: {
      name: "absence.io",
      description: "Absence management — connect HR stack signals when partner API opens.",
    },
    pracujSalaryGrid: {
      name: "Siatka wynagrodzeń",
      description: "Official Grupa Pracuj salary grid — benchmark offers before publishing.",
    },
    pracujCalculators: {
      name: "Pracuj calculators",
      description: "Employer cost, net/gross salary, VAT, and B2B calculators for HR and finance.",
    },
    pracujReports: {
      name: "HR reports",
      description: "Labour market reports and hiring trend data from Grupa Pracuj research.",
    },
    pracujHrChallenges: {
      name: "Wyzwania HR",
      description: "HR challenge programs and community insights for talent teams.",
    },
    pracujRecruitment360: {
      name: "Rekrutacja 360",
      description: "Full-service recruitment from Grupa Pracuj — RPO-style support for employers.",
    },
    pracujAnonymousJob: {
      name: "Anonymous job posting",
      description: "Confidential listings on Pracuj.pl when hiring discreetly.",
    },
    linkedinRecruiter: {
      name: "LinkedIn Recruiter",
      description: "Full recruiting seat — separate OAuth from candidate LinkedIn sign-in.",
    },
    linkedinHiringPro: {
      name: "Hiring Pro",
      description: "Combined hiring bundle — connect when LinkedIn partner scopes are approved.",
    },
    linkedinRecruiterLite: {
      name: "Recruiter Lite",
      description: "Lightweight sourcing seat for small teams and agencies.",
    },
    linkedinJobSlots: {
      name: "Jobs & Job Slots",
      description: "Promoted job posts on LinkedIn — slot management integration coming soon.",
    },
    linkedinCareerPages: {
      name: "Career Pages",
      description: "Hosted career site on LinkedIn — employer branding for company persona.",
    },
    linkedinTalentInsights: {
      name: "Talent Insights",
      description: "Workforce analytics and talent pool intelligence for workforce planning.",
    },
    linkedinHiringIntegrations: {
      name: "Hiring Integrations",
      description: "LinkedIn ATS sync marketplace — TWIN placement hooks when partner API lands.",
    },
    linkedinCampaignManager: {
      name: "Campaign Manager",
      description: "Run LinkedIn ads for hiring and employer brand campaigns.",
    },
    linkedinAdFormats: {
      name: "Ad formats",
      description: "Single image, carousel, video, and message ads for talent marketing.",
    },
    linkedinPage: {
      name: "LinkedIn Page",
      description: "Company page — organic reach and life content for candidates.",
    },
    linkedinBusinessManager: {
      name: "Business Manager",
      description: "Central ad account and permissions for marketing teams.",
    },
    linkedinSalesNavigator: {
      name: "Sales Navigator",
      description: "Prospecting tool — optional for agency sourcers, not core HR workflow.",
    },
    twinPracujScraper: {
      name: "Pracuj.pl job feed",
      description: "TWIN scans Pracuj.pl for matches — enable in dashboard job sources.",
    },
    twinRocketjobs: {
      name: "RocketJobs feed",
      description: "Polish tech board in TWIN scraper — matches appear in your pipeline.",
    },
  },
} as const;

export const INTEGRATIONS_HUB_MESSAGES_PL = {
  title: "Centrum integracji",
  lead:
    "Połącz narzędzia ekosystemu Pracuj.pl, LinkedIn Hiring i globalne ATS — filtrowane do Twojej roli.",
  leadRecruiter:
    "ATS, sourcing i potwierdzenie zatrudnienia — ekosystem Pracuj.pl w pierwszej kolejności.",
  leadCompany:
    "Employer branding, multiposting, HR SaaS i kalkulatory — bez paneli admin kandydata.",
  leadCandidate:
    "Źródła ofert skanowane przez TWIN — bez paneli ATS pracodawcy.",
  tabPracuj: "Ekosystem Pracuj.pl",
  tabLinkedin: "LinkedIn Hiring",
  tabOtherAts: "Inne ATS",
  providerPracuj: "Grupa Pracuj",
  providerLinkedin: "LinkedIn",
  providerTwin: "TWIN",
  providerOther: "Partner",
  category: {
    ats: "ATS i rekrutacja",
    jobboard: "Portale ogłoszeniowe",
    employer_branding: "Employer branding",
    hr_saas: "HR SaaS",
    data_tools: "Dane i kalkulatory",
    ads: "Reklama",
    services: "Usługi",
  },
  actionConnect: "Połącz",
  actionConfigure: "Konfiguruj",
  actionLearnMore: "Dowiedz się więcej",
  actionComingSoon: "Wkrótce",
  actionConnected: "Połączono",
  actionOfficialSite: "Strona produktu",
  badgeAvailable: "Dostępne",
  badgeBeta: "Beta",
  badgeComingSoon: "Wkrótce",
  badgeConnected: "Połączono",
  gdprNote:
    "Strefa Pracuj.pl i eRecruiter mogą przetwarzać CV kandydatów. TWIN szyfruje dane logowania i synchronizuje tylko po Twojej zgodzie RODO.",
  connectModalLead:
    "Wpisz dane partnerskie od opiekuna konta Pracuj / eRecruiter. Klucze są szyfrowane w spoczynku.",
  connectAccountId: "ID konta / firmy",
  connectAccountIdPlaceholder: "np. slug pracodawcy lub ID klienta eRecruiter",
  connectApiKey: "Klucz API",
  connectApiKeyPlaceholder: "Wklej klucz API partnera",
  connectGdprConsent:
    "Potwierdzam podstawę prawną i zgodę kandydatów na synchronizację aplikacji i CV ze Strefy Pracuj.pl / eRecruiter do TWIN.",
  cancelButton: "Anuluj",
  toastConnected: "Integracja zapisana.",
  toastFailed: "Nie udało się zapisać integracji.",
  toastComingSoon: "Publiczne API partnera jeszcze niedostępne — zapisaliśmy zainteresowanie.",
  backRecruiter: "Strefa rekrutera",
  backCompany: "Hub firm",
  backCandidate: "Panel kandydata",
  items: {
    pracujErecruiter: {
      name: "eRecruiter",
      description:
        "Polski ATS — synchronizacja aplikacji, etapów i sygnałów zatrudnienia z weryfikacją placement w TWIN.",
    },
    pracujSoftgarden: {
      name: "softgarden",
      description: "Europejski ATS w multipostingu Pracuj.pl — połączenie gdy API partnera będzie dostępne.",
    },
    pracujStrefa: {
      name: "Strefa Pracuj.pl",
      description:
        "Strefa pracodawcy na Pracuj.pl — połącz konto, aby importować kandydatów ze zgodą RODO.",
    },
    pracujExternalAts: {
      name: "Przekierowanie do zewnętrznego ATS",
      description:
        "Ogłoszenia Pracuj.pl kierujące do własnego ATS — skonfiguruj URL aplikacji w ofertach TWIN.",
    },
    pracujErecruiterForm: {
      name: "Zintegrowany formularz eRecruiter",
      description: "Formularz eRecruiter na Pracuj.pl — auto-dopasowanie aplikacji gdy API będzie live.",
    },
    pracujPl: {
      name: "Pracuj.pl",
      description: "Największy portal w Polsce — ogłoszenia, aplikacje i zasięg skanera TWIN.",
    },
    pracujTheprotocol: {
      name: "the:protocol",
      description: "Portal IT w portfolio Grupy Pracuj — multiposting obok Pracuj.pl.",
    },
    pracujRobota: {
      name: "robota.ua",
      description: "Ukraiński portal w ekosystemie — dla zespołów rekrutujących cross-border.",
    },
    pracujMultiposting: {
      name: "Partnerzy multipostingu",
      description: "Publikacja na sieci portali Grupy Pracuj — OAuth wkrótce.",
    },
    pracujEmployerProfile: {
      name: "Profile Pracodawców",
      description: "Strony marki pracodawcy na Pracuj.pl — kultura, benefity i oferty.",
    },
    pracujAds: {
      name: "Pracuj ADS",
      description: "Płatna widoczność na Pracuj.pl — sponsorowane ogłoszenia i reklama display.",
    },
    pracujJobicon: {
      name: "JOBICON",
      description: "Wydarzenia employer branding i nagrody w sieci Grupy Pracuj.",
    },
    pracujSponsored: {
      name: "Treści sponsorowane",
      description: "Pakiety content marketingowe dla zasięgu marki pracodawcy.",
    },
    pracujWorksmile: {
      name: "worksmile",
      description: "Platforma benefitów — szkic integracji HR SaaS pod oferty z benefitami.",
    },
    pracujAbsence: {
      name: "absence.io",
      description: "Zarządzanie nieobecnościami — integracja stosu HR gdy API partnera będzie otwarte.",
    },
    pracujSalaryGrid: {
      name: "Siatka wynagrodzeń",
      description: "Oficjalna siatka wynagrodzeń Grupy Pracuj — benchmark przed publikacją oferty.",
    },
    pracujCalculators: {
      name: "Kalkulatory Pracuj",
      description: "Kalkulatory kosztu pracodawcy, netto/brutto, VAT i B2B dla HR i finansów.",
    },
    pracujReports: {
      name: "Raporty HR",
      description: "Raporty rynku pracy i trendy rekrutacyjne z badań Grupy Pracuj.",
    },
    pracujHrChallenges: {
      name: "Wyzwania HR",
      description: "Programy wyzwań HR i insighty społeczności dla zespołów talentowych.",
    },
    pracujRecruitment360: {
      name: "Rekrutacja 360",
      description: "Rekrutacja end-to-end od Grupy Pracuj — wsparcie RPO dla pracodawców.",
    },
    pracujAnonymousJob: {
      name: "Ogłoszenie anonimowe",
      description: "Poufne ogłoszenia na Pracuj.pl przy dyskretnym hiringu.",
    },
    linkedinRecruiter: {
      name: "LinkedIn Recruiter",
      description: "Pełne stanowisko rekrutera — OAuth oddzielny od logowania kandydata LinkedIn.",
    },
    linkedinHiringPro: {
      name: "Hiring Pro",
      description: "Pakiet hiringowy — połączenie gdy LinkedIn zatwierdzi scope partnerskie.",
    },
    linkedinRecruiterLite: {
      name: "Recruiter Lite",
      description: "Lekkie stanowisko sourcingowe dla małych zespołów i agencji.",
    },
    linkedinJobSlots: {
      name: "Jobs & Job Slots",
      description: "Promowane oferty na LinkedIn — zarządzanie slotami wkrótce.",
    },
    linkedinCareerPages: {
      name: "Career Pages",
      description: "Kariera na LinkedIn — employer branding dla persony firmy.",
    },
    linkedinTalentInsights: {
      name: "Talent Insights",
      description: "Analityka workforce i intelligence pul talentu do planowania zatrudnienia.",
    },
    linkedinHiringIntegrations: {
      name: "Hiring Integrations",
      description: "Marketplace integracji ATS LinkedIn — hooki placement TWIN gdy API będzie live.",
    },
    linkedinCampaignManager: {
      name: "Campaign Manager",
      description: "Reklamy LinkedIn pod hiring i employer brand.",
    },
    linkedinAdFormats: {
      name: "Formaty reklam",
      description: "Single image, karuzele, wideo i message ads pod talent marketing.",
    },
    linkedinPage: {
      name: "LinkedIn Page",
      description: "Strona firmy — organiczny zasięg i life content dla kandydatów.",
    },
    linkedinBusinessManager: {
      name: "Business Manager",
      description: "Centralne konto reklamowe i uprawnienia dla marketingu.",
    },
    linkedinSalesNavigator: {
      name: "Sales Navigator",
      description: "Prospecting — opcjonalnie dla sourcerów agencji, nie core HR.",
    },
    twinPracujScraper: {
      name: "Feed Pracuj.pl",
      description: "TWIN skanuje Pracuj.pl pod dopasowania — włącz w źródłach ofert w panelu.",
    },
    twinRocketjobs: {
      name: "Feed RocketJobs",
      description: "Polski portal tech w skanerze TWIN — dopasowania w Twoim pipeline.",
    },
  },
} as const;

export type IntegrationItemKey = keyof typeof INTEGRATIONS_HUB_MESSAGES_EN.items;

export function integrationNameKey(id: IntegrationItemKey): `integrationsHub.items.${IntegrationItemKey}.name` {
  return `integrationsHub.items.${id}.name`;
}

export function integrationDescKey(
  id: IntegrationItemKey,
): `integrationsHub.items.${IntegrationItemKey}.description` {
  return `integrationsHub.items.${id}.description`;
}
