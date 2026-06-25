import type { Locale } from "@/lib/i18n";

type PersonaHubRecruiterOverlay = {
  companyTalentPool?: Record<string, string>;
  recruiterTrustReviewQueue?: Record<string, string>;
  recruiterOperationalWorkQueue?: Record<string, string>;
  recruiterDailyCockpit?: Record<string, string>;
};

const es: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "Memoria de talento de la empresa",
    lead:
      "Vista estructurada de candidatos que su organización ya conoce — para futuras contrataciones y Talent Radar. Datos internos primero; revisión del reclutador antes de cualquier contacto.",
    navLink: "Memoria de talento",
    chipNoOutreach: "Sin contacto saliente automático",
    chipAtsPlanned: "Sincronización ATS planificada",
    trustCopy:
      "La memoria de talento no contacta candidatos — solo interno, sin contacto saliente automático, sin sincronización ATS en vivo. Revisión del reclutador antes del contacto.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "Cola de revisión de confianza",
    pageTitle: "Cola de revisión de confianza del reclutador",
    summaryLead:
      "Eventos de confianza/control del candidato agregados que requieren revisión humana — solo lectura, sin aprobaciones.",
    boundaryBody:
      "Esta cola es agregación demo de solo lectura. Sin botones de aprobación, correo, contacto saliente ni escritura en ATS. Decisión humana requerida en todas las acciones de confianza del candidato.",
    navLink: "Cola de revisión de confianza",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "Cola de trabajo operativo",
    pageTitle: "Cola de trabajo operativo del reclutador",
    summaryLead: "Elementos de trabajo demo agregados — sin acciones activas habilitadas.",
    boundaryBody:
      "Revisión humana requerida. Todas las acciones salientes deshabilitadas — cola solo demo.",
    navLink: "Cola de trabajo",
  },
  recruiterDailyCockpit: {
    navLink: "Cockpit diario",
    pageEyebrow: "Cockpit operativo diario del reclutador",
    title: "Lista de trabajo de hoy — piloto",
    lead:
      "Colas demo deterministas: decisiones, confianza, feedback, borradores, revisión ATS y pipeline — solo acciones humanas.",
    atsImportTitle: "Cola de revisión de importación ATS",
    atsImportLead: "Vista previa de mapeo y deduplicación — sin sincronización en vivo ni escritura en ATS en el piloto.",
    humanBoundaryBody:
      "TWIN agrega colas para revisión del reclutador. Los resúmenes asistidos por IA informan — no deciden. Sin contacto saliente automático, sin aplicación automática, sin escritura en ATS, sin correo enviado.",
  },
};

const ja: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "企業のタレントメモリ",
    lead:
      "組織がすでに把握している候補者の構造化ビュー — 将来の採用とタレントレーダー向け。まず内部データ。連絡前にリクルーターの確認が必要です。",
    navLink: "タレントメモリ",
    chipNoOutreach: "自動アウトリーチなし",
    chipAtsPlanned: "ATS同期は計画中",
    trustCopy:
      "企業のタレントメモリは候補者に連絡しません — 内部のみ、自動アウトリーチなし、ライブATS同期なし。連絡前にリクルーターの確認が必要です。",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "信頼レビューキュー",
    pageTitle: "リクルーター信頼レビューキュー",
    summaryLead:
      "人間のレビューが必要な候補者の信頼/制御イベントの集約 — 読み取り専用、承認なし。",
    boundaryBody:
      "このキューは読み取り専用のデモ集約です。承認ボタン、メール、アウトリーチ、ATS書き戻しはありません。候補者の信頼アクションはすべて人間の判断が必要です。",
    navLink: "信頼レビューキュー",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "運用ワークキュー",
    pageTitle: "リクルーター運用ワークキュー",
    summaryLead: "集約されたデモ作業項目 — 有効なライブアクションなし。",
    boundaryBody: "人間のレビューが必要です。すべての送信アクションは無効 — デモのみのキュー。",
    navLink: "ワークキュー",
  },
  recruiterDailyCockpit: {
    navLink: "デイリーコックピット",
    pageEyebrow: "リクルーター日次運用コックピット",
    title: "今日の作業リスト — パイロット",
    lead:
      "決定、信頼、フィードバック、下書き、ATSレビュー、パイプラインの決定論的デモキュー — 人間のみのアクション。",
    atsImportTitle: "ATSインポートレビューキュー",
    atsImportLead: "マッピングと重複排除のプレビュー — パイロットではライブ同期も書き戻しもありません。",
    humanBoundaryBody:
      "TWINはリクルーター向けにキューを集約します。AI支援の要約は情報提供のみ — 決定しません。自動アウトリーチなし、自動応募なし、ATS書き戻しなし、メール送信なし。",
  },
};

