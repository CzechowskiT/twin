import type { WaitlistNarrative } from "./waitlist-narrative";

/** Spanish waitlist narrative — no English fallback on rendered /waitlist. */
export const esWaitlistNarrative: WaitlistNarrative = {
  heroEyebrow: "Wishlist founding · primeros 1.000",
  heroOfferBadge: "Cohorte founding — acceso anticipado gratis, fair-use al lanzamiento",
  heroOfferSub:
    "Ruta: wishlist → invitación founding → registro → CV → perfil → hasta 200 roles rankeados. Un agente, un panel, entrevistas que merecen tu tiempo.",
  valueStrip: [
    "Primeros 1.000 founding — sin tarjeta hoy",
    "Pipeline rankeado hasta 200 ofertas · top 20 destacado",
    "~30 adaptadores de fuentes live · 50+ en roadmap",
  ],
  statsLiveLabel: "Datos de wishlist en vivo",
  statsLoadingLabel: "Conectando estadísticas en vivo…",
  statsOfflineHint: "No se pudieron cargar estadísticas — los números pueden ir retrasados. El alta sigue funcionando.",
  counterEyebrow: "Cohorte founding · escasez en vivo",
  counterRemainingLabel: "plazas libres",
  counterOfCap: "de {cap} plazas founding",
  counterOnList: "{signed} en la wishlist",
  counterProgressAria: "Progreso de llenado de wishlist",
  sectionSources: "Fuentes que agregamos hoy",
  sourcesLead:
    "TWIN extrae de portales y páginas de empleador — no una lotería de un solo portal. Mercado PL prioritario; roles EU remote según tu barra.",
  sourceChips: [
    "pracuj.pl",
    "rocketjobs.pl",
    "LinkedIn Jobs",
    "justjoin.it",
    "Páginas de carrera",
    "Greenhouse",
    "…y más adaptadores",
  ],
  sectionProblem: "Los portales no se hicieron para ti",
  problemLead:
    "Abres cinco pestañas, subes el mismo CV otra vez y te ahogas en anuncios que no encajan. Los reclutadores se ahogan en CVs crudos. Todos pierden tiempo.",
  problemPoints: [
    "Cientos de clics para un puñado de encajes reales",
    "Sin vista honesta de preparado vs enviado de verdad",
    "Ruido en inbox en lugar de un calendario corto de entrevistas que valen la pena",
  ],
  sectionTop200: "Hasta 200 oportunidades rankeadas — no 200 envíos aleatorios",
  top200Lead:
    "Con perfil listo, TWIN rankea roles con final_score. Ves el top 20 primero; el resto en pipeline hasta 200 — con feedback por oferta.",
  top200Bullets: [
    "Top 20 primero — ordenados por final_score",
    "Lista completa hasta 200 — acepta, omite o da feedback para el siguiente lote",
    "Estrella del norte: menos y mejores momentos en tu calendario — no spam de aplicaciones",
  ],
  sectionWhatTwin: "Qué hace TWIN",
  whatTwinLead:
    "Agente de carrera autónomo: scrape → match → apply (donde se soporte) → track → schedule — tú te centras en entrevistas.",
  whatTwinItems: [
    {
      icon: "🧠",
      title: "CV → perfil",
      body: "Sube CV, perfil estructurado, suelo salarial y barra de rol — matching con consentimiento.",
    },
    {
      icon: "📊",
      title: "Pipeline rankeado",
      body: "Hasta 200 jobs puntuados; top 20 destacado para decidir qué merece acción.",
    },
    {
      icon: "📅",
      title: "Calendario primero",
      body: "Holds y slots confirmados sincronizados donde esté configurado (Google Calendar hoy; ICS + más en roadmap).",
    },
  ],
  sectionRanking: "Cómo rankea TWIN",
  rankingLead: "Scoring transparente — no una caja negra de «trabajo perfecto con IA».",
  rankingBullets: [
    "final_score combina encaje de skills, nivel, ubicación/remote y tu feedback",
    "Cada tarjeta admite feedback para que el siguiente lote respete lo que omitiste",
    "El ranking se recalcula al refrescar fuentes — ~30 adaptadores activos hoy",
  ],
  sectionControl: "Tú mantienes el control",
  controlLead:
    "Auto-apply solo en rutas soportadas. Cada estado es honesto — nunca marcamos «enviada» sin evidencia.",
  statusChips: [
    { label: "Prepared", body: "Materiales listos — tú o el agente revisáis antes de enviar." },
    { label: "Manual", body: "Portal requiere tu clic; TWIN preparó el paquete." },
    { label: "Attempted", body: "Automatización intentó; resultado registrado con motivo." },
    { label: "Confirmed", body: "Envío respaldado por evidencia (confirmación, ATS o traza)." },
  ],
  sectionCoverage: "Cobertura de mercado",
  coverageLead: "Añadimos fuentes iterativamente — cifras honestas, no «50 portales live».",
  coverageActive: "~30 adaptadores de fuentes activos en producción hoy",
  coverageRoadmap: "50+ adaptadores en roadmap — tableros PL y stacks EU primero",
  plPriorityLabel: "Fuentes prioritarias PL",
  plPriorityChips: ["pracuj.pl", "rocketjobs.pl", "LinkedIn", "justjoin.it", "páginas empleador", "Greenhouse"],
  sectionFounding: "Miembros founding",
  foundingHeadline: "Primeros 1.000 — acceso founding gratis, fair-use al go-live",
  foundingSub:
    "Planes de pago pueden llegar tras el lanzamiento público. Miembros wishlist founding entran sin tarjeta — un perfil activo y fair-use antes de billing.",
  foundingPerks: [
    "Cohorte founding: cola prioritaria y superficies tempranas antes de GA",
    "Runway completo del agente en piloto — matching, tracking, calendario donde esté configurado",
    "Insignia founding + moldea el producto antes de que lleguen clones",
    "Sin pago para unirte a esta wishlist — condiciones antes de tiers de pago",
  ],
  foundingFinePrint:
    "Oferta para los primeros 1.000 registros verificados. Actividad de cuenta y fair-use al lanzamiento; condiciones completas antes de billing. No promesa de Pro de pago de por vida a 0 € salvo en condiciones.",
  sectionHow8: "Cómo funciona — 8 pasos",
  how8Lead: "Wishlist hoy → entrevistas en tu calendario cuando tu perfil esté live.",
  how8Steps: [
    { n: "1", title: "Únete a la wishlist", body: "Email + consentimiento — entras en la cola founding." },
    { n: "2", title: "Invitación founding", body: "Cuando abra tu slot, mail con siguientes pasos." },
    { n: "3", title: "Registro", body: "Crea cuenta TWIN (consentimiento RGPD en registro)." },
    { n: "4", title: "Sube CV", body: "Parseamos y validamos campos para matching." },
    { n: "5", title: "Define tu barra", body: "Rol, nivel, suelo salarial, ubicaciones — tus reglas." },
    { n: "6", title: "Ve jobs rankeados", body: "Top 20 + hasta 200 con final_score y feedback." },
    { n: "7", title: "Aplica con honestidad", body: "Auto-apply en rutas soportadas; manual donde el portal lo exija." },
    { n: "8", title: "Calendario de entrevistas", body: "Acepta, rechaza o reprograma — export/sync donde haya." },
  ],
  sectionWhyFounding: "Por qué importan los founding",
  whyFoundingLead:
    "Construimos calendarios listos para aceptar — no otra máquina de ruido. Los primeros miembros marcan la barra antes de escalar.",
  whyFoundingPoints: [
    "Tu feedback entrena ranking y prioridad de fuentes (especialmente PL).",
    "Ayudas a mantener estados honestos mientras crece auto-apply.",
    "La cohorte founding demuestra el bucle antes del marketing de pago masivo.",
  ],
  sectionExample: "Escenario de ejemplo",
  exampleDisclaimer: "Solo ilustración — no testimonio ni resultado garantizado.",
  exampleTitle: "Senior backend · EU remote",
  exampleParagraphs: [
    "Alex se une a la wishlist, sube CV tras invitación y fija suelo salarial. TWIN muestra 18 roles en banda top 20 y 140 más en pipeline.",
    "Tres roles: prepared → manual (portal empresa). Dos rutas soportadas: confirmed con evidencia. Una entrevista en Google Calendar; otras dos como ICS.",
    "Alex omite ruido con feedback — el lote siguiente evita roles similares. Sin filas falsas de «enviada».",
  ],
  sectionReferral: "Sube en la cola — sin premios en efectivo",
  referralLead: "Comparte tu enlace tras el alta. Cada amigo que se une mejora tu posición — esa es la recompensa.",
  referralBullets: [
    "Código de referido en tu panel wishlist tras el alta",
    "Leaderboard muestra invitaciones — no bonos en dólares",
    "Sin promesas de 1.000 $ / 500 $ — solo acceso founding más temprano",
  ],
  faqExtra: [
    {
      q: "¿Cuántas fuentes de empleo usa TWIN?",
      a: "Unos 30 adaptadores activos hoy, 50+ planificados. Cifras reales — no ficción de «50 portales live».",
    },
    {
      q: "¿El auto-apply spameará empresas?",
      a: "Solo en rutas soportadas, con estados honestos. Portales no soportados: manual o attempted con motivo visible — nunca «enviada» falsa.",
    },
    {
      q: "¿Qué pagan los miembros founding?",
      a: "Unirse a esta wishlist no cuesta hoy. Cohorte founding tiene early access gratis; planes de pago opcionales después con condiciones publicadas antes.",
    },
    {
      q: "¿Está garantizado «Pro de por vida a 0 €»?",
      a: "No prometemos tiers de pago de por vida a cero salvo en condiciones firmadas. Aquí: early access gratis y fair-use founding — ver letra pequeña.",
    },
  ],
};

