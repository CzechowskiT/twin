import type { Locale } from "@/lib/i18n";

export type WaitlistCopy = {
  metaTitle: string;
  metaDescription: string;
  backHome: string;
  heroHeadline: string;
  heroLead1: string;
  heroLead2: string;
  heroLead3: string;
  sectionHow: string;
  terminalTitle: string;
  terminalSteps: string[];
  calendarTitle: string;
  calendar: { day: string; time: string; title: string; link: string }[];
  sectionCompare: string;
  compareBadTitle: string;
  compareBad: string[];
  compareGoodTitle: string;
  compareGood: string[];
  sectionStats: string;
  metricSpots: string;
  metricSigned: string;
  metricRemaining: string;
  metricJobs: string;
  sectionBoost: string;
  boostPositionTitle: string;
  boostPositionHint: string;
  boostRewards: string;
  leaderboardTitle: string;
  leaderboardLine: string;
  sectionFaq: string;
  faq: { q: string; a: string }[];
  testimonials: { quote: string; who: string }[];
  finalTitle: string;
  finalJoin: string;
  finalSpotsLine: string;
  finalMidnight: string;
  footerPrivacy: string;
  footerTerms: string;
  footerBeta: string;
  formJoinCap: string;
  formEmailLabel: string;
  formEmailPlaceholder: string;
  formPrivacyPrefix: string;
  formPrivacyLink: string;
  formEmailConsent: string;
  formConsentsError: string;
  formSubmit: string;
  formSubmitting: string;
  formSpotsLine: string;
  formTodayLine: string;
  formBullet1: string;
  formBullet2: string;
  formBullet3: string;
  formSuccessTitle: string;
  formSuccessPosition: string;
  formCopy: string;
  formReferralHint: string;
  formOpenDashboard: string;
  formErrorGeneric: string;
  validationEmail: string;
  validationConsent: string;
};

const TERMINAL_EN = [
  "> Initializing agent...",
  "✓ Agent active",
  "> Scanning LinkedIn Jobs...",
  "✓ Found 1,247 listings",
  "> Matching your profile...",
  "✓ 23 roles fit your bar",
  "> Tailoring applications...",
  "✓ 23 unique applications ready",
  "> Submitting applications...",
  "✓ 23/23 sent",
  "> Replies incoming...",
  "✓ 5 interview invites!",
  "> Syncing your calendar...",
  "✓ 5 meetings scheduled",
];

const en: WaitlistCopy = {
  metaTitle: "TWIN Wishlist — join the first 1,000",
  metaDescription:
    "Your digital twin takes over job search. Join the waitlist — free lifetime access for early adopters.",
  backHome: "← Home",
  heroHeadline: "STOP CHASING JOB BOARDS",
  heroLead1: "Your digital twin takes the wheel.",
  heroLead2: "No CVs. No forms.",
  heroLead3: "Only interview invites on your calendar.",
  sectionHow: "How it works in practice",
  terminalTitle: "TWIN Agent Terminal",
  terminalSteps: TERMINAL_EN,
  calendarTitle: "Your calendar",
  calendar: [
    { day: "MONDAY, MAY 24", time: "10:00 – 11:00", title: "📞 Technical interview — Revolut", link: "Google Meet" },
    { day: "TUESDAY, MAY 25", time: "14:00 – 15:00", title: "💼 First interview — Stripe", link: "Zoom" },
    { day: "WEDNESDAY, MAY 26", time: "09:00 – 10:00", title: "🎯 Tech call — N26", link: "Teams" },
  ],
  sectionCompare: "End the job-search nightmare",
  compareBadTitle: "❌ The old way",
  compareBad: [
    "⏰ 4+ hours/day on portals",
    "📝 Hundreds of apps, ~5% replies",
    "😫 Ghosting, no feedback",
    "💸 Agencies take a cut of salary",
  ],
  compareGoodTitle: "✅ TWIN",
  compareGood: [
    "😴 Agent works while you sleep",
    "🎯 Only matched roles",
    "💬 Status in one dashboard",
    "🚀 Momentum: interviews in weeks",
  ],
  sectionStats: "TWIN in numbers",
  metricSpots: "List capacity",
  metricSigned: "Signed up",
  metricRemaining: "Spots left",
  metricJobs: "Jobs in database",
  sectionBoost: "Boost your odds",
  boostPositionTitle: "🎯 Your queue position",
  boostPositionHint:
    "Invite friends — each signup from your link moves you up (see your panel after joining).",
  boostRewards: "TOP 10 → $1000 bonus · TOP 100 → $500 · TOP 1000 → $200 (beta program)",
  leaderboardTitle: "🏆 Top referrers",
  leaderboardLine: "{referrals} invites → {reward}",
  sectionFaq: "FAQ",
  faq: [
    {
      q: "Does this actually work?",
      a: "TWIN sends applications and tracks replies in one place. The beta waitlist is early access — live metrics on this page come from the product.",
    },
    {
      q: "How long until I get access?",
      a: "First 1,000: about 14 days after signup. After that: rolling access in 4–6 weeks.",
    },
    {
      q: "What does it cost?",
      a: "First 1,000 = free for early adopters. Later: freemium / success fee — details before public launch.",
    },
    {
      q: "What if I don't land a role?",
      a: "Beta is free for the first thousand — no financial risk when you sign up.",
    },
    {
      q: "How does TWIN personalize applications?",
      a: "AI matches the role to your profile and generates tailored materials — every application is unique.",
    },
    {
      q: "Do companies know it's AI?",
      a: "TWIN automates manual work — applications look like yours, with your consent and data.",
    },
  ],
  testimonials: [
    {
      quote: "Six weeks of manual applying: zero interviews. TWIN found three in two weeks. Signed at Revolut.",
      who: "Michał K., Senior Python Developer",
    },
    {
      quote: "Two offers at once. TWIN applied while I slept. I chose Stripe.",
      who: "Kasia W., Frontend Engineer",
    },
  ],
  finalTitle: "Last chance",
  finalJoin: "Join the first {cap}",
  finalSpotsLine: "⏱️ Spots left: {spots} · 🔥 Today: {today} signups",
  finalMidnight: "⏰ Until midnight: {countdown}",
  footerPrivacy: "Privacy",
  footerTerms: "Terms",
  footerBeta: "Beta (classic)",
  formJoinCap: "🎯 Join the first {cap}",
  formEmailLabel: "Your email (developer)",
  formEmailPlaceholder: "you@example.com",
  formPrivacyPrefix: "I accept the",
  formPrivacyLink: "privacy policy",
  formEmailConsent: "Consent to email about the queue and beta (required)",
  formConsentsError: "Check both boxes to join.",
  formSubmit: "Get free access forever ✨",
  formSubmitting: "Saving…",
  formSpotsLine: "Spots left: {remaining}/{cap}",
  formTodayLine: "⚡ Today: {today} signups",
  formBullet1: "✓ Lifetime free access for early adopters",
  formBullet2: "✓ No credit card",
  formBullet3: "✓ Access within 14 days of signup",
  formSuccessTitle: "You're on the list!",
  formSuccessPosition: "Position: #{position}",
  formCopy: "Copy",
  formReferralHint: "Invite friends — each person moves you up the queue.",
  formOpenDashboard: "Open waitlist panel",
  formErrorGeneric: "Something went wrong. Try again.",
  validationEmail: "Invalid email address",
  validationConsent: "Consent required",
};

