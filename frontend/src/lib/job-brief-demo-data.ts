/** Illustrative enterprise job brief — demo only, not live employer data. */

import type { Locale } from "@/lib/i18n";

export type JobBriefOffice = {
  city: string;
  country: string;
  headcount: string;
  timezone: string;
};

export type JobBriefSimilarRole = {
  title: string;
  location: string;
  seniority: string;
};

export type JobBriefTimelineStep = {
  stage: string;
  duration: string;
  detail: string;
};

export type GlobalJobBriefData = {
  companySlug: string;
  brandBlurb: string;
  cultureHighlights: string[];
  deiNote: string;
  offices: JobBriefOffice[];
  responsibilities: string[];
  qualifications: string[];
  niceToHave: string[];
  techStack: string[];
  benefits: string[];
  interviewSteps: JobBriefTimelineStep[];
  applicationTimeline: JobBriefTimelineStep[];
  similarRoles: JobBriefSimilarRole[];
  chipValues: {
    roleFamily: string;
    seniority: string;
    employment: string;
    teamSize: string;
    reportsTo: string;
    compBand: string;
    equity: string;
    visa: string;
    relocation: string;
    workModel: string;
    travel: string;
  };
  facts: {
    industry: string;
    founded: string;
    hq: string;
    employees: string;
    revenue: string;
    ticker: string | null;
  };
  ratings: {
    glassdoor: number;
    ceo: number;
    recommendPct: number;
  };
};

type BriefInput = {
  company: string;
  title: string;
  location: string | null;
};

