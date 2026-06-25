import type { Locale } from "@/lib/i18n";

type ProfilePipelineTrustOverlay = {
  candidateProfile360?: Record<string, string>;
  jobPipeline?: Record<string, string>;
  candidateCollaboration?: Record<string, string>;
  candidateTrust?: Record<string, string>;
  candidateTrustCenter?: Record<string, string>;
  candidateExportPreview?: Record<string, string>;
  candidateIdentityVerification?: Record<string, string>;
  candidateDataPortability?: Record<string, string>;
  candidateRevokeDelete?: Record<string, string>;
  candidateTrustAuditExport?: Record<string, string>;
  candidateConsentReceipt?: Record<string, string>;
  candidateTrustOverview?: Record<string, string>;
};

const es: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "Perfil del candidato 360",
    pageTitle: "Perfil del candidato 360",
    boundaryBody:
      "TWIN prepara señales y memoria — el reclutador decide lista corta, posponer, descartar y contacto. Sin auto-aplicación, sin contacto saliente automático, sin contacto oculto con el candidato.",
  },
  jobPipeline: {
    pageEyebrow: "Embudo de la vacante",
    pageTitle: "Embudo de contratación",
    boundaryBody:
      "TWIN clasifica y muestra candidatos por vacante — el reclutador decide movimientos de etapa, contacto y ofertas. Sin auto-aplicación, sin contacto saliente automático, sin escritura en el ATS en este piloto.",
  },
  candidateTrustCenter: {
    pageTitle: "Centro de confianza del candidato",
    boundaryBody:
      "TWIN muestra lo que guardamos, lo que ven los reclutadores y cómo puedes controlarlo. Sin auto-aplicación, sin contacto automatizado, sin veredictos de IA sobre contratación — tú decides cuándo aplicar y quién contacta.",
  },
  candidateExportPreview: {
    pageTitle: "Vista previa de exportación del candidato",
    boundaryBody:
      "Este JSON es un paquete de vista previa solo demo. No es una exportación legal, no muta el backend y excluye ATS en vivo, contacto saliente y PII de contacto.",
  },
  candidateIdentityVerification: {
    pageTitle: "Verificación de identidad del candidato",
    boundaryBody:
      "Esta página es un piloto de verificación de identidad solo demo. Sin KYC, sin carga de documentos, sin llamadas a API de proveedor ni mutación de backend.",
  },
};

const it: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "Profilo candidato 360",
    pageTitle: "Profilo candidato 360",
    boundaryBody:
      "TWIN prepara segnali e memoria — il recruiter decide lista ristretta, posticipa, scarta e contatto. Nessuna auto-candidatura, nessun contatto in uscita automatico, nessun contatto nascosto col candidato.",
  },
  jobPipeline: {
    pageEyebrow: "Pipeline della posizione",
    pageTitle: "Pipeline di recruiting",
    boundaryBody:
      "TWIN classifica e mostra i candidati per ruolo — il recruiter decide spostamenti di fase, contatto e offerte. Nessuna auto-candidatura, nessun contatto in uscita automatico, nessuna scrittura nell'ATS in questo pilota.",
  },
  candidateTrustCenter: {
    pageTitle: "Centro fiducia candidato",
    boundaryBody:
      "TWIN mostra cosa conserviamo, cosa vedono i recruiter e come puoi controllarlo. Nessuna auto-candidatura, nessun contatto automatizzato, nessun verdetto IA sull'assunzione — decidi tu quando candidarti e chi contattare.",
  },
  candidateExportPreview: {
    pageTitle: "Anteprima export candidato",
    boundaryBody:
      "Questo JSON è un pacchetto anteprima solo demo. Non è un export legale, non muta il backend ed esclude ATS live, contatto in uscita e PII di contatto.",
  },
  candidateIdentityVerification: {
    pageTitle: "Verifica identità candidato",
    boundaryBody:
      "Questa pagina è un pilota di verifica identità solo demo. Nessun KYC, nessun caricamento documenti, nessuna chiamata API provider né mutazione backend.",
  },
};

const fr: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "Profil candidat 360",
    pageTitle: "Profil candidat 360",
    boundaryBody:
      "TWIN prépare signaux et mémoire — le recruteur décide liste restreinte, report, rejet et contact. Pas d'auto-candidature, pas de contact sortant automatique, pas de contact caché avec le candidat.",
  },
  jobPipeline: {
    pageEyebrow: "Pipeline du poste",
    pageTitle: "Pipeline de recrutement",
    boundaryBody:
      "TWIN classe et affiche les candidats par poste — le recruteur décide des mouvements d'étape, du contact et des offres. Pas d'auto-candidature, pas de contact sortant automatique, pas d'écriture dans l'ATS sur ce pilote.",
  },
  candidateTrustCenter: {
    pageTitle: "Centre de confiance candidat",
    boundaryBody:
      "TWIN montre ce que nous détenons, ce que voient les recruteurs et comment vous pouvez le contrôler. Pas d'auto-candidature, pas de contact automatisé, pas de verdict IA sur l'embauche — vous décidez quand postuler et qui engage.",
  },
  candidateExportPreview: {
    pageTitle: "Aperçu export candidat",
    boundaryBody:
      "Ce JSON est un paquet d'aperçu démo uniquement. Ce n'est pas un export légal, ne mute pas le backend et exclut ATS en direct, contact sortant et PII de contact.",
  },
  candidateIdentityVerification: {
    pageTitle: "Vérification d'identité candidat",
    boundaryBody:
      "Cette page est un pilote de vérification d'identité démo uniquement. Pas de KYC, pas de téléversement de documents, pas d'appels API fournisseur ni mutation backend.",
  },
};

