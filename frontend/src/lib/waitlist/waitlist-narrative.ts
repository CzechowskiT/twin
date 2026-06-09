import type { Locale } from "@/lib/i18n";

export type WaitlistPillar = { icon: string; title: string; body: string };

export type WaitlistStatusChip = { label: string; body: string };

export type WaitlistHowStep = { n: string; title: string; body: string };

export type WaitlistNarrative = {
  heroEyebrow: string;
  heroOfferBadge: string;
  heroOfferSub: string;
  valueStrip: [string, string, string];
  statsLiveLabel: string;
  statsLoadingLabel: string;
  statsOfflineHint: string;
  counterEyebrow: string;
  counterRemainingLabel: string;
  counterOfCap: string;
  counterOnList: string;
  counterProgressAria: string;
  sectionSources: string;
  sourcesLead: string;
  sourceChips: string[];
  sectionProblem: string;
  problemLead: string;
  problemPoints: string[];
  sectionTop200: string;
  top200Lead: string;
  top200Bullets: string[];
  sectionWhatTwin: string;
  whatTwinLead: string;
  whatTwinItems: WaitlistPillar[];
  sectionRanking: string;
  rankingLead: string;
  rankingBullets: string[];
  sectionControl: string;
  controlLead: string;
  statusChips: WaitlistStatusChip[];
  sectionCoverage: string;
  coverageLead: string;
  coverageActive: string;
  coverageRoadmap: string;
  plPriorityLabel: string;
  plPriorityChips: string[];
  sectionFounding: string;
  foundingHeadline: string;
  foundingSub: string;
  foundingPerks: string[];
  foundingFinePrint: string;
  sectionHow8: string;
  how8Lead: string;
  how8Steps: WaitlistHowStep[];
  sectionWhyFounding: string;
  whyFoundingLead: string;
  whyFoundingPoints: string[];
  sectionExample: string;
  exampleDisclaimer: string;
  exampleTitle: string;
  exampleParagraphs: string[];
  sectionReferral: string;
  referralLead: string;
  referralBullets: string[];
  faqExtra: { q: string; a: string }[];
};