const pl: WaitlistCopy = {
  ...en,
  metaTitle: "TWIN Wishlist — dołącz do pierwszych 1000",
  metaDescription:
    "Twój cyfrowy bliźniak przejmuje szukanie pracy. Zapisz się — darmowy dostęp dla Early Adopters.",
  backHome: "← Strona główna",
  heroHeadline: "ZWOLNIJ SIĘ Z SZUKANIA PRACY",
  heroLead1: "Twój cyfrowy bliźniak przejmuje stery.",
  heroLead2: "Żadnych CV. Żadnych formularzy.",
  heroLead3: "Tylko gotowe zaproszenia na rozmowy w Twoim kalendarzu.",
  sectionHow: "Jak to działa w praktyce?",
  terminalTitle: "TWIN Agent Terminal",
  terminalSteps: [
    "> Inicjalizacja agenta...",
    "✓ Agent aktywny",
    "> Skanowanie LinkedIn Jobs...",
    "✓ Znaleziono 1,247 ofert",
    "> Analiza dopasowania...",
    "✓ 23 oferty pasują do Twojego profilu",
    "> Personalizacja CV...",
    "✓ Wygenerowano 23 unikalne aplikacje",
    "> Wysyłanie aplikacji...",
    "✓ 23/23 wysłane",
    "> Otrzymano odpowiedzi...",
    "✓ 5 zaproszeń na rozmowy!",
    "> Synchronizacja z kalendarzem...",
    "✓ 5 spotkań dodanych",
  ],
  calendarTitle: "Twój kalendarz",
  calendar: [
    { day: "PONIEDZIAŁEK, 24 MAJ", time: "10:00 – 11:00", title: "📞 Rozmowa techniczna — Revolut", link: "Google Meet" },
    { day: "WTOREK, 25 MAJ", time: "14:00 – 15:00", title: "💼 First Interview — Stripe", link: "Zoom" },
    { day: "ŚRODA, 26 MAJ", time: "09:00 – 10:00", title: "🎯 Tech Call — N26", link: "Teams" },
  ],
  sectionCompare: "Koniec z koszmarem szukania pracy",
  compareBadTitle: "❌ Tradycyjny sposób",
  compareBad: [
    "⏰ 4+ godziny dziennie na portalach",
    "📝 Setki aplikacji, ~5% odpowiedzi",
    "😫 Ghosting i brak feedbacku",
    "💸 Agencje biorą % pensji",
  ],
  compareGoodTitle: "✅ TWIN",
  compareGood: [
    "😴 Agent pracuje, gdy śpisz",
    "🎯 Tylko dopasowane oferty",
    "💬 Status w jednym dashboardzie",
    "🚀 Momentum: rozmowy w tygodniach, nie miesiącach",
  ],
  sectionStats: "TWIN w liczbach",
  metricSpots: "Miejsc na liście",
  metricSigned: "Zapisanych",
  metricRemaining: "Wolnych miejsc",
  metricJobs: "Ofert w bazie",
  sectionBoost: "Zwiększ swoje szanse",
  boostPositionTitle: "🎯 Twoja pozycja na liście",
  boostPositionHint:
    "Zaproś znajomych — każdy signup z Twojego linku podnosi Cię w kolejce (patrz panel po zapisie).",
  boostRewards: "TOP 10 → $1000 bonus · TOP 100 → $500 · TOP 1000 → $200 (program beta)",
  leaderboardTitle: "🏆 Najlepsi rekruterzy",
  leaderboardLine: "{referrals} zaproszeń → {reward}",
  faq: [
    {
      q: "Czy to naprawdę działa?",
      a: "TWIN wysyła aplikacje i śledzi odpowiedzi w jednym miejscu. Beta waitlist to wczesny dostęp — metryki na stronie odzwierciedlają żywe dane z produktu.",
    },
    {
      q: "Jak długo muszę czekać na dostęp?",
      a: "Pierwsze 1000 osób: ok. 14 dni od rejestracji. Kolejne: rolling access 4–6 tygodni.",
    },
    {
      q: "Ile to kosztuje?",
      a: "Pierwsze 1000 = darmowy dostęp dla Early Adopters. Później plan freemium / success fee — szczegóły przed launch.",
    },
    {
      q: "Co jeśli nie znajdę pracy?",
      a: "Beta jest bez opłat dla pierwszej tysiącki — zero ryzyka finansowego przy zapisie.",
    },
    {
      q: "Jak TWIN personalizuje aplikacje?",
      a: "AI dopasowuje ofertę do profilu i generuje spersonalizowane materiały — każda aplikacja jest unikalna.",
    },
    {
      q: "Czy firmy wiedzą, że to AI?",
      a: "TWIN automatyzuje pracę ręczną — aplikacja wygląda jak od Ciebie, z Twoją zgodą i danymi.",
    },
  ],
  testimonials: [
    {
      quote:
        "6 tygodni ręcznego aplikowania: 0 rozmów. TWIN znalazł mi 3 w 2 tygodnie. Podpisałem w Revolut.",
      who: "Michał K., Senior Python Developer",
    },
    {
      quote: "Dostałam 2 oferty równocześnie. TWIN aplikował jak spałam. Wybrałam Stripe.",
      who: "Kasia W., Frontend Engineer",
    },
  ],
  finalTitle: "Ostatnia szansa",
  finalJoin: "Dołącz do pierwszych {cap}",
  finalSpotsLine: "⏱️ Pozostało: {spots} miejsc · 🔥 Dziś: {today} zapisów",
  finalMidnight: "⏰ Do północy: {countdown}",
  footerPrivacy: "Prywatność",
  footerTerms: "Regulamin",
  footerBeta: "Beta (klasyczny)",
  formJoinCap: "🎯 Dołącz do pierwszych {cap}",
  formEmailLabel: "Twój email (developer)",
  formEmailPlaceholder: "jan.kowalski@gmail.com",
  formPrivacyPrefix: "Akceptuję",
  formPrivacyLink: "politykę prywatności",
  formEmailConsent: "Zgoda na email o kolejce i beta (wymagane)",
  formConsentsError: "Zaznacz obie zgody, aby dołączyć.",
  formSubmit: "Zdobądź darmowy dostęp na zawsze ✨",
  formSubmitting: "Zapisuję…",
  formSpotsLine: "Pozostało: {remaining}/{cap}",
  formTodayLine: "⚡ Dziś: {today} zapisów",
  formBullet1: "✓ Dożywotni darmowy dostęp dla Early Adopters",
  formBullet2: "✓ Zero kart kredytowych",
  formBullet3: "✓ Dostęp w ciągu 14 dni od rejestracji",
  formSuccessTitle: "Jesteś na liście!",
  formSuccessPosition: "Pozycja: #{position}",
  formCopy: "Kopiuj",
  formReferralHint: "Zaproś znajomych — każda osoba = wyższa pozycja na liście.",
  formOpenDashboard: "Otwórz panel waitlisty",
  formErrorGeneric: "Wystąpił błąd. Spróbuj ponownie.",
  validationEmail: "Nieprawidłowy adres email",
  validationConsent: "Wymagana zgoda",
};

