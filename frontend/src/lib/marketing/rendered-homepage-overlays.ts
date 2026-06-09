import type { Locale } from "@/lib/i18n";

type Overlay = Record<string, unknown>;

const esHome: Overlay = {
  curiosityEyebrow: "Mira qué hay dentro",
  tagline: "Gemelo de carrera con IA",
  title: "Vuelve a entrevistas que merecen la pena — no al spam del inbox.",
  heroHook:
    "La wishlist founding reserva beneficios de cohorte early access para los primeros 1.000 — aplican condiciones founding, fair-use y Regulamin de lanzamiento (ver /first-1000). O abre una cuenta gratis para ver coincidencias hoy.",
  description:
    "TWIN escanea los portales que activas y muestra roles que valen tu tiempo — tras una pausa abres una lista corta de slots, no ruido aleatorio.",
  getStarted: "Crear cuenta gratis",
  ctaRegisterMicro: "Ve tus coincidencias en ~2 min",
  ctaDemoSecondary: "Ver demo interactiva",
  ctaDemoCardSubtitle: "Walkthrough interactivo de 8 pasos · sin cuenta",
  ctaDemoCardLead: "Mira cómo encajan ranking, feedback y calendario",
  logInPrompt: "¿Ya tienes cuenta?",
  logIn: "Entrar",
  liveCounter: "{count}+ roles escaneados en portales activados",
  liveCounterUnavailable: "—",
  socialProofJoin:
    "Únete a candidatos que construyen un calendario de aceptación — no otro cementerio de pestañas.",
  socialProofQuote: "«Por fin un pipeline en lugar de veinte pestañas.»",
  teaserEyebrow: "Dentro de tu espacio de trabajo",
  teaserTitle: "Tu feed de coincidencias y pipeline — vista previa",
  teaserUnlock: "Desbloquea tras registrarte",
  teaserCard1Title: "Staff engineer · plataforma",
  teaserCard1Meta: "Remote EU · 92% coincidencia",
  teaserCard2Title: "Product lead · B2B SaaS",
  teaserCard2Meta: "Híbrido · 88% coincidencia",
  teaserCard3Title: "Engineering manager",
  teaserCard3Meta: "Varsovia · 85% coincidencia",
  insideEyebrow: "Qué obtienes dentro",
  insideTitle:
    "Tu pipeline puede trabajar mientras duermes — cuando la automatización que activas está disponible",
  insideStep1Title: "Feed rankeado",
  insideStep1Line: "Roles puntuados a tu perfil — no un chorro de cada anuncio.",
  insideStep2Title: "Registro de candidaturas",
  insideStep2Line: "Cada guardado y estado en una línea de tiempo fiable.",
  insideStep3Title: "Calendario de entrevistas",
  insideStep3Line: "Slots que merecen ir, sincronizados al conectar calendario.",
  stickyCtaLabel: "Únete a la wishlist founding",
  stickyCtaMicro: "Early access founding · solo email · aplican condiciones",
  joinWishlist: "Únete a la wishlist founding",
  joinWishlistMicro: "Primeros 1.000 · beneficios cohorte founding · sin tarjeta · aplican condiciones",
  foundingCounterAria: "Plazas restantes en wishlist founding",
  foundingCounterEyebrow: "Plazas founding restantes",
  foundingCounterOf: "de {cap}",
  foundingCounterLoading: "Cargando contador en vivo…",
  foundingCounterLive: "Datos de wishlist en vivo",
  foundingCounterOffline: "Contador retrasado — el alta en la siguiente página sigue funcionando.",
  ctaBandWishlistEyebrow: "Mil founding",
  ctaBandWishlistTitle:
    "Reserva early access founding antes del precio público — beneficios sujetos a condiciones.",
  ctaBandWishlistMicro:
    "Misma oferta founding que /first-1000 y wishlist — primero email; aplican condiciones founding y fair-use.",
  scrape: "Descubrir",
  scrapeDesc: "Agrega anuncios de los portales que activas.",
  match: "Emparejar",
  matchDesc: "Puntuación según perfil, habilidades y objetivos.",
  track: "Seguir",
  trackDesc: "Búsqueda, guardados y estados en un espacio.",
  featuresTitle: "Pipeline de un vistazo",
  featuresSubtitle: "Vista previa en vivo: descubrir → emparejar → seguir.",
  footerHint: "Añade perfil tras el alta para que el ranking tenga señal real.",
  howEyebrow: "Cómo funciona",
  howTitle: "Cuatro pasos hacia una búsqueda más tranquila",
  howDetailLink: "Walkthrough completo",
  howStep1Title: "Conectar",
  howStep1Line: "Activa portales y regiones que te importan.",
  howStep2Title: "Emparejar",
  howStep2Line: "Roles puntuados a tu perfil cuando llegan anuncios.",
  howStep3Title: "Seguir",
  howStep3Line: "Cada guardado y estado de candidatura en un cockpit.",
  howStep4Title: "Automatizar",
  howStep4Line: "Auto-apply y sync de calendario llegan por fases públicas.",
  statsAria: "Actividad de la plataforma",
  statJobs: "Ofertas validadas",
  statUsers: "Miembros",
  statApps: "Candidaturas",
  statBoards: "Portales en registro",
  featureGridTitle: "Hecho para momentum, no caos de pestañas",
  feature1Title: "Feed unificado",
  feature1Line: "Deja de capturar roles en múltiples sitios.",
  feature2Title: "Ranking consciente del perfil",
  feature2Line: "Puntuaciones que respetan seniority y skills.",
  feature3Title: "Inteligencia de CV",
  feature3Line: "Afina la señal antes de aplicar.",
  feature4Title: "Registro de candidaturas",
  feature4Line: "Una línea de tiempo para cada cambio de estado.",
  feature5Title: "Consentimiento y RGPD",
  feature5Line: "Opt-in explícito; exportaciones cuando las necesites.",
  feature6Title: "Automatización por fases (en pausa hoy)",
  feature6Line:
    "Prepara paquetes de candidatura para revisión — auto-apply pausada en producción hasta que las condiciones lo permitan.",
  socialProofEyebrow: "Candidatos exploran roles en empresas como",
  faqEyebrow: "FAQ",
  faqTitle: "Preguntas y respuestas",
  faqPrivacyLink: "Política de privacidad",
};