const it: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "Memoria talenti aziendale",
    lead:
      "Vista strutturata dei candidati che la tua organizzazione conosce già — per assunzioni future e Talent Radar. Dati interni prima; revisione manuale del recruiter prima di qualsiasi contatto.",
    navLink: "Memoria talenti",
    chipNoOutreach: "Nessun contatto in uscita automatico",
    chipAtsPlanned: "Sincronizzazione ATS pianificata",
    trustCopy:
      "La memoria talenti non contatta i candidati — solo interno, nessun contatto in uscita automatico, nessuna sincronizzazione ATS live. Revisione manuale del recruiter prima del contatto.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "Coda revisione fiducia",
    pageTitle: "Coda revisione fiducia recruiter",
    summaryLead:
      "Eventi fiducia/controllo candidato aggregati che richiedono revisione manuale — solo lettura, senza approvazioni.",
    boundaryBody:
      "Questa coda è aggregazione demo solo lettura. Nessun pulsante di approvazione, email, contatto in uscita né scrittura nell'ATS. Decisione umana richiesta per tutte le azioni fiducia candidato.",
    navLink: "Coda revisione fiducia",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "Coda lavoro operativo",
    pageTitle: "Coda lavoro operativo recruiter",
    summaryLead: "Elementi di lavoro demo aggregati — nessuna azione live abilitata.",
    boundaryBody: "Revisione manuale richiesta. Tutte le azioni in uscita disabilitate — coda solo demo.",
    navLink: "Coda lavoro",
  },
  recruiterDailyCockpit: {
    navLink: "Cockpit giornaliero",
    pageEyebrow: "Cockpit operativo giornaliero recruiter",
    title: "Lista lavoro di oggi — pilota",
    lead:
      "Code demo deterministiche: decisioni, fiducia, feedback, bozze, revisione ATS e pipeline — solo azioni umane.",
    atsImportTitle: "Coda revisione import ATS",
    atsImportLead: "Anteprima mapping e deduplicazione — nessuna sincronizzazione live né scrittura nell'ATS nel pilota.",
    humanBoundaryBody:
      "TWIN aggrega code per revisione recruiter. I riepiloghi assistiti da IA informano — non decidono. Nessun contatto in uscita automatico, nessuna auto-candidatura, nessuna scrittura nell'ATS, nessuna email inviata.",
  },
};

const fr: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "Mémoire talents entreprise",
    lead:
      "Vue structurée des candidats que votre organisation connaît déjà — pour les prochains recrutements et le Talent Radar. Données internes d'abord ; revue manuelle du recruteur avant tout contact.",
    navLink: "Mémoire talents",
    chipNoOutreach: "Pas de contact sortant automatique",
    chipAtsPlanned: "Synchronisation ATS planifiée",
    trustCopy:
      "La mémoire talents ne contacte pas les candidats — interne uniquement, pas de contact sortant automatique, pas de synchronisation ATS en direct. Revue manuelle du recruteur avant contact.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "File de revue confiance",
    pageTitle: "File de revue confiance recruteur",
    summaryLead:
      "Événements confiance/contrôle candidat agrégés nécessitant une revue manuelle — lecture seule, sans approbations.",
    boundaryBody:
      "Cette file est une agrégation démo en lecture seule. Pas de boutons d'approbation, email, contact sortant ni écriture dans l'ATS. Décision humaine requise pour toutes les actions confiance candidat.",
    navLink: "File revue confiance",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "File de travail opérationnel",
    pageTitle: "File de travail opérationnel recruteur",
    summaryLead: "Éléments de travail démo agrégés — aucune action live activée.",
    boundaryBody: "Revue manuelle requise. Toutes les actions sortantes désactivées — file démo uniquement.",
    navLink: "File de travail",
  },
  recruiterDailyCockpit: {
    navLink: "Cockpit quotidien",
    pageEyebrow: "Cockpit opérationnel quotidien recruteur",
    title: "Liste de travail du jour — pilote",
    lead:
      "Files démo déterministes : décisions, confiance, feedback, brouillons, revue ATS et pipeline — actions humaines uniquement.",
    atsImportTitle: "File de revue import ATS",
    atsImportLead: "Aperçu mapping et déduplication — aucune synchronisation en direct ni écriture dans l'ATS sur ce pilote.",
    humanBoundaryBody:
      "TWIN agrège des files pour revue recruteur. Les résumés assistés par IA informent — ne décident pas. Pas de contact sortant automatique, pas d'auto-candidature, pas d'écriture dans l'ATS, aucun email envoyé.",
  },
};

