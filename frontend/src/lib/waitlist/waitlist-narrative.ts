import type { Locale } from "@/lib/i18n";

export type WaitlistPillar = { icon: string; title: string; body: string };

export type WaitlistNarrative = {
  heroOfferBadge: string;
  heroOfferSub: string;
  valueStrip: [string, string, string];
  statsLiveLabel: string;
  statsLoadingLabel: string;
  statsOfflineHint: string;
  sectionWhy: string;
  whyLead: string;
  whyPillars: [WaitlistPillar, WaitlistPillar, WaitlistPillar];
  sectionShift: string;
  shiftLead: string;
  shiftPoints: [string, string, string];
  sectionFounding: string;
  foundingHeadline: string;
  foundingSub: string;
  foundingPerks: string[];
  foundingFinePrint: string;
  faqExtra: { q: string; a: string }[];
};

const en: WaitlistNarrative = {
  heroOfferBadge: "First 1,000 — Lifetime Pro & Enterprise · $0 forever",
  heroOfferSub:
    "Join the cohort rewriting job search: one ranked pipeline, one calendar of interviews worth showing up for — not another inbox of noise.",
  valueStrip: [
    "Lifetime top tier for founding members",
    "No credit card · cancel nothing later",
    "Access in ~14 days if you're in the first thousand",
  ],
  statsLiveLabel: "Live waitlist data",
  statsLoadingLabel: "Connecting to live stats…",
  statsOfflineHint: "Could not reach live stats — numbers below may be delayed. Signup still works.",
  sectionWhy: "Why developers are leaving the job-board treadmill",
  whyLead:
    "You didn't fail at job search — the game was designed for volume, not fit. TWIN is an autonomous agent that does the grind and only puts acceptance-ready moments on your calendar.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Your bar, not the portal's lottery",
      body: "Roles are matched to your skills and salary floor. Every application is tailored — no spray-and-pray, no 200 identical cover letters.",
    },
    {
      icon: "♾️",
      title: "Founding access that doesn't expire",
      body: "The first 1,000 on this wishlist lock lifetime Pro & Enterprise — including the highest tiers we ship at public launch. No upgrade treadmill for what you signed up for.",
    },
    {
      icon: "📅",
      title: "A calendar, not a guilt inbox",
      body: "Our north star: short lists of pre-qualified slots — accept, decline, reschedule — for candidates and recruiters alike. Momentum without spam.",
    },
  ],
  sectionShift: "The shift we're building",
  shiftLead:
    "This isn't \"another job board with AI.\" It's infrastructure for talent and teams who refuse to drown in noise.",
  shiftPoints: [
    "Scrape → match → apply → track → schedule — one loop, one dashboard, while you sleep.",
    "Recruiters meet profiles already at the bar — not mountains of raw CVs.",
    "Candidates return from time off to interviews worth preparing for — not ghosting and portal fatigue.",
  ],
  sectionFounding: "Founding thousand",
  foundingHeadline: "Lifetime top tier — because you showed up before the crowd",
  foundingSub:
    "Paid plans will exist at public launch. Founding wishlist members keep Pro & Enterprise features without paying — ever — with one active profile and fair-use rules at go-live.",
  foundingPerks: [
    "Lifetime Pro & Enterprise: auto-apply, priority matching, calendar sync, full agent runway",
    "Founding badge + early access to new surfaces before GA",
    "Priority queue — typically ~14 days from signup for the first 1,000",
    "No card today · no surprise paywall on the tier you earned on this list",
  ],
  foundingFinePrint:
    "Offer for the first 1,000 verified wishlist signups. Account activity and fair-use policies apply at launch; full terms before any billing goes live.",
  faqExtra: [
    {
      q: "What does \"lifetime Pro & Enterprise\" actually mean?",
      a: "If you join from this wishlist in the first 1,000, you keep our top product tiers without a subscription — as we define Pro and Enterprise at launch. New paid tiers may appear later; your founding tier does not get taken away.",
    },
    {
      q: "Is this going to change how hiring works?",
      a: "We're betting on agents + consent + ranked pipelines — not more manual email ping-pong. Early members help shape the product before the market floods with copycats.",
    },
  ],
};