const en: WaitlistNarrative = {
  heroEyebrow: "Founding wishlist · first 1,000",
  heroOfferBadge: "Founding cohort — free early access, fair-use at launch",
  heroOfferSub:
    "Join the path from wishlist → founding invite → register → CV → profile → up to 200 ranked roles. One agent, one dashboard, interviews worth showing up for.",
  valueStrip: [
    "First 1,000 founding members — no card today",
    "Ranked pipeline up to 200 jobs · top 20 highlighted",
    "~30 live source adapters today · 50+ on the roadmap",
  ],
  statsLiveLabel: "Live wishlist data",
  statsLoadingLabel: "Connecting to live stats…",
  statsOfflineHint: "Could not reach live stats — numbers may be delayed. Signup still works.",
  counterEyebrow: "Founding cohort · live scarcity",
  counterRemainingLabel: "spots left",
  counterOfCap: "of {cap} founding places",
  counterOnList: "{signed} on the wishlist",
  counterProgressAria: "Wishlist fill progress",
  sectionSources: "Sources we aggregate today",
  sourcesLead:
    "TWIN pulls from job boards and employer pages — not a single portal lottery. PL market is a priority; EU remote-friendly roles follow your profile bar.",
  sourceChips: [
    "pracuj.pl",
    "rocketjobs.pl",
    "LinkedIn Jobs",
    "justjoin.it",
    "Employer career pages",
    "Greenhouse",
    "…and more adapters",
  ],
  sectionProblem: "Job boards weren't built for you",
  problemLead:
    "You open five tabs, upload the same CV again, and drown in listings that never matched your bar. Recruiters drown in raw CVs. Everyone loses time.",
  problemPoints: [
    "Hundreds of clicks for a handful of real fits",
    "No honest view of what was prepared vs actually submitted",
    "Inbox noise instead of a short calendar of interviews worth preparing for",
  ],
  sectionTop200: "Up to 200 ranked opportunities — not 200 random sends",
  top200Lead:
    "After your profile is ready, TWIN ranks roles with final_score. You see the top 20 first; the rest stay in your pipeline up to 200 — with feedback per job.",
  top200Bullets: [
    "Top 20 matches surfaced first — sorted by final_score",
    "Full list up to 200 — accept, skip, or give feedback to improve the next batch",
    "North star: fewer, better moments on your calendar — not application spam",
  ],
  sectionWhatTwin: "What TWIN does",
  whatTwinLead:
    "An autonomous career agent: scrape → match → apply (where supported) → track → schedule — while you focus on interviews.",
  whatTwinItems: [
    {
      icon: "🧠",
      title: "CV → profile",
      body: "Upload CV, build a structured profile, set salary floor and role bar — matching uses your data with consent.",
    },
    {
      icon: "📊",
      title: "Ranked pipeline",
      body: "Up to 200 scored jobs in one workspace; top 20 highlighted so you decide what deserves action.",
    },
    {
      icon: "📅",
      title: "Calendar-first",
      body: "Interview holds and confirmed slots sync where configured (Google Calendar today; ICS + more providers on the roadmap).",
    },
  ],
  sectionRanking: "How TWIN ranks",
  rankingLead: "Transparent scoring — not a black-box “perfect AI job.”",
  rankingBullets: [
    "final_score combines fit to skills, role level, location/remote, and your feedback",
    "Every job card supports feedback so the next batch respects what you skipped",
    "Ranking is recomputed as sources refresh — typically ~30 active adapters today",
  ],
  sectionControl: "You stay in control",
  controlLead:
    "Auto-apply only on supported paths. Every status is honest — we never mark “submitted” without evidence.",
  statusChips: [
    { label: "Prepared", body: "Materials ready — you or the agent can review before send." },
    { label: "Manual", body: "Portal needs your click; TWIN prepared the package." },
    { label: "Attempted", body: "Automation tried; outcome logged with reason." },
    { label: "Confirmed", body: "Submission backed by evidence (confirmation, ATS state, or trace)." },
  ],
  sectionCoverage: "Market coverage",
  coverageLead: "We ship sources incrementally — honest counts, not “50 live portals.”",
  coverageActive: "~30 active source adapters in production today",
  coverageRoadmap: "50+ adapters on the roadmap — PL boards and EU employer stacks first",
  plPriorityLabel: "PL priority sources",
  plPriorityChips: ["pracuj.pl", "rocketjobs.pl", "LinkedIn", "justjoin.it", "employer pages", "Greenhouse"],
  sectionFounding: "Founding members",
  foundingHeadline: "First 1,000 — free founding access, fair-use at go-live",
  foundingSub:
    "Paid plans may appear after public launch. Founding wishlist members get early access without a card today — one active profile and fair-use terms before any billing switches on.",
  foundingPerks: [
    "Founding cohort: priority queue and early surfaces before GA",
    "Full agent runway during pilot — matching, tracking, calendar where configured",
    "Founding badge + shape the product before copycat agents flood the market",
    "No payment required to join this wishlist — terms published before paid tiers",
  ],
  foundingFinePrint:
    "Offer for the first 1,000 verified wishlist signups. Account activity and fair-use policies apply at launch; full terms before billing goes live. Not a promise of lifetime paid Pro at $0 unless spelled out in Terms.",
  sectionHow8: "How it works — 8 steps",
  how8Lead: "Wishlist today → interviews on your calendar when your profile is live.",
  how8Steps: [
    { n: "1", title: "Join the wishlist", body: "Email + consent — you're in the founding queue." },
    { n: "2", title: "Founding invite", body: "When your slot opens, you get invite mail with next steps." },
    { n: "3", title: "Register", body: "Create your TWIN account (GDPR consent on register)." },
    { n: "4", title: "Upload CV", body: "We parse and validate profile fields for matching." },
    { n: "5", title: "Set your bar", body: "Role, level, salary floor, locations — your rules." },
    { n: "6", title: "See ranked jobs", body: "Top 20 + up to 200 with final_score and feedback." },
    { n: "7", title: "Apply with honesty", body: "Auto-apply on supported paths; manual where portals require it." },
    { n: "8", title: "Calendar of interviews", body: "Accept, decline, or reschedule — export/sync where available." },
  ],
  sectionWhyFounding: "Why founding members matter",
  whyFoundingLead:
    "We're building acceptance-ready calendars for candidates and recruiters — not another noise machine. Early members set the bar before scale.",
  whyFoundingPoints: [
    "Your feedback trains ranking and source priority (especially PL boards).",
    "You help us keep statuses honest as auto-apply coverage grows.",
    "Founding cohort proves the loop before we turn on broad paid marketing.",
  ],
  sectionExample: "Example scenario",
  exampleDisclaimer: "Illustration only — not a customer testimonial or guaranteed outcome.",
  exampleTitle: "Senior backend engineer · EU remote",
  exampleParagraphs: [
    "Alex joins the wishlist, uploads a CV after invite, and sets a salary floor. TWIN surfaces 18 roles in the top 20 band and 140 more in the pipeline.",
    "Three roles go to prepared → manual (company portal). Two supported paths reach confirmed with evidence. One interview lands on Google Calendar; two others export as ICS.",
    "Alex skips noisy listings with feedback — the next week's batch drops similar roles. No fake “submitted” rows.",
  ],
  sectionReferral: "Move up the queue — no cash prizes",
  referralLead:
    "Share your link after signup. Each friend who joins from it improves your position — that's the reward.",
  referralBullets: [
    "Referral code on your wishlist panel after signup",
    "Leaderboard shows invite counts — not dollar bonuses",
    "No $1,000 / $500 promises — just earlier access in the founding queue",
  ],
  faqExtra: [
    {
      q: "How many job sources does TWIN use?",
      a: "About 30 active adapters today, with 50+ planned. We quote real adapter counts — not marketing fiction about “50 live portals.”",
    },
    {
      q: "Will auto-apply spam companies?",
      a: "Only on supported paths, with honest statuses. Unsupported portals stay manual or attempted with a visible reason — never fake “submitted.”",
    },
    {
      q: "What do founding members pay?",
      a: "Joining this wishlist costs nothing today. Founding cohort gets free early access; optional paid plans may come later with terms published first.",
    },
    {
      q: "Is “lifetime Pro for $0” guaranteed?",
      a: "We don't promise lifetime paid tiers at zero unless it's in signed Terms. Founding benefit here is free early access and fair-use founding terms — see fine print on this page.",
    },
  ],
};