const de: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "Unternehmens-Talentgedächtnis",
    lead:
      "Strukturierte Ansicht von Kandidaten, die Ihre Organisation bereits kennt — für künftige Einstellungen und Talent-Radar. Zuerst interne Daten; manuelle Recruiter-Prüfung vor jedem Kontakt.",
    navLink: "Talentgedächtnis",
    chipNoOutreach: "Kein automatischer ausgehender Kontakt",
    chipAtsPlanned: "ATS-Synchronisierung geplant",
    trustCopy:
      "Das Talentgedächtnis kontaktiert keine Kandidaten — nur intern, kein automatischer ausgehender Kontakt, keine Live-ATS-Synchronisierung. Manuelle Recruiter-Prüfung vor Kontakt.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "Vertrauensprüfungs-Warteschlange",
    pageTitle: "Recruiter-Vertrauensprüfungs-Warteschlange",
    summaryLead:
      "Aggregierte Kandidaten-Vertrauens-/Kontrollereignisse mit manueller Prüfung — Nur-Lese-Ansicht, keine Freigaben.",
    boundaryBody:
      "Diese Warteschlange ist eine reine Demo-Aggregation. Keine Freigabe-Buttons, E-Mail, ausgehender Kontakt oder ATS-Schreibvorgänge. Menschliche Entscheidung für alle Kandidaten-Vertrauensaktionen erforderlich.",
    navLink: "Vertrauensprüfung",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "Operative Arbeitswarteschlange",
    pageTitle: "Recruiter-Arbeitswarteschlange",
    summaryLead: "Aggregierte Demo-Arbeitspunkte — keine aktiven Live-Aktionen.",
    boundaryBody: "Manuelle Prüfung erforderlich. Alle ausgehenden Aktionen deaktiviert — nur Demo-Warteschlange.",
    navLink: "Arbeitswarteschlange",
  },
  recruiterDailyCockpit: {
    navLink: "Tägliches Cockpit",
    pageEyebrow: "Tägliches Recruiter-Betriebs-Cockpit",
    title: "Heutige Arbeitsliste — Pilot",
    lead:
      "Deterministische Demo-Warteschlangen: Entscheidungen, Vertrauen, Feedback, Entwürfe, ATS-Prüfung und Pipeline — nur menschliche Aktionen.",
    atsImportTitle: "ATS-Import-Prüfungswarteschlange",
    atsImportLead: "Mapping- und Deduplizierungsvorschau — keine Live-Synchronisierung, kein Zurückschreiben ins ATS im Pilot.",
    humanBoundaryBody:
      "TWIN aggregiert Warteschlangen zur Recruiter-Prüfung. KI-unterstützte Zusammenfassungen informieren — entscheiden nicht. Kein automatischer ausgehender Kontakt, keine automatische Bewerbung, kein Zurückschreiben ins ATS, keine E-Mail gesendet.",
  },
};