const pl: WaitlistNarrative = {
  heroOfferBadge: "Pierwsze 1000 — Pro i Enterprise na zawsze · 0 zł",
  heroOfferSub:
    "Dołącz do grupy, która przepisuje szukanie pracy: jedna rankingowana ścieżka aplikacji, jeden kalendarz rozmów wartych Twojego czasu — bez kolejnej skrzynki pełnej szumu.",
  valueStrip: [
    "Dożywotni najwyższy plan dla founding members",
    "Bez karty · bez ukrytych opłat później",
    "Dostęp w ~14 dni, jeśli jesteś w pierwszej tysiątce",
  ],
  statsLiveLabel: "Dane na żywo z listy",
  statsLoadingLabel: "Łączenie ze statystykami na żywo…",
  statsOfflineHint: "Brak połączenia ze statystykami — liczby mogą być opóźnione. Zapis nadal działa.",
  sectionWhy: "Dlaczego developerzy schodzą z bieżni portali",
  whyLead:
    "To nie Ty przegrałeś z rynkiem pracy — gra była ustawiona na wolumen, nie na dopasowanie. TWIN to autonomiczny agent, który robi harówkę i zostawia na kalendarzu tylko momenty gotowe do akceptacji.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Twój próg, nie los na portalu",
      body: "Oferty są dopasowane do umiejętności i progu pensji. Każda aplikacja jest spersonalizowana — zero spray-and-pray i 200 tych samych listów.",
    },
    {
      icon: "♾️",
      title: "Founding access, który nie wygasa",
      body: "Pierwsze 1000 na wishliście blokuje dożywotnie Pro i Enterprise — włącznie z najwyższymi planami przy publicznym launchu. Bez biegu za upgrade'ami.",
    },
    {
      icon: "📅",
      title: "Kalendarz, nie skrzynka wstydu",
      body: "Główny cel: krótka lista wstępnie zakwalifikowanych slotów — akceptuj, odrzuć, przełóż — dla kandydatów i rekruterów. Tempo bez spamu.",
    },
  ],
  sectionShift: "Zmiana, którą budujemy",
  shiftLead:
    "To nie „kolejny portal z AI”. To warstwa między talentem a zespołami, która nie tonie w szumie.",
  shiftPoints: [
    "Pobierz → dopasuj → aplikuj → śledź → zaplanuj — jedna pętla, jeden panel, gdy śpisz.",
    "Rekruterzy widzą profile już na poziomie — nie góry surowych CV.",
    "Kandydaci wracają z urlopu do rozmów wartych przygotowania — nie ghostingu i zmęczenia portalami.",
  ],
  sectionFounding: "Founding thousand",
  foundingHeadline: "Najwyższy plan na zawsze — bo byłeś przed tłumem",
  foundingSub:
    "Przy publicznym starcie będą płatne plany. Członkowie wishlisty founding zachowują Pro i Enterprise bez opłat — z jednym aktywnym profilem i zasadami fair-use przy starcie.",
  foundingPerks: [
    "Dożywotnie Pro i Enterprise: auto-aplikacja, priorytetowe dopasowanie, synchronizacja kalendarza, pełny agent",
    "Odznaka founding + wcześniejszy dostęp do nowych funkcji przed GA",
    "Priorytetowa kolejka — zwykle ~14 dni od zapisu dla pierwszej tysiącki",
    "Bez karty dziś · bez paywalla na plan, który zdobyłeś na liście",
  ],
  foundingFinePrint:
    "Oferta dla pierwszych 1000 zweryfikowanych zapisów na wishliście. Aktywność konta i fair-use obowiązują przy starcie; pełne warunki przed włączeniem płatności.",
  faqExtra: [
    {
      q: "Co dokładnie znaczy „dożywotnie Pro i Enterprise”?",
      a: "Jeśli dołączysz z tej wishlisty w pierwszej tysiątce, zachowujesz najwyższe plany bez subskrypcji — tak jak zdefiniujemy Pro i Enterprise przy launchu. Nowe płatne tiery mogą się pojawić; Twój founding plan nie zostanie odebrany.",
    },
    {
      q: "Czy to zmieni sposób rekrutacji?",
      a: "Stawiamy na agentów, zgodę i rankingowaną ścieżkę aplikacji — nie na ręczny ping-pong mailowy. Wcześni członkowie kształtują produkt, zanim rynek zapełni się klonami.",
    },
  ],
};