const pl: WaitlistNarrative = {
  heroEyebrow: "Wishlista founding · pierwsze 1000",
  heroOfferBadge: "Kohorta founding — darmowy early access, fair-use przy starcie",
  heroOfferSub:
    "Ścieżka: wishlist → zaproszenie founding → rejestracja → CV → profil → do 200 rankingowych ofert. Jeden agent, jeden panel, kalendarz rozmów wart Twój czas.",
  valueStrip: [
    "Pierwsze 1000 founding — bez karty dziś",
    "Pipeline do 200 ofert · top 20 na pierwszy plan",
    "~30 aktywnych adapterów dziś · 50+ w roadmapie",
  ],
  statsLiveLabel: "Dane wishlisty na żywo",
  statsLoadingLabel: "Łączenie ze statystykami…",
  statsOfflineHint: "Brak połączenia ze statystykami — liczby mogą być opóźnione. Zapis nadal działa.",
  counterEyebrow: "Kohorta founding · licznik na żywo",
  counterRemainingLabel: "wolnych miejsc",
  counterOfCap: "z {cap} miejsc founding",
  counterOnList: "{signed} na wishliście",
  counterProgressAria: "Postęp zapełnienia wishlisty",
  sectionSources: "Źródła, z których zbieramy oferty",
  sourcesLead:
    "TWIN agreguje portale i strony pracodawców — nie jedną loterię ogłoszeń. Rynek PL jest priorytetem; role EU remote zgodnie z Twoim progiem.",
  sourceChips: [
    "pracuj.pl",
    "rocketjobs.pl",
    "LinkedIn Jobs",
    "justjoin.it",
    "Strony kariery pracodawców",
    "Greenhouse",
    "…i kolejne adaptery",
  ],
  sectionProblem: "Portale nie były zbudowane pod Ciebie",
  problemLead:
    "Otwierasz pięć kart, wrzucasz to samo CV i toniesz w ofertach poniżej Twojego progu. Rekruterzy toną w surowych CV. Wszyscy tracą czas.",
  problemPoints: [
    "Setki kliknięć dla garści realnych dopasowań",
    "Brak uczciwego widoku: przygotowane vs faktycznie wysłane",
    "Szum w skrzynce zamiast krótkiego kalendarza rozmów wartych przygotowania",
  ],
  sectionTop200: "Do 200 rankingowych ofert — nie 200 losowych wysyłek",
  top200Lead:
    "Gdy profil jest gotowy, TWIN rankinguje role według final_score. Widzisz top 20; reszta w pipeline do 200 — z feedbackiem per oferta.",
  top200Bullets: [
    "Top 20 na pierwszy plan — sortowanie final_score",
    "Pełna lista do 200 — akceptuj, pomiń, daj feedback na następną partię",
    "Cel: mniej, lepsze momenty w kalendarzu — nie spam aplikacji",
  ],
  sectionWhatTwin: "Co robi TWIN",
  whatTwinLead:
    "Autonomiczny agent kariery: pobierz → dopasuj → aplikuj (gdzie wspierane) → śledź → zaplanuj — Ty skupiasz się na rozmowach.",
  whatTwinItems: [
    {
      icon: "🧠",
      title: "CV → profil",
      body: "Upload CV, profil strukturalny, próg pensji i roli — matching na Twoich danych za zgodą.",
    },
    {
      icon: "📊",
      title: "Rankingowany pipeline",
      body: "Do 200 ofert w jednym workspace; top 20 wyróżnione, żebyś decydował co jest warte akcji.",
    },
    {
      icon: "📅",
      title: "Kalendarz na pierwszym planie",
      body: "Holdy i potwierdzone sloty — sync tam gdzie skonfigurowane (Google Calendar; ICS + kolejni providerzy w planie).",
    },
  ],
  sectionRanking: "Jak TWIN rankinguje",
  rankingLead: "Przejrzysty scoring — nie czarna skrzynka „idealnej oferty AI”.",
  rankingBullets: [
    "final_score: dopasowanie skills, poziom, lokalizacja/remote i Twój feedback",
    "Każda karta oferty ma feedback — następna partia respektuje pominięcia",
    "Ranking odświeża się ze źródłami — dziś ~30 aktywnych adapterów",
  ],
  sectionControl: "Ty decydujesz",
  controlLead:
    "Auto-aplikacja tylko na wspieranych ścieżkach. Każdy status jest uczciwy — bez „wysłano” bez dowodu.",
  statusChips: [
    { label: "Prepared", body: "Materiały gotowe — Ty lub agent możecie przejrzeć przed wysyłką." },
    { label: "Manual", body: "Portal wymaga Twojego kliknięcia; TWIN przygotował paczkę." },
    { label: "Attempted", body: "Automat próbował; wynik zapisany z powodem." },
    { label: "Confirmed", body: "Wysyłka potwierdzona dowodem (potwierdzenie, ATS, ślad)." },
  ],
  sectionCoverage: "Zasięg rynku",
  coverageLead: "Źródła dokładamy iteracyjnie — uczciwe liczby, nie „50 żywych portali”.",
  coverageActive: "~30 aktywnych adapterów źródeł w produkcji dziś",
  coverageRoadmap: "50+ adapterów w roadmapie — najpierw PL i stosy pracodawców EU",
  plPriorityLabel: "Priorytet PL",
  plPriorityChips: ["pracuj.pl", "rocketjobs.pl", "LinkedIn", "justjoin.it", "strony pracodawców", "Greenhouse"],
  sectionFounding: "Founding members",
  foundingHeadline: "Pierwsze 1000 — darmowy dostęp founding, fair-use przy starcie",
  foundingSub:
    "Płatne plany mogą pojawić się po publicznym launchu. Członkowie wishlisty founding wchodzą bez karty — jeden aktywny profil i fair-use zanim włączymy billing.",
  foundingPerks: [
    "Kohorta founding: priorytetowa kolejka i wcześniejsze powierzchnie przed GA",
    "Pełna ścieżka agenta w pilocie — matching, tracking, kalendarz gdzie skonfigurowany",
    "Odznaka founding + kształtujesz produkt zanim rynek zapełni się klonami",
    "Brak płatności za zapis na wishlistę — warunki przed płatnymi tierami",
  ],
  foundingFinePrint:
    "Oferta dla pierwszych 1000 zweryfikowanych zapisów. Aktywność konta i fair-use przy starcie; pełne warunki przed billingiem. To nie obietnica dożywotniego płatnego Pro za 0 zł, chyba że w Regulaminie.",
  sectionHow8: "Jak to działa — 8 kroków",
  how8Lead: "Wishlist dziś → rozmowy w kalendarzu, gdy profil jest live.",
  how8Steps: [
    { n: "1", title: "Zapis na wishlistę", body: "E-mail + zgody — jesteś w kolejce founding." },
    { n: "2", title: "Zaproszenie founding", body: "Gdy przyjdzie slot, mail z kolejnymi krokami." },
    { n: "3", title: "Rejestracja", body: "Konto TWIN (zgody RODO na /register)." },
    { n: "4", title: "Upload CV", body: "Parsowanie i walidacja pól pod matching." },
    { n: "5", title: "Ustaw próg", body: "Rola, poziom, pensja, lokalizacje — Twoje reguły." },
    { n: "6", title: "Rankingowe oferty", body: "Top 20 + do 200 z final_score i feedbackiem." },
    { n: "7", title: "Aplikuj uczciwie", body: "Auto-aplikacja gdzie wspierane; manual na portalach." },
    { n: "8", title: "Kalendarz rozmów", body: "Akceptuj, odrzuć, przełóż — eksport/sync gdzie dostępne." },
  ],
  sectionWhyFounding: "Dlaczego founding ma znaczenie",
  whyFoundingLead:
    "Budujemy kalendarze gotowe do akceptacji — nie kolejną maszynę szumu. Wcześni członkowie ustawiają poprzeczkę przed skalą.",
  whyFoundingPoints: [
    "Twój feedback uczy rankingu i priorytetu źródeł (zwłaszcza PL).",
    "Pomagasz utrzymać uczciwe statusy wraz z rosnącym auto-apply.",
    "Kohorta founding dowodzi pętli przed szerokim marketingiem płatnym.",
  ],
  sectionExample: "Przykładowy scenariusz",
  exampleDisclaimer: "Ilustracja — nie opinia klienta ani gwarantowany wynik.",
  exampleTitle: "Senior backend · EU remote",
  exampleParagraphs: [
    "Alex zapisuje się na wishlistę, po zaproszeniu wrzuca CV i ustawia próg pensji. TWIN pokazuje 18 ról w paśmie top 20 i 140 w pipeline.",
    "Trzy role: prepared → manual (portal firmowy). Dwie wspierane ścieżki: confirmed z dowodem. Jedna rozmowa w Google Calendar; dwie jako ICS.",
    "Alex pomija hałas z feedbackiem — następna partia nie powtarza podobnych ofert. Bez fałszywych „wysłano”.",
  ],
  sectionReferral: "Wyżej w kolejce — bez nagród pieniężnych",
  referralLead:
    "Po zapisie udostępnij link. Każdy znajomy z Twojego linku podnosi pozycję — to cała nagroda.",
  referralBullets: [
    "Kod polecający w panelu wishlisty po zapisie",
    "Leaderboard pokazuje liczbę zaproszeń — nie bonusy w dolarach",
    "Bez obietnic 1000 $ / 500 $ — tylko wcześniejszy dostęp founding",
  ],
  faqExtra: [
    {
      q: "Ile źródeł ofert ma TWIN?",
      a: "Dziś ~30 aktywnych adapterów, w planie 50+. Podajemy realne liczby — nie fikcję „50 żywych portali”.",
    },
    {
      q: "Czy auto-aplikacja zaspami firmy?",
      a: "Tylko na wspieranych ścieżkach, ze uczciwymi statusami. Niewspierane portale: manual lub attempted z widocznym powodem — nigdy fałszywe „wysłano”.",
    },
    {
      q: "Ile płacą founding members?",
      a: "Zapis na wishlistę jest darmowy. Kohorta founding ma darmowy early access; płatne plany mogą przyjść później — warunki najpierw.",
    },
    {
      q: "Czy „dożywotnie Pro za 0 zł” jest gwarantowane?",
      a: "Nie obiecujemy dożywotnich płatnych tierów za zero bez Regulaminu. Tu: darmowy early access founding i fair-use — patrz drobny druk na stronie.",
    },
  ],
};

