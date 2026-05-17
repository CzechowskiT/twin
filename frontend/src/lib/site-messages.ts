/** Marketing / company copy (EN + PL). Other locales fall back to EN via merge. */
export const SITE_MESSAGES_EN = {
  aboutTitle: "About TWIN",
  aboutLead:
    "TWIN sells you time back: one layer above noisy job boards so your ambition isn’t taxed by tab chaos — autonomy ships in public phases, not vaporware vibes.",
  aboutP1:
    "We sit above public job markets instead of replacing them. Employers keep their apply flows; candidates keep control of where they send their data.",
  aboutP2:
    "Phase 1 focuses on data quality, consent-first profiles, and a calm pipeline UX. Later phases add auto-apply, scheduling, and richer matching — same surface, more autonomy underneath.",
  aboutValuesTitle: "What we optimize for",
  aboutV1Title: "Candidate time",
  aboutV1Body: "Fewer tabs, less copy-paste, clearer status on every application you care about.",
  aboutV2Title: "Signal quality",
  aboutV2Body: "Validated listings and profile-aware scoring so attention goes to the right roles.",
  aboutV3Title: "Trust & control",
  aboutV3Body: "Explicit consent, exportable history, and paths to delete — aligned with GDPR from day one.",

  contactTitle: "Contact",
  contactLead: "Routing depends on topic — use the channel that fits so we can respond faster.",
  contactGeneralTitle: "Product & general",
  contactGeneralBody:
    "Questions about the workspace, matching, or roadmap: start from your account after sign-up, or write from the email you used to register so we can verify context.",
  contactSalesTitle: "Sales & enterprise",
  contactSalesBody:
    "For procurement, security review packs, or multi-seat programs, mention “Enterprise” in the subject and your company domain.",
  contactPressTitle: "Press & speaking",
  contactPressBody: "For interviews, logos, and product factsheets, see Media — we reply to press-specific threads within a few business days where capacity allows.",
  contactOfficeTitle: "Legal entity & hosting",
  contactOfficeBody:
    "Contracting entity, DPA, and sub-processor lists are shared during onboarding. Infrastructure is designed for EU-grade residency where configured.",

  careersTitle: "Careers",
  careersLead: "We are building a small, senior team across product, applied AI, and recruiting tech.",
  careersIntro:
    "If you care about labor markets, honest UX, and shipping fast without breaking trust, you will fit the early TWIN culture.",
  careersOpenTitle: "Open roles",
  careersOpenBody:
    "Public listings will appear here as we open them. Until then, speculative introductions are welcome via Contact — attach a short note on what you would improve first in hiring software.",
  careersPerksTitle: "Why join early",
  careersPerk1: "Ownership across discovery, matching, and pipeline — not narrow tickets only.",
  careersPerk2: "Direct exposure to real job-board integrations and GDPR-grade data flows.",
  careersPerk3: "Hybrid-friendly defaults with written async culture.",

  mediaTitle: "Media & press",
  mediaLead: "Fact-based messaging about what the product does today versus the long-term vision.",
  mediaKitTitle: "Brand kit",
  mediaKitBody:
    "Logos in SVG/PNG, product screenshots, and executive bios are available on request for accredited outlets — use the press path on Contact.",
  mediaCoverageTitle: "Coverage",
  mediaCoverageBody: "Articles, podcasts, and conference appearances will be listed here as we publish them.",

  partnersTitle: "Partners",
  partnersLead: "Job boards, ATS vendors, universities, and outplacement firms — we grow through selective integrations.",
  partnersBody:
    "We prioritize partners who share standards on listing quality, rate limits, and candidate consent. If you represent a board or HR platform, reach out via Contact with “Partnership” in the subject and your API or data-sharing posture.",
  partnersNote:
    "Logos shown on the home marquee are illustrative of the global hiring landscape and are not partnership endorsements unless separately announced.",

  casesTitle: "Case studies",
  casesLead: "Anonymized scenarios aligned with workflows the MVP already supports or is explicitly building toward.",
  case1Title: "Pan-European SaaS scale-up",
  case1Body:
    "Consolidated discovery across PL and EU-wide boards into one pipeline; agency success fees modeled down with the in-app ROI calculator before procurement decisions.",
  case2Title: "Commercial hiring hub (Warsaw)",
  case2Body:
    "Sales and GTM roles tracked in one workspace; recruiters reclaimed weekly hours previously lost to duplicate searches and status spreadsheets.",
  case3Title: "Multi-board sourcing program",
  case3Body:
    "Sourcers replaced a patchwork of tabs with a single feed and filters, improving hand-off to hiring managers with consistent URLs and timestamps.",

  faqPageTitle: "FAQ",
  faqPageLead: "Straight answers about the live product and the roadmap.",
  faqMoreHome: "Product narrative and visuals also live on the home page.",

  footerTagline: "Autonomous career agent",
  footerExplore: "Explore",
  footerHome: "Home",
  footerCompany: "Company",
  footerLegal: "Legal",
  footerPrivacy: "Privacy Policy",
  footerTerms: "Terms of Service",
  footerCookieSettings: "Cookie settings",
  footerRights: "© 2026 TWIN. All rights reserved.",
  footerSocial: "Social",
  footerLinkedInAria: "TWIN on LinkedIn",
  footerGithubAria: "TWIN on GitHub",
  footerXAria: "TWIN on X",

  footerMobileTitle: "Mobile app",
  footerMobileLead: "Install TWIN on iPhone (App Store) or Android (Google Play).",
  footerMobileAppStore: "Download on the App Store",
  footerMobileGooglePlay: "Get it on Google Play",
  footerMobileSoonHint: "Store link not configured yet — coming soon.",

  momentumAria: "Tips and shortcuts",
  momentumEyebrow: "Keep momentum",
  momentumLead: "Small rituals beat heroic once-a-week job hunts.",
  momentumTip1:
    "When you save or apply from matches or the feed, applications land in one timeline — treat it as your private CRM until interviews appear.",
  momentumTip2: "Refresh filters after you edit skills or target titles so the feed picks up the new signal.",
  momentumTip3: "Statuses that match reality (applied, interview, rejected) keep weekly momentum charts believable.",
  momentumTip4: "If the feed feels too wide, tighten title terms; widen again once you see titles you actually want.",
  momentumTip5: "Premium lifts caps on tracked applications when billing is enabled in your environment — free stays strong for focused searches.",
  momentumTip6: "Open tricky listings in a new tab; let TWIN remember what you decided so you are not re-reading the same JD.",
  momentumCtaWorkspace: "Open workspace",
  momentumCtaProfile: "Profile & CV",
  momentumCtaHome: "Home story",
  momentumCtaRegister: "Create account",
  momentumCtaLogin: "Log in",
  momentumCtaFaq: "FAQ",
} as const;