const es: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "Primeros 1.000 — Pro y Enterprise de por vida · 0 €",
  heroOfferSub:
    "Únete a quienes reescriben la búsqueda de empleo: un pipeline clasificado y un calendario de entrevistas que merecen tu tiempo.",
  valueStrip: [
    "Plan superior de por vida para fundadores",
    "Sin tarjeta · sin sorpresas después",
    "Acceso en ~14 días si entras en el primer millar",
  ],
  sectionWhy: "Por qué los desarrolladores abandonan el hámster de los portales",
  whyLead:
    "No fallaste en la búsqueda — el juego premia volumen, no encaje. TWIN es un agente autónomo que hace el trabajo pesado y deja en tu calendario solo momentos listos para aceptar.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Tu nivel, no la lotería del portal",
      body: "Ofertas alineadas con tus skills y salario mínimo. Cada candidatura es única — nada de spray-and-pray.",
    },
    {
      icon: "♾️",
      title: "Acceso fundador que no caduca",
      body: "Los primeros 1.000 en esta lista bloquean Pro y Enterprise de por vida, incluidos los planes más altos del lanzamiento público.",
    },
    {
      icon: "📅",
      title: "Calendario, no inbox de culpa",
      body: "Nuestra estrella polar: slots pre-cualificados — aceptar, rechazar, reprogramar — sin spam para nadie.",
    },
  ],
  sectionShift: "El cambio que estamos construyendo",
  shiftLead: "No es «otro portal con IA». Es infraestructura para talento y equipos que rechazan el ruido.",
  shiftPoints: [
    "Scrape → match → apply → track → schedule — un bucle, un panel, mientras duermes.",
    "Reclutadores ven perfiles ya al nivel — no montañas de CVs.",
    "Candidatos vuelven de vacaciones a entrevistas que importan — no a ghosting.",
  ],
  sectionFounding: "Mil fundadores",
  foundingHeadline: "Plan top de por vida — porque llegaste antes de la masa",
  foundingSub:
    "Habrá planes de pago en el lanzamiento. Los fundadores de esta lista mantienen Pro y Enterprise sin pagar — con un perfil activo y reglas de uso justo.",
  foundingPerks: [
    "Pro y Enterprise de por vida: auto-candidatura, matching prioritario, sync de calendario",
    "Insignia fundador + acceso anticipado a funciones",
    "Cola prioritaria — ~14 días para los primeros 1.000",
    "Sin tarjeta hoy · sin paywall en el tier que ganaste en esta lista",
  ],
  foundingFinePrint:
    "Oferta para los primeros 1.000 registros verificados. Actividad de cuenta y uso justo al lanzar; términos completos antes de facturación.",
  faqExtra: [
    {
      q: "¿Qué significa «Pro y Enterprise de por vida»?",
      a: "Si entras en el primer millar desde esta lista, conservas los planes superiores sin suscripción — según los definamos en el lanzamiento. Tu tier fundador no se retira.",
    },
    {
      q: "¿Cambiará esto la contratación?",
      a: "Apostamos por agentes + consentimiento + pipelines clasificados — no por más correos manuales. Los primeros miembros moldean el producto.",
    },
  ],
};

