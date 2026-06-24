import type { Locale } from "@/lib/i18n";

type DraftOverlay = {
  recruiterMessageDrafts: Record<string, string>;
};

const es: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "Preparar mensaje",
    notSentBanner: "Borrador de mensaje — no enviado automáticamente",
    copy: "Copiar",
    editBeforeSendHint: "Edite antes de enviar",
    twinNoSendDisclaimer: "TWIN no envía este mensaje por usted",
    panelTitle: "Borrador de mensaje al candidato",
    panelLead: "Borrador para {name} · {role}",
    close: "Cerrar",
    templateLabel: "Plantilla",
    subjectLabel: "Asunto",
    bodyLabel: "Mensaje",
    copied: "Copiado al portapapeles",
    templateInvitation: "Invitación a la primera conversación",
    templateMissingInfo: "Solicitar información faltante",
    templateAvailability: "Aclarar disponibilidad",
    templateHoldFollowUp: "Espera amable / seguimiento",
    defaultRecruiterName: "Equipo de selección",
    contactStatusTitle: "Seguimiento de contacto",
    contactStatusHint: "Solo local en este navegador — sin envío por TWIN.",
    markContacted: "Marcar como contactado",
    moveToContact: "Volver a por contactar",
    markInvited: "Marcar como invitado",
    phaseToContact: "Por contactar",
    phaseContacted: "Contactado",
    phaseInvited: "Invitado",
    invitationSubject: "Invitación a entrevista — {role} en {company}",
    invitationBody:
      "Hola{candidateName},\n\nGracias por su interés en el puesto {role} en {company}. Nos gustaría invitarle a una primera conversación.\n\nIndíquenos cuándo estaría disponible la próxima semana.\n\nSaludos,\n{recruiterName}",
    missingInfoSubject: "Información adicional — {role} en {company}",
    missingInfoBody:
      "Hola{candidateName},\n\nGracias por postular a {role} en {company}. Antes de programar una conversación, ¿podría compartir la información que aún falta verificar?\n\nSaludos,\n{recruiterName}",
    availabilitySubject: "Disponibilidad — {role} en {company}",
    availabilityBody:
      "Hola{candidateName},\n\nEstamos revisando su perfil para {role} en {company}. ¿Podría indicar algunas franjas horarias en las próximas dos semanas?\n\nSaludos,\n{recruiterName}",
    holdFollowUpSubject: "Seguimiento — {role} en {company}",
    holdFollowUpBody:
      "Hola{candidateName},\n\nGracias por su paciencia respecto a {role} en {company}. Aún coordinamos internamente los próximos pasos y volveremos pronto.\n\nSaludos,\n{recruiterName}",
  },
};

const it: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "Prepara messaggio",
    notSentBanner: "Bozza messaggio — non inviata automaticamente",
    copy: "Copia",
    editBeforeSendHint: "Modifica prima di inviare",
    twinNoSendDisclaimer: "TWIN non invia questo messaggio al posto tuo",
    panelTitle: "Bozza messaggio al candidato",
    panelLead: "Bozza per {name} · {role}",
    close: "Chiudi",
    templateLabel: "Modello",
    subjectLabel: "Oggetto",
    bodyLabel: "Messaggio",
    copied: "Copiato negli appunti",
    templateInvitation: "Invito al primo colloquio",
    templateMissingInfo: "Richiesta informazioni mancanti",
    templateAvailability: "Chiarire disponibilità",
    templateHoldFollowUp: "Pausa cortese / follow-up",
    defaultRecruiterName: "Team recruiting",
    contactStatusTitle: "Stato contatto",
    contactStatusHint: "Solo locale in questo browser — nessun invio tramite TWIN.",
    markContacted: "Segna come contattato",
    moveToContact: "Torna a da contattare",
    markInvited: "Segna come invitato",
    phaseToContact: "Da contattare",
    phaseContacted: "Contattato",
    phaseInvited: "Invitato",
    invitationSubject: "Invito al colloquio — {role} presso {company}",
    invitationBody:
      "Buongiorno{candidateName},\n\nGrazie per l'interesse per la posizione {role} presso {company}. Vorremmo invitarla a un primo colloquio.\n\nCi indichi quando sarebbe disponibile la prossima settimana.\n\nCordiali saluti,\n{recruiterName}",
    missingInfoSubject: "Informazioni aggiuntive — {role} presso {company}",
    missingInfoBody:
      "Buongiorno{candidateName},\n\nGrazie per la candidatura a {role} presso {company}. Prima di fissare un colloquio, potrebbe condividere le informazioni ancora da verificare?\n\nCordiali saluti,\n{recruiterName}",
    availabilitySubject: "Disponibilità — {role} presso {company}",
    availabilityBody:
      "Buongiorno{candidateName},\n\nStiamo valutando il suo profilo per {role} presso {company}. Può indicare alcune fasce orarie nelle prossime due settimane?\n\nCordiali saluti,\n{recruiterName}",
    holdFollowUpSubject: "Follow-up — {role} presso {company}",
    holdFollowUpBody:
      "Buongiorno{candidateName},\n\nGrazie per la pazienza riguardo a {role} presso {company}. Stiamo ancora coordinando internamente i prossimi passi e torneremo presto.\n\nCordiali saluti,\n{recruiterName}",
  },
};