const deHome: Overlay = {
  curiosityEyebrow: "Sieh, was drin ist",
  tagline: "KI-Karrierezwilling",
  title: "Zurück zu Interviews, die sich lohnen — nicht Postfach-Spam.",
  heroHook:
    "Die Founding-Wishlist reserviert Early-Access-Kohorten-Vorteile für die ersten 1.000 — Founding-Bedingungen, Fair-Use und Launch-AGB gelten (siehe /first-1000). Oder kostenloses Konto öffnen und Matches heute ansehen.",
  description:
    "TWIN scannt aktivierte Jobbörsen und zeigt Rollen, die deine Zeit wert sind — nach der Pause öffnest du eine kurze Slot-Liste, kein Zufallsrauschen.",
  getStarted: "Kostenloses Konto erstellen",
  ctaRegisterMicro: "Deine Matches in ~2 Min",
  ctaDemoSecondary: "Interaktive Demo ansehen",
  ctaDemoCardSubtitle: "8-Schritte-Walkthrough · kein Konto nötig",
  ctaDemoCardLead: "So greifen Ranking, Feedback und Kalender ineinander",
  logInPrompt: "Bereits ein Konto?",
  logIn: "Anmelden",
  liveCounter: "{count}+ Rollen auf aktivierten Börsen gescannt",
  liveCounterUnavailable: "—",
  socialProofJoin:
    "Schließe dich Kandidaten an, die einen Akzeptanz-Kalender bauen — kein weiteres Tab-Friedhof.",
  socialProofQuote: "„Endlich ein Pipeline statt zwanzig Tabs.“",
  teaserEyebrow: "In deinem Workspace",
  teaserTitle: "Match-Feed und Pipeline — Vorschau",
  teaserUnlock: "Nach Anmeldung freischalten",
  teaserCard1Title: "Staff Engineer · Plattform",
  teaserCard1Meta: "Remote EU · 92 % Match",
  teaserCard2Title: "Product Lead · B2B SaaS",
  teaserCard2Meta: "Hybrid · 88 % Match",
  teaserCard3Title: "Engineering Manager",
  teaserCard3Meta: "Warschau · 85 % Match",
  insideEyebrow: "Was du drinnen bekommst",
  insideTitle:
    "Deine Pipeline kann arbeiten, während du schläfst — wenn aktivierte Automatisierung verfügbar ist",
  insideStep1Title: "Gerankter Feed",
  insideStep1Line: "Rollen nach Profil bewertet — kein Feuerwehrschlauch jedes Inserats.",
  insideStep2Title: "Bewerbungs-Ledger",
  insideStep2Line: "Jeder Save und Status in einer Timeline, der Recruiter vertrauen.",
  insideStep3Title: "Interview-Kalender",
  insideStep3Line: "Slots, die sich lohnen — Sync beim Kalender-Connect.",
  stickyCtaLabel: "Founding-Wishlist beitreten",
  stickyCtaMicro: "Founding Early Access · nur E-Mail · AGB gelten",
  joinWishlist: "Founding-Wishlist beitreten",
  joinWishlistMicro: "Erste 1.000 · Founding-Kohorten-Vorteile · keine Karte · AGB gelten",
  foundingCounterAria: "Verbleibende Founding-Wishlist-Plätze",
  foundingCounterEyebrow: "Founding-Plätze übrig",
  foundingCounterOf: "von {cap}",
  foundingCounterLoading: "Live-Zähler wird geladen…",
  foundingCounterLive: "Live-Wishlist-Daten",
  foundingCounterOffline: "Live-Zähler verzögert — Anmeldung auf der nächsten Seite funktioniert.",
  ctaBandWishlistEyebrow: "Founding-Tausend",
  ctaBandWishlistTitle:
    "Founding Early Access vor Public-Pricing reservieren — Vorteile gemäß AGB.",
  ctaBandWishlistMicro:
    "Gleiches Founding-Angebot wie /first-1000 & Wishlist — zuerst E-Mail; Founding-Bedingungen & Fair-Use gelten.",
  scrape: "Entdecken",
  scrapeDesc: "Inserate von aktivierten Börsen aggregieren.",
  match: "Matchen",
  matchDesc: "Scores nach Profil, Skills und Zielen.",
  track: "Tracken",
  trackDesc: "Suche, Saves und Status in einem Workspace.",
  featuresTitle: "Pipeline auf einen Blick",
  featuresSubtitle: "Live-Vorschau: Entdecken → Matchen → Tracken.",
  footerHint: "Profil nach Anmeldung ergänzen — dann hat Ranking echtes Signal.",
  howEyebrow: "So funktioniert's",
  howTitle: "Vier Schritte zu ruhigerer Suche",
  howDetailLink: "Voller Walkthrough",
  howStep1Title: "Verbinden",
  howStep1Line: "Jobbörsen und Regionen aktivieren, die zählen.",
  howStep2Title: "Matchen",
  howStep2Line: "Rollen werden bei neuen Inseraten zum Profil gescored.",
  howStep3Title: "Tracken",
  howStep3Line: "Jeder Save und Bewerbungsstatus in einem Cockpit.",
  howStep4Title: "Automatisieren",
  howStep4Line: "Auto-Apply und Kalender-Sync kommen in öffentlichen Phasen.",
  statsAria: "Plattform-Aktivität",
  statJobs: "Validierte Jobs",
  statUsers: "Mitglieder",
  statApps: "Bewerbungen",
  statBoards: "Börsen im Register",
  featureGridTitle: "Für Momentum gebaut, nicht Tab-Chaos",
  feature1Title: "Ein Feed",
  feature1Line: "Schluss mit Screenshots über mehrere Seiten.",
  feature2Title: "Profilbewusstes Ranking",
  feature2Line: "Scores mit Seniority und Skills.",
  feature3Title: "CV-Intelligenz",
  feature3Line: "Signal schärfen vor der Bewerbung.",
  feature4Title: "Bewerbungs-Ledger",
  feature4Line: "Eine Timeline für jeden Statuswechsel.",
  feature5Title: "Consent & DSGVO",
  feature5Line: "Explizites Opt-in; Exporte auf Abruf.",
  feature6Title: "Phasenweise Automatisierung (heute pausiert)",
  feature6Line:
    "Bewerbungspakete zur Prüfung vorbereiten — Auto-Apply bleibt in Produktion pausiert, bis Freigaben es erlauben.",
  socialProofEyebrow: "Kandidaten erkunden Rollen bei Unternehmen wie",
  faqEyebrow: "FAQ",
  faqTitle: "Fragen & Antworten",
  faqPrivacyLink: "Datenschutz",
};