const fr: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "1 000 premiers — Pro & Enterprise à vie · 0 €",
  heroOfferSub:
    "Rejoignez ceux qui réécrivent la recherche d'emploi : un pipeline classé, un calendrier d'entretiens qui méritent votre temps.",
  valueStrip: [
    "Offre top à vie pour les fondateurs",
    "Sans carte · sans surprise plus tard",
    "Accès en ~14 jours si vous êtes dans le premier millier",
  ],
  sectionWhy: "Pourquoi les devs quittent le hamster des portails",
  whyLead:
    "Vous n'avez pas échoué — le jeu favorisait le volume, pas l'adéquation. TWIN est un agent autonome qui fait le travail et ne laisse sur votre calendrier que des moments prêts à accepter.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Votre niveau, pas la loterie",
      body: "Offres alignées sur vos compétences et salaire minimum. Chaque candidature est unique.",
    },
    {
      icon: "♾️",
      title: "Un accès fondateur qui dure",
      body: "Les 1 000 premiers sur cette liste verrouillent Pro et Enterprise à vie, y compris les offres les plus hautes au lancement.",
    },
    {
      icon: "📅",
      title: "Un calendrier, pas une boîte de culpabilité",
      body: "Étoile polaire : créneaux pré-qualifiés — accepter, refuser, replanifier — sans spam.",
    },
  ],
  sectionShift: "Le changement que nous construisons",
  shiftLead:
    "Ce n'est pas « une autre plateforme avec de l'IA ». C'est l'infrastructure pour les talents et les équipes qui refusent le bruit.",
  shiftPoints: [
    "Scrape → match → apply → track → schedule — une boucle, un tableau de bord, pendant que vous dormez.",
    "Les recruteurs voient des profils déjà au niveau — pas des montagnes de CV.",
    "Les candidats reviennent de congés vers des entretiens qui comptent.",
  ],
  sectionFounding: "Les mille fondateurs",
  foundingHeadline: "Offre top à vie — parce que vous étiez là avant la foule",
  foundingSub:
    "Des offres payantes existeront au lancement public. Les membres fondateurs gardent Pro et Enterprise sans payer — avec un profil actif et un usage équitable.",
  foundingPerks: [
    "Pro et Enterprise à vie : auto-candidature, matching prioritaire, sync calendrier",
    "Badge fondateur + accès anticipé aux nouveautés",
    "File prioritaire — ~14 jours pour les 1 000 premiers",
    "Pas de carte aujourd'hui · pas de paywall sur votre tier",
  ],
  foundingFinePrint:
    "Offre pour les 1 000 premières inscriptions vérifiées. Activité du compte et usage équitable au lancement ; conditions complètes avant facturation.",
  faqExtra: [
    {
      q: "Que signifie « Pro et Enterprise à vie » ?",
      a: "Si vous rejoignez le premier millier via cette liste, vous conservez les offres supérieures sans abonnement — telles que définies au lancement. Votre tier fondateur n'est pas retiré.",
    },
    {
      q: "Cela va-t-il changer le recrutement ?",
      a: "Nous parions sur agents + consentement + pipelines classés — pas sur plus d'e-mails manuels. Les premiers membres façonnent le produit.",
    },
  ],
};

const de: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "Erste 1.000 — Pro & Enterprise lebenslang · 0 €",
  heroOfferSub:
    "Schließe dich an, die Jobsuche neu schreiben: eine Rangliste, ein Kalender mit Interviews, die sich lohnen.",
  valueStrip: [
    "Top-Tarif lebenslang für Gründer",
    "Keine Karte · keine späteren Überraschungen",
    "Zugang in ~14 Tagen in den ersten tausend",
  ],
  sectionWhy: "Warum Entwickler das Portal-Hamsterrad verlassen",
  whyLead:
    "Du bist nicht gescheitert — das Spiel belohnte Masse, nicht Passung. TWIN ist ein autonomer Agent, der die Arbeit erledigt und nur akzeptierbare Termine in deinen Kalender legt.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Dein Niveau, nicht Portal-Lotterie",
      body: "Rollen passend zu Skills und Gehaltsuntergrenze. Jede Bewerbung ist individuell.",
    },
    {
      icon: "♾️",
      title: "Gründerzugang ohne Ablauf",
      body: "Die ersten 1.000 auf dieser Liste sichern Pro und Enterprise lebenslang — inklusive höchster Tiers beim Launch.",
    },
    {
      icon: "📅",
      title: "Kalender statt Schuld-Postfach",
      body: "North Star: vorqualifizierte Slots — annehmen, ablehnen, verschieben — ohne Spam.",
    },
  ],
  sectionShift: "Die Verschiebung, die wir bauen",
  shiftLead:
    "Kein «noch ein Jobportal mit KI». Infrastruktur für Talente und Teams, die Lärm ablehnen.",
  shiftPoints: [
    "Scrape → Match → Bewerben → Tracken → Planen — eine Schleife, ein Dashboard, im Schlaf.",
    "Recruiter sehen Profile auf Niveau — keine CV-Berge.",
    "Kandidaten kommen zurück zu Interviews, die zählen.",
  ],
  sectionFounding: "Gründer-Tausend",
  foundingHeadline: "Top-Tarif lebenslang — weil du vor der Masse da warst",
  foundingSub:
    "Beim öffentlichen Start gibt es Bezahlpläne. Gründer dieser Liste behalten Pro und Enterprise ohne zu zahlen — mit aktivem Profil und Fair-Use.",
  foundingPerks: [
    "Pro & Enterprise lebenslang: Auto-Apply, Priority-Matching, Kalender-Sync",
    "Gründer-Badge + früher Zugang zu Features",
    "Prioritäts-Warteschlange — ~14 Tage für die ersten 1.000",
    "Keine Karte heute · kein Paywall auf deinem Tier",
  ],
  foundingFinePrint:
    "Für die ersten 1.000 verifizierten Anmeldungen. Kontaktivität und Fair-Use beim Start; volle Bedingungen vor Abrechnung.",
  faqExtra: [
    {
      q: "Was heißt «Pro & Enterprise lebenslang»?",
      a: "Wer im ersten Tausend über diese Liste beitritt, behält die Top-Tiers ohne Abo — wie beim Launch definiert. Dein Gründer-Tier wird nicht entzogen.",
    },
    {
      q: "Verändert das Hiring?",
      a: "Wir setzen auf Agenten + Einwilligung + Ranglisten — nicht auf E-Mail-Ping-Pong. Frühe Mitglieder formen das Produkt.",
    },
  ],
};