const fr: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "Préparer le message",
    notSentBanner: "Brouillon — non envoyé automatiquement",
    copy: "Copier",
    editBeforeSendHint: "Modifier avant envoi",
    twinNoSendDisclaimer: "TWIN n'envoie pas ce message à votre place",
    panelTitle: "Brouillon de message candidat",
    panelLead: "Brouillon pour {name} · {role}",
    close: "Fermer",
    templateLabel: "Modèle",
    subjectLabel: "Objet",
    bodyLabel: "Corps du message",
    copied: "Copié dans le presse-papiers",
    templateInvitation: "Invitation au premier échange",
    templateMissingInfo: "Demande d'informations manquantes",
    templateAvailability: "Préciser la disponibilité",
    templateHoldFollowUp: "Mise en attente / relance",
    defaultRecruiterName: "Équipe recrutement",
    contactStatusTitle: "Suivi de contact",
    contactStatusHint: "Local à ce navigateur — aucun envoi via TWIN.",
    markContacted: "Marquer comme contacté",
    moveToContact: "Revenir à à contacter",
    markInvited: "Marquer comme invité",
    phaseToContact: "À contacter",
    phaseContacted: "Contacté",
    phaseInvited: "Invité",
    invitationSubject: "Invitation entretien — {role} chez {company}",
    invitationBody:
      "Bonjour{candidateName},\n\nMerci pour votre intérêt pour le poste {role} chez {company}. Nous aimerions vous inviter à un premier échange.\n\nIndiquez-nous vos disponibilités la semaine prochaine.\n\nCordialement,\n{recruiterName}",
    missingInfoSubject: "Informations complémentaires — {role} chez {company}",
    missingInfoBody:
      "Bonjour{candidateName},\n\nMerci pour votre candidature à {role} chez {company}. Avant de planifier un échange, pourriez-vous préciser les informations encore à vérifier ?\n\nCordialement,\n{recruiterName}",
    availabilitySubject: "Disponibilités — {role} chez {company}",
    availabilityBody:
      "Bonjour{candidateName},\n\nNous examinons votre profil pour {role} chez {company}. Pourriez-vous proposer quelques créneaux dans les deux prochaines semaines ?\n\nCordialement,\n{recruiterName}",
    holdFollowUpSubject: "Relance — {role} chez {company}",
    holdFollowUpBody:
      "Bonjour{candidateName},\n\nMerci pour votre patience concernant {role} chez {company}. Nous coordonnons encore en interne et reviendrons vers vous bientôt.\n\nCordialement,\n{recruiterName}",
  },
};