const zh: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "企业人才记忆",
    lead:
      "组织已了解候选人的结构化视图 — 用于未来招聘与人才雷达。内部数据优先；任何联系前需招聘人员人工审核。",
    navLink: "人才记忆",
    chipNoOutreach: "无自动外联",
    chipAtsPlanned: "ATS 同步计划中",
    trustCopy:
      "人才记忆不会联系候选人 — 仅内部使用，无自动外联，无实时 ATS 同步。联系前需招聘人员人工审核。",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "信任审核队列",
    pageTitle: "招聘人员信任审核队列",
    summaryLead: "需要人工审核的候选人信任/控制事件汇总 — 只读，无审批。",
    boundaryBody:
      "此队列为只读演示汇总。无审批按钮、邮件、外联或 ATS 写入。所有候选人信任操作均需人工决策。",
    navLink: "信任审核队列",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "运营工作队列",
    pageTitle: "招聘人员运营工作队列",
    summaryLead: "汇总的演示工作项 — 无启用的实时操作。",
    boundaryBody: "需要人工审核。所有外发操作已禁用 — 仅演示队列。",
    navLink: "工作队列",
  },
  recruiterDailyCockpit: {
    navLink: "每日驾驶舱",
    pageEyebrow: "招聘人员每日运营驾驶舱",
    title: "今日工作清单 — 试点",
    lead: "确定性演示队列：决策、信任、反馈、草稿、ATS 审核与管道 — 仅人工操作。",
    atsImportTitle: "ATS 导入审核队列",
    atsImportLead: "映射与去重预览 — 本试点无实时同步、不会写入 ATS。",
    humanBoundaryBody:
      "TWIN 汇总队列供招聘人员审核。AI 辅助摘要仅提供信息 — 不做决策。无自动外联、无自动申请、不会写入 ATS、不发送邮件。",
  },
};

const ar: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "ذاكرة مواهب الشركة",
    lead:
      "عرض منظّم للمرشحين الذين تعرفهم مؤسستك بالفعل — للتوظيف المستقبلي ورادار المواهب. البيانات الداخلية أولًا؛ مراجعة بشرية من المُوظّف قبل أي تواصل.",
    navLink: "ذاكرة المواهب",
    chipNoOutreach: "لا تواصل صادر تلقائي",
    chipAtsPlanned: "مزامنة ATS مخططة",
    trustCopy:
      "ذاكرة المواهب لا تتواصل مع المرشحين — داخلي فقط، بلا تواصل صادر تلقائي ولا مزامنة ATS حية. مراجعة بشرية من المُوظّف قبل التواصل.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "طابور مراجعة الثقة",
    pageTitle: "طابور مراجعة ثقة المُوظّف",
    summaryLead:
      "أحداث ثقة/تحكم المرشح المجمّعة التي تتطلب مراجعة بشرية — عرض للقراءة فقط، بلا موافقات.",
    boundaryBody:
      "هذا الطابور تجميع تجريبي للقراءة فقط. بلا أزرار موافقة ولا بريد ولا تواصل صادر ولا كتابة في ATS. قرار بشري مطلوب لجميع إجراءات ثقة المرشح.",
    navLink: "طابور مراجعة الثقة",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "طابور العمل التشغيلي",
    pageTitle: "طابور عمل المُوظّف التشغيلي",
    summaryLead: "عناصر عمل تجريبية مجمّعة — بلا إجراءات حية مفعّلة.",
    boundaryBody: "تتطلب مراجعة بشرية. جميع الإجراءات الصادرة معطّلة — طابور تجريبي فقط.",
    navLink: "طابور العمل",
  },
  recruiterDailyCockpit: {
    navLink: "قمرة القيادة اليومية",
    pageEyebrow: "قمرة قيادة المُوظّف اليومية",
    title: "قائمة عمل اليوم — طيار",
    lead:
      "طوابير تجريبية حتمية: قرارات وثقة وملاحظات ومسودات ومراجعة ATS ومسار — إجراءات بشرية فقط.",
    atsImportTitle: "طابور مراجعة استيراد ATS",
    atsImportLead: "معاينة التعيين وإزالة التكرار — بلا مزامنة حية ولا كتابة في ATS في هذا الطيار.",
    humanBoundaryBody:
      "يجمع TWIN الطوابير لمراجعة المُوظّف. الملخصات المدعومة بالذكاء الاصطناعي تُعلِم — لا تقرر. بلا تواصل صادر تلقائي ولا تقديم تلقائي ولا كتابة في ATS ولا بريد مُرسل.",
  },
};

export const PERSONA_HUB_RECRUITER_OVERLAYS: Partial<Record<Locale, PersonaHubRecruiterOverlay>> = {
  es,
  ja,
  it,
  fr,
  de,
  zh,
  ar,
};