const it: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "Primi 1.000 — Pro ed Enterprise a vita · 0 €",
  heroOfferSub:
    "Unisciti a chi riscrive la ricerca lavoro: pipeline classificata, calendario di colloqui che contano.",
  valueStrip: [
    "Piano top a vita per i fondatori",
    "Nessuna carta · nessuna sorpresa dopo",
    "Accesso in ~14 giorni se sei nel primo migliaio",
  ],
  sectionWhy: "Perché gli sviluppatori lasciano il treadmill dei portali",
  whyLead:
    "Non hai fallito — il gioco premiava il volume, non l'affinità. TWIN è un agente autonomo che fa il lavoro sporco e mette in calendario solo momenti pronti.",
  whyPillars: [
    {
      icon: "🎯",
      title: "Il tuo livello, non la lotteria",
      body: "Ruoli allineati a skill e salario minimo. Ogni candidatura è unica.",
    },
    {
      icon: "♾️",
      title: "Accesso fondatore che non scade",
      body: "I primi 1.000 su questa lista bloccano Pro ed Enterprise a vita, inclusi i tier più alti al lancio.",
    },
    {
      icon: "📅",
      title: "Calendario, non inbox di colpa",
      body: "North star: slot pre-qualificati — accetta, rifiuta, riprogramma — senza spam.",
    },
  ],
  sectionShift: "Il cambiamento che stiamo costruendo",
  shiftLead:
    "Non è «un altro job board con IA». È infrastruttura per talenti e team che rifiutano il rumore.",
  shiftPoints: [
    "Scrape → match → apply → track → schedule — un ciclo, una dashboard, mentre dormi.",
    "I recruiter vedono profili già al livello — non montagne di CV.",
    "I candidati tornano dalle ferie a colloqui che valgono la pena.",
  ],
  sectionFounding: "Mille fondatori",
  foundingHeadline: "Piano top a vita — perché sei arrivato prima della folla",
  foundingSub:
    "Al lancio pubblico ci saranno piani a pagamento. I fondatori di questa lista mantengono Pro ed Enterprise senza pagare — con un profilo attivo.",
  foundingPerks: [
    "Pro ed Enterprise a vita: auto-apply, matching prioritario, sync calendario",
    "Badge fondatore + accesso anticipato",
    "Coda prioritaria — ~14 giorni per i primi 1.000",
    "Nessuna carta oggi · nessun paywall sul tuo tier",
  ],
  foundingFinePrint:
    "Per i primi 1.000 iscritti verificati. Attività account e fair-use al go-live; termini completi prima della fatturazione.",
  faqExtra: [
    {
      q: "Cosa significa «Pro ed Enterprise a vita»?",
      a: "Se entri nel primo migliaio da questa lista, mantieni i tier top senza abbonamento — come definiti al lancio. Il tier fondatore non viene revocato.",
    },
    {
      q: "Cambierà il recruiting?",
      a: "Puntiamo su agenti + consenso + pipeline classificate — non su altre email manuali. I primi membri modellano il prodotto.",
    },
  ],
};