const de: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "Nachricht vorbereiten",
    notSentBanner: "Nachrichtenentwurf — nicht automatisch gesendet",
    copy: "Kopieren",
    editBeforeSendHint: "Vor dem Senden bearbeiten",
    twinNoSendDisclaimer: "TWIN versendet diese Nachricht nicht für Sie",
    panelTitle: "Kandidaten-Nachrichtenentwurf",
    panelLead: "Entwurf für {name} · {role}",
    close: "Schließen",
    templateLabel: "Vorlage",
    subjectLabel: "Betreff",
    bodyLabel: "Nachricht",
    copied: "In die Zwischenablage kopiert",
    templateInvitation: "Einladung zum Erstgespräch",
    templateMissingInfo: "Fehlende Informationen anfragen",
    templateAvailability: "Verfügbarkeit klären",
    templateHoldFollowUp: "Höfliche Wartephase / Follow-up",
    defaultRecruiterName: "Recruiting-Team",
    contactStatusTitle: "Kontaktstatus",
    contactStatusHint: "Nur lokal in diesem Browser — kein Versand über TWIN.",
    markContacted: "Als kontaktiert markieren",
    moveToContact: "Zurück zu zu kontaktieren",
    markInvited: "Als eingeladen markieren",
    phaseToContact: "Zu kontaktieren",
    phaseContacted: "Kontaktiert",
    phaseInvited: "Eingeladen",
    invitationSubject: "Einladung zum Gespräch — {role} bei {company}",
    invitationBody:
      "Guten Tag{candidateName},\n\nvielen Dank für Ihr Interesse an der Stelle {role} bei {company}. Wir möchten Sie zu einem Erstgespräch einladen.\n\nBitte teilen Sie uns mit, wann Sie nächste Woche verfügbar wären.\n\nMit freundlichen Grüßen\n{recruiterName}",
    missingInfoSubject: "Zusätzliche Informationen — {role} bei {company}",
    missingInfoBody:
      "Guten Tag{candidateName},\n\nvielen Dank für Ihre Bewerbung auf {role} bei {company}. Bevor wir ein Gespräch planen, könnten Sie fehlende Angaben ergänzen?\n\nMit freundlichen Grüßen\n{recruiterName}",
    availabilitySubject: "Verfügbarkeit — {role} bei {company}",
    availabilityBody:
      "Guten Tag{candidateName},\n\nwir prüfen Ihr Profil für {role} bei {company}. Nennen Sie bitte einige Zeitfenster in den nächsten zwei Wochen.\n\nMit freundlichen Grüßen\n{recruiterName}",
    holdFollowUpSubject: "Follow-up — {role} bei {company}",
    holdFollowUpBody:
      "Guten Tag{candidateName},\n\nvielen Dank für Ihre Geduld bezüglich {role} bei {company}. Wir koordinieren intern noch die nächsten Schritte und melden uns bald.\n\nMit freundlichen Grüßen\n{recruiterName}",
  },
};

const zh: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "准备消息",
    notSentBanner: "消息草稿 — 未自动发送",
    copy: "复制",
    editBeforeSendHint: "发送前请编辑",
    twinNoSendDisclaimer: "TWIN 不会代您发送此消息",
    panelTitle: "候选人消息草稿",
    panelLead: "{name} 的草稿 · {role}",
    close: "关闭",
    templateLabel: "模板",
    subjectLabel: "主题",
    bodyLabel: "正文",
    copied: "已复制到剪贴板",
    templateInvitation: "首次沟通邀请",
    templateMissingInfo: "请求补充信息",
    templateAvailability: "确认可用时间",
    templateHoldFollowUp: "礼貌暂缓 / 跟进",
    defaultRecruiterName: "招聘团队",
    contactStatusTitle: "联系状态",
    contactStatusHint: "仅保存在本浏览器 — 不通过 TWIN 发送。",
    markContacted: "标记为已联系",
    moveToContact: "移回待联系",
    markInvited: "标记为已邀请",
    phaseToContact: "待联系",
    phaseContacted: "已联系",
    phaseInvited: "已邀请",
    invitationSubject: "面试邀请 — {role} @ {company}",
    invitationBody:
      "您好{candidateName}，\n\n感谢您对 {company} {role} 职位的兴趣。我们想邀请您进行首次沟通。\n\n请告知您下周方便的时间。\n\n此致\n{recruiterName}",
    missingInfoSubject: "补充信息 — {company} {role}",
    missingInfoBody:
      "您好{candidateName}，\n\n感谢您申请 {company} 的 {role}。在安排沟通前，能否补充尚需核实的信息？\n\n此致\n{recruiterName}",
    availabilitySubject: "可用时间 — {company} {role}",
    availabilityBody:
      "您好{candidateName}，\n\n我们正在评估您与 {company} {role} 的匹配。请提供未来两周内几个可用时段。\n\n此致\n{recruiterName}",
    holdFollowUpSubject: "跟进 — {company} {role}",
    holdFollowUpBody:
      "您好{candidateName}，\n\n感谢您对 {company} {role} 的耐心。我们仍在内部协调下一步，会尽快回复。\n\n此致\n{recruiterName}",
  },
};