const es: WaitlistNarrative = {
  ...en,
  heroEyebrow: "Lista fundadora · primeros 1.000",
  heroOfferBadge: "Cohorte fundadora — acceso anticipado gratuito, uso razonable al lanzamiento",
  heroOfferSub:
    "Ruta: lista fundadora → invitación → registro → CV → perfil → hasta 200 roles clasificados. Un agente, un panel, entrevistas que valen la pena.",
  valueStrip: [
    "Primeros 1.000 fundadores — sin tarjeta hoy",
    "Pipeline clasificado hasta 200 ofertas · top 20 destacado",
    "~30 adaptadores activos hoy · 50+ en la hoja de ruta",
  ],
  statsLiveLabel: "Datos de lista en vivo",
  counterEyebrow: "Cohorte fundadora · escasez en vivo",
  counterOfCap: "de {cap} plazas fundadoras",
  counterOnList: "{signed} en la lista",
  sectionFounding: "Miembros fundadores",
  foundingHeadline: "Primeros 1.000 — acceso fundador gratuito, uso razonable al lanzamiento",
  foundingSub:
    "Los planes de pago pueden llegar tras el lanzamiento público. La lista fundadora entra sin tarjeta hoy — un perfil activo y uso razonable antes de cualquier facturación.",
  how8Lead: "Lista hoy → entrevistas en tu calendario cuando tu perfil esté activo.",
  how8Steps: [
    { n: "1", title: "Únete a la lista fundadora", body: "Email + consentimiento — entras en la cola de fundadores." },
    { n: "2", title: "Invitación fundadora", body: "Cuando abra tu hueco, correo con los siguientes pasos." },
    { n: "3", title: "Registro", body: "Crea tu cuenta TWIN (consentimiento RGPD al registrarte)." },
    { n: "4", title: "Sube CV", body: "Analizamos y validamos campos del perfil para el matching." },
    { n: "5", title: "Define tu barra", body: "Rol, nivel, salario mínimo, ubicaciones — tus reglas." },
    { n: "6", title: "Ve empleos clasificados", body: "Top 20 + hasta 200 con final_score y feedback." },
    { n: "7", title: "Aplica con honestidad", body: "Autoaplicación en rutas soportadas; manual donde el portal lo exija." },
    { n: "8", title: "Calendario de entrevistas", body: "Acepta, rechaza o reprograma — exporta/sincroniza donde esté disponible." },
  ],
};