const frHome: Overlay = {
  ...esHome,
  curiosityEyebrow: "Voir ce qu'il y a dedans",
  tagline: "Jumeau de carrière IA",
  title: "Revenez à des entretiens qui valent le coup — pas du spam inbox.",
  heroHook:
    "La wishlist founding réserve les avantages de cohorte early access pour les 1 000 premiers — conditions founding, fair-use et CGU de lancement (voir /first-1000). Ou ouvrez un compte gratuit pour prévisualiser les matchs aujourd'hui.",
  joinWishlist: "Rejoindre la wishlist founding",
  joinWishlistMicro: "Premiers 1 000 · avantages cohorte founding · sans carte · CGU applicables",
  stickyCtaLabel: "Rejoindre la wishlist founding",
  insideEyebrow: "Ce que vous obtenez dedans",
  insideTitle:
    "Votre pipeline peut travailler pendant que vous dormez — quand l'automatisation activée est disponible",
  foundingCounterEyebrow: "Places founding restantes",
  foundingCounterLoading: "Chargement du compteur en direct…",
  foundingCounterLive: "Données wishlist en direct",
  ctaBandWishlistEyebrow: "Mille founding",
  featureGridTitle: "Conçu pour l'élan, pas le chaos d'onglets",
  getStarted: "Créer un compte gratuit",
  logIn: "Se connecter",
  faqTitle: "Questions & réponses",
};