const ar: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "إعداد الرسالة",
    notSentBanner: "مسودة رسالة — لم تُرسل تلقائيًا",
    copy: "نسخ",
    editBeforeSendHint: "حرّر قبل الإرسال",
    twinNoSendDisclaimer: "TWIN لا يرسل هذه الرسالة نيابةً عنك",
    panelTitle: "مسودة رسالة للمرشح",
    panelLead: "مسودة لـ {name} · {role}",
    close: "إغلاق",
    templateLabel: "قالب",
    subjectLabel: "الموضوع",
    bodyLabel: "الرسالة",
    copied: "تم النسخ إلى الحافظة",
    templateInvitation: "دعوة للمحادثة الأولى",
    templateMissingInfo: "طلب معلومات ناقصة",
    templateAvailability: "توضيح التوفر",
    templateHoldFollowUp: "تأجيل مهذب / متابعة",
    defaultRecruiterName: "فريق التوظيف",
    contactStatusTitle: "حالة التواصل",
    contactStatusHint: "محلي في هذا المتصفح فقط — لا إرسال عبر TWIN.",
    markContacted: "تعيين كتم التواصل",
    moveToContact: "إرجاع إلى بانتظار التواصل",
    markInvited: "تعيين كمدعو",
    phaseToContact: "بانتظار التواصل",
    phaseContacted: "تم التواصل",
    phaseInvited: "مدعو",
    invitationSubject: "دعوة مقابلة — {role} في {company}",
    invitationBody:
      "مرحبًا{candidateName}،\n\nشكرًا لاهتمامك بوظيفة {role} في {company}. نود دعوتك لمحادثة أولى.\n\nيرجى إخبارنا بمواعيدك المتاحة الأسبوع القادم.\n\nمع التحية،\n{recruiterName}",
    missingInfoSubject: "معلومات إضافية — {role} في {company}",
    missingInfoBody:
      "مرحبًا{candidateName}،\n\nشكرًا لتقديمك على {role} في {company}. قبل جدولة محادثة، هل يمكنك مشاركة المعلومات الناقصة؟\n\nمع التحية،\n{recruiterName}",
    availabilitySubject: "التوفر — {role} في {company}",
    availabilityBody:
      "مرحبًا{candidateName}،\n\nنراجع ملفك لوظيفة {role} في {company}. هل يمكنك ذكر بعض الفترات خلال الأسبوعين القادمين؟\n\nمع التحية،\n{recruiterName}",
    holdFollowUpSubject: "متابعة — {role} في {company}",
    holdFollowUpBody:
      "مرحبًا{candidateName}،\n\nشكرًا لصبرك بخصوص {role} في {company}. ما زلنا ننسق داخليًا وسنعود إليك قريبًا.\n\nمع التحية،\n{recruiterName}",
  },
};

const ja: DraftOverlay = {
  recruiterMessageDrafts: {
    prepareMessage: "メッセージを準備",
    notSentBanner: "メッセージ下書き — 自動送信されていません",
    copy: "コピー",
    editBeforeSendHint: "送信前に編集してください",
    twinNoSendDisclaimer: "TWIN はこのメッセージを代わりに送信しません",
    panelTitle: "候補者向けメッセージ下書き",
    panelLead: "{name} 向け下書き · {role}",
    close: "閉じる",
    templateLabel: "テンプレート",
    subjectLabel: "件名",
    bodyLabel: "本文",
    copied: "クリップボードにコピーしました",
    templateInvitation: "初回面談への招待",
    templateMissingInfo: "不足情報の依頼",
    templateAvailability: "可用性の確認",
    templateHoldFollowUp: "丁寧な保留 / フォローアップ",
    defaultRecruiterName: "採用チーム",
    contactStatusTitle: "連絡ステータス",
    contactStatusHint: "このブラウザ内のみ — TWIN 経由では送信されません。",
    markContacted: "連絡済みにする",
    moveToContact: "未連絡に戻す",
    markInvited: "招待済みにする",
    phaseToContact: "未連絡",
    phaseContacted: "連絡済み",
    phaseInvited: "招待済み",
    invitationSubject: "面談のご案内 — {role}（{company}）",
    invitationBody:
      "こんにちは{candidateName}、\n\n{company} の {role} にご関心をお寄せいただきありがとうございます。初回の面談にご招待したく存じます。\n\n来週ご都合のよい日時をお知らせください。\n\nよろしくお願いいたします。\n{recruiterName}",
    missingInfoSubject: "追加情報のお願い — {company} {role}",
    missingInfoBody:
      "こんにちは{candidateName}、\n\n{company} の {role} へのご応募ありがとうございます。面談調整前に、確認が必要な情報を共有いただけますか。\n\nよろしくお願いいたします。\n{recruiterName}",
    availabilitySubject: "面談可能日時 — {company} {role}",
    availabilityBody:
      "こんにちは{candidateName}、\n\n{company} の {role} についてプロフィールを確認中です。今後2週間で都合のよい時間帯をいくつか教えてください。\n\nよろしくお願いいたします。\n{recruiterName}",
    holdFollowUpSubject: "フォローアップ — {company} {role}",
    holdFollowUpBody:
      "こんにちは{candidateName}、\n\n{company} の {role} についてお待ちいただきありがとうございます。社内調整中のため、追ってご連絡いたします。\n\nよろしくお願いいたします。\n{recruiterName}",
  },
};

export const RECRUITER_MESSAGE_DRAFTS_OVERLAYS: Partial<Record<Locale, DraftOverlay>> = {
  es,
  it,
  fr,
  de,
  zh,
  ar,
  ja,
};