const de: WaitlistNarrative = {
  ...en,
  heroEyebrow: "Gründerliste · erste 1.000",
  heroOfferBadge: "Gründerkohorte — kostenloser früher Zugang, Fair-Use beim Start",
  heroOfferSub:
    "Weg: Gründerliste → Einladung → Registrierung → CV → Profil → bis zu 200 gerankte Rollen. Ein Agent, ein Dashboard, Interviews die sich lohnen.",
  valueStrip: [
    "Erste 1.000 Gründer — heute keine Karte",
    "Gerankte Pipeline bis 200 Jobs · Top 20 hervorgehoben",
    "~30 aktive Adapter heute · 50+ in der Roadmap",
  ],
  statsLiveLabel: "Live-Listen-Daten",
  counterEyebrow: "Gründerkohorte · Live-Knappheit",
  counterOfCap: "von {cap} Gründerplätzen",
  counterOnList: "{signed} auf der Gründerliste",
  sectionFounding: "Gründungsmitglieder",
  foundingHeadline: "Erste 1.000 — kostenloser Gründerzugang, Fair-Use beim Go-Live",
  foundingSub:
    "Bezahlte Pläne können nach dem öffentlichen Start kommen. Gründerliste heute ohne Karte — ein aktives Profil und Fair-Use, bevor Billing startet.",
  how8Lead: "Gründerliste heute → Interviews im Kalender, wenn dein Profil live ist.",
  how8Steps: [
    { n: "1", title: "Zur Gründerliste anmelden", body: "E-Mail + Einwilligung — du bist in der Gründer-Queue." },
    { n: "2", title: "Gründereinladung", body: "Bei freiem Slot: E-Mail mit den nächsten Schritten." },
    { n: "3", title: "Registrierung", body: "TWIN-Konto anlegen (DSGVO-Einwilligung bei /register)." },
    { n: "4", title: "CV hochladen", body: "Wir parsen und validieren Profilfelder fürs Matching." },
    { n: "5", title: "Deine Bar setzen", body: "Rolle, Level, Gehaltsuntergrenze, Standorte — deine Regeln." },
    { n: "6", title: "Gerankte Jobs sehen", body: "Top 20 + bis 200 mit final_score und Feedback." },
    { n: "7", title: "Ehrlich bewerben", body: "Auto-Apply auf unterstützten Wegen; manuell wo Portale es verlangen." },
    { n: "8", title: "Interview-Kalender", body: "Annehmen, ablehnen, verschieben — Export/Sync wo verfügbar." },
  ],
};