const itHome: Overlay = {
  ...esHome,
  curiosityEyebrow: "Guarda cosa c'è dentro",
  tagline: "Gemello di carriera IA",
  title: "Torna a colloqui che valgono il tempo — non spam in inbox.",
  joinWishlist: "Unisciti alla wishlist founding",
  joinWishlistMicro: "Primi 1.000 · vantaggi cohort founding · nessuna carta · si applicano i Termini",
  stickyCtaLabel: "Unisciti alla wishlist founding",
  insideEyebrow: "Cosa ottieni dentro",
  insideTitle:
    "La tua pipeline può lavorare mentre dormi — quando l'automazione abilitata è disponibile",
  foundingCounterEyebrow: "Posti founding rimasti",
  foundingCounterLoading: "Caricamento contatore live…",
  foundingCounterLive: "Dati wishlist live",
  featureGridTitle: "Fatto per lo slancio, non il caos di schede",
  getStarted: "Crea account gratuito",
  logIn: "Accedi",
  faqTitle: "Domande & risposte",
};

const zhHome: Overlay = {
  ...esHome,
  curiosityEyebrow: "看看里面有什么",
  tagline: "AI 职业分身",
  title: "回到值得赴约的面试 — 而不是收件箱噪音。",
  heroHook:
    "Founding 候补为前 1,000 名保留 early access 队列权益 — 适用 founding 条款、fair-use 与上线条款（见 /first-1000）。或免费开户，今天预览匹配。",
  description: "TWIN 扫描你启用的招聘板，呈现值得时间的职位 — 休假归来打开短名单，而非随机噪音。",
  getStarted: "创建免费账户",
  joinWishlist: "加入 founding 候补",
  joinWishlistMicro: "前 1,000 · founding 队列权益 · 无需信用卡 · 适用条款",
  stickyCtaLabel: "加入 founding 候补",
  insideEyebrow: "里面有什么",
  insideTitle: "你睡觉时管道仍可工作 — 在你启用的自动化可用时",
  foundingCounterEyebrow: "剩余 founding 名额",
  foundingCounterLoading: "加载实时计数…",
  foundingCounterLive: "候补实时数据",
  ctaBandWishlistEyebrow: "Founding 千人",
  featureGridTitle: "为势头而建，而非标签 chaos",
  socialProofEyebrow: "候选人在如下公司探索职位",
  logIn: "登录",
  faqTitle: "常见问题",
};