/** Localized waitlist copy; non-EN/PL locales use professional translations of the EN base. */
function esCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — únete a los primeros 1.000",
    metaDescription: "Tu gemelo digital busca trabajo por ti. Lista de espera — acceso gratis de por vida para early adopters.",
    backHome: "← Inicio",
    heroHeadline: "DEJA DE PERSEGUIR OFERTAS",
    heroLead1: "Tu gemelo digital toma el control.",
    heroLead2: "Sin CVs. Sin formularios.",
    heroLead3: "Solo invitaciones a entrevistas en tu calendario.",
    sectionHow: "Cómo funciona en la práctica",
    terminalTitle: "Terminal del agente TWIN",
    terminalSteps: TERMINAL_EN.map((s) =>
      s
        .replace("Initializing agent", "Iniciando agente")
        .replace("Agent active", "Agente activo")
        .replace("Scanning LinkedIn Jobs", "Escaneando LinkedIn Jobs")
        .replace("Found 1,247 listings", "1.247 ofertas encontradas")
        .replace("Matching your profile", "Analizando tu perfil")
        .replace("roles fit your bar", "ofertas encajan con tu perfil")
        .replace("Tailoring applications", "Personalizando candidaturas")
        .replace("unique applications ready", "candidaturas únicas listas")
        .replace("Submitting applications", "Enviando candidaturas")
        .replace("sent", "enviadas")
        .replace("Replies incoming", "Respuestas entrantes")
        .replace("interview invites", "invitaciones a entrevista")
        .replace("Syncing your calendar", "Sincronizando calendario")
        .replace("meetings scheduled", "reuniones programadas"),
    ),
    calendarTitle: "Tu calendario",
    sectionCompare: "Fin a la pesadilla de buscar empleo",
    compareBadTitle: "❌ La forma antigua",
    compareGoodTitle: "✅ TWIN",
    sectionStats: "TWIN en cifras",
    metricSpots: "Plazas en la lista",
    metricSigned: "Registrados",
    metricRemaining: "Plazas libres",
    metricJobs: "Ofertas en base de datos",
    sectionBoost: "Mejora tus opciones",
    boostPositionTitle: "🎯 Tu posición en la lista",
    leaderboardTitle: "🏆 Mejores referidores",
    leaderboardLine: "{referrals} invitaciones → {reward}",
    compareBad: [
      "⏰ Más de 4 h/día en portales",
      "📝 Cientos de solicitudes, ~5 % de respuestas",
      "😫 Ghosting sin feedback",
      "💸 Agencias que se llevan un % del salario",
    ],
    compareGood: [
      "😴 El agente trabaja mientras duermes",
      "🎯 Solo ofertas que encajan",
      "💬 Estado en un solo panel",
      "🚀 Entrevistas en semanas, no meses",
    ],
    sectionFaq: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Funciona de verdad?",
        a: "TWIN envía candidaturas y sigue las respuestas en un solo lugar. La lista beta es acceso anticipado; las métricas de esta página son datos en vivo del producto.",
      },
      {
        q: "¿Cuánto tardo en entrar?",
        a: "Primeros 1.000: unos 14 días tras registrarte. Después: acceso progresivo en 4–6 semanas.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Primeros 1.000 = gratis para early adopters. Después: freemium / tarifa por éxito — detalles antes del lanzamiento público.",
      },
      {
        q: "¿Y si no encuentro trabajo?",
        a: "La beta es gratis para los primeros mil — sin riesgo financiero al apuntarte.",
      },
      {
        q: "¿Cómo personaliza TWIN las candidaturas?",
        a: "La IA adapta la oferta a tu perfil y genera materiales únicos — cada solicitud es distinta.",
      },
      {
        q: "¿Las empresas saben que es IA?",
        a: "TWIN automatiza el trabajo manual — la candidatura parece tuya, con tu consentimiento y datos.",
      },
    ],
    formJoinCap: "🎯 Únete a los primeros {cap}",
    formEmailLabel: "Tu email (desarrollador/a)",
    formPrivacyPrefix: "Acepto la",
    formPrivacyLink: "política de privacidad",
    formEmailConsent: "Consentimiento para emails sobre la cola y la beta (obligatorio)",
    formConsentsError: "Marca las dos casillas para unirte.",
    formSubmitting: "Guardando…",
    formSubmit: "Acceso gratis para siempre ✨",
    formSpotsLine: "Quedan: {remaining}/{cap}",
    formTodayLine: "⚡ Hoy: {today} inscripciones",
    formBullet1: "✓ Acceso gratis de por vida para early adopters",
    formBullet2: "✓ Sin tarjeta de crédito",
    formBullet3: "✓ Acceso en unos 14 días",
    formSuccessTitle: "¡Estás en la lista!",
    formSuccessPosition: "Posición: #{position}",
    formCopy: "Copiar",
    formReferralHint: "Invita amigos — cada persona sube tu posición.",
    formOpenDashboard: "Abrir panel de la lista",
    formErrorGeneric: "Algo falló. Inténtalo de nuevo.",
    validationEmail: "Email no válido",
    validationConsent: "Consentimiento obligatorio",
  };
}

function frCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — rejoignez les 1 000 premiers",
    metaDescription: "Votre jumeau numérique gère la recherche d'emploi. Liste d'attente — accès gratuit à vie pour les early adopters.",
    backHome: "← Accueil",
    heroHeadline: "ARRÊTEZ DE COURIR APRÈS LES OFFRES",
    heroLead1: "Votre jumeau numérique prend le relais.",
    heroLead2: "Pas de CV. Pas de formulaires.",
    heroLead3: "Seulement des entretiens dans votre calendrier.",
    sectionHow: "Comment ça marche en pratique",
    terminalTitle: "Terminal agent TWIN",
    sectionCompare: "Fin du cauchemar de la recherche d'emploi",
    compareBadTitle: "❌ L'ancienne méthode",
    compareGoodTitle: "✅ TWIN",
    sectionStats: "TWIN en chiffres",
    metricSpots: "Places sur la liste",
    metricSigned: "Inscrits",
    metricRemaining: "Places restantes",
    metricJobs: "Offres en base",
    sectionBoost: "Augmentez vos chances",
    boostPositionTitle: "🎯 Votre position",
    leaderboardTitle: "🏆 Meilleurs parrains",
    leaderboardLine: "{referrals} invitations → {reward}",
    sectionFaq: "FAQ",
    faq: [
      {
        q: "Est-ce que ça marche vraiment ?",
        a: "TWIN envoie les candidatures et suit les réponses au même endroit. La liste d'attente beta est un accès anticipé ; les métriques viennent du produit en direct.",
      },
      {
        q: "Combien de temps avant l'accès ?",
        a: "Les 1 000 premiers : environ 14 jours après inscription. Ensuite : accès progressif en 4 à 6 semaines.",
      },
      {
        q: "Quel est le prix ?",
        a: "Les 1 000 premiers = gratuit pour les early adopters. Ensuite : freemium / success fee — détails avant le lancement public.",
      },
      {
        q: "Et si je ne trouve pas de poste ?",
        a: "La beta est gratuite pour les premiers mille — aucun risque financier à l'inscription.",
      },
      {
        q: "Comment TWIN personnalise les candidatures ?",
        a: "L'IA adapte l'offre à votre profil et génère des supports uniques — chaque candidature est distincte.",
      },
      {
        q: "Les entreprises savent-elles que c'est de l'IA ?",
        a: "TWIN automatise le travail manuel — la candidature ressemble à la vôtre, avec votre consentement.",
      },
    ],
    compareBad: [
      "⏰ Plus de 4 h/jour sur les portails",
      "📝 Des centaines de candidatures, ~5 % de réponses",
      "😫 Ghosting sans retour",
      "💸 Agences qui prélèvent un % du salaire",
    ],
    compareGood: [
      "😴 L'agent travaille pendant que vous dormez",
      "🎯 Offres ciblées uniquement",
      "💬 Statut dans un seul tableau de bord",
      "🚀 Entretiens en semaines",
    ],
    formSubmit: "Accès gratuit à vie ✨",
    formSuccessTitle: "Vous êtes sur la liste !",
    validationEmail: "Adresse e-mail invalide",
    validationConsent: "Consentement requis",
  };
}

function deCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — sichere dir einen der ersten 1.000 Plätze",
    metaDescription: "Dein digitaler Zwilling übernimmt die Jobsuche. Warteliste — lebenslanger Gratiszugang für Early Adopters.",
    backHome: "← Startseite",
    heroHeadline: "HÖR AUF, JOBPORTALE ZU JAGEN",
    heroLead1: "Dein digitaler Zwilling übernimmt.",
    heroLead2: "Keine CVs. Keine Formulare.",
    heroLead3: "Nur Interview-Einladungen im Kalender.",
    sectionHow: "So funktioniert es in der Praxis",
    terminalTitle: "TWIN-Agent-Terminal",
    sectionCompare: "Schluss mit dem Jobsuche-Albtraum",
    compareBadTitle: "❌ Der alte Weg",
    compareGoodTitle: "✅ TWIN",
    sectionStats: "TWIN in Zahlen",
    metricSpots: "Listenplätze",
    metricSigned: "Angemeldet",
    metricRemaining: "Freie Plätze",
    metricJobs: "Jobs in der Datenbank",
    sectionBoost: "Erhöhe deine Chancen",
    boostPositionTitle: "🎯 Deine Listenposition",
    leaderboardTitle: "🏆 Top-Einladende",
    leaderboardLine: "{referrals} Einladungen → {reward}",
    sectionFaq: "FAQ",
    compareBad: [
      "⏰ Über 4 Std./Tag auf Jobportalen",
      "📝 Hunderte Bewerbungen, ~5 % Antworten",
      "😫 Ghosting ohne Feedback",
      "💸 Agenturen nehmen Gehaltsprozente",
    ],
    compareGood: [
      "😴 Agent arbeitet, während du schläfst",
      "🎯 Nur passende Rollen",
      "💬 Status in einem Dashboard",
      "🚀 Interviews in Wochen",
    ],
    formSubmit: "Kostenlosen Zugang für immer ✨",
    formSuccessTitle: "Du stehst auf der Liste!",
    validationEmail: "Ungültige E-Mail-Adresse",
    validationConsent: "Zustimmung erforderlich",
  };
}

function itCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — entra nei primi 1.000",
    metaDescription: "Il tuo gemello digitale gestisce la ricerca lavoro. Lista d'attesa — accesso gratuito a vita per early adopter.",
    backHome: "← Home",
    heroHeadline: "SMETTI DI INSEGUIRE LE OFFERTE",
    heroLead1: "Il tuo gemello digitale prende il comando.",
    heroLead2: "Niente CV. Niente moduli.",
    heroLead3: "Solo inviti a colloquio sul calendario.",
    sectionHow: "Come funziona nella pratica",
    terminalTitle: "Terminale agente TWIN",
    sectionCompare: "Fine all'incubo della ricerca lavoro",
    compareBadTitle: "❌ Il vecchio modo",
    compareGoodTitle: "✅ TWIN",
    sectionStats: "TWIN in numeri",
    metricSpots: "Posti in lista",
    metricSigned: "Iscritti",
    metricRemaining: "Posti liberi",
    metricJobs: "Offerte nel database",
    sectionBoost: "Aumenta le tue chance",
    boostPositionTitle: "🎯 La tua posizione",
    leaderboardTitle: "🏆 Migliori referrer",
    leaderboardLine: "{referrals} inviti → {reward}",
    sectionFaq: "FAQ",
    compareBad: [
      "⏰ Oltre 4 ore/giorno sui portali",
      "📝 Centinaia di candidature, ~5% risposte",
      "😫 Ghosting senza feedback",
      "💸 Agenzie che prendono una % dello stipendio",
    ],
    compareGood: [
      "😴 L'agente lavora mentre dormi",
      "🎯 Solo offerte in target",
      "💬 Stato in un'unica dashboard",
      "🚀 Colloqui in settimane",
    ],
    formSubmit: "Accesso gratuito per sempre ✨",
    formSuccessTitle: "Sei in lista!",
    validationEmail: "Email non valida",
    validationConsent: "Consenso obbligatorio",
  };
}

function zhCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — 加入前 1000 名",
    metaDescription: "你的数字分身接管求职。加入候补名单 — 早期用户终身免费。",
    backHome: "← 首页",
    heroHeadline: "别再刷招聘网站",
    heroLead1: "数字分身替你出手。",
    heroLead2: "无需简历。无需表单。",
    heroLead3: "日历里只有面试邀请。",
    sectionHow: "实际如何运作",
    terminalTitle: "TWIN 代理终端",
    terminalSteps: [
      "> 正在初始化代理…",
      "✓ 代理已启动",
      "> 扫描 LinkedIn 职位…",
      "✓ 找到 1,247 个职位",
      "> 匹配你的画像…",
      "✓ 23 个职位符合你的标准",
      "> 定制申请材料…",
      "✓ 已生成 23 份独特申请",
      "> 提交申请…",
      "✓ 23/23 已发送",
      "> 收到回复…",
      "✓ 5 个面试邀请！",
      "> 同步日历…",
      "✓ 已安排 5 场会议",
    ],
    calendarTitle: "你的日历",
    calendar: [
      { day: "5月24日 周一", time: "10:00 – 11:00", title: "📞 技术面试 — Revolut", link: "Google Meet" },
      { day: "5月25日 周二", time: "14:00 – 15:00", title: "💼 初试 — Stripe", link: "Zoom" },
      { day: "5月26日 周三", time: "09:00 – 10:00", title: "🎯 技术通话 — N26", link: "Teams" },
    ],
    sectionCompare: "结束求职噩梦",
    compareBadTitle: "❌ 传统方式",
    compareBad: [
      "⏰ 每天在招聘网站花 4+ 小时",
      "📝 数百份申请，约 5% 有回复",
      "😫 已读不回，没有反馈",
      "💸 猎头抽成薪水比例",
    ],
    compareGoodTitle: "✅ TWIN",
    compareGood: [
      "😴 你睡觉时代理在工作",
      "🎯 只投递匹配职位",
      "💬 一个面板看清状态",
      "🚀 数周内拿到面试",
    ],
    sectionStats: "TWIN 数据",
    metricSpots: "名单名额",
    metricSigned: "已报名",
    metricRemaining: "剩余名额",
    metricJobs: "库内职位",
    sectionBoost: "提高你的排名",
    boostPositionTitle: "🎯 你的排队位置",
    boostPositionHint: "邀请好友 — 每个通过你链接的注册都会让你靠前（加入后可在面板查看）。",
    boostRewards: "前 10 名 → $1000 奖金 · 前 100 → $500 · 前 1000 → $200（beta 计划）",
    leaderboardTitle: "🏆 推荐榜",
    leaderboardLine: "{referrals} 次邀请 → {reward}",
    sectionFaq: "常见问题",
    faq: [
      {
        q: "真的有用吗？",
        a: "TWIN 在一个地方投递申请并跟踪回复。候补名单是早期访问 — 本页指标来自真实产品数据。",
      },
      {
        q: "多久能开通？",
        a: "前 1000 名：注册后约 14 天。之后：滚动开通，约 4–6 周。",
      },
      {
        q: "多少钱？",
        a: "前 1000 名对早期用户免费。之后：免费增值 / 成功费 — 公开发布前会说明。",
      },
      {
        q: "找不到工作怎么办？",
        a: "前一千名 beta 免费 — 注册没有财务风险。",
      },
      {
        q: "TWIN 如何个性化申请？",
        a: "AI 将职位与你的画像匹配并生成定制材料 — 每份申请都独一无二。",
      },
      {
        q: "公司知道是 AI 吗？",
        a: "TWIN 自动化手工环节 — 申请看起来像你的，且经你同意并使用你的数据。",
      },
    ],
    testimonials: [
      { quote: "手动投了六周：零面试。TWIN 两周内找到三个。最后在 Revolut 签约。", who: "Michał K.，高级 Python 开发" },
      { quote: "同时收到两个 offer。TWIN 在我睡觉时投递。我选了 Stripe。", who: "Kasia W.，前端工程师" },
    ],
    finalTitle: "最后机会",
    finalJoin: "加入前 {cap} 名",
    finalSpotsLine: "⏱️ 剩余名额：{spots} · 🔥 今日报名：{today}",
    finalMidnight: "⏰ 距午夜：{countdown}",
    footerPrivacy: "隐私",
    footerTerms: "条款",
    footerBeta: "Beta（经典版）",
    formJoinCap: "🎯 加入前 {cap} 名",
    formEmailLabel: "你的邮箱（开发者）",
    formEmailPlaceholder: "you@example.com",
    formPrivacyPrefix: "我接受",
    formPrivacyLink: "隐私政策",
    formEmailConsent: "同意接收关于排队与 beta 的邮件（必填）",
    formConsentsError: "请勾选两项以加入。",
    formSubmit: "永久免费访问 ✨",
    formSubmitting: "保存中…",
    formSpotsLine: "剩余：{remaining}/{cap}",
    formTodayLine: "⚡ 今日报名：{today}",
    formBullet1: "✓ 早期用户终身免费",
    formBullet2: "✓ 无需信用卡",
    formBullet3: "✓ 注册后约 14 天内开通",
    formSuccessTitle: "你已在名单中！",
    formSuccessPosition: "排位：#{position}",
    formCopy: "复制",
    formReferralHint: "邀请好友 — 每多一人你的排位都会上升。",
    formOpenDashboard: "打开候补面板",
    formErrorGeneric: "出了点问题，请重试。",
    validationEmail: "邮箱格式无效",
    validationConsent: "需要同意",
  };
}

function jaCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — 最初の1000人に参加",
    metaDescription: "デジタルツインが転職活動を代行。ウェイトリスト — アーリーアダプターは永久無料。",
    backHome: "← ホーム",
    heroHeadline: "求人探しをやめよう",
    heroLead1: "デジタルツインが引き継ぎます。",
    heroLead2: "履歴書なし。フォームなし。",
    heroLead3: "カレンダーには面接招待だけ。",
    sectionHow: "実際の流れ",
    terminalTitle: "TWINエージェント端末",
    terminalSteps: [
      "> エージェントを初期化中…",
      "✓ エージェント稼働",
      "> LinkedIn Jobs をスキャン…",
      "✓ 1,247 件の求人を発見",
      "> プロフィールにマッチング…",
      "✓ 23 件が基準に適合",
      "> 応募をカスタマイズ…",
      "✓ 23 件のユニーク応募を生成",
      "> 応募を送信…",
      "✓ 23/23 送信完了",
      "> 返信を受信中…",
      "✓ 面接招待 5 件！",
      "> カレンダーと同期…",
      "✓ 5 件のミーティングを予定",
    ],
    calendarTitle: "あなたのカレンダー",
    calendar: [
      { day: "5月24日（月）", time: "10:00 – 11:00", title: "📞 技術面接 — Revolut", link: "Google Meet" },
      { day: "5月25日（火）", time: "14:00 – 15:00", title: "💼 一次面接 — Stripe", link: "Zoom" },
      { day: "5月26日（水）", time: "09:00 – 10:00", title: "🎯 技術通話 — N26", link: "Teams" },
    ],
    sectionCompare: "転職の悪夢を終わらせる",
    compareBadTitle: "❌ 従来の方法",
    compareBad: [
      "⏰ 求人サイトに1日4時間以上",
      "📝 数百応募、返信は約5%",
      "😫 音信不通、フィードバックなし",
      "💸 エージェンシーが給与の一部を取得",
    ],
    compareGoodTitle: "✅ TWIN",
    compareGood: [
      "😴 寝ている間もエージェントが稼働",
      "🎯 マッチした求人だけ",
      "💬 1つのダッシュボードで状況把握",
      "🚀 数週間で面接へ",
    ],
    sectionStats: "TWINの数字",
    metricSpots: "リスト定員",
    metricSigned: "登録数",
    metricRemaining: "残り枠",
    metricJobs: "DB内の求人",
    sectionBoost: "チャンスを上げる",
    boostPositionTitle: "🎯 あなたの順位",
    boostPositionHint: "友達を招待 — あなたのリンクからの登録ごとに順位が上がります（登録後のパネルで確認）。",
    boostRewards: "TOP 10 → $1000 ボーナス · TOP 100 → $500 · TOP 1000 → $200（beta）",
    leaderboardTitle: "🏆 トップ紹介者",
    leaderboardLine: "{referrals} 件の招待 → {reward}",
    sectionFaq: "よくある質問",
    faq: [
      {
        q: "本当に機能しますか？",
        a: "TWIN は応募の送信と返信の追跡を一箇所で行います。ウェイトリストは早期アクセス — このページの指標は製品のライブデータです。",
      },
      {
        q: "アクセスまでどのくらい？",
        a: "最初の1000人：登録から約14日。以降：4〜6週間で順次アクセス。",
      },
      {
        q: "料金は？",
        a: "最初の1000人はアーリーアダプター無料。以降：フリーミアム / 成功報酬 — 公開前に詳細を案内します。",
      },
      {
        q: "内定しなかったら？",
        a: "最初の1000人向け beta は無料 — 登録に金銭的リスクはありません。",
      },
      {
        q: "TWIN はどう応募をパーソナライズしますか？",
        a: "AI が求人とプロフィールを照合し、独自の資料を生成 — 応募ごとにユニークです。",
      },
      {
        q: "企業はAIだと分かりますか？",
        a: "TWIN は手作業を自動化 — あなたの同意とデータのもと、応募はあなたらしく見えます。",
      },
    ],
    testimonials: [
      { quote: "手動で6週間：面接ゼロ。TWINは2週間で3件。Revolutで内定。", who: "Michał K.、シニア Python エンジニア" },
      { quote: "同時に2つのオファー。寝ている間にTWINが応募。Stripeを選択。", who: "Kasia W.、フロントエンドエンジニア" },
    ],
    finalTitle: "ラストチャンス",
    finalJoin: "最初の{cap}人に参加",
    finalSpotsLine: "⏱️ 残り枠：{spots} · 🔥 本日の登録：{today}",
    finalMidnight: "⏰ 深夜まで：{countdown}",
    footerPrivacy: "プライバシー",
    footerTerms: "利用規約",
    footerBeta: "Beta（クラシック）",
    formJoinCap: "🎯 最初の{cap}人に参加",
    formEmailLabel: "メール（開発者向け）",
    formEmailPlaceholder: "you@example.com",
    formPrivacyPrefix: "以下に同意します：",
    formPrivacyLink: "プライバシーポリシー",
    formEmailConsent: "キューと beta に関するメールの受信に同意（必須）",
    formConsentsError: "参加するには両方にチェックしてください。",
    formSubmit: "永久無料アクセス ✨",
    formSubmitting: "保存中…",
    formSpotsLine: "残り：{remaining}/{cap}",
    formTodayLine: "⚡ 本日の登録：{today}",
    formBullet1: "✓ アーリーアダプターは永久無料",
    formBullet2: "✓ クレジットカード不要",
    formBullet3: "✓ 登録から約14日でアクセス",
    formSuccessTitle: "リストに登録されました！",
    formSuccessPosition: "順位：#{position}",
    formCopy: "コピー",
    formReferralHint: "友達を招待 — 1人ごとに順位が上がります。",
    formOpenDashboard: "ウェイトリストパネルを開く",
    formErrorGeneric: "問題が発生しました。もう一度お試しください。",
    validationEmail: "無効なメールアドレス",
    validationConsent: "同意が必要です",
  };
}

