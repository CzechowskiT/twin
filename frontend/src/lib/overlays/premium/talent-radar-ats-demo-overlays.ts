import type { Locale } from "@/lib/i18n";

type TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar?: Record<string, string>;
  recruiterTalentRadarDigest?: Record<string, string>;
  atsImportReadiness?: Record<string, string>;
  founderLedDemo?: Record<string, string>;
  executiveProductProof?: Record<string, string>;
};

const it: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "Radar dei talenti",
    navLink: "Radar dei talenti",
    disclaimer:
      "Il Radar dei talenti mostra segnali e contesto. Il recruiter decide se e come contattare il candidato.",
    chipNoAutoOutreach: "Nessun contatto in uscita automatico",
  },
  recruiterTalentRadarDigest: {
    title: "Digest settimanale del Radar dei talenti",
    trustNoOutreach: "Nessun contatto in uscita automatico — il recruiter decide ogni contatto.",
  },
  atsImportReadiness: {
    title: "Prontezza import ATS",
    lead: "Workspace di mappatura e revisione import — solo pilota demo. Nessuna sincronizzazione ATS live, nessuna credenziale, nessuna scrittura su ATS.",
    boundaryBody:
      "TWIN mostra la mappatura di prontezza import ATS per la revisione del recruiter. Solo prontezza import — nessuna sincronizzazione ATS live, nessuna scrittura su ATS, nessun contatto in uscita automatico.",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "Radar dei talenti",
    journeyTalentRadarDesc:
      "Pipeline classificata con posticipa, esclusione, bozze e memoria decisionale per audit.",
    boundaryNoOutreach:
      "Nessun contatto in uscita automatico — i messaggi li invia il recruiter; TWIN non contatta i candidati in cold email.",
  },
  executiveProductProof: {
    linkAtsReadiness: "Prontezza import ATS",
    boundaryNoAtsSync: "Nessuna sincronizzazione ATS bidirezionale — solo anteprima prontezza import.",
    boundaryNoOutreach: "Nessun contatto in uscita automatico — le bozze richiedono revisione umana.",
  },
};

const fr: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "Radar des talents",
    navLink: "Radar des talents",
    disclaimer:
      "Le Radar des talents affiche signaux et contexte. Le recruteur décide s'il faut contacter le candidat et comment.",
    chipNoAutoOutreach: "Pas de contact sortant automatique",
  },
  recruiterTalentRadarDigest: {
    title: "Digest hebdomadaire du Radar des talents",
    trustNoOutreach: "Pas de contact sortant automatique — le recruteur décide de chaque contact.",
  },
  atsImportReadiness: {
    title: "Préparation import ATS",
    lead: "Espace de mapping et revue d'import — pilote démo uniquement. Pas de synchro ATS live, pas d'identifiants, pas d'écriture ATS.",
    boundaryBody:
      "TWIN affiche le mapping de préparation import ATS pour revue recruteur. Préparation import uniquement — pas de synchro ATS live, pas d'écriture ATS, pas de contact sortant automatique.",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "Radar des talents",
    journeyTalentRadarDesc:
      "Pipeline classée avec report, rejet, brouillons et mémoire décisionnelle pour audit.",
    boundaryNoOutreach:
      "Pas de contact sortant automatique — le recruteur envoie les messages ; TWIN ne contacte pas les candidats à froid.",
  },
  executiveProductProof: {
    linkAtsReadiness: "Préparation import ATS",
    boundaryNoAtsSync: "Pas de synchro ATS bidirectionnelle — aperçu préparation import uniquement.",
    boundaryNoOutreach: "Pas de contact sortant automatique — les brouillons exigent une revue humaine.",
  },
};

const de: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "Talent-Radar",
    navLink: "Talent-Radar",
    disclaimer:
      "Das Talent-Radar zeigt Signale und Kontext. Der Recruiter entscheidet, ob und wie der Kandidat kontaktiert wird.",
    chipNoAutoOutreach: "Kein automatischer Outbound-Kontakt",
  },
  recruiterTalentRadarDigest: {
    title: "Wöchentlicher Talent-Radar-Digest",
    trustNoOutreach: "Kein automatischer Outbound — der Recruiter entscheidet über jeden Kontakt.",
  },
  atsImportReadiness: {
    title: "ATS-Import-Bereitschaft",
    lead: "Mapping- und Import-Review-Workspace — nur Demo-Pilot. Keine Live-ATS-Sync, keine Credentials, kein ATS-Writeback.",
    boundaryBody:
      "TWIN zeigt ATS-Import-Bereitschafts-Mapping zur Recruiter-Review. Nur Import-Bereitschaft — keine Live-ATS-Sync, kein ATS-Writeback, kein automatischer Outbound.",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "Talent-Radar",
    journeyTalentRadarDesc:
      "Gerankte Pipeline mit Snooze, Ablehnung, Entwürfen und auditfreundlicher Entscheidungshistorie.",
    boundaryNoOutreach:
      "Kein automatischer Outbound — Recruiter senden Nachrichten; TWIN kontaktiert Kandidaten nicht per Cold-Mail.",
  },
  executiveProductProof: {
    linkAtsReadiness: "ATS-Import-Bereitschaft",
    boundaryNoAtsSync: "Keine bidirektionale ATS-Sync — nur Import-Bereitschafts-Vorschau.",
    boundaryNoOutreach: "Kein automatischer Outbound — Entwürfe erfordern menschliche Review.",
  },
};