const jaHome: Overlay = {
  ...deHome,
  curiosityEyebrow: "中身を見る",
  tagline: "AI キャリアツイン",
  title: "受ける価値のある面接に戻る — 受信トレイのノイズではなく。",
  heroHook:
    "founding ウェイトリストは最初の1,000人向けに early access コホート特典を確保 — founding 条件・fair-use・ローンチ規約が適用（/first-1000 参照）。または無料アカウントで今日マッチをプレビュー。",
  getStarted: "無料アカウント作成",
  joinWishlist: "founding ウェイトリストに参加",
  joinWishlistMicro: "最初の1,000 · founding コホート特典 · カード不要 · 規約適用",
  stickyCtaLabel: "founding ウェイトリストに参加",
  insideEyebrow: "中で得られるもの",
  insideTitle: "眠っている間もパイプラインが動く — 有効な自動化があるとき",
  foundingCounterEyebrow: "残り founding 枠",
  foundingCounterLoading: "ライブカウントを読み込み中…",
  foundingCounterLive: "ウェイトリスト・ライブデータ",
  ctaBandWishlistEyebrow: "founding 千人",
  featureGridTitle: "勢いのために — タブ chaos ではなく",
  logIn: "ログイン",
  faqTitle: "よくある質問",
};

const arHome: Overlay = {
  ...deHome,
  curiosityEyebrow: "اكتشف ما بداخل",
  tagline: "توأم مهني بالذكاء الاصطناعي",
  title: "عد إلى مقابلات تستحق وقتك — لا ضجيج البريد.",
  heroHook:
    "قائمة founding تحجز مزايا cohort early access لأول 1,000 — تنطبق شروط founding و fair-use وشروط الإطلاق (انظر /first-1000). أو افتح حساباً مجانياً لمعاينة التطابقات اليوم.",
  getStarted: "إنشاء حساب مجاني",
  joinWishlist: "انضم إلى قائمة founding",
  joinWishlistMicro: "أول 1,000 · مزايا cohort founding · بدون بطاقة · تنطبق الشروط",
  stickyCtaLabel: "انضم إلى قائمة founding",
  insideEyebrow: "ما تحصل عليه داخل",
  insideTitle: "مسارك يمكن أن يعمل وأنت نائم — عندما تكون الأتمتة التي فعّلتها متاحة",
  foundingCounterEyebrow: "أماكن founding متبقية",
  foundingCounterLoading: "جاري تحميل العداد المباشر…",
  foundingCounterLive: "بيانات قائمة الانتظار مباشرة",
  ctaBandWishlistEyebrow: "ألف founding",
  featureGridTitle: "للزخم — لا فوضى التبويبات",
  logIn: "تسجيل الدخول",
  faqTitle: "الأسئلة الشائعة",
};

const esFaq: Overlay = {
  homeTeaserLead:
    "{count} respuestas en general, candidatos, reclutadores, empresas e inversores — abre el FAQ completo con pestañas por persona.",
  homeCta: "Ver las {count} respuestas",
  homeCtaHint: "Pestañas por persona en la página FAQ completa",
  sectionGeneral: "General",
  sectionCandidates: "Candidatos",
  sectionRecruiters: "Reclutadores",
  sectionCompanies: "Empresas",
  sectionInvestors: "Inversores",
  general01Q: "¿Qué es TWIN hoy?",
  general01A:
    "Un agente de carrera que reduce el caos de pestañas: descubrimiento agregado, ranking consciente del perfil, seguimiento de candidaturas y automatización por fases (solo preparación en producción hoy). La estrella del norte: un calendario corto de momentos listos para aceptar — no más spam.",
  general02Q: "¿Para quién es TWIN?",
  general02A:
    "Cuatro carriles en una plataforma: candidatos, reclutadores, empresas e inversores. Elige el carril al registrarte — SKU y facturación difieren por persona.",
  general03Q: "¿En qué se diferencia de un solo portal?",
  general03A:
    "Los portales alojan las ofertas; TWIN normaliza descubrimiento, señales de encaje y seguimiento en una UX. Sigues los flujos del empleador cuando el portal lo exige.",
};