const zh: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "前 1000 名 — Pro 与 Enterprise 终身免费",
  heroOfferSub: "加入重写求职方式的一群人：一条排序管道，一个值得赴约的面试日历。",
  valueStrip: ["创始成员终身最高套餐", "无需信用卡", "前一千名约 14 天内开通"],
  sectionWhy: "开发者为何离开刷岗位的模式",
  whyLead: "不是你失败了——游戏规则奖励数量而非匹配。TWIN 是自主代理，替你完成苦工，只在日历上留下值得接受的时刻。",
  whyPillars: [
    { icon: "🎯", title: "你的标准，不是门户彩票", body: "岗位匹配技能与薪资底线，每份申请都量身定制。" },
    { icon: "♾️", title: "不过期的创始权益", body: "本候补名单前 1000 名锁定终身 Pro 与 Enterprise，含公开发布时的最高档位。" },
    { icon: "📅", title: "日历，而非愧疚收件箱", body: "北极星：预筛选时段——接受、拒绝、改期——对候选人与招聘方都减少噪音。" },
  ],
  sectionShift: "我们正在推动的转变",
  shiftLead: "不是「又一个带 AI 的招聘站」，而是让人才与团队摆脱噪音的基础设施。",
  shiftPoints: [
    "抓取 → 匹配 → 投递 → 跟踪 → 排期——一条闭环，一个面板，在你睡觉时运行。",
    "招聘方看到已达标的画像，而非 CV 山。",
    "候选人度假回来面对的是值得准备的面试。",
  ],
  sectionFounding: "创始一千",
  foundingHeadline: "终身最高档——因为你早于人群到来",
  foundingSub: "公开发布会有付费计划；本名单创始成员保留 Pro 与 Enterprise 功能且无需付费。",
  foundingPerks: [
    "终身 Pro 与 Enterprise：自动投递、优先匹配、日历同步",
    "创始徽章 + 新功能抢先体验",
    "优先队列——前 1000 名通常约 14 天",
    "今日无需绑卡 · 已获档位不会突然收费",
  ],
  foundingFinePrint: "限前 1000 名 verified 注册；上线时适用账户活跃与合理使用规则；计费前公布完整条款。",
  faqExtra: [
    { q: "「终身 Pro 与 Enterprise」指什么？", a: "若通过本名单在前 1000 加入，可永久保留我们定义的顶级套餐，无需订阅。" },
    { q: "这会改变招聘吗？", a: "我们押注代理 + 同意 + 排序管道，而非更多人工邮件往返。" },
  ],
};

const ja: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "最初の1000人 — Pro・Enterprise 永久無料",
  heroOfferSub: "転職のやり方を書き換える仲間に参加：ランク付きパイプラインと、会う価値のある面接カレンダー。",
  valueStrip: ["創設メンバーは最上位プラン永久", "クレジットカード不要", "最初の1000人は約14日でアクセス"],
  sectionWhy: "開発者がポータルのハムスターから降りる理由",
  whyLead: "あなたが負けたのではない——ゲームは量を評価し、適合を評価しなかった。TWINは自律エージェントが雑務を担い、受け入れ可能な瞬間だけをカレンダーに残す。",
  whyPillars: [
    { icon: "🎯", title: "あなたの基準、ポータルの宝くじではない", body: "スキルと最低年収に合う求人のみ。応募はすべて一意。" },
    { icon: "♾️", title: "期限のない創設アクセス", body: "本ウェイトリスト最初の1000人は Pro・Enterprise を永久にロック。" },
    { icon: "📅", title: "カレンダー、罪悪感のインボックスではない", body: "北極星：事前 qualified スロット——承諾・辞退・再調整——スパムなし。" },
  ],
  sectionShift: "私たちが作る転換",
  shiftLead: "「AI付き求人サイト」ではない。ノイズを拒む人材とチームのための基盤。",
  shiftPoints: [
    "スクレイプ→マッチ→応募→追跡→予定——一つのループ、一つのダッシュボード、睡眠中も。",
    "採用担当は基準を満たしたプロフィールだけ見る。",
    "候補者は休暇後、準備する価値のある面接に戻る。",
  ],
  sectionFounding: "創設1000",
  foundingHeadline: "最上位プラン永久——群衆の前に来たから",
  foundingSub: "公開時に有料プランはある。本リストの創設メンバーは Pro・Enterprise を永久無料で維持。",
  foundingPerks: [
    "永久 Pro・Enterprise：自動応募、優先マッチ、カレンダー同期",
    "創設バッジ + 新機能の早期アクセス",
    "優先キュー——最初の1000人は約14日",
    "今日カード不要 · 獲得ティアに突然のペイウォールなし",
  ],
  foundingFinePrint: "最初の1000 verified 登録まで。アカウント活動とフェアユースはローンチ時適用。",
  faqExtra: [
    { q: "「永久 Pro・Enterprise」とは？", a: "本リストから最初の1000人で参加すれば、最上位ティアをサブスクなしで維持。" },
    { q: "採用は変わる？", a: "エージェント+同意+ランク付きパイプラインに賭ける——手動メール往復ではない。" },
  ],
};