function arCopy(): WaitlistCopy {
  return {
    ...en,
    metaTitle: "TWIN Wishlist — انضم إلى أول 1000",
    metaDescription: "توأمك الرقمي يتولى البحث عن عمل. قائمة الانتظار — وصول مجاني مدى الحياة للمبكرين.",
    backHome: "← الرئيسية",
    heroHeadline: "توقف عن مطاردة الوظائف",
    heroLead1: "توأمك الرقمي يتولى القيادة.",
    heroLead2: "بدون سير ذاتية. بدون نماذج.",
    heroLead3: "فقط دعوات مقابلات في تقويمك.",
    sectionHow: "كيف يعمل عمليًا",
    terminalTitle: "طرفية وكيل TWIN",
    terminalSteps: [
      "> جاري تهيئة الوكيل…",
      "✓ الوكيل نشط",
      "> مسح وظائف LinkedIn…",
      "✓ وُجد 1,247 إعلانًا",
      "> مطابقة ملفك…",
      "✓ 23 دورًا يناسب معاييرك",
      "> تخصيص الطلبات…",
      "✓ 23 طلبًا فريدًا جاهزًا",
      "> إرسال الطلبات…",
      "✓ 23/23 أُرسلت",
      "> وصول الردود…",
      "✓ 5 دعوات مقابلة!",
      "> مزامنة التقويم…",
      "✓ 5 اجتماعات مجدولة",
    ],
    calendarTitle: "تقويمك",
    calendar: [
      { day: "الاثنين 24 مايو", time: "10:00 – 11:00", title: "📞 مقابلة تقنية — Revolut", link: "Google Meet" },
      { day: "الثلاثاء 25 مايو", time: "14:00 – 15:00", title: "💼 مقابلة أولى — Stripe", link: "Zoom" },
      { day: "الأربعاء 26 مايو", time: "09:00 – 10:00", title: "🎯 مكالمة تقنية — N26", link: "Teams" },
    ],
    sectionCompare: "نهاية كابوس البحث عن عمل",
    compareBadTitle: "❌ الطريقة القديمة",
    compareBad: [
      "⏰ أكثر من 4 ساعات يوميًا على البوابات",
      "📝 مئات الطلبات، ~5% ردود",
      "😫 تجاهل بلا ملاحظات",
      "💸 وكالات تأخذ نسبة من الراتب",
    ],
    compareGoodTitle: "✅ TWIN",
    compareGood: [
      "😴 الوكيل يعمل وأنت نائم",
      "🎯 أدوار متطابقة فقط",
      "💬 الحالة في لوحة واحدة",
      "🚀 مقابلات خلال أسابيع",
    ],
    sectionStats: "TWIN بالأرقام",
    metricSpots: "سعة القائمة",
    metricSigned: "المسجلون",
    metricRemaining: "أماكن متبقية",
    metricJobs: "وظائف في القاعدة",
    sectionBoost: "عزّز فرصك",
    boostPositionTitle: "🎯 موقعك في القائمة",
    boostPositionHint: "ادعُ أصدقاءك — كل تسجيل عبر رابطك يرفع ترتيبك (انظر اللوحة بعد الانضمام).",
    boostRewards: "أفضل 10 → مكافأة $1000 · أفضل 100 → $500 · أفضل 1000 → $200 (برنامج beta)",
    leaderboardTitle: "🏆 أفضل المُحيلين",
    leaderboardLine: "{referrals} دعوات → {reward}",
    sectionFaq: "الأسئلة الشائعة",
    faq: [
      {
        q: "هل يعمل فعلًا؟",
        a: "TWIN يرسل الطلبات ويتتبع الردود في مكان واحد. قائمة الانتظار وصول مبكر — المقاييس على هذه الصفحة من المنتج الحي.",
      },
      {
        q: "متى أحصل على الوصول؟",
        a: "أول 1000: نحو 14 يومًا بعد التسجيل. بعد ذلك: وصول تدريجي خلال 4–6 أسابيع.",
      },
      {
        q: "كم التكلفة؟",
        a: "أول 1000 مجانًا للمبكرين. لاحقًا: freemium / رسوم نجاح — التفاصيل قبل الإطلاق العام.",
      },
      {
        q: "ماذا إن لم أحصل على وظيفة؟",
        a: "النسخة التجريبية مجانية لأول ألف — لا مخاطر مالية عند التسجيل.",
      },
      {
        q: "كيف يخصص TWIN الطلبات؟",
        a: "الذكاء الاصطناعي يطابق الدور بملفك ويولّد مواد مخصصة — كل طلب فريد.",
      },
      {
        q: "هل تعرف الشركات أنه ذكاء اصطناعي؟",
        a: "TWIN يؤتمت العمل اليدوي — الطلب يبدو كأنك أرسلته، بموافقتك وبياناتك.",
      },
    ],
    testimonials: [
      { quote: "ستة أسابيع يدويًا: صفر مقابلات. TWIN وجد ثلاثًا في أسبوعين. وقّعت مع Revolut.", who: "Michał K.، مطوّر Python أول" },
      { quote: "عرضان في آن واحد. TWIN تقدّم وأنا نائم. اخترت Stripe.", who: "Kasia W.، مهندسة واجهات" },
    ],
    finalTitle: "الفرصة الأخيرة",
    finalJoin: "انضم إلى أول {cap}",
    finalSpotsLine: "⏱️ أماكن متبقية: {spots} · 🔥 اليوم: {today} تسجيل",
    finalMidnight: "⏰ حتى منتصف الليل: {countdown}",
    footerPrivacy: "الخصوصية",
    footerTerms: "الشروط",
    footerBeta: "Beta (كلاسيكي)",
    formJoinCap: "🎯 انضم إلى أول {cap}",
    formEmailLabel: "بريدك (مطوّر)",
    formEmailPlaceholder: "you@example.com",
    formPrivacyPrefix: "أوافق على",
    formPrivacyLink: "سياسة الخصوصية",
    formEmailConsent: "الموافقة على رسائل بريد عن الطابور والنسخة التجريبية (إلزامي)",
    formConsentsError: "حدّد الخانتين للانضمام.",
    formSubmit: "وصول مجاني للأبد ✨",
    formSubmitting: "جاري الحفظ…",
    formSpotsLine: "متبقي: {remaining}/{cap}",
    formTodayLine: "⚡ اليوم: {today} تسجيل",
    formBullet1: "✓ وصول مجاني مدى الحياة للمبكرين",
    formBullet2: "✓ بدون بطاقة ائتمان",
    formBullet3: "✓ وصول خلال نحو 14 يومًا من التسجيل",
    formSuccessTitle: "أنت على القائمة!",
    formSuccessPosition: "الترتيب: #{position}",
    formCopy: "نسخ",
    formReferralHint: "ادعُ أصدقاءك — كل شخص يرفع ترتيبك.",
    formOpenDashboard: "فتح لوحة الانتظار",
    formErrorGeneric: "حدث خطأ. حاول مرة أخرى.",
    validationEmail: "عنوان بريد غير صالح",
    validationConsent: "الموافقة مطلوبة",
  };
}

export const WAITLIST_MESSAGES: Record<Locale, WaitlistCopy> = {
  en,
  pl,
  es: esCopy(),
  fr: frCopy(),
  de: deCopy(),
  it: itCopy(),
  zh: zhCopy(),
  ja: jaCopy(),
  ar: arCopy(),
};

export function formatWaitlist(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    template,
  );
}