const de: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "Kandidatenprofil 360",
    pageTitle: "Kandidatenprofil 360",
    boundaryBody:
      "TWIN bereitet Signale und Historie vor — Recruiter entscheiden über Vorauswahl, Zurückstellen, Ablehnung und Kontakt. Keine automatische Bewerbung, kein automatischer ausgehender Kontakt, kein versteckter Kandidatenkontakt.",
  },
  jobPipeline: {
    pageEyebrow: "Stellen-Pipeline",
    pageTitle: "Recruiting-Pipeline",
    boundaryBody:
      "TWIN rankt und zeigt Kandidaten pro Rolle — Recruiter entscheiden über Phasenwechsel, Kontakt und Angebote. Keine automatische Bewerbung, kein automatischer ausgehender Kontakt, kein Zurückschreiben ins ATS in diesem Pilot.",
  },
  candidateTrustCenter: {
    pageTitle: "Kandidaten-Vertrauenszentrum",
    boundaryBody:
      "TWIN zeigt, was wir speichern, was Recruiter sehen und wie Sie es steuern können. Keine automatische Bewerbung, kein automatisierter ausgehender Kontakt, keine KI-Einstellungsurteile — Sie entscheiden, wann Sie sich bewerben und wer Kontakt aufnimmt.",
  },
  candidateExportPreview: {
    pageTitle: "Kandidaten-Exportvorschau",
    boundaryBody:
      "Dieses JSON ist ein reines Demo-Vorschau-Paket. Kein rechtlicher Export, keine Backend-Mutation und ohne Live-ATS, ausgehenden Kontakt oder Kontakt-PII.",
  },
  candidateIdentityVerification: {
    pageTitle: "Kandidaten-Identitätsprüfung",
    boundaryBody:
      "Diese Seite ist ein reiner Demo-Identitätsprüfungs-Pilot. Kein KYC, kein Dokumenten-Upload, keine Provider-API-Aufrufe, keine Backend-Mutation.",
  },
};

const zh: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "候选人 360 档案",
    pageTitle: "候选人 360 档案",
    boundaryBody:
      "TWIN 准备信号与记忆 — 招聘人员决定入围、暂缓、拒绝与外联。无自动申请、无自动外联、无隐藏候选人联系。",
  },
  jobPipeline: {
    pageEyebrow: "职位管道",
    pageTitle: "招聘管道",
    boundaryBody:
      "TWIN 按职位排序并展示候选人 — 招聘人员决定阶段移动、外联与录用意向。本试点无自动申请、无自动外联、不会写入 ATS。",
  },
  candidateTrustCenter: {
    pageTitle: "候选人信任中心",
    boundaryBody:
      "TWIN 展示我们保存的内容、招聘人员可见范围及您的控制方式。无自动申请、无自动外联、无 AI 录用裁决 — 由您决定何时申请及谁联系。",
  },
  candidateExportPreview: {
    pageTitle: "候选人导出预览",
    boundaryBody:
      "此 JSON 仅为演示预览包。非法律导出、不会变更后端，且不含实时 ATS、外联或联系 PII。",
  },
  candidateIdentityVerification: {
    pageTitle: "候选人身份验证",
    boundaryBody:
      "此页面为仅演示的身份验证试点。无 KYC、无文档上传、无供应商 API 调用、无后端变更。",
  },
};

const ar: ProfilePipelineTrustOverlay = {
  candidateProfile360: {
    pageEyebrow: "ملف المرشح 360",
    pageTitle: "ملف المرشح 360",
    boundaryBody:
      "TWIN يجهّز الإشارات والذاكرة — يقرر المُوظّف القائمة المختصرة والتأجيل والرفض والتواصل. لا تقديم تلقائي، لا تواصل صادر تلقائي، لا اتصال خفي بالمرشح.",
  },
  jobPipeline: {
    pageEyebrow: "مسار الوظيفة",
    pageTitle: "مسار التوظيف",
    boundaryBody:
      "TWIN يرتّب ويعرض المرشحين لكل دور — يقرر المُوظّف تحركات المراحل والتواصل والعروض. لا تقديم تلقائي، لا تواصل صادر تلقائي، لا كتابة في ATS في هذا الطيار.",
  },
  candidateTrustCenter: {
    pageTitle: "مركز ثقة المرشح",
    boundaryBody:
      "TWIN يوضح ما نحتفظ به وما يراه المُوظّفون وكيف تتحكم به. لا تقديم تلقائي، لا تواصل آلي، لا أحكام توظيف بالذكاء الاصطناعي — أنت تقرر متى تتقدم ومن يتواصل.",
  },
  candidateExportPreview: {
    pageTitle: "معاينة تصدير المرشح",
    boundaryBody:
      "هذا JSON حزمة معاينة تجريبية فقط. ليست تصديرًا قانونيًا، ولا يغيّر الخادم، ويستبعد ATS الحي والتواصل الصادر وPII الاتصال.",
  },
  candidateIdentityVerification: {
    pageTitle: "التحقق من هوية المرشح",
    boundaryBody:
      "هذه الصفحة طيار تحقق هوية تجريبي فقط. بلا KYC ولا رفع مستندات ولا استدعاءات API للمزود ولا تغيير في الخادم.",
  },
};

export const PROFILE_PIPELINE_TRUST_OVERLAYS: Partial<Record<Locale, ProfilePipelineTrustOverlay>> = {
  es,
  it,
  fr,
  de,
  zh,
  ar,
};