export const SITE_MESSAGES_PL: { [K in keyof typeof SITE_MESSAGES_EN]: string } = {
  aboutTitle: "O TWIN",
  aboutLead:
    "TWIN oddaje Ci czas: warstwa nad hałaśliwymi portalami, żeby ambicja nie ginęła w chaosie tabów — autonomia wchodzi etapami na żywo, nie jako marketingowy „wow”.",
  aboutP1:
    "Działamy ponad publicznymi rynkami pracy, zamiast je zastępować. Pracodawcy zachowują swoje ścieżki aplikacji; kandydaci kontrolują, gdzie wysyłają dane.",
  aboutP2:
    "Faza 1 stawia na jakość danych, profil z wyraźną zgodą (RODO) i spokojny UX pipeline’u. Kolejne fazy dodają m.in. auto-aplikacje i kalendarz — ta sama powierzchnia, więcej autonomii pod spodem.",
  aboutValuesTitle: "Na czym nam zależy",
  aboutV1Title: "Czas kandydata",
  aboutV1Body: "Mniej kart, mniej kopiuj-wklej, czytelny status każdej ważnej aplikacji.",
  aboutV2Title: "Jakość sygnału",
  aboutV2Body: "Walidowane ogłoszenia i scoring pod profil, żeby uwaga szła we właściwe role.",
  aboutV3Title: "Zaufanie i kontrola",
  aboutV3Body: "Wyraźna zgoda, historia do eksportu, ścieżki usunięcia — RODO od pierwszego dnia.",

  contactTitle: "Kontakt",
  contactLead: "Wybierz temat — dzięki temu szybciej trafisz do właściwej osoby lub procesu.",
  contactGeneralTitle: "Produkt i ogólne",
  contactGeneralBody:
    "Pytania o przestrzeń roboczą, dopasowanie lub roadmapę: najpierw konto po rejestracji albo mail z adresu używanego przy rejestracji (łatwiej zweryfikować kontekst).",
  contactSalesTitle: "Sprzedaż i enterprise",
  contactSalesBody:
    "Zakupy, pakiety bezpieczeństwa, wdrożenia wielomiejscowe — w temacie wpisz „Enterprise” i domenę firmy.",
  contactPressTitle: "Prasa i wystąpienia",
  contactPressBody:
    "Wywiady, logotypy, fakty o produkcie: zobacz Media — na wątki prasowe odpowiadamy w kilka dni roboczych, o ile mamy pojemność.",
  contactOfficeTitle: "Podmiot i hosting",
  contactOfficeBody:
    "Dane do umów, DPA i podwykonawcy są przekazywane przy onboardingu. Infrastruktura przewiduje m.in. rezyduencję w UE tam, gdzie jest skonfigurowana.",

  careersTitle: "Kariera",
  careersLead: "Budujemy mały, doświadczony zespół: produkt, AI stosowane i technologia rekrutacyjna.",
  careersIntro:
    "Jeśli zależy Ci na rynku pracy, uczciwym UX i szybkim shipowaniu bez łamania zaufania — sprawdzisz się we wczesnym TWIN.",
  careersOpenTitle: "Otwarte role",
  careersOpenBody:
    "Listy pojawią się tutaj, gdy je opublikujemy. Do tego czasu zapraszamy zgłoszenia inicjatywne przez Kontakt — krótko: co pierwsze poprawiłbyś w software do hiringu.",
  careersPerksTitle: "Dlaczego wcześnie",
  careersPerk1: "Odpowiedzialność za discovery, matching i pipeline — nie tylko wąskie tickety.",
  careersPerk2: "Bezpośredni kontakt z integracjami portali i przepływami danych pod RODO.",
  careersPerk3: "Async na piśmie i elastyczny hybrid jako domyślne.",

  mediaTitle: "Media i prasa",
  mediaLead: "Komunikacja oparta na faktach: co produkt robi dziś, a co jest wizją na przyszłość.",
  mediaKitTitle: "Materiały marki",
  mediaKitBody:
    "Logo SVG/PNG, screeny produktu, bio dla mediów — na prośbę dla zweryfikowanych redakcji; użyj ścieżki prasowej z Kontakt.",
  mediaCoverageTitle: "Relacje i wystąpienia",
  mediaCoverageBody: "Artykuły, podcasty i konferencje będą tu wymieniane w miarę publikacji.",

  partnersTitle: "Partnerzy",
  partnersLead: "Portale pracy, dostawcy ATS, uczelnie, outplacement — rośniemy przez selektywne integracje.",
  partnersBody:
    "Priorytet mają partnerzy z podobnymi standardami jakości ogłoszeń, limitów zapytań i zgody kandydata. Jeśli reprezentujesz portal lub platformę HR, napisz z Kontaktu z tematem „Partnership” i informacją o API / udostępnianiu danych.",
  partnersNote:
    "Logotypy na stronie głównej ilustrują globalny krajobraz rekrutacji i nie oznaczają partnerstwa, dopóki nie ogłosimy tego osobno.",

  casesTitle: "Studia przypadków",
  casesLead: "Scenariusze zanonimizowane, zgodne z tym, co MVP już wspiera lub jawnie buduje.",
  case1Title: "Scale-up SaaS w Europie",
  case1Body:
    "Ujednolicenie discovery na portalach PL i UE w jednym pipeline; modelowanie kosztów agencji kalkulatorem ROI przed decyzjami zakupowymi.",
  case2Title: "Hub komercyjny (Warszawa)",
  case2Body:
    "Role sales i GTM w jednym workspace; rekruterzy odzyskali godziny tygodniowo zamiast duplikować wyszukiwania i arkusze statusów.",
  case3Title: "Program sourcingu wieloźródłowego",
  case3Body:
    "Sourcerzy zamienili wiele kart na jeden feed i filtry, z lepszym przekazaniem do hiring managerów (URL, znaczniki czasu).",

  faqPageTitle: "FAQ",
  faqPageLead: "Krótko o żywym produkcie i roadmapzie.",
  faqMoreHome: "Opowieść produktowa i sekcje wizualne są też na stronie głównej.",

  footerTagline: "Autonomiczny agent kariery",
  footerExplore: "Odkrywaj",
  footerHome: "Strona główna",
  footerCompany: "Firma",
  footerLegal: "Prawne",
  footerPrivacy: "Polityka prywatności",
  footerTerms: "Regulamin",
  footerCookieSettings: "Ustawienia plików cookie",
  footerRights: "© 2026 TWIN. Wszelkie prawa zastrzeżone.",
  footerSocial: "Social media",
  footerLinkedInAria: "TWIN na LinkedIn",
  footerGithubAria: "TWIN na GitHubie",
  footerXAria: "TWIN na X",

  footerMobileTitle: "Aplikacja mobilna",
  footerMobileLead: "Zainstaluj TWIN na iPhone (App Store) lub Androidzie (Google Play).",
  footerMobileAppStore: "Pobierz z App Store",
  footerMobileGooglePlay: "Pobierz z Google Play",
  footerMobileSoonHint: "Link do sklepu jeszcze nie ustawiony — wkrótce.",

  momentumAria: "Podpowiedzi i skróty",
  momentumEyebrow: "Utrzymaj tempo",
  momentumLead: "Małe nawyki wygrywają z „job huntem” raz w tygodniu.",
  momentumTip1:
    "Gdy zapiszesz ofertę lub wyślesz aplikację z dopasowań albo feedu, wpisy trafiają do jednej osi czasu — traktuj to jak prywatny CRM do momentu rozmów.",
  momentumTip2: "Po edycji umiejętności lub docelowych stanowisk odśwież filtry, żeby feed złapał nowy sygnał.",
  momentumTip3: "Statusy zgodne z rzeczywistością (applied, interview, rejected) utrzymują wiarygodność tygodniowego tempa.",
  momentumTip4: "Gdy feed jest zbyt szeroki, zacieśnij frazy w tytule; poluzuj, gdy zobaczysz realne nazwy ról.",
  momentumTip5: "Premium zdejmuje limity śledzonych aplikacji, gdy billing jest włączony w Twoim środowisku — Free wystarczy do skupionego szukania.",
  momentumTip6: "Wymagające ogłoszenia otwieraj w nowej karcie; TWIN zapamięta decyzję, żebyś nie czytał tego samego JD po raz kolejny.",
  momentumCtaWorkspace: "Otwórz workspace",
  momentumCtaProfile: "Profil i CV",
  momentumCtaHome: "Strona główna",
  momentumCtaRegister: "Załóż konto",
  momentumCtaLogin: "Zaloguj się",
  momentumCtaFaq: "FAQ",
};