const fr: WaitlistNarrative = {
  ...en,
  heroEyebrow: "Liste des fondateurs · 1 000 premiers",
  heroOfferBadge: "Cohorte fondatrice — accès anticipé gratuit, fair-use au lancement",
  heroOfferSub:
    "Parcours : liste des fondateurs → invitation → inscription → CV → profil → jusqu'à 200 rôles classés. Un agent, un tableau de bord, des entretiens qui valent le coup.",
  valueStrip: [
    "1 000 premiers fondateurs — sans carte aujourd'hui",
    "Pipeline classé jusqu'à 200 offres · top 20 en premier",
    "~30 adaptateurs actifs aujourd'hui · 50+ au roadmap",
  ],
  statsLiveLabel: "Données de liste en direct",
  counterEyebrow: "Cohorte fondatrice · rareté en direct",
  counterOfCap: "sur {cap} places fondatrices",
  counterOnList: "{signed} sur la liste",
  sectionFounding: "Membres fondateurs",
  foundingHeadline: "1 000 premiers — accès fondateur gratuit, fair-use au lancement",
  foundingSub:
    "Des offres payantes peuvent suivre le lancement public. La liste des fondateurs s'ouvre sans carte — un profil actif et fair-use avant toute facturation.",
  how8Lead: "Liste aujourd'hui → entretiens sur votre calendrier quand le profil est actif.",
};

