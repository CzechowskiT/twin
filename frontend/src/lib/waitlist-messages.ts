import type { Locale } from "@/lib/i18n";
import type { WaitlistNarrative } from "@/lib/waitlist/waitlist-narrative";

/** Core landing strings (narrative blocks merged in `useWaitlistCopy`). */
export type WaitlistCopyBase = {
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
  finalTitle: string;
  finalLead: string;
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
  formShare: string;
  formReferralHint: string;
  formWelcomeMailDeferred: string;
  formWelcomeMailSent: string;
  formOpenDashboard: string;
  formErrorGeneric: string;
  validationEmail: string;
  validationConsent: string;
};

export type WaitlistCopy = WaitlistCopyBase & WaitlistNarrative;

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

const en: WaitlistCopyBase = {
  metaTitle: "TWIN Wishlist — founding career agent",
  metaDescription:
    "Join the first 1,000 founding members: ranked jobs up to 200, honest application statuses, ~30 source adapters today. Free wishlist signup — no card.",
  backHome: "← Home",
  heroHeadline: "YOUR CAREER AGENT — RANKED JOBS, HONEST STATUSES",
  heroLead1: "Wishlist → founding invite → register → CV → profile.",
  heroLead2: "Up to 200 ranked roles · top 20 first · feedback per job.",
  heroLead3: "A calendar of interviews worth showing up for — not inbox noise.",
  sectionHow: "How it works in practice",
  terminalTitle: "TWIN Agent Terminal",
  terminalSteps: TERMINAL_EN,
  calendarTitle: "Your calendar",
  calendar: [],
  sectionCompare: "End the job-search nightmare",
  compareBadTitle: "❌ The old way",
  compareBad: [],
  compareGoodTitle: "✅ TWIN",
  compareGood: [],
  sectionStats: "Wishlist live",
  metricSpots: "Founding cap",
  metricSigned: "On the list",
  metricRemaining: "Spots left",
  metricJobs: "Indexed roles (approx.)",
  sectionBoost: "Referrals",
  boostPositionTitle: "Your queue position",
  boostPositionHint:
    "After signup, share your link — each friend who joins moves you up. No cash prizes.",
  boostRewards: "Reward = earlier founding access, not dollar bonuses.",
  leaderboardTitle: "Top referrers",
  leaderboardLine: "{referrals} signups from your link",
  sectionFaq: "FAQ",
  faq: [
    {
      q: "Who is TWIN for?",
      a: "Mid/senior tech, product, data/AI, and tech sales in the EU (remote-friendly). You want a ranked pipeline and honest application tracking — not another job-board hamster wheel.",
    },
    {
      q: "What happens after I join the wishlist?",
      a: "You enter the founding queue (first 1,000 cap). When your slot opens, you get an invite to register, upload CV, and build your profile.",
    },
    {
      q: "How does ranking work?",
      a: "Roles get a final_score from fit to your profile and your feedback. You see the top 20 matches first, with up to 200 in the pipeline.",
    },
    {
      q: "What are honest application statuses?",
      a: "Prepared, manual, attempted, and confirmed (with evidence). Auto-apply only runs on supported paths — we never fake “submitted.”",
    },
    {
      q: "How many sources does TWIN use?",
      a: "About 30 active adapters today (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, employer pages, Greenhouse, and more). 50+ is the roadmap — we quote real numbers.",
    },
    {
      q: "What does founding cost?",
      a: "Wishlist signup is free and no card is required. Founding cohort gets free early access; paid plans may launch later with terms published first.",
    },
    {
      q: "How do referrals work?",
      a: "Share your link after signup. Invites move you up the queue — there are no $1,000 or similar cash promises on this page.",
    },
    {
      q: "When is auto-apply available?",
      a: "Only on supported employer/portal paths. Everything else stays manual or attempted with a visible reason in your dashboard.",
    },
  ],
  finalTitle: "Join the founding wishlist",
  finalLead: "First 1,000 · free signup · shape the agent before scale",
  finalJoin: "Join the first {cap}",
  finalSpotsLine: "Spots left: {spots} · Today: {today} signups",
  finalMidnight: "",
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
  formSubmit: "Join founding wishlist",
  formSubmitting: "Saving…",
  formSpotsLine: "Spots left: {remaining}/{cap}",
  formTodayLine: "Today: {today} signups",
  formBullet1: "✓ First 1,000 founding — no card today",
  formBullet2: "✓ Ranked pipeline up to 200 jobs",
  formBullet3: "✓ ~30 source adapters live · 50+ roadmap",
  formSuccessTitle: "You're on the list!",
  formSuccessPosition: "Position: #{position}",
  formCopy: "Copy",
  formShare: "Share link",
  formReferralHint: "Invite friends — each person moves you up the queue.",
  formWelcomeMailDeferred:
    "Welcome email may be delayed — the API mail provider is not configured yet. You are still on the list.",
  formWelcomeMailSent: "Check your inbox — we sent a welcome email with your dashboard link and referral code.",
  formOpenDashboard: "Open waitlist panel",
  formErrorGeneric: "Something went wrong. Try again.",
  validationEmail: "Invalid email address",
  validationConsent: "Consent required",
};