const zh: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "人才雷达",
    navLink: "人才雷达",
    disclaimer: "人才雷达展示信号与背景。是否以及如何联系候选人由招聘人员决定。",
    chipNoAutoOutreach: "无自动外联",
  },
  recruiterTalentRadarDigest: {
    title: "人才雷达周报摘要",
    trustNoOutreach: "无自动外联 — 每次联系由招聘人员决定。",
  },
  atsImportReadiness: {
    title: "ATS 导入就绪",
    lead: "连接器映射与导入审阅工作区 — 仅演示试点。无实时 ATS 同步、无凭据、无 ATS 回写。",
    boundaryBody:
      "TWIN 展示 ATS 导入就绪映射供招聘人员审阅。仅导入就绪 — 无实时 ATS 同步、无 ATS 回写、无自动外联。",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "人才雷达",
    journeyTalentRadarDesc: "带延后、排除、草稿决策与可审计决策记忆的排序管道。",
    boundaryNoOutreach: "无自动外联 — 消息由招聘人员发送；TWIN 不会冷邮件联系候选人。",
  },
  executiveProductProof: {
    linkAtsReadiness: "ATS 导入就绪",
    boundaryNoAtsSync: "无双向往返 ATS 同步 — 仅导入就绪预览。",
    boundaryNoOutreach: "无自动外联 — 草稿需人工审阅。",
  },
};

const ar: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "رادار المواهب",
    navLink: "رادار المواهب",
    disclaimer: "يعرض رادار المواهب الإشارات والسياق. يقرر المُوظّف ما إذا كان سيتواصل مع المرشح وكيف.",
    chipNoAutoOutreach: "لا تواصل صادر تلقائي",
  },
  recruiterTalentRadarDigest: {
    title: "ملخص أسبوعي لرادار المواهب",
    trustNoOutreach: "لا تواصل صادر تلقائي — المُوظّف يقرر كل تواصل.",
  },
  atsImportReadiness: {
    title: "جاهزية استيراد ATS",
    lead: "مساحة تعيين ومراجعة الاستيراد — تجريبي للعرض فقط. بلا مزامنة ATS حية ولا بيانات اعتماد ولا كتابة على ATS.",
    boundaryBody:
      "يعرض TWIN تعيين جاهزية استيراد ATS لمراجعة المُوظّف. جاهزية الاستيراد فقط — بلا مزامنة ATS حية ولا كتابة على ATS ولا تواصل صادر تلقائي.",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "رادار المواهب",
    journeyTalentRadarDesc: "خط أنابيب مُرتّب مع تأجيل واستبعاد ومسودات وذاكرة قرارات قابلة للتدقيق.",
    boundaryNoOutreach:
      "لا تواصل صادر تلقائي — المُوظّف يرسل الرسائل؛ TWIN لا يتواصل مع المرشحين ببريد بارد.",
  },
  executiveProductProof: {
    linkAtsReadiness: "جاهزية استيراد ATS",
    boundaryNoAtsSync: "بلا مزامنة ATS ثنائية — معاينة جاهزية الاستيراد فقط.",
    boundaryNoOutreach: "لا تواصل صادر تلقائي — المسودات تتطلب مراجعة بشرية.",
  },
};

const es: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "Radar de talento",
    navLink: "Radar de talento",
    chipNoAutoOutreach: "Sin contacto saliente automático",
  },
  recruiterTalentRadarDigest: {
    title: "Digest semanal del Radar de talento",
  },
  atsImportReadiness: {
    title: "Preparación de importación ATS",
    noLiveSyncBadge: "SIN SINCRONIZACIÓN ATS EN VIVO",
    noWritebackBadge: "SIN ESCRITURA EN ATS",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "Radar de talento",
    journeyTalentPoolImportTitle: "Importación de memoria de talento",
  },
};

const ja: TalentRadarAtsDemoOverlay = {
  recruiterTalentRadar: {
    title: "タレントレーダー",
    navLink: "タレントレーダー",
    chipNoAutoOutreach: "自動アウトリーチなし",
  },
  recruiterTalentRadarDigest: {
    title: "タレントレーダー週次ダイジェスト",
  },
  atsImportReadiness: {
    title: "ATSインポート準備",
    noLiveSyncBadge: "ライブATS同期なし",
    noWritebackBadge: "ATS書き戻しなし",
  },
  founderLedDemo: {
    journeyTalentRadarTitle: "タレントレーダー",
    journeyTalentPoolImportTitle: "タレントメモリのインポート",
  },
};

export const TALENT_RADAR_ATS_DEMO_OVERLAYS: Partial<Record<Locale, TalentRadarAtsDemoOverlay>> = {
  it,
  fr,
  de,
  zh,
  ar,
  es,
  ja,
};