const it: WaitlistNarrative = {
  ...en,
  heroEyebrow: "Lista dei fondatori · primi 1.000",
  heroOfferBadge: "Cohort fondatrice — accesso anticipato gratuito, fair-use al lancio",
  heroOfferSub:
    "Percorso: lista dei fondatori → invito → registrazione → CV → profilo → fino a 200 ruoli classificati. Un agente, una dashboard, colloqui che valgono il tempo.",
  valueStrip: [
    "Primi 1.000 fondatori — nessuna carta oggi",
    "Pipeline classificata fino a 200 offerte · top 20 in evidenza",
    "~30 adapter attivi oggi · 50+ in roadmap",
  ],
  statsLiveLabel: "Dati lista in diretta",
  counterEyebrow: "Cohort fondatrice · scarsità live",
  sectionFounding: "Membri fondatori",
  foundingHeadline: "Primi 1.000 — accesso fondatore gratuito, fair-use al go-live",
  foundingSub:
    "Piani a pagamento possono arrivare dopo il lancio pubblico. La lista dei fondatori è senza carta oggi — un profilo attivo e fair-use prima del billing.",
  how8Lead: "Lista oggi → colloqui nel calendario quando il profilo è attivo.",
};

const zh: WaitlistNarrative = {
  ...en,
  heroEyebrow: "创始候补 · 前 1,000 名",
  heroOfferBadge: "创始队列 — 免费提前访问，上线时合理使用",
  heroOfferSub:
    "路径：创始候补 → 邀请 → 注册 → 简历 → 档案 → 最多 200 个排序职位。一个代理，一个面板，值得赴约的面试。",
  valueStrip: [
    "前 1,000 创始成员 — 今天无需信用卡",
    "最多 200 个排序职位管道 · 先看前 20",
    "约 30 个活跃适配器 · 路线图 50+",
  ],
  statsLiveLabel: "候补实时数据",
  counterEyebrow: "创始队列 · 实时稀缺",
  sectionFounding: "创始成员",
  foundingHeadline: "前 1,000 名 — 免费创始访问，上线合理使用",
  foundingSub: "公开启动后可能有付费计划。创始候补今天无需信用卡 — 一个活跃档案，计费前合理使用。",
  how8Lead: "今日候补 → 档案上线后日历上的面试。",
};

const ja: WaitlistNarrative = {
  ...en,
  heroEyebrow: "創設者リスト · 先着1,000名",
  heroOfferBadge: "創設コホート — 無料の早期アクセス、ローンチ時フェアユース",
  heroOfferSub:
    "流れ：創設者リスト → 招待 → 登録 → CV → プロフィール → 最大200件のランキング求人。1つのエージェント、1つのダッシュボード、赴く価値のある面接。",
  valueStrip: [
    "先着1,000 創設メンバー — 今日はカード不要",
    "最大200件のランキングパイプライン · まずトップ20",
    "約30のアクティブアダプター · ロードマップ50+",
  ],
  statsLiveLabel: "リストのライブデータ",
  counterEyebrow: "創設コホート · ライブ希少性",
  sectionFounding: "創設メンバー",
  foundingHeadline: "先着1,000 — 無料の創設アクセス、ゴーライブ時フェアユース",
  foundingSub: "公開ローンチ後に有料プランが来る可能性があります。創設者リストは今日カード不要 — 課金前に1つのアクティブプロフィールとフェアユース。",
  how8Lead: "今日リスト登録 → プロフィールが稼働したらカレンダーに面接。",
};

const ar: WaitlistNarrative = {
  ...en,
  heroEyebrow: "قائمة المؤسسين · أول 1,000",
  heroOfferBadge: "مجموعة المؤسسين — وصول مبكر مجاني، استخدام عادل عند الإطلاق",
  heroOfferSub:
    "المسار: قائمة المؤسسين → دعوة → تسجيل → سيرة → ملف → حتى 200 وظيفة مرتبة. وكيل واحد، لوحة واحدة، مقابلات تستحق الحضور.",
  valueStrip: [
    "أول 1,000 مؤسس — بدون بطاقة اليوم",
    "خط أنابيب مرتب حتى 200 وظيفة · أفضل 20 أولاً",
    "~30 محولاً نشطاً اليوم · 50+ في خارطة الطريق",
  ],
  statsLiveLabel: "بيانات القائمة المباشرة",
  counterEyebrow: "مجموعة المؤسسين · ندرة مباشرة",
  sectionFounding: "أعضاء المؤسسون",
  foundingHeadline: "أول 1,000 — وصول مؤسس مجاني، استخدام عادل عند الإطلاق",
  foundingSub:
    "قد تأتي خطط مدفوعة بعد الإطلاق العام. قائمة المؤسسين بدون بطاقة اليوم — ملف نشط واحد واستخدام عادل قبل أي فوترة.",
  how8Lead: "القائمة اليوم → مقابلات في تقويمك عندما يصبح ملفك نشطاً.",
};

export const WAITLIST_NARRATIVE: Record<Locale, WaitlistNarrative> = {
  en,
  pl,
  es,
  fr,
  de,
  it,
  zh,
  ja,
  ar,
};