function normalizeCompany(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function helioBrief(locale: Locale, title: string, location: string | null): GlobalJobBriefData {
  const loc = location ?? (locale === "pl" ? "Warszawa / hybryda" : "Warsaw / hybrid");
  const en = locale === "en";
  return {
    companySlug: "helios-cloud",
    brandBlurb: en
      ? "Helios Cloud Group builds regulated cloud platforms for banks and insurers across EMEA. Product engineering ships in squads aligned to customer journeys — not ticket factories."
      : "Helios Cloud Group buduje regulowane platformy chmurowe dla banków i ubezpieczycieli w EMEA. Inżynieria produktowa pracuje w squadach podróży klienta — nie w fabryce ticketów.",
    cultureHighlights: en
      ? [
          "Engineering-led roadmap reviews with CFO visibility quarterly",
          "40% internal mobility across 14 countries in 2025",
          "Paid certification budget (AWS, Azure, CKA) — €4k/year",
        ]
      : [
          "Kwartalne przeglądy roadmapy z udziałem CFO",
          "40% mobilności wewnętrznej w 14 krajach (2025)",
          "Budżet certyfikacji (AWS, Azure, CKA) — 4 tys. €/rok",
        ],
    deiNote: en
      ? "Global ERG network (Women in Infra, Neurodiversity, Pride). Published pay bands in EU entities. Sponsorship for underrepresented groups in leadership pipeline."
      : "Globalna sieć ERG (Women in Infra, Neurodiversity, Pride). Opublikowane widełki w UE. Sponsoring grup niedostatecznie reprezentowanych w ścieżce leadership.",
    offices: [
      { city: "Warsaw", country: en ? "Poland" : "Polska", headcount: "420", timezone: "CET" },
      { city: "Dublin", country: en ? "Ireland" : "Irlandia", headcount: "180", timezone: "GMT" },
      { city: "Frankfurt", country: en ? "Germany" : "Niemcy", headcount: "95", timezone: "CET" },
      { city: "Singapore", country: en ? "Singapore" : "Singapur", headcount: "60", timezone: "SGT" },
      { city: "Austin", country: en ? "USA" : "USA", headcount: "110", timezone: "CST" },
    ],
    responsibilities: en
      ? [
          `Own the ${title} charter for identity & access on the Helios Core platform`,
          "Design multi-region APIs with SLOs ≥ 99.95% for tier-1 banking tenants",
          "Partner with security and compliance on SOC2 / DORA evidence packs",
          "Mentor two mid-level engineers; run weekly architecture office hours",
        ]
      : [
          `Prowadź charter ${title} dla tożsamości i dostępu na platformie Helios Core`,
          "Projektuj API multi-region z SLO ≥ 99,95% dla tenantów bankowych tier-1",
          "Współpracuj z security i compliance przy pakietach SOC2 / DORA",
          "Mentoruj dwóch midów; cotygodniowe architecture office hours",
        ],
    qualifications: en
      ? [
          "8+ years backend/platform engineering in regulated industries",
          "Production experience with Kubernetes, Terraform, and event-driven systems",
          "Track record shipping GDPR-ready data flows and audit trails",
        ]
      : [
          "8+ lat inżynierii backend/platform w branżach regulowanych",
          "Produkcja: Kubernetes, Terraform, systemy event-driven",
          "Udokumentowane wdrożenia przepływów RODO i śladów audytowych",
        ],
    niceToHave: en
      ? ["Polish or German conversational", "Prior Big Four or tier-1 bank vendor context", "Open-source contributions in IAM"]
      : ["Polski lub niemiecki w mowie", "Doświadczenie u vendora Big Four / bank tier-1", "OSS w obszarze IAM"],
    techStack: ["Go", "PostgreSQL", "Kafka", "Kubernetes (EKS)", "Terraform", "Grafana", "Vault", "Python (tooling)"],
    benefits: en
      ? [
          "PLN 28–38k gross + 15% annual bonus (demo band)",
          "Private medical (Medicover) + mental health stipend",
          "26 vacation days + public holidays",
          "Stock purchase plan (ESPP) — illustrative",
          "Relocation package to Warsaw hub (if applicable)",
        ]
      : [
          "28–38 tys. PLN brutto + premia roczna 15% (pasmo demo)",
          "Prywatna opieka (Medicover) + budżet na zdrowie psychiczne",
          "26 dni urlopu + święta",
          "Plan zakupu akcji (ESPP) — ilustracyjnie",
          "Pakiet relokacji do hubu Warszawa (jeśli dotyczy)",
        ],
    interviewSteps: en
      ? [
          { stage: "Recruiter screen", duration: "30 min", detail: "Motivation, comp expectations, work authorization" },
          { stage: "Hiring manager", duration: "45 min", detail: "System design whiteboard — IAM scenario" },
          { stage: "Panel", duration: "90 min", detail: "Two engineers + EM — coding + architecture depth" },
          { stage: "Executive", duration: "30 min", detail: "VP Engineering — culture & scale questions" },
        ]
      : [
          { stage: "Screen rekrutera", duration: "30 min", detail: "Motywacja, widełki, uprawnienia do pracy" },
          { stage: "Hiring manager", duration: "45 min", detail: "System design — scenariusz IAM" },
          { stage: "Panel", duration: "90 min", detail: "Dwóch inżynierów + EM — kod i architektura" },
          { stage: "Executive", duration: "30 min", detail: "VP Engineering — kultura i skala" },
        ],
    applicationTimeline: en
      ? [
          { stage: "Apply via TWIN", duration: "Day 0", detail: "Consent + tailored CV package" },
          { stage: "ATS review", duration: "Days 1–3", detail: "Recruiter queue — acceptance calendar slot" },
          { stage: "Interviews", duration: "Week 2", detail: "Compressed loop if calendar sync enabled" },
          { stage: "Offer", duration: "Week 3–4", detail: "Written offer + negotiation assistant" },
        ]
      : [
          { stage: "Aplikacja przez TWIN", duration: "Dzień 0", detail: "Zgoda + spersonalizowany pakiet CV" },
          { stage: "Przegląd ATS", duration: "Dni 1–3", detail: "Kolejka rekrutera — slot w kalendarzu akceptacji" },
          { stage: "Rozmowy", duration: "Tydzień 2", detail: "Skrócony loop przy sync kalendarza" },
          { stage: "Oferta", duration: "Tydz. 3–4", detail: "Oferta pisemna + asystent negocjacji" },
        ],
    similarRoles: en
      ? [
          { title: "Staff Platform Engineer", location: "Dublin", seniority: "Staff" },
          { title: "Principal Security Engineer", location: "Frankfurt", seniority: "Principal" },
          { title: "Engineering Manager — Identity", location: "Warsaw", seniority: "M+IC" },
        ]
      : [
          { title: "Staff Platform Engineer", location: "Dublin", seniority: "Staff" },
          { title: "Principal Security Engineer", location: "Frankfurt", seniority: "Principal" },
          { title: "Engineering Manager — Identity", location: "Warszawa", seniority: "M+IC" },
        ],
    chipValues: {
      roleFamily: en ? "Platform Engineering" : "Inżynieria platform",
      seniority: en ? "Senior (IC4)" : "Senior (IC4)",
      employment: en ? "Full-time · B2B or UoP" : "Pełny etat · B2B lub UoP",
      teamSize: en ? "Squad of 9 (3 backend, 2 SRE, 1 PM, 2 QA, 1 EM)" : "Squad 9 osób (3 backend, 2 SRE, 1 PM, 2 QA, 1 EM)",
      reportsTo: en ? "Director of Platform — Identity" : "Director Platform — Identity",
      compBand: en ? "PLN 28–38k/mo + bonus (demo)" : "28–38 tys. PLN/mies. + premia (demo)",
      equity: en ? "ESPP + RSU illustrative" : "ESPP + RSU (ilustracyjnie)",
      visa: en ? "EU Blue Card supported" : "Wsparcie Blue Card UE",
      relocation: en ? "Warsaw hub package" : "Pakiet relokacji Warszawa",
      workModel: loc,
      travel: en ? "≤ 15% (customer QBRs)" : "≤ 15% (QBR u klientów)",
    },
    facts: {
      industry: en ? "Cloud infrastructure · Fintech enablement" : "Infrastruktura chmurowa · Fintech",
      founded: "2009",
      hq: en ? "Dublin, Ireland (EMEA HQ)" : "Dublin, Irlandia (HQ EMEA)",
      employees: en ? "~12,400 globally" : "~12 400 globalnie",
      revenue: en ? "€2.1B ARR (FY25 illustrative)" : "2,1 mld € ARR (FY25, demo)",
      ticker: "HLSC (demo)",
    },
    ratings: { glassdoor: 4.2, ceo: 86, recommendPct: 78 },
  };
}

function nordicBrief(locale: Locale, title: string, location: string | null): GlobalJobBriefData {
  const loc = location ?? (locale === "pl" ? "Kraków / zdalnie w UE" : "Kraków / remote EU");
  const en = locale === "en";
  return {
    companySlug: "nordic-axis",
    brandBlurb: en
      ? "Nordic Axis Systems delivers industrial IoT and supply-chain visibility for automotive and aerospace OEMs. R&D centers pair hardware labs with cloud control planes."
      : "Nordic Axis Systems dostarcza industrial IoT i widoczność łańcucha dostaw dla OEM automotive i aerospace. Centra R&D łączą laboratoria hardware z control plane w chmurze.",
    cultureHighlights: en
      ? [
          "4-day deep-work Fridays in engineering (meeting-free)",
          "Carbon-neutral operations target 2027 — published roadmap",
          "Hack weeks twice per year with patent filing support",
        ]
      : [
          "Piątki deep-work w inżynierii (bez spotkań)",
          "Cel neutralności węglowej 2027 — publiczna roadmapa",
          "Hack weeks 2×/rok ze wsparciem patentów",
        ],
    deiNote: en
      ? "Parental leave parity across all entities. Blind review for promotion packets in EU. Partnership with Women in Tech Kraków."
      : "Równy urlop rodzicielski we wszystkich spółkach. Blind review awansów w UE. Partnerstwo Women in Tech Kraków.",
    offices: [
      { city: "Kraków", country: en ? "Poland" : "Polska", headcount: "650", timezone: "CET" },
      { city: "Stockholm", country: en ? "Sweden" : "Szwecja", headcount: "220", timezone: "CET" },
      { city: "Munich", country: en ? "Germany" : "Niemcy", headcount: "140", timezone: "CET" },
      { city: "Detroit", country: en ? "USA" : "USA", headcount: "85", timezone: "EST" },
      { city: "São Paulo", country: en ? "Brazil" : "Brazylia", headcount: "45", timezone: "BRT" },
    ],
    responsibilities: en
      ? [
          `Lead ${title} for edge telemetry ingestion at 2M events/sec`,
          "Define schema contracts with OEM partners and compliance (ISO 27001)",
          "Own on-call rotation for tier-2 — max 1 weekend / quarter",
        ]
      : [
          `Prowadź ${title} dla ingestu telemetrii edge (2M zdarzeń/s)`,
          "Definiuj kontrakty schematów z OEM i compliance (ISO 27001)",
          "On-call tier-2 — max 1 weekend / kwartał",
        ],
    qualifications: en
      ? [
          "5+ years with streaming data (Kafka, Flink, or Pulsar)",
          "Rust or C++ plus Python for data pipelines",
          "English C1 for OEM workshops",
        ]
      : [
          "5+ lat ze streamingiem (Kafka, Flink lub Pulsar)",
          "Rust lub C++ plus Python w pipeline'ach danych",
          "Angielski C1 na warsztaty z OEM",
        ],
    niceToHave: en
      ? ["Automotive ASPICE exposure", "Polish B2", "Experience with digital twin platforms"]
      : ["ASPICE w automotive", "Polski B2", "Digital twin"],
    techStack: ["Rust", "Kafka", "TimescaleDB", "Kubernetes", "gRPC", "Grafana", "OPC-UA gateways"],
    benefits: en
      ? [
          "PLN 22–32k gross + profit share (demo)",
          "Multisport + language classes",
          "Company EV lease program (illustrative)",
          "30 days PTO",
        ]
      : [
          "22–32 tys. PLN brutto + profit share (demo)",
          "Multisport + zajęcia językowe",
          "Program leasingu EV (demo)",
          "30 dni urlopu",
        ],
    interviewSteps: en
      ? [
          { stage: "Talent partner", duration: "25 min", detail: "Role fit & logistics" },
          { stage: "Technical deep dive", duration: "75 min", detail: "Streaming design + code review" },
          { stage: "Site visit / virtual lab", duration: "60 min", detail: "Hardware lab tour optional" },
        ]
      : [
          { stage: "Talent partner", duration: "25 min", detail: "Dopasowanie i logistyka" },
          { stage: "Deep dive techniczny", duration: "75 min", detail: "Design streamingu + code review" },
          { stage: "Wizyta / lab wirtualny", duration: "60 min", detail: "Opcjonalna trasa po labie" },
        ],
    applicationTimeline: en
      ? [
          { stage: "TWIN auto-apply", duration: "Day 0", detail: "Human ack + package PDF" },
          { stage: "HM shortlist", duration: "Days 2–5", detail: "Batch acceptance UI" },
          { stage: "Offer", duration: "Week 3", detail: "Negotiation modal in TWIN" },
        ]
      : [
          { stage: "Auto-apply TWIN", duration: "Dzień 0", detail: "Potwierdzenie + PDF pakietu" },
          { stage: "Shortlista HM", duration: "Dni 2–5", detail: "UI akceptacji wsadowej" },
          { stage: "Oferta", duration: "Tydzień 3", detail: "Negocjacje w TWIN" },
        ],
    similarRoles: en
      ? [
          { title: "Senior Embedded Engineer", location: "Stockholm", seniority: "Senior" },
          { title: "Data Engineer — Supply Chain", location: "Kraków", seniority: "Mid–Senior" },
          { title: "Product Manager — IoT", location: "Munich", seniority: "Senior PM" },
        ]
      : [
          { title: "Senior Embedded Engineer", location: "Sztokholm", seniority: "Senior" },
          { title: "Data Engineer — Supply Chain", location: "Kraków", seniority: "Mid–Senior" },
          { title: "Product Manager — IoT", location: "Monachium", seniority: "Senior PM" },
        ],
    chipValues: {
      roleFamily: en ? "Data & Edge Platform" : "Platforma danych i edge",
      seniority: en ? "Senior (L5)" : "Senior (L5)",
      employment: en ? "Full-time" : "Pełny etat",
      teamSize: en ? "14 across 3 time zones" : "14 osób w 3 strefach",
      reportsTo: en ? "Head of Edge Platform" : "Head of Edge Platform",
      compBand: en ? "PLN 22–32k/mo (demo)" : "22–32 tys. PLN/mies. (demo)",
      equity: en ? "Profit share unit (demo)" : "Jednostka profit share (demo)",
      visa: en ? "Not required (EU)" : "Nie wymagane (UE)",
      relocation: en ? "Optional Kraków studio" : "Opcjonalnie studio Kraków",
      workModel: loc,
      travel: en ? "≤ 10%" : "≤ 10%",
    },
    facts: {
      industry: en ? "Industrial IoT · Automotive supply chain" : "Industrial IoT · Łańcuch dostaw automotive",
      founded: "1998",
      hq: en ? "Stockholm, Sweden" : "Sztokholm, Szwecja",
      employees: en ? "~8,900" : "~8 900",
      revenue: en ? "SEK 14B (FY25 demo)" : "14 mld SEK (FY25, demo)",
      ticker: null,
    },
    ratings: { glassdoor: 4.0, ceo: 79, recommendPct: 72 },
  };
}

function genericBrief(locale: Locale, company: string, title: string, location: string | null): GlobalJobBriefData {
  const loc = location ?? (locale === "pl" ? "Hybryda / EU" : "Hybrid / EU");
  const en = locale === "en";
  return {
    companySlug: "global-enterprise",
    brandBlurb: en
      ? `${company} operates as a multinational employer with standardized career frameworks, regional pay bands, and centralized employer branding — the profile below is an illustrative enterprise brief for demo purposes.`
      : `${company} działa jako międzynarodowy pracodawca ze standaryzowanymi ścieżkami kariery, regionalnymi pasmami wynagrodzeń i centralnym employer brandingiem — poniższy profil to ilustracyjny brief enterprise (demo).`,
    cultureHighlights: en
      ? [
          "Global mobility program across 40+ countries",
          "Learning wallet €2.5k/year",
          "Quarterly business resource groups",
        ]
      : [
          "Program mobilności w 40+ krajach",
          "Portfel szkoleń 2,5 tys. €/rok",
          "Kwartalne grupy zasobów biznesowych",
        ],
    deiNote: en
      ? "Published diversity goals; third-party pay equity audits in major markets (illustrative)."
      : "Opublikowane cele różnorodności; zewnętrzne audyty płac w głównych rynkach (demo).",
    offices: [
      { city: en ? "London" : "Londyn", country: en ? "UK" : "Wielka Brytania", headcount: "1.2k", timezone: "GMT" },
      { city: en ? "Warsaw" : "Warszawa", country: en ? "Poland" : "Polska", headcount: "800", timezone: "CET" },
      { city: en ? "New York" : "Nowy Jork", country: en ? "USA" : "USA", headcount: "2.1k", timezone: "EST" },
      { city: en ? "Singapore" : "Singapur", country: en ? "Singapore" : "Singapur", headcount: "450", timezone: "SGT" },
    ],
    responsibilities: en
      ? [
          `Deliver outcomes for ${title} within a cross-functional product trio`,
          "Contribute to architecture reviews and operational readiness",
          "Collaborate with recruiting on structured interview loops",
        ]
      : [
          `Dostarczaj rezultaty jako ${title} w cross-functional trio`,
          "Udział w przeglądach architektury i gotowości operacyjnej",
          "Współpraca z rekrutacją przy strukturyzowanych loopach",
        ],
    qualifications: en
      ? ["Relevant seniority for title", "Fluent English", "Right to work or visa sponsorship path"]
      : ["Odpowiedni poziom do tytułu", "Angielski", "Prawo pracy lub ścieżka wizowa"],
    niceToHave: en ? ["Second EU language", "Prior scale-up or enterprise context"] : ["Drugi język UE", "Scale-up lub korporacja"],
    techStack: ["TypeScript", "Python", "PostgreSQL", "AWS", "Kubernetes", "Datadog"],
    benefits: en
      ? ["Competitive band (regional demo)", "Healthcare", "Pension match", "Flexible PTO"]
      : ["Konkurencyjne pasmo (demo regionalne)", "Opieka zdrowotna", "PPK/emerytura", "Elastyczny urlop"],
    interviewSteps: en
      ? [
          { stage: "Screen", duration: "30 min", detail: "Recruiter" },
          { stage: "Technical", duration: "60 min", detail: "Role-specific" },
          { stage: "Final", duration: "45 min", detail: "Hiring manager" },
        ]
      : [
          { stage: "Screen", duration: "30 min", detail: "Rekruter" },
          { stage: "Techniczne", duration: "60 min", detail: "Pod rolę" },
          { stage: "Finał", duration: "45 min", detail: "Hiring manager" },
        ],
    applicationTimeline: en
      ? [
          { stage: "Apply", duration: "Day 0", detail: "TWIN package" },
          { stage: "Review", duration: "Days 1–5", detail: "Recruiter acceptance queue" },
          { stage: "Interviews", duration: "Week 2+", detail: "Calendar sync" },
        ]
      : [
          { stage: "Aplikacja", duration: "Dzień 0", detail: "Pakiet TWIN" },
          { stage: "Przegląd", duration: "Dni 1–5", detail: "Kolejka akceptacji" },
          { stage: "Rozmowy", duration: "Tydz. 2+", detail: "Sync kalendarza" },
        ],
    similarRoles: en
      ? [
          { title: `Senior ${title}`, location: loc, seniority: "Senior" },
          { title: `Lead ${title}`, location: en ? "Remote EU" : "Zdalnie UE", seniority: "Lead" },
        ]
      : [
          { title: `Senior ${title}`, location: loc, seniority: "Senior" },
          { title: `Lead ${title}`, location: en ? "Zdalnie UE" : "Remote EU", seniority: "Lead" },
        ],
    chipValues: {
      roleFamily: en ? "Product & Engineering" : "Produkt i inżynieria",
      seniority: en ? "Senior" : "Senior",
      employment: en ? "Full-time" : "Pełny etat",
      teamSize: en ? "8–12" : "8–12",
      reportsTo: en ? "Engineering Manager" : "Engineering Manager",
      compBand: en ? "Regional band (demo)" : "Pasmo regionalne (demo)",
      equity: en ? "Varies by entity" : "Zależnie od spółki",
      visa: en ? "Case-by-case sponsorship" : "Sponsoring indywidualnie",
      relocation: en ? "Available for key hubs" : "Dla kluczowych hubów",
      workModel: loc,
      travel: en ? "As needed" : "W razie potrzeby",
    },
    facts: {
      industry: en ? "Multinational enterprise" : "Korporacja międzynarodowa",
      founded: en ? "Varies" : "Zróżnicowane",
      hq: en ? "Global HQ (demo)" : "HQ globalne (demo)",
      employees: en ? "10,000+" : "10 000+",
      revenue: en ? "Not disclosed (demo)" : "Nieujawnione (demo)",
      ticker: null,
    },
    ratings: { glassdoor: 3.9, ceo: 74, recommendPct: 68 },
  };
}

export function getDemoGlobalJobBrief(
  input: BriefInput,
  locale: Locale,
): GlobalJobBriefData {
  const key = normalizeCompany(input.company);
  if (key.includes("helios")) return helioBrief(locale, input.title, input.location);
  if (key.includes("nordic")) return nordicBrief(locale, input.title, input.location);
  return genericBrief(locale, input.company, input.title, input.location);
}