const pl: WaitlistCopyBase = {
  ...en,
  metaTitle: "TWIN Wishlist — agent kariery founding",
  metaDescription:
    "Pierwsze 1000 founding: ranking do 200 ofert, uczciwe statusy aplikacji, ~30 adapterów źródeł. Darmowy zapis — bez karty.",
  backHome: "← Strona główna",
  heroHeadline: "TWÓJ AGENT KARIERY — RANKING, UCZCIWE STATUSY",
  heroLead1: "Wishlist → zaproszenie founding → rejestracja → CV → profil.",
  heroLead2: "Do 200 rankingowych ról · top 20 na start · feedback per oferta.",
  heroLead3: "Kalendarz rozmów wartych czasu — nie szum w skrzynce.",
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
  sectionStats: "Wishlist na żywo",
  metricSpots: "Limit founding",
  metricSigned: "Na liście",
  metricRemaining: "Wolne miejsca",
  metricJobs: "Zindeksowane role (szac.)",
  sectionBoost: "Polecenia",
  boostPositionTitle: "Twoja pozycja w kolejce",
  boostPositionHint:
    "Po zapisie udostępnij link — każdy znajomy z linku podnosi Cię w kolejce. Bez nagród pieniężnych.",
  boostRewards: "Nagroda = wcześniejszy dostęp founding, nie bonusy w dolarach.",
  leaderboardTitle: "Top polecający",
  leaderboardLine: "{referrals} zapisów z Twojego linku",
  sectionFaq: "FAQ",
  faq: [
    {
      q: "Dla kogo jest TWIN?",
      a: "Mid/senior tech, product, data/AI i tech sales w EU (remote). Chcesz rankingowany pipeline i uczciwe statusy — nie kolejną bieżnię portali.",
    },
    {
      q: "Co po zapisie na wishlistę?",
      a: "Wchodzisz w kolejkę founding (limit 1000). Gdy przyjdzie slot — zaproszenie do rejestracji, CV i profilu.",
    },
    {
      q: "Jak działa ranking?",
      a: "Oferty dostają final_score z dopasowania do profilu i Twojego feedbacku. Najpierw top 20, w pipeline do 200.",
    },
    {
      q: "Co to uczciwe statusy aplikacji?",
      a: "Prepared, manual, attempted, confirmed (z dowodem). Auto-aplikacja tylko na wspieranych ścieżkach — bez fałszywego „wysłano”.",
    },
    {
      q: "Ile źródeł ofert?",
      a: "Dziś ~30 aktywnych adapterów (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, strony pracodawców, Greenhouse i więcej). 50+ w roadmapie.",
    },
    {
      q: "Ile kosztuje founding?",
      a: "Zapis na wishlistę jest darmowy, bez karty. Kohorta founding ma darmowy early access; płatne plany mogą przyjść później — warunki wcześniej.",
    },
    {
      q: "Jak działają polecenia?",
      a: "Link po zapisie. Zaproszenia podnoszą pozycję — bez obietnic 1000 $ i podobnych na tej stronie.",
    },
    {
      q: "Kiedy jest auto-aplikacja?",
      a: "Tylko na wspieranych ścieżkach pracodawcy/portalu. Reszta: manual lub attempted z widocznym powodem w panelu.",
    },
  ],
  finalTitle: "Dołącz do wishlisty founding",
  finalLead: "Pierwsze 1000 · darmowy zapis · kształtuj agenta przed skalą",
  finalJoin: "Dołącz do pierwszych {cap}",
  finalSpotsLine: "Wolne miejsca: {spots} · Dziś: {today} zapisów",
  finalMidnight: "",
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
  formSubmit: "Dołącz do wishlisty founding",
  formSubmitting: "Zapisuję…",
  formSpotsLine: "Wolne: {remaining}/{cap}",
  formTodayLine: "Dziś: {today} zapisów",
  formBullet1: "✓ Pierwsze 1000 founding — bez karty",
  formBullet2: "✓ Pipeline do 200 rankingowych ofert",
  formBullet3: "✓ ~30 adapterów live · 50+ w planie",
  formSuccessTitle: "Jesteś na liście!",
  formSuccessPosition: "Pozycja: #{position}",
  formCopy: "Kopiuj",
  formShare: "Udostępnij link",
  formReferralHint: "Zaproś znajomych — każda osoba = wyższa pozycja na liście.",
  formWelcomeMailDeferred:
    "Mail powitalny może przyjść później — dostawca maili na API nie jest jeszcze skonfigurowany. Jesteś na liście.",
  formWelcomeMailSent:
    "Sprawdź skrzynkę — wysłaliśmy mail powitalny z linkiem do panelu i kodem polecającym.",
  formOpenDashboard: "Otwórz panel waitlisty",
  formErrorGeneric: "Wystąpił błąd. Spróbuj ponownie.",
  validationEmail: "Nieprawidłowy adres email",
  validationConsent: "Wymagana zgoda",
};