const deFaq: Overlay = {
  homeTeaserLead:
    "{count} Antworten zu Allgemein, Kandidaten, Recruiter, Unternehmen und Investoren — vollständiges FAQ mit Persona-Tabs öffnen.",
  homeCta: "Alle {count} Antworten ansehen",
  homeCtaHint: "Persona-Tabs auf der vollständigen FAQ-Seite",
  sectionGeneral: "Allgemein",
  sectionCandidates: "Kandidaten",
  sectionRecruiters: "Recruiter",
  sectionCompanies: "Unternehmen",
  sectionInvestors: "Investoren",
  general01Q: "Was ist TWIN heute?",
  general01A:
    "Ein Karriereagent, der Tab-Chaos reduziert: aggregierte Jobsuche, profilbewusstes Ranking, Bewerbungs-Tracking und frühe phasenweise Automatisierung (heute nur Vorbereitung in Produktion). North Star: kurzer Kalender akzeptanzbereiter Momente — kein Inbox-Spam.",
  general02Q: "Für wen ist TWIN?",
  general02A:
    "Vier Lanes auf einer Plattform: Kandidaten, Recruiter, Unternehmen, Investoren. Wähle die Lane bei der Anmeldung — SKUs und Billing unterscheiden sich.",
  general03Q: "Worin unterscheidet sich das von einer Jobbörse?",
  general03A:
    "Börsen hosten Stellen; TWIN normalisiert Entdeckung, Match-Signale und Tracking in einer UX. Employer-Flows bleiben, wenn die Börse es verlangt.",
};

const esRewards = {
  eyebrow: "Gana por resultados",
  headline: "Te pagamos por conseguir tu trabajo ideal — cuando esté verificado",
  lead:
    "Bonos por contrataciones, referidos y victorias en calendario — no por envíos masivos. La empresa paga success fee; tú recibes una parte definida tras verificación.",
  colTrigger: "Disparador",
  colReward: "Recompensa",
  colTiming: "Cuándo se paga",
  placementTitle: "Bono por placement",
  placementTrigger:
    "Contratación vía aplicación TWIN y placement verificado (checks asistidos — sin ping-pong por email)",
  placementReward:
    "{pct}% del primer salario bruto mensual — la empresa paga {feePct}% del salario mensual; la mitad vuelve a ti",
  placementTiming: "Tras placement verificado + reglas en condiciones (normalmente 30 días hábiles)",
  referralTitle: "Recomienda a un amigo",
  referralTrigger:
    "Tu amigo se registra con tu enlace, verifica email, completa perfil y consentimiento RGPD; el cash se desbloquea en su primera suscripción de pago",
  referralReward:
    "{firstPay} en el primer pago · {retained} tras 3 meses pagados · {hired} si consigue trabajo vía TWIN",
  referralTiming: "Seguimiento en panel; cash-out manual en demo (ver condiciones)",
  foundingTitle: "Founding 1.000",
  foundingTrigger: "Únete antes de que se llene el cupo — cuenta candidato verificada",
  foundingReward: "Precio founding bloqueado (incl. ventana Premium gratis según condiciones de lanzamiento)",
  foundingTiming: "En activación de cuenta — sin placement requerido",
  interviewTitle: "Entrevista en tu calendario",
  interviewTrigger:
    "Slot confirmado por reclutador en tu calendario conectado (Google hoy; Outlook/ICS próximo)",
  interviewReward: "{amount} por slot confirmado — máx. {max} por trimestre (programa demo)",
  interviewTiming: "Tras verificar slot · límites trimestrales",
  mechanicsNote:
    "Economía alineada con modelo inversor: fee empresa 50% salario mensual → 25% neto para ti. Programa LinkedIn puede aumentar tu parte en hires elegibles.",
  disclaimer:
    "Condiciones demo — no ingreso garantizado. Pagos tras checks antifraude, identidad y condiciones vigentes. No disponible donde esté prohibido.",
  fraudLine: "Una cuenta por persona; auto-referidos y registros sintéticos anulan recompensas.",
  ctaReferrals: "Tu panel de referidos",
  ctaTerms: "Condiciones",
  ctaPrivacy: "Privacidad",
  ctaFounding: "Founding 1.000",
  ctaRegister: "Crear cuenta gratis",
};

const deRewards = {
  eyebrow: "Verdiene an Ergebnissen",
  headline: "Wir zahlen dir für deinen Traumjob — wenn verifiziert",
  lead:
    "Boni für Hires, Empfehlungen und Kalender-Erfolge — nicht für Massenbewerbungen. Arbeitgeber zahlt Success Fee; du erhältst definierten Anteil nach Verifikation.",
  colTrigger: "Auslöser",
  colReward: "Belohnung",
  colTiming: "Auszahlung",
  placementTitle: "Placement-Erfolgsbonus",
  placementTrigger:
    "Einstellung über TWIN-getrackte Bewerbung und Placement verified (maschinell unterstützt — kein E-Mail-Ping-Pong)",
  placementReward:
    "{pct}% deines ersten monatlichen Bruttogehalts — Arbeitgeber zahlt {feePct}% Monatsgehalt; die Hälfte geht an dich",
  placementTiming: "Nach Placement verified + Regeln in AGB (typisch innerhalb 30 Werktagen)",
  referralTitle: "Freund empfehlen",
  referralTrigger:
    "Freund registriert sich mit deinem Link, verifiziert E-Mail, vervollständigt Profil und DSGVO-Einwilligung; Auszahlung bei erster bezahlter Subscription",
  referralReward:
    "{firstPay} bei erster Zahlung · {retained} nach 3 bezahlten Monaten · {hired} bei Hire via TWIN",
  referralTiming: "Im Dashboard nachverfolgt; manueller Cash-out in Demo (AGB)",
  foundingTitle: "Founding 1.000",
  foundingTrigger: "Beitritt vor vollem Public-Cap — verifiziertes Kandidatenkonto",
  foundingReward: "Founding-Preis gesperrt (inkl. kostenlosem Premium-Fenster laut Launch-Bedingungen)",
  foundingTiming: "Bei Kontoaktivierung — kein Placement nötig",
  interviewTitle: "Interview im Kalender",
  interviewTrigger:
    "Recruiter-bestätigter Slot landet in verbundenem Kalender (Google heute; Outlook/ICS als Nächstes)",
  interviewReward: "{amount} pro bestätigtem Slot — max. {max} pro Kalenderquartal (Demo-Programm)",
  interviewTiming: "Nach Slot-Verifikation · Limits quartalsweise",
  mechanicsNote:
    "Ökonomie wie Investorenmodell: Standard-Arbeitgebergebühr 50% Monatsgehalt → 25% netto für dich. LinkedIn-Programm kann Anteil bei qualifizierten Hires erhöhen.",
  disclaimer:
    "Demo-Programmbedingungen — kein garantiertes Einkommen. Auszahlungen nach Fraud-Checks, Identität und aktiven AGB. Nicht verfügbar, wo verboten.",
  fraudLine: "Ein Konto pro Person; Selbst-Empfehlungen und synthetische Anmeldungen annullieren Belohnungen.",
  ctaReferrals: "Dein Empfehlungs-Dashboard",
  ctaTerms: "AGB",
  ctaPrivacy: "Datenschutz",
  ctaFounding: "Founding 1.000",
  ctaRegister: "Kostenloses Konto erstellen",
};

function overlay(home: Overlay, faq: Overlay, candidateRewards: Record<string, string>): Overlay {
  return { home, faq, candidateRewards };
}

/** Merged into es–ja dictionaries — rendered `/` + rewards band + FAQ teaser only. */
export const RENDERED_HOMEPAGE_OVERLAYS: Partial<Record<Locale, Overlay>> = {
  es: overlay(esHome, esFaq, esRewards),
  de: overlay(deHome, deFaq, deRewards),
  fr: overlay(frHome, esFaq, esRewards),
  it: overlay(itHome, esFaq, esRewards),
  zh: overlay(zhHome, esFaq, esRewards),
  ja: overlay(jaHome, esFaq, esRewards),
  ar: overlay(arHome, esFaq, esRewards),
};

/** PL uses inline dictionary; EN is source. */
export const RENDERED_HOMEPAGE_LOCALES: Locale[] = ["es", "de", "fr", "it", "zh", "ja", "ar"];