const ar: WaitlistNarrative = {
  ...en,
  heroOfferBadge: "أول 1000 — Pro و Enterprise مجاني مدى الحياة",
  heroOfferSub: "انضم من يعيد كتابة البحث عن عمل: خط أنابيب مُرتّب وتقويم مقابلات يستحق وقتك.",
  valueStrip: ["أعلى باقة مدى الحياة للمؤسسين", "بدون بطاقة ائتمان", "وصول في ~14 يومًا للألف الأولى"],
  sectionWhy: "لماذا يغادر المطورون هامستر البوابات",
  whyLead: "لم تفشل — اللعبة كافأت الحجم لا الملاءمة. TWIN وكيل مستقل يقوم بالعمل الشاق ويضع على تقويمك لحظات جاهزة للقبول.",
  whyPillars: [
    { icon: "🎯", title: "معيارك، لا يانصيب البوابة", body: "وظائف مطابقة لمهاراتك وحد الراتب. كل طلب فريد." },
    { icon: "♾️", title: "وصول مؤسس لا ينتهي", body: "أول 1000 على هذه القائمة يثبتون Pro و Enterprise مدى الحياة." },
    { icon: "📅", title: "تقويم، لا صندوق ذنب", body: "الهدف: فتحات مؤهلة مسبقًا — قبول، رفض، إعادة جدولة — بلا إزعاج." },
  ],
  sectionShift: "التحول الذي نبنيه",
  shiftLead: "ليس «موقع وظائف آخر بالذكاء الاصطناعي». بنية تحتية للمواهب والفرق التي ترفض الضوضاء.",
  shiftPoints: [
    "جمع → مطابقة → تقديم → تتبع → جدولة — حلقة واحدة، لوحة واحدة، وأنت نائم.",
    "المُوظّفون يرون ملفات عند المستوى — لا جبال سير ذاتية.",
    "المرشحون يعودون من الإجازة لمقابلات تستحق التحضير.",
  ],
  sectionFounding: "الألف المؤسس",
  foundingHeadline: "أعلى باقة مدى الحياة — لأنك سبقت الحشد",
  foundingSub: "ستوجد خطط مدفوعة عند الإطلاق العام. المؤسسون من هذه القائمة يحتفظون بـ Pro و Enterprise دون دفع.",
  foundingPerks: [
    "Pro و Enterprise مدى الحياة: تقديم تلقائي، مطابقة أولوية، مزامنة تقويم",
    "شارة مؤسس + وصول مبكر للميزات",
    "طابور أولوية — ~14 يومًا لأول 1000",
    "لا بطاقة اليوم · لا حاجز دفع مفاجئ على باقاتك",
  ],
  foundingFinePrint: "لأول 1000 تسجيل مُتحقق. نشاط الحساب والاستخدام العادل عند الإطلاق؛ شروط كاملة قبل الفوترة.",
  faqExtra: [
    { q: "ماذا يعني «Pro و Enterprise مدى الحياة»؟", a: "إذا انضممت من أول 1000 عبر هذه القائمة، تحتفظ بأعلى الباقات دون اشتراك." },
    { q: "هل سيغيّر هذا التوظيف؟", a: "نراهن على الوكلاء + الموافقة + خطوط أنابيب مُرتبة — لا مزيد من مراسلات البريد اليدوية." },
  ],
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