/** German waitlist narrative. */
export const deWaitlistNarrative: WaitlistNarrative = {
  heroEyebrow: "Founding-Wishlist · erste 1.000",
  heroOfferBadge: "Founding-Kohorte — kostenloser Early Access, Fair-Use beim Launch",
  heroOfferSub:
    "Weg: Wishlist → Founding-Einladung → Registrierung → CV → Profil → bis zu 200 gerankte Rollen. Ein Agent, ein Dashboard, Interviews, die sich lohnen.",
  valueStrip: [
    "Erste 1.000 Founding — heute keine Karte",
    "Gerankte Pipeline bis 200 Jobs · Top 20 hervorgehoben",
    "~30 Live-Quell-Adapter · 50+ im Roadmap",
  ],
  statsLiveLabel: "Live-Wishlist-Daten",
  statsLoadingLabel: "Verbinde Live-Statistiken…",
  statsOfflineHint: "Live-Statistiken nicht erreichbar — Zahlen können verzögert sein. Anmeldung funktioniert weiter.",
  counterEyebrow: "Founding-Kohorte · Live-Knappheit",
  counterRemainingLabel: "Plätze frei",
  counterOfCap: "von {cap} Founding-Plätzen",
  counterOnList: "{signed} auf der Wishlist",
  counterProgressAria: "Wishlist-Füllfortschritt",
  sectionSources: "Quellen, die wir heute aggregieren",
  sourcesLead:
    "TWIN zieht von Jobbörsen und Arbeitgeberseiten — kein Einzelportal-Lotto. PL-Markt Priorität; EU-Remote-Rollen nach deiner Bar.",
  sourceChips: [
    "pracuj.pl",
    "rocketjobs.pl",
    "LinkedIn Jobs",
    "justjoin.it",
    "Karriereseiten",
    "Greenhouse",
    "…und weitere Adapter",
  ],
  sectionProblem: "Jobbörsen wurden nicht für dich gebaut",
  problemLead:
    "Du öffnest fünf Tabs, lädst dasselbe CV erneut hoch und ertrinkst in Inseraten unter deiner Bar. Recruiter ertrinken in rohen CVs. Alle verlieren Zeit.",
  problemPoints: [
    "Hunderte Klicks für eine Handvoll echter Fits",
    "Kein ehrlicher Blick auf vorbereitet vs. wirklich eingereicht",
    "Postfach-Rauschen statt kurzem Kalender lohnenswerter Interviews",
  ],
  sectionTop200: "Bis zu 200 gerankte Chancen — nicht 200 zufällige Sends",
  top200Lead:
    "Mit fertigem Profil rankt TWIN Rollen mit final_score. Top 20 zuerst; Rest in Pipeline bis 200 — mit Feedback pro Job.",
  top200Bullets: [
    "Top 20 zuerst — sortiert nach final_score",
    "Volle Liste bis 200 — annehmen, überspringen oder Feedback für nächsten Batch",
    "North Star: weniger, bessere Momente im Kalender — kein Bewerbungs-Spam",
  ],
  sectionWhatTwin: "Was TWIN tut",
  whatTwinLead:
    "Autonomer Karriereagent: Scrape → Match → Apply (wo unterstützt) → Track → Schedule — du fokussierst Interviews.",
  whatTwinItems: [
    {
      icon: "🧠",
      title: "CV → Profil",
      body: "CV hochladen, strukturiertes Profil, Gehaltsuntergrenze und Rollen-Bar — Matching mit Einwilligung.",
    },
    {
      icon: "📊",
      title: "Gerankte Pipeline",
      body: "Bis zu 200 gescorte Jobs; Top 20 hervorgehoben für Entscheidungen.",
    },
    {
      icon: "📅",
      title: "Kalender-first",
      body: "Interview-Holds und bestätigte Slots syncen wo konfiguriert (Google Calendar heute; ICS + mehr im Roadmap).",
    },
  ],
  sectionRanking: "Wie TWIN rankt",
  rankingLead: "Transparentes Scoring — keine Black-Box „perfekter KI-Job“.",
  rankingBullets: [
    "final_score kombiniert Skill-Fit, Level, Ort/Remote und Feedback",
    "Jede Job-Karte unterstützt Feedback für den nächsten Batch",
    "Ranking wird bei Quell-Refresh neu berechnet — ~30 aktive Adapter heute",
  ],
  sectionControl: "Du behältst die Kontrolle",
  controlLead:
    "Auto-Apply nur auf unterstützten Pfaden. Jeder Status ist ehrlich — nie „eingereicht“ ohne Beleg.",
  statusChips: [
    { label: "Prepared", body: "Materialien bereit — du oder der Agent prüft vor dem Send." },
    { label: "Manual", body: "Portal braucht deinen Klick; TWIN hat Paket vorbereitet." },
    { label: "Attempted", body: "Automation versucht; Ergebnis mit Grund geloggt." },
    { label: "Confirmed", body: "Einreichung mit Beleg (Bestätigung, ATS oder Trace)." },
  ],
  sectionCoverage: "Marktabdeckung",
  coverageLead: "Quellen iterativ — ehrliche Zahlen, kein „50 live Portale“.",
  coverageActive: "~30 aktive Quell-Adapter in Produktion heute",
  coverageRoadmap: "50+ Adapter im Roadmap — PL-Boards und EU-Arbeitgeber zuerst",
  plPriorityLabel: "PL-Prioritätsquellen",
  plPriorityChips: ["pracuj.pl", "rocketjobs.pl", "LinkedIn", "justjoin.it", "Arbeitgeberseiten", "Greenhouse"],
  sectionFounding: "Founding-Mitglieder",
  foundingHeadline: "Erste 1.000 — kostenloser Founding-Zugang, Fair-Use beim Go-live",
  foundingSub:
    "Bezahlpläne können nach Public Launch kommen. Founding-Wishlist ohne Karte — ein aktives Profil und Fair-Use vor Billing.",
  foundingPerks: [
    "Founding-Kohorte: Prioritäts-Queue und frühe Oberflächen vor GA",
    "Voller Agent-Runway im Pilot — Matching, Tracking, Kalender wo konfiguriert",
    "Founding-Badge + Produkt mitgestalten vor Klon-Flut",
    "Keine Zahlung für Wishlist — Bedingungen vor Paid-Tiers",
  ],
  foundingFinePrint:
    "Angebot für erste 1.000 verifizierte Wishlist-Anmeldungen. Kontoaktivität und Fair-Use beim Launch; volle Bedingungen vor Billing. Kein Versprechen lebenslang bezahltes Pro für 0 € ohne AGB.",
  sectionHow8: "So funktioniert's — 8 Schritte",
  how8Lead: "Wishlist heute → Interviews im Kalender, wenn Profil live ist.",
  how8Steps: [
    { n: "1", title: "Wishlist beitreten", body: "E-Mail + Einwilligung — du bist in der Founding-Queue." },
    { n: "2", title: "Founding-Einladung", body: "Bei freiem Slot: Mail mit nächsten Schritten." },
    { n: "3", title: "Registrieren", body: "TWIN-Konto erstellen (DSGVO-Einwilligung bei Registrierung)." },
    { n: "4", title: "CV hochladen", body: "Profilfelder parsen und validieren für Matching." },
    { n: "5", title: "Bar setzen", body: "Rolle, Level, Gehaltsuntergrenze, Orte — deine Regeln." },
    { n: "6", title: "Gerankte Jobs sehen", body: "Top 20 + bis 200 mit final_score und Feedback." },
    { n: "7", title: "Ehrlich bewerben", body: "Auto-Apply auf unterstützten Pfaden; manuell wo nötig." },
    { n: "8", title: "Interview-Kalender", body: "Annehmen, ablehnen, verschieben — Export/Sync wo verfügbar." },
  ],
  sectionWhyFounding: "Warum Founding-Mitglieder zählen",
  whyFoundingLead:
    "Wir bauen akzeptanzbereite Kalender — keine weitere Lärm-Maschine. Frühe Mitglieder setzen die Bar vor Skalierung.",
  whyFoundingPoints: [
    "Dein Feedback trainiert Ranking und Quellen-Priorität (besonders PL).",
    "Du hilfst, ehrliche Status zu halten, während Auto-Apply wächst.",
    "Founding-Kohorte beweist die Schleife vor breitem Paid-Marketing.",
  ],
  sectionExample: "Beispielszenario",
  exampleDisclaimer: "Nur Illustration — kein Kunden-Testimonial oder garantiertes Ergebnis.",
  exampleTitle: "Senior Backend · EU remote",
  exampleParagraphs: [
    "Alex tritt der Wishlist bei, lädt nach Einladung CV hoch und setzt Gehaltsuntergrenze. TWIN zeigt 18 Rollen im Top-20-Band und 140 in der Pipeline.",
    "Drei Rollen: prepared → manual (Firmenportal). Zwei unterstützte Pfade: confirmed mit Beleg. Ein Interview in Google Calendar; zwei als ICS.",
    "Alex überspringt Lärm mit Feedback — nächster Batch meidet ähnliche Rollen. Keine falschen „eingereicht“-Zeilen.",
  ],
  sectionReferral: "In der Queue nach oben — keine Cash-Preise",
  referralLead: "Teile deinen Link nach Anmeldung. Jeder Freund verbessert deine Position — das ist die Belohnung.",
  referralBullets: [
    "Referral-Code im Wishlist-Panel nach Anmeldung",
    "Leaderboard zeigt Einladungen — keine Dollar-Boni",
    "Keine 1.000-$ / 500-$-Versprechen — nur früherer Founding-Zugang",
  ],
  faqExtra: [
    {
      q: "Wie viele Jobquellen nutzt TWIN?",
      a: "Etwa 30 aktive Adapter heute, 50+ geplant. Echte Adapter-Zahlen — keine Marketing-Fiktion „50 live Portale“.",
    },
    {
      q: "Spammt Auto-Apply Unternehmen?",
      a: "Nur auf unterstützten Pfaden mit ehrlichen Status. Nicht unterstützte Portale: manuell oder attempted mit sichtbarem Grund — nie falsches „eingereicht“.",
    },
    {
      q: "Was zahlen Founding-Mitglieder?",
      a: "Wishlist-Beitritt kostet heute nichts. Founding-Kohorte erhält kostenlosen Early Access; optionale Paid-Pläne später mit vorher publizierten Bedingungen.",
    },
    {
      q: "Ist „Lifetime Pro für 0 €“ garantiert?",
      a: "Wir versprechen keine lebenslangen Paid-Tiers für null ohne AGB. Hier: kostenloser Early Access und Founding-Fair-Use — siehe Kleingedrucktes.",
    },
  ],
};