/** Localized waitlist copy; non-EN/PL locales mirror EN founding tone (no cash/lifetime/guaranteed claims). */
function esCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — agente de carrera · lista fundadora",
    metaDescription:
      "Primeros 1.000 fundadores: ranking hasta 200 ofertas, estados honestos, ~30 adaptadores de fuentes. Alta gratuita — sin tarjeta.",
    backHome: "← Inicio",
    heroHeadline: "TU AGENTE DE CARRERA — RANKING, ESTADOS HONESTOS",
    heroLead1: "Lista fundadora → invitación → registro → CV → perfil.",
    heroLead2: "Hasta 200 roles rankeados · top 20 primero · feedback por oferta.",
    heroLead3: "Un calendario de entrevistas que merecen tu tiempo — no ruido en el inbox.",
    sectionStats: "Lista en vivo",
    metricSpots: "Cupo fundador",
    metricSigned: "En la lista",
    metricRemaining: "Plazas libres",
    metricJobs: "Roles indexados (aprox.)",
    sectionBoost: "Referidos",
    boostPositionTitle: "Tu posición en la cola",
    boostPositionHint:
      "Tras el alta, comparte tu enlace — cada amigo que se une te sube. Sin premios en efectivo.",
    boostRewards: "Recompensa = acceso anticipado antes, no bonos en dólares.",
    leaderboardTitle: "Top referidores",
    leaderboardLine: "{referrals} altas desde tu enlace",
    sectionFaq: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Para quién es TWIN?",
        a: "Tech mid/senior, producto, data/IA y ventas tech en la UE (remote-friendly). Quieres un pipeline rankeado y seguimiento honesto — no otra rueda de portales.",
      },
      {
        q: "¿Qué pasa tras unirme a la lista fundadora?",
        a: "Entras en la cola de fundadores (cupo 1.000). Cuando abra tu hueco, invitación a registrarte, subir CV y crear perfil.",
      },
      {
        q: "¿Cómo funciona el ranking?",
        a: "Cada rol tiene final_score por encaje y tu feedback. Ves primero el top 20, hasta 200 en el pipeline.",
      },
      {
        q: "¿Qué son estados honestos de aplicación?",
        a: "Preparada, manual, intentada y confirmada (con evidencia). Auto-apply solo en rutas soportadas — nunca marcamos «enviada» sin prueba.",
      },
      {
        q: "¿Cuántas fuentes usa TWIN?",
        a: "Unos 30 adaptadores activos hoy (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, páginas de empleador, Greenhouse y más). 50+ en roadmap — cifras reales.",
      },
      {
        q: "¿Cuánto cuesta ser fundador?",
        a: "La lista es gratis y sin tarjeta. La cohorte fundadora tiene acceso anticipado gratuito; planes de pago pueden llegar después con condiciones publicadas antes.",
      },
      {
        q: "¿Cómo funcionan los referidos?",
        a: "Comparte tu enlace tras el alta. Cada invitación mejora tu posición — sin promesas de 1.000 $ ni premios en efectivo en esta página.",
      },
      {
        q: "¿Cuándo hay auto-apply?",
        a: "Solo en rutas soportadas de empleador/portal. El resto queda manual o intentado con motivo visible en el panel.",
      },
    ],
    finalTitle: "Únete a la lista fundadora",
    finalLead: "Primeros 1.000 · alta gratis · moldea el agente antes de escalar",
    finalJoin: "Únete a los primeros {cap}",
    formJoinCap: "🎯 Únete a los primeros {cap}",
    formEmailLabel: "Tu email (desarrollador/a)",
    formSubmit: "Unirme a la lista fundadora",
    formBullet1: "✓ Primeros 1.000 fundadores — sin tarjeta hoy",
    formBullet2: "✓ Pipeline rankeado hasta 200 ofertas",
    formBullet3: "✓ ~30 adaptadores live · 50+ en roadmap",
    formSuccessTitle: "¡Estás en la lista!",
    formSuccessPosition: "Posición: #{position}",
    formReferralHint: "Invita amigos — cada persona sube tu posición en la cola.",
    formOpenDashboard: "Abrir panel waitlist",
    formErrorGeneric: "Algo falló. Inténtalo de nuevo.",
    validationEmail: "Email no válido",
    validationConsent: "Consentimiento obligatorio",
  };
}

function frCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — agent carrière · liste des fondateurs",
    metaDescription:
      "Premiers 1 000 fondateurs : ranking jusqu'à 200 offres, statuts honnêtes, ~30 adaptateurs sources. Inscription gratuite — sans carte.",
    backHome: "← Accueil",
    heroHeadline: "VOTRE AGENT CARRIÈRE — RANKING, STATUTS HONNÊTES",
    heroLead1: "Liste des fondateurs → invitation → inscription → CV → profil.",
    heroLead2: "Jusqu'à 200 rôles classés · top 20 d'abord · feedback par offre.",
    heroLead3: "Un calendrier d'entretiens qui valent le déplacement — pas le bruit de la boîte mail.",
    sectionStats: "Liste en direct",
    metricSpots: "Plafond fondateurs",
    metricSigned: "Sur la liste",
    metricRemaining: "Places restantes",
    metricJobs: "Rôles indexés (approx.)",
    sectionBoost: "Parrainage",
    boostPositionTitle: "Votre position dans la file",
    boostPositionHint:
      "Après inscription, partagez votre lien — chaque ami inscrit vous fait monter. Pas de prix en cash.",
    boostRewards: "Récompense = accès anticipé plus tôt, pas de bonus en dollars.",
    leaderboardTitle: "Top parrains",
    leaderboardLine: "{referrals} inscriptions via votre lien",
    sectionFaq: "FAQ",
    faq: [
      {
        q: "Pour qui est TWIN ?",
        a: "Tech mid/senior, produit, data/IA et ventes tech en UE (remote-friendly). Vous voulez un pipeline classé et un suivi honnête — pas une autre roue de job boards.",
      },
      {
        q: "Que se passe-t-il après la liste des fondateurs ?",
        a: "Vous entrez dans la file des fondateurs (plafond 1 000). À l'ouverture de votre créneau : invitation à vous inscrire, déposer CV et profil.",
      },
      {
        q: "Comment fonctionne le ranking ?",
        a: "Chaque rôle a un final_score selon l'adéquation et vos retours. Top 20 en premier, jusqu'à 200 dans le pipeline.",
      },
      {
        q: "Que sont les statuts honnêtes ?",
        a: "Préparé, manuel, tenté et confirmé (avec preuve). Auto-apply uniquement sur les chemins supportés — jamais de « soumis » fictif.",
      },
      {
        q: "Combien de sources TWIN utilise ?",
        a: "Environ 30 adaptateurs actifs aujourd'hui (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, pages employeur, Greenhouse, etc.). 50+ au roadmap — chiffres réels.",
      },
      {
        q: "Combien coûte la cohorte fondatrice ?",
        a: "Liste gratuite, sans carte. La cohorte fondatrice a un accès anticipé gratuit ; offres payantes possibles plus tard avec conditions publiées avant.",
      },
      {
        q: "Comment marchent les parrainages ?",
        a: "Partagez votre lien après inscription. Chaque invité améliore votre position — pas de promesses 1 000 $ ni de cash sur cette page.",
      },
      {
        q: "Quand l'auto-apply est disponible ?",
        a: "Uniquement sur les parcours employeur/portail supportés. Le reste reste manuel ou tenté avec raison visible dans le tableau de bord.",
      },
    ],
    finalTitle: "Rejoindre la liste des fondateurs",
    finalLead: "Premiers 1 000 · inscription gratuite · façonnez l'agent avant l'échelle",
    formSubmit: "Rejoindre la liste des fondateurs",
    formBullet1: "✓ Premiers 1 000 fondateurs — sans carte aujourd'hui",
    formBullet2: "✓ Pipeline classé jusqu'à 200 offres",
    formBullet3: "✓ ~30 adaptateurs live · 50+ au roadmap",
    formSuccessTitle: "Vous êtes sur la liste !",
    validationEmail: "Adresse e-mail invalide",
    validationConsent: "Consentement requis",
  };
}

function deCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — Gründer-Karriereagent",
    metaDescription:
      "Erste 1.000 Gründer: Ranking bis 200 Jobs, ehrliche Bewerbungsstatus, ~30 Quell-Adapter. Kostenlose Gründerliste — keine Karte.",
    backHome: "← Startseite",
    heroHeadline: "DEIN KARRIEREAGENT — RANKING, EHRLICHE STATUS",
    heroLead1: "Gründerliste → Einladung → Registrierung → CV → Profil.",
    heroLead2: "Bis 200 gerankte Rollen · Top 20 zuerst · Feedback pro Job.",
    heroLead3: "Ein Kalender mit Interviews, die sich lohnen — kein Postfach-Rauschen.",
    sectionStats: "Gründerliste live",
    metricSpots: "Gründer-Limit",
    metricSigned: "Auf der Liste",
    metricRemaining: "Plätze frei",
    metricJobs: "Indexierte Rollen (ca.)",
    sectionBoost: "Empfehlungen",
    boostPositionTitle: "Deine Queue-Position",
    boostPositionHint:
      "Nach der Anmeldung Link teilen — jeder Freund verbessert deine Position. Keine Bargeldpreise.",
    boostRewards: "Belohnung = früherer Gründer-Zugang, keine Dollar-Boni.",
    leaderboardTitle: "Top-Empfehlende",
    leaderboardLine: "{referrals} Anmeldungen über deinen Link",
    sectionFaq: "FAQ",
    faq: [
      {
        q: "Für wen ist TWIN?",
        a: "Mid/Senior Tech, Produkt, Data/AI und Tech-Vertrieb in der EU (remote-freundlich). Du willst ein geranktes Pipeline und ehrliches Tracking — keine weitere Jobbörsen-Hamsterrad.",
      },
      {
        q: "Was passiert nach der Gründerliste?",
        a: "Du bist in der Gründer-Queue (Limit 1.000). Bei freiem Slot: Einladung zu Registrierung, CV-Upload und Profil.",
      },
      {
        q: "Wie funktioniert das Ranking?",
        a: "Rollen erhalten final_score aus Passung und Feedback. Top 20 zuerst, bis 200 in der Pipeline.",
      },
      {
        q: "Was sind ehrliche Bewerbungsstatus?",
        a: "Vorbereitet, manuell, versucht und bestätigt (mit Nachweis). Auto-Apply nur auf unterstützten Wegen — nie fingiertes „eingereicht“.",
      },
      {
        q: "Wie viele Quellen nutzt TWIN?",
        a: "Etwa 30 aktive Adapter heute (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, Arbeitgeberseiten, Greenhouse u. a.). 50+ im Roadmap — echte Zahlen.",
      },
      {
        q: "Was kostet die Gründerkohorte?",
        a: "Die Gründerliste ist kostenlos ohne Karte. Die Gründerkohorte erhält kostenlosen Frühzugang; bezahlte Pläne ggf. später — Bedingungen zuerst veröffentlicht.",
      },
      {
        q: "Wie funktionieren Empfehlungen?",
        a: "Link nach Anmeldung teilen. Jede Einladung verbessert die Position — keine 1.000-$-Versprechen auf dieser Seite.",
      },
      {
        q: "Wann gibt es Auto-Apply?",
        a: "Nur auf unterstützten Arbeitgeber-/Portalpfaden. Sonst manuell oder versucht mit sichtbarem Grund im Dashboard.",
      },
    ],
    finalTitle: "Zur Gründerliste anmelden",
    finalLead: "Erste 1.000 · kostenlose Anmeldung · Agent vor Skalierung mitgestalten",
    formSubmit: "Zur Gründerliste anmelden",
    formBullet1: "✓ Erste 1.000 Gründer — heute keine Karte",
    formBullet2: "✓ Gerankte Pipeline bis 200 Jobs",
    formBullet3: "✓ ~30 Adapter live · 50+ im Roadmap",
    formSuccessTitle: "Du stehst auf der Liste!",
    validationEmail: "Ungültige E-Mail-Adresse",
    validationConsent: "Zustimmung erforderlich",
  };
}

function itCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — agente carriera · lista dei fondatori",
    metaDescription:
      "Primi 1.000 fondatori: ranking fino a 200 offerte, stati candidatura onesti, ~30 adapter sorgenti. Iscrizione gratuita — nessuna carta.",
    backHome: "← Home",
    heroHeadline: "IL TUO AGENTE CARRIERA — RANKING, STATI ONESTI",
    heroLead1: "Lista dei fondatori → invito → registrazione → CV → profilo.",
    heroLead2: "Fino a 200 ruoli in ranking · top 20 per primi · feedback per offerta.",
    heroLead3: "Un calendario di colloqui che valgono il tempo — non rumore in inbox.",
    sectionStats: "Lista live",
    metricSpots: "Cap fondatori",
    metricSigned: "In lista",
    metricRemaining: "Posti liberi",
    metricJobs: "Ruoli indicizzati (circa)",
    sectionBoost: "Referral",
    boostPositionTitle: "La tua posizione in coda",
    boostPositionHint:
      "Dopo l'iscrizione, condividi il link — ogni amico che entra ti fa salire. Nessun premio in contanti.",
    boostRewards: "Ricompensa = accesso anticipato prima, non bonus in dollari.",
    leaderboardTitle: "Top referrer",
    leaderboardLine: "{referrals} iscrizioni dal tuo link",
    sectionFaq: "FAQ",
    faq: [
      {
        q: "Per chi è TWIN?",
        a: "Tech mid/senior, prodotto, data/AI e vendite tech in UE (remote-friendly). Vuoi pipeline classificata e tracking onesto — non un'altra ruota di job board.",
      },
      {
        q: "Cosa succede dopo la lista dei fondatori?",
        a: "Entri nella coda dei fondatori (cap 1.000). All'apertura dello slot: invito a registrarti, caricare CV e profilo.",
      },
      {
        q: "Come funziona il ranking?",
        a: "Ogni ruolo ha final_score da fit e feedback. Top 20 prima, fino a 200 in pipeline.",
      },
      {
        q: "Cosa sono stati candidatura onesti?",
        a: "Preparata, manuale, tentata e confermata (con prova). Auto-apply solo su percorsi supportati — mai «inviata» fittizia.",
      },
      {
        q: "Quante fonti usa TWIN?",
        a: "Circa 30 adapter attivi oggi (pracuj.pl, rocketjobs.pl, LinkedIn, justjoin.it, pagine employer, Greenhouse, ecc.). 50+ in roadmap — numeri reali.",
      },
      {
        q: "Quanto costa la cohorte fondatrice?",
        a: "Lista gratuita, senza carta. Cohort fondatrice con accesso anticipato gratuito; piani a pagamento possibili dopo — condizioni prima del billing.",
      },
      {
        q: "Come funzionano i referral?",
        a: "Condividi il link dopo l'iscrizione. Ogni invito migliora la posizione — niente promesse da 1.000 $ su questa pagina.",
      },
      {
        q: "Quando c'è auto-apply?",
        a: "Solo su percorsi employer/portale supportati. Il resto resta manuale o tentato con motivo visibile in dashboard.",
      },
    ],
    finalTitle: "Unisciti alla lista dei fondatori",
    finalLead: "Primi 1.000 · iscrizione gratuita · modella l'agente prima della scala",
    formSubmit: "Unisciti alla lista dei fondatori",
    formBullet1: "✓ Primi 1.000 fondatori — nessuna carta oggi",
    formBullet2: "✓ Pipeline classificata fino a 200 offerte",
    formBullet3: "✓ ~30 adapter live · 50+ in roadmap",
    formSuccessTitle: "Sei in lista!",
    validationEmail: "Email non valida",
    validationConsent: "Consenso obbligatorio",
  };
}

function zhCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — 职业代理 · 创始候补名单",
    metaDescription:
      "前 1000 名创始成员：最多 200 个排序职位、诚实申请状态、约 30 个来源适配器。免费候补 — 无需信用卡。",
    backHome: "← 首页",
    heroHeadline: "你的职业代理 — 排序职位，诚实状态",
    heroLead1: "创始候补 → 邀请 → 注册 → 简历 → 档案。",
    heroLead2: "最多 200 个排序角色 · 先看前 20 · 每个职位可反馈。",
    heroLead3: "值得赴约的面试日历 — 不是收件箱噪音。",
    sectionStats: "候补实时",
    metricSpots: "创始名额",
    metricSigned: "已登记",
    metricRemaining: "剩余名额",
    metricJobs: "已索引职位（约）",
    sectionBoost: "推荐",
    boostPositionTitle: "你的排队位置",
    boostPositionHint: "注册后分享链接 — 每位通过你链接加入的朋友都会让你靠前。无现金奖励。",
    boostRewards: "奖励 = 更早的创始访问，不是美元奖金。",
    leaderboardTitle: "推荐排行",
    leaderboardLine: "通过你的链接 {referrals} 次注册",
    sectionFaq: "常见问题",
    faq: [
      {
        q: "TWIN 适合谁？",
        a: "欧盟 mid/senior 技术、产品、数据/AI 及技术销售（支持远程）。你需要排序管道和诚实的申请跟踪 — 而不是又一个招聘网站轮子。",
      },
      {
        q: "加入候补后会发生什么？",
        a: "进入创始队列（上限 1000）。轮到你的名额时，收到注册、上传简历和建立档案的邀请。",
      },
      {
        q: "排序如何工作？",
        a: "职位根据匹配度和你的反馈得到 final_score。先看前 20，管道最多 200。",
      },
      {
        q: "什么是诚实的申请状态？",
        a: "已准备、手动、已尝试和已确认（有证据）。自动投递仅在支持的路径 — 从不伪造「已提交」。",
      },
      {
        q: "TWIN 使用多少来源？",
        a: "目前约 30 个活跃适配器（pracuj.pl、rocketjobs.pl、LinkedIn、justjoin.it、雇主页、Greenhouse 等）。路线图 50+ — 真实数字。",
      },
      {
        q: "创始成员费用多少？",
        a: "候补免费且无需信用卡。创始队列有免费提前访问；付费计划可能稍后推出 — 计费前先公布条款。",
      },
      {
        q: "推荐如何运作？",
        a: "注册后分享链接。每次邀请提升排位 — 本页无 1000 美元等现金承诺。",
      },
      {
        q: "何时有自动投递？",
        a: "仅在支持的雇主/门户路径。其余保持手动或已尝试，并在面板显示原因。",
      },
    ],
    finalTitle: "加入创始候补名单",
    finalLead: "前 1000 名 · 免费报名 · 在规模化前塑造代理",
    formSubmit: "加入创始候补名单",
    formBullet1: "✓ 前 1000 创始成员 — 今天无需信用卡",
    formBullet2: "✓ 最多 200 个排序职位管道",
    formBullet3: "✓ 约 30 个适配器上线 · 路线图 50+",
    formSuccessTitle: "你已在名单中！",
    formReferralHint: "邀请好友 — 每多一人你的排位都会上升。",
    formOpenDashboard: "打开候补面板",
    validationEmail: "邮箱格式无效",
    validationConsent: "需要同意",
  };
}

function jaCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — キャリアエージェント · 創設者リスト",
    metaDescription:
      "最初の1,000名の創設メンバー：最大200件のランキング求人、正直な応募ステータス、約30のソースアダプター。無料登録 — カード不要。",
    backHome: "← ホーム",
    heroHeadline: "あなたのキャリアエージェント — ランキング求人、正直なステータス",
    heroLead1: "創設者リスト → 招待 → 登録 → CV → プロフィール。",
    heroLead2: "最大200ロールをランキング · まずトップ20 · 求人ごとにフィードバック。",
    heroLead3: "赴く価値のある面接カレンダー — 受信トレイのノイズではない。",
    sectionStats: "リスト（ライブ）",
    metricSpots: "創設定員",
    metricSigned: "リスト登録",
    metricRemaining: "残り枠",
    metricJobs: "インデックス済みロール（概算）",
    sectionBoost: "紹介",
    boostPositionTitle: "キューでの順位",
    boostPositionHint:
      "登録後にリンクを共有 — リンク経由の登録ごとに順位が上がります。現金報酬はありません。",
    boostRewards: "報酬 = より早い創設アクセス。ドルボーナスではありません。",
    leaderboardTitle: "トップ紹介者",
    leaderboardLine: "あなたのリンクから {referrals} 件登録",
    sectionFaq: "よくある質問",
    faq: [
      {
        q: "TWIN は誰向け？",
        a: "EU の mid/senior テック・プロダクト・データ/AI・テック営業（リモート可）。ランキングパイプラインと正直な応募追跡が欲しい人向け — また別の求人サイトのハムスター輪ではありません。",
      },
      {
        q: "創設者リスト登録後は？",
        a: "創設キュー（上限1,000）に入ります。枠が開いたら、登録・CV・プロフィールの招待が届きます。",
      },
      {
        q: "ランキングの仕組みは？",
        a: "求人は適合度とフィードバックで final_score。まずトップ20、パイプラインは最大200。",
      },
      {
        q: "正直な応募ステータスとは？",
        a: "Prepared、manual、attempted、confirmed（証拠付き）。自動応募はサポート経路のみ — 偽の「送信済み」はしません。",
      },
      {
        q: "TWIN のソース数は？",
        a: "現在約30のアクティブアダプター（pracuj.pl、rocketjobs.pl、LinkedIn、justjoin.it、雇用主ページ、Greenhouse など）。ロードマップ50+ — 実数です。",
      },
      {
        q: "創設メンバーの費用は？",
        a: "リスト登録は無料でカード不要。創設コホートは無料の早期アクセス。有料プランは後日の可能性 — 課金前に条件を公開。",
      },
      {
        q: "紹介の仕組みは？",
        a: "登録後にリンクを共有。招待ごとに順位アップ — 本ページに1,000ドル等の現金約束はありません。",
      },
      {
        q: "自動応募はいつ？",
        a: "サポートされた雇用主/ポータル経路のみ。それ以外は manual または attempted で理由をダッシュボードに表示。",
      },
    ],
    finalTitle: "創設者リストに参加",
    finalLead: "最初の1,000 · 無料登録 · スケール前にエージェントを形作る",
    formSubmit: "創設者リストに参加",
    formBullet1: "✓ 最初の1,000 創設メンバー — 今日はカード不要",
    formBullet2: "✓ 最大200件のランキングパイプライン",
    formBullet3: "✓ 約30アダプター稼働 · ロードマップ50+",
    formSuccessTitle: "リストに登録されました！",
    formReferralHint: "友達を招待 — 1人ごとに順位が上がります。",
    formOpenDashboard: "ウェイトリストパネルを開く",
    validationEmail: "無効なメールアドレス",
    validationConsent: "同意が必要です",
  };
}

function arCopy(): WaitlistCopyBase {
  return {
    ...en,
    metaTitle: "TWIN — وكيل مهنة · قائمة المؤسسين",
    metaDescription:
      "أول 1,000 مؤسس: ترتيب حتى 200 وظيفة، حالات طلب صادقة، ~30 محول مصدر. قائمة مجانية — بدون بطاقة.",
    backHome: "← الرئيسية",
    heroHeadline: "وكيلك المهني — وظائف مرتبة، حالات صادقة",
    heroLead1: "قائمة المؤسسين → دعوة → تسجيل → سيرة → ملف.",
    heroLead2: "حتى 200 دور مرتب · أفضل 20 أولاً · ملاحظات لكل وظيفة.",
    heroLead3: "تقويم مقابلات تستحق الحضور — لا ضجيج في البريد.",
    sectionStats: "قائمة الانتظار مباشرة",
    metricSpots: "سقف المؤسسين",
    metricSigned: "على القائمة",
    metricRemaining: "أماكن متبقية",
    metricJobs: "أدوار مفهرسة (تقريباً)",
    sectionBoost: "إحالات",
    boostPositionTitle: "موقعك في الطابور",
    boostPositionHint:
      "بعد التسجيل شارك رابطك — كل صديق ينضم عبره يرفع ترتيبك. لا جوائز نقدية.",
    boostRewards: "المكافأة = وصول مبكر أبكر، وليس مكافآت بالدولار.",
    leaderboardTitle: "أفضل المُحيلين",
    leaderboardLine: "{referrals} تسجيل عبر رابطك",
    sectionFaq: "الأسئلة الشائعة",
    faq: [
      {
        q: "لمن TWIN؟",
        a: "تقنية mid/senior ومنتج وبيانات/ذكاء اصطناعي ومبيعات تقنية في الاتحاد الأوروبي (يدعم العمل عن بُعد). تريد مساراً مرتباً وتتبعاً صادقاً — وليس عجلة بوابات أخرى.",
      },
      {
        q: "ماذا بعد الانضمام للقائمة؟",
        a: "تدخل طابور المؤسسين (حد 1,000). عند فتح مكانك: دعوة للتسجيل ورفع السيرة والملف.",
      },
      {
        q: "كيف يعمل الترتيب؟",
        a: "الوظائف تحصل على final_score من الملاءمة وملاحظاتك. ترى أفضل 20 أولاً، حتى 200 في المسار.",
      },
      {
        q: "ما حالات الطلب الصادقة؟",
        a: "مُعدّ، يدوي، مُحاول ومؤكد (بدليل). التقديم التلقائي فقط على المسارات المدعومة — لا «مُرسل» وهمي.",
      },
      {
        q: "كم مصدراً يستخدم TWIN؟",
        a: "حوالي 30 محولاً نشطاً اليوم (pracuj.pl وrocketjobs.pl وLinkedIn وjustjoin.it وصفحات الشركات وGreenhouse وغيرها). 50+ في الخارطة — أرقام حقيقية.",
      },
      {
        q: "كم تكلفة مجموعة المؤسسين؟",
        a: "القائمة مجانية بدون بطاقة. مجموعة المؤسسين تحصل على وصول مبكر مجاني؛ خطط مدفوعة قد تأتي لاحقاً — شروط قبل الفوترة.",
      },
      {
        q: "كيف تعمل الإحالات؟",
        a: "شارك رابطك بعد التسجيل. كل دعوة ترفع ترتيبك — لا وعود بـ 1,000 $ أو جوائز نقدية على هذه الصفحة.",
      },
      {
        q: "متى التقديم التلقائي؟",
        a: "فقط على مسارات الشركة/البوابة المدعومة. الباقي يدوي أو مُحاول مع سبب ظاهر في اللوحة.",
      },
    ],
    finalTitle: "انضم إلى قائمة المؤسسين",
    finalLead: "أول 1,000 · تسجيل مجاني · شكّل الوكيل قبل التوسع",
    formSubmit: "انضم إلى قائمة المؤسسين",
    formBullet1: "✓ أول 1,000 مؤسس — بدون بطاقة اليوم",
    formBullet2: "✓ مسار مرتب حتى 200 وظيفة",
    formBullet3: "✓ ~30 محولاً نشطاً · 50+ في الخارطة",
    formSuccessTitle: "أنت على القائمة!",
    formReferralHint: "ادعُ أصدقاءك — كل شخص يرفع ترتيبك.",
    formOpenDashboard: "فتح لوحة الانتظار",
    validationEmail: "عنوان بريد غير صالح",
    validationConsent: "الموافقة مطلوبة",
  };
}

export const WAITLIST_MESSAGES: Record<Locale, WaitlistCopyBase> = {
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