/** FR / IT / ZH / JA / AR reuse DE/ES structure with locale-specific hero badges. */
export const frWaitlistNarrative: WaitlistNarrative = {
  ...esWaitlistNarrative,
  heroEyebrow: "Wishlist founding · premiers 1 000",
  heroOfferBadge: "Cohorte founding — accès anticipé gratuit, fair-use au lancement",
  counterEyebrow: "Cohorte founding · rareté en direct",
  sectionFounding: "Membres founding",
  foundingHeadline: "Premiers 1 000 — accès founding gratuit, fair-use au go-live",
};

export const itWaitlistNarrative: WaitlistNarrative = {
  ...esWaitlistNarrative,
  heroEyebrow: "Wishlist founding · primi 1.000",
  heroOfferBadge: "Cohort founding — early access gratuito, fair-use al lancio",
  counterEyebrow: "Cohort founding · scarsità live",
  sectionFounding: "Membri founding",
};

export const zhWaitlistNarrative: WaitlistNarrative = {
  ...deWaitlistNarrative,
  heroEyebrow: "Founding 候补 · 前 1,000",
  heroOfferBadge: "Founding 队列 — 免费 early access，上线 fair-use",
  counterEyebrow: "Founding 队列 · 实时稀缺",
  heroOfferSub:
    "路径：候补 → founding 邀请 → 注册 → 简历 → 档案 → 最多 200 个排序职位。一个代理，一个面板，值得赴约的面试。",
  valueStrip: [
    "前 1,000 founding — 今天无需信用卡",
    "最多 200 个排序职位管道 · 突出前 20",
    "约 30 个来源适配器上线 · 路线图 50+",
  ],
};

export const jaWaitlistNarrative: WaitlistNarrative = {
  ...deWaitlistNarrative,
  heroEyebrow: "founding ウェイトリスト · 最初の1,000",
  heroOfferBadge: "founding コホート — 無料 early access、ローンチ時 fair-use",
  counterEyebrow: "founding コホート · ライブ希少性",
};

export const arWaitlistNarrative: WaitlistNarrative = {
  ...deWaitlistNarrative,
  heroEyebrow: "قائمة founding · أول 1,000",
  heroOfferBadge: "مجموعة founding — early access مجاني، fair-use عند الإطلاق",
  counterEyebrow: "مجموعة founding · ندرة مباشرة",
};