import type { Locale } from "@/lib/i18n";

type OfferPlacementCalendarOverlay = {
  candidateOfferReadiness?: Record<string, string>;
  offerReadinessEvidence?: Record<string, string>;
  placementVerificationEvidence?: Record<string, string>;
  microsoftCalendarReadiness?: Record<string, string>;
  microsoftBusyRead?: Record<string, string>;
  calendarReadinessEvidence?: Record<string, string>;
  boardOfferReadiness?: Record<string, string>;
  boardPlacementEvidence?: Record<string, string>;
  schedulingProposal?: Record<string, string>;
};

const es: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "Preparación para la oferta",
    pageTitle: "Centro de preparación para la oferta",
    summaryLead:
      "Estado de preparación solo de vista previa — no es una oferta formal, aprobación legal ni contrato listo.",
    checklistLead:
      "Nueve secciones para revisar antes de cualquier conversación sobre la oferta — solo datos de demostración.",
    boundaryNote:
      "Solo lectura · sin envío de oferta · sin contrato · sin pago · revisión manual requerida",
  },
  offerReadinessEvidence: {
    panelTitle: "Materiales de preparación para la oferta",
    panelLead:
      "Vista previa operativa de preparación — solo lectura, sin oferta garantizada, aprobación legal ni contrato listo.",
    boundaryNote:
      "Solo lectura · sin envío de oferta · sin contrato · sin pago · sin aceptación automática",
  },
  placementVerificationEvidence: {
    panelTitle: "Materiales de verificación de placement",
    panelLead:
      "Centro de vista previa operativa — solo verificación preliminar, sin validez legal, factura, pago ni reconocimiento de ingresos.",
    boundaryNote:
      "Solo lectura · sin acciones de escritura · GET canónico /api/v1/placement-events · revisión manual requerida",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "Ocupación del calendario (Microsoft Graph)",
    busyReadLead:
      "Vista previa de ocupación — comprueba la configuración OAuth; sin sincronización en vivo ni escrituras en Graph.",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "Disponibilidad ocupada (solo lectura)",
    slotPreviewLead:
      "Vista previa de franjas ocupadas de Microsoft Graph — solo Calendars.Read, detalles de eventos ocultos.",
    noInviteSent: "Sin envío de invitaciones — prueba de disponibilidad solo de lectura.",
    noCalendarSync: "Sin sincronización de calendario — solo vista previa en este hito.",
    crossLinkTitle: "Preparación de lectura de ocupación del calendario",
    crossLinkLead:
      "Prueba de disponibilidad solo de lectura para planificación — OAuth solicita solo Calendars.Read, sin acción en vivo.",
  },
  calendarReadinessEvidence: {
    panelTitle: "Materiales de preparación del calendario",
    panelLead:
      "Vista previa de preparación OAuth — solo lectura, sin planificación automática de entrevistas ni escrituras en calendario.",
    boundaryNote:
      "Solo materiales de preparación · escrituras deshabilitadas · creación de eventos en Microsoft Graph bloqueada · sin sondeo",
  },
  boardOfferReadiness: {
    pageTitle: "Monitor de preparación para la oferta",
    headerLead:
      "Prueba demo de preparación entre personas — vista previa interna, sin oferta garantizada.",
    safetyNote:
      "El centro de preparación demuestra valor sin envío de oferta, contrato, pago ni aceptación automática.",
  },
  boardPlacementEvidence: {
    pageTitle: "Monitor de materiales de placement",
    headerLead:
      "Salud de materiales de placement entre personas — prueba demo interna, no verificación legal.",
  },
  schedulingProposal: {
    pageTitle: "Paquete de propuesta de planificación",
    readOnlyBadge: "Vista previa solo lectura",
    subtitleCandidate: "Revise el contexto antes de que alguien envíe una invitación — sin acción automática.",
    subtitleRecruiter: "Vista preparatoria antes de planificar manualmente — requiere revisión humana.",
    subtitleCompany: "No se creó invitación ni evento de calendario — solo contexto de aprobación.",
    subtitleBoard: "Muestra lógica de preparación, no planificación en vivo — solo materiales y barreras.",
    blockedActionsTitle: "Acciones bloqueadas",
    humanReviewTitle: "Lista de revisión humana",
    auditTrailTitle: "Materiales / auditoría",
  },
};

const it: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "Preparazione all'offerta",
    pageTitle: "Centro preparazione all'offerta",
    summaryLead:
      "Stato di preparazione solo anteprima — non è un'offerta formale, approvazione legale né contratto pronto.",
    checklistLead:
      "Nove sezioni da rivedere prima di qualsiasi conversazione sull'offerta — solo dati dimostrativi.",
    boundaryNote:
      "Solo lettura · nessun invio offerta · nessun contratto · nessun pagamento · revisione manuale richiesta",
  },
  offerReadinessEvidence: {
    panelTitle: "Materiali preparazione all'offerta",
    panelLead:
      "Anteprima operativa di preparazione — solo lettura, senza offerta garantita, approvazione legale né contratto pronto.",
    boundaryNote:
      "Solo lettura · nessun invio offerta · nessun contratto · nessun pagamento · nessuna accettazione automatica",
  },
  placementVerificationEvidence: {
    panelTitle: "Materiali verifica placement",
    panelLead:
      "Centro anteprima operativa — solo verifica preliminare, senza valore legale, fattura, pagamento né riconoscimento ricavi.",
    boundaryNote:
      "Solo lettura · nessuna azione di scrittura · GET canonico /api/v1/placement-events · revisione manuale richiesta",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "Occupazione calendario (Microsoft Graph)",
    busyReadLead:
      "Anteprima occupazione — verifica configurazione OAuth; nessuna sincronizzazione live né scritture su Graph.",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "Disponibilità occupata (solo lettura)",
    slotPreviewLead:
      "Anteprima slot occupati Microsoft Graph — solo Calendars.Read, dettagli evento oscurati.",
    noInviteSent: "Nessun invito inviato — prova disponibilità solo lettura.",
    noCalendarSync: "Nessuna sincronizzazione calendario — solo anteprima in questa fase.",
    crossLinkTitle: "Preparazione lettura occupazione calendario",
    crossLinkLead:
      "Prova disponibilità solo lettura per pianificazione — OAuth richiede solo Calendars.Read, nessuna azione live.",
  },
  calendarReadinessEvidence: {
    panelTitle: "Materiali preparazione calendario",
    panelLead:
      "Anteprima preparazione OAuth — solo lettura, senza pianificazione automatica colloqui né scritture calendario.",
    boundaryNote:
      "Solo materiali preparazione · scritture disabilitate · creazione eventi Microsoft Graph bloccata · nessun polling",
  },
  boardOfferReadiness: {
    pageTitle: "Monitor preparazione all'offerta",
    headerLead:
      "Prova demo preparazione tra persone — anteprima interna, senza offerta garantita.",
    safetyNote:
      "Il centro preparazione dimostra valore senza invio offerta, contratto, pagamento né accettazione automatica.",
  },
  boardPlacementEvidence: {
    pageTitle: "Monitor materiali placement",
    headerLead:
      "Salute materiali placement tra persone — prova demo interna, non verifica legale.",
  },
  schedulingProposal: {
    pageTitle: "Pacchetto proposta di pianificazione",
    readOnlyBadge: "Anteprima solo lettura",
    subtitleCandidate: "Rivedi il contesto prima che qualcuno invii un invito — nessuna azione automatica.",
    subtitleRecruiter: "Vista preparatoria prima della pianificazione manuale — revisione umana richiesta.",
    subtitleCompany: "Nessun invito o evento calendario creato — solo contesto di approvazione.",
    subtitleBoard: "Mostra la logica di preparazione, non pianificazione live — solo materiali e barriere.",
    blockedActionsTitle: "Azioni bloccate",
    humanReviewTitle: "Checklist revisione umana",
    auditTrailTitle: "Materiali / audit",
  },
};

const fr: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "Préparation à l'offre",
    pageTitle: "Centre de préparation à l'offre",
    summaryLead:
      "Statut de préparation en aperçu uniquement — pas une offre formelle, approbation légale ni contrat prêt.",
    checklistLead:
      "Neuf sections à revoir avant toute conversation sur l'offre — données de démonstration uniquement.",
    boundaryNote:
      "Lecture seule · pas d'envoi d'offre · pas de contrat · pas de paiement · revue manuelle requise",
  },
  offerReadinessEvidence: {
    panelTitle: "Matériaux de préparation à l'offre",
    panelLead:
      "Aperçu opérationnel de préparation — lecture seule, sans offre garantie, approbation légale ni contrat prêt.",
    boundaryNote:
      "Lecture seule · pas d'envoi d'offre · pas de contrat · pas de paiement · pas d'acceptation automatique",
  },
  placementVerificationEvidence: {
    panelTitle: "Matériaux de vérification de placement",
    panelLead:
      "Centre d'aperçu opérationnel — vérification préliminaire uniquement, sans valeur légale, facture, paiement ni reconnaissance de revenus.",
    boundaryNote:
      "Lecture seule · pas d'actions d'écriture · GET canonique /api/v1/placement-events · revue manuelle requise",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "Occupation du calendrier (Microsoft Graph)",
    busyReadLead:
      "Aperçu d'occupation — vérifie la configuration OAuth ; aucune synchronisation en direct ni écritures Graph.",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "Disponibilité occupée (lecture seule)",
    slotPreviewLead:
      "Aperçu des créneaux occupés Microsoft Graph — Calendars.Read uniquement, détails d'événement masqués.",
    noInviteSent: "Aucune invitation envoyée — preuve de disponibilité en lecture seule.",
    noCalendarSync: "Aucune synchronisation de calendrier — aperçu uniquement à cette étape.",
    crossLinkTitle: "Préparation lecture d'occupation du calendrier",
    crossLinkLead:
      "Preuve de disponibilité en lecture seule pour la planification — OAuth demande Calendars.Read uniquement, sans action en direct.",
  },
  calendarReadinessEvidence: {
    panelTitle: "Matériaux de préparation du calendrier",
    panelLead:
      "Aperçu de préparation OAuth — lecture seule, sans planification automatique d'entretiens ni écritures calendrier.",
    boundaryNote:
      "Matériaux de préparation uniquement · écritures désactivées · création d'événements Microsoft Graph bloquée · pas de polling",
  },
  boardOfferReadiness: {
    pageTitle: "Moniteur de préparation à l'offre",
    headerLead:
      "Preuve demo de préparation inter-personas — aperçu interne, sans offre garantie.",
    safetyNote:
      "Le centre de préparation démontre la valeur sans envoi d'offre, contrat, paiement ni acceptation automatique.",
  },
  boardPlacementEvidence: {
    pageTitle: "Moniteur de matériaux de placement",
    headerLead:
      "Santé des matériaux de placement inter-personas — preuve demo interne, pas de vérification légale.",
  },
  schedulingProposal: {
    pageTitle: "Pack de proposition de planification",
    readOnlyBadge: "Aperçu lecture seule",
    subtitleCandidate: "Consultez le contexte avant toute invitation — aucune action automatique.",
    subtitleRecruiter: "Vue préparatoire avant planification manuelle — revue humaine requise.",
    subtitleCompany: "Aucune invitation ni événement calendrier créé — contexte d'approbation uniquement.",
    subtitleBoard: "Prouve la logique de préparation, pas la planification live — matériaux et barrières.",
    blockedActionsTitle: "Actions bloquées",
    humanReviewTitle: "Liste de revue humaine",
    auditTrailTitle: "Preuves / audit",
  },
};

const de: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "Angebotsvorbereitung",
    pageTitle: "Zentrum für Angebotsvorbereitung",
    summaryLead:
      "Nur-Lese-Vorschau des Bereitschaftsstatus — keine formelle Offerte, keine Rechtsfreigabe, kein vertragsfertiger Stand.",
    checklistLead:
      "Neun Abschnitte vor jedem Angebotsgespräch prüfen — nur Demonstrationsdaten.",
    boundaryNote:
      "Nur-Lese-Ansicht · kein Angebotsversand · kein Vertrag · keine Zahlung · manuelle Prüfung erforderlich",
  },
  offerReadinessEvidence: {
    panelTitle: "Materialien zur Angebotsvorbereitung",
    panelLead:
      "Operative Vorschau der Angebotsvorbereitung — Nur-Lese-Ansicht, keine garantierte Offerte, keine Rechtsfreigabe, kein vertragsfertiger Stand.",
    boundaryNote:
      "Nur-Lese-Ansicht · kein Angebotsversand · kein Vertrag · keine Zahlung · keine automatische Annahme",
  },
  placementVerificationEvidence: {
    panelTitle: "Materialien zur Placement-Verifizierung",
    panelLead:
      "Operatives Vorschauzentrum — nur vorläufige Verifizierung, keine Rechtswirkung, Rechnung, Zahlung oder Umsatzerfassung.",
    boundaryNote:
      "Nur-Lese-Ansicht · keine Schreibaktionen · kanonischer GET /api/v1/placement-events · manuelle Prüfung erforderlich",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "Kalenderbelegung (Microsoft Graph)",
    busyReadLead:
      "Vorschau der Belegung — prüft OAuth-Konfiguration; keine Live-Synchronisierung, keine Graph-Schreibvorgänge.",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "Belegte Verfügbarkeit (Nur-Lese-Ansicht)",
    slotPreviewLead:
      "Vorschau belegter Microsoft-Graph-Slots — nur Calendars.Read, Ereignisdetails ausgeblendet.",
    noInviteSent: "Keine Einladung gesendet — Verfügbarkeitsnachweis nur zum Lesen.",
    noCalendarSync: "Keine Kalendersynchronisierung — nur Vorschau in diesem Meilenstein.",
    crossLinkTitle: "Vorbereitung Kalenderbelegungs-Lesevorgang",
    crossLinkLead:
      "Verfügbarkeitsnachweis nur zum Lesen für die Planung — OAuth fordert nur Calendars.Read an, keine Live-Aktion.",
  },
  calendarReadinessEvidence: {
    panelTitle: "Materialien zur Kalendervorbereitung",
    panelLead:
      "OAuth-Bereitschaftsvorschau — Nur-Lese-Ansicht, keine automatische Interviewplanung, keine Kalenderschreibvorgänge.",
    boundaryNote:
      "Nur Bereitschaftsmaterialien · Schreibvorgänge deaktiviert · Microsoft-Graph-Ereigniserstellung blockiert · kein Polling",
  },
  boardOfferReadiness: {
    pageTitle: "Monitor für Angebotsvorbereitung",
    headerLead:
      "Demo-Nachweis der Angebotsvorbereitung über Personas — interne Vorschau, keine garantierte Offerte.",
    safetyNote:
      "Das Vorbereitungszentrum zeigt Wert ohne Angebotsversand, Vertrag, Zahlung oder automatische Annahme.",
  },
  boardPlacementEvidence: {
    pageTitle: "Monitor für Placement-Materialien",
    headerLead:
      "Gesundheit der Placement-Materialien über Personas — interner Demo-Nachweis, keine Rechtsverifizierung.",
  },
  schedulingProposal: {
    pageTitle: "Planungsvorschlags-Paket",
    readOnlyBadge: "Nur-Lese-Vorschau",
    subtitleCandidate: "Kontext prüfen, bevor jemand eine Einladung sendet — keine automatische Aktion.",
    subtitleRecruiter: "Vorbereitungsansicht vor manueller Planung — menschliche Prüfung erforderlich.",
    subtitleCompany: "Keine Einladung oder Kalenderereignis erstellt — nur Freigabekontext.",
    subtitleBoard: "Zeigt Bereitschaftslogik, keine Live-Planung — nur Materialien und Gates.",
    blockedActionsTitle: "Blockierte Aktionen",
    humanReviewTitle: "Checkliste menschliche Prüfung",
    auditTrailTitle: "Nachweise / Audit",
  },
};

const zh: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "录用准备",
    pageTitle: "录用准备中心",
    summaryLead: "只读预览的准备状态 — 非正式 offer、非法律批准、非合同就绪。",
    checklistLead: "任何 offer 对话前需审阅的九个部分 — 仅演示数据。",
    boundaryNote: "只读预览 · 不发送 offer · 无合同 · 无付款 · 需要人工审核",
  },
  offerReadinessEvidence: {
    panelTitle: "录用准备材料",
    panelLead: "录用准备的操作预览 — 只读，无保证 offer、无法律批准、非合同就绪。",
    boundaryNote: "只读预览 · 不发送 offer · 无合同 · 无付款 · 无自动接受",
  },
  placementVerificationEvidence: {
    panelTitle: "入职验证材料",
    panelLead: "操作预览中心 — 仅初步验证，无法律效力、发票、付款或收入确认。",
    boundaryNote: "只读预览 · 无写入操作 · 规范 GET /api/v1/placement-events · 需要人工审核",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "日历占用（Microsoft Graph）",
    busyReadLead: "占用预览 — 检查 OAuth 配置；不会实时同步、不会写入 Graph。",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "占用时段（只读预览）",
    slotPreviewLead: "Microsoft Graph 占用时段预览 — 仅 Calendars.Read，事件详情已隐藏。",
    noInviteSent: "不会发送邀请 — 只读可用性证明。",
    noCalendarSync: "不会同步日历 — 本阶段仅预览。",
    crossLinkTitle: "日历占用读取准备",
    crossLinkLead: "用于排期的只读可用性证明 — OAuth 仅请求 Calendars.Read，无实时操作。",
  },
  calendarReadinessEvidence: {
    panelTitle: "日历准备材料",
    panelLead: "OAuth 准备预览 — 只读，无自动面试排期、无日历写入。",
    boundaryNote: "仅准备材料 · 写入已禁用 · Microsoft Graph 事件创建已阻止 · 无轮询",
  },
  boardOfferReadiness: {
    pageTitle: "录用准备监控",
    headerLead: "跨角色的录用准备演示证明 — 内部预览，无保证 offer。",
    safetyNote: "准备中心展示价值，但不发送 offer、不签合同、不付款、不自动接受。",
  },
  boardPlacementEvidence: {
    pageTitle: "入职材料监控",
    headerLead: "跨角色的入职材料健康度 — 内部演示证明，非法律验证。",
  },
  schedulingProposal: {
    pageTitle: "排期提案包",
    readOnlyBadge: "只读预览",
    subtitleCandidate: "在任何人发送邀请前可查看上下文 — 无自动日历操作。",
    subtitleRecruiter: "手动排期前的准备视图 — 需人工审核。",
    subtitleCompany: "未创建邀请或日历事件 — 仅审批上下文。",
    subtitleBoard: "展示就绪逻辑，非实时排期 — 仅证据与门槛。",
    blockedActionsTitle: "已阻止的操作",
    humanReviewTitle: "人工审核清单",
    auditTrailTitle: "证据 / 审计",
  },
};

const ar: OfferPlacementCalendarOverlay = {
  candidateOfferReadiness: {
    pageEyebrow: "الاستعداد للعرض",
    pageTitle: "مركز الاستعداد للعرض",
    summaryLead:
      "حالة استعداد للعرض للقراءة فقط — ليست عرضًا رسميًا ولا موافقة قانونية ولا جاهزية عقد.",
    checklistLead: "تسعة أقسام للمراجعة قبل أي محادثة عن العرض — بيانات تجريبية فقط.",
    boundaryNote: "عرض للقراءة فقط · بلا إرسال عرض · بلا عقد · بلا دفع · تتطلب مراجعة بشرية",
  },
  offerReadinessEvidence: {
    panelTitle: "مواد الاستعداد للعرض",
    panelLead:
      "معاينة تشغيلية للاستعداد — للقراءة فقط، بلا عرض مضمون ولا موافقة قانونية ولا جاهزية عقد.",
    boundaryNote: "عرض للقراءة فقط · بلا إرسال عرض · بلا عقد · بلا دفع · بلا قبول تلقائي",
  },
  placementVerificationEvidence: {
    panelTitle: "مواد التحقق من التوظيف",
    panelLead:
      "مركز معاينة تشغيلية — تحقق أولي فقط، بلا أثر قانوني ولا فاتورة ولا دفع ولا اعتراف بالإيراد.",
    boundaryNote:
      "عرض للقراءة فقط · بلا إجراءات كتابة · GET قياسي /api/v1/placement-events · تتطلب مراجعة بشرية",
  },
  microsoftCalendarReadiness: {
    busyReadTitle: "إشغال التقويم (Microsoft Graph)",
    busyReadLead: "معاينة الإشغال — تفحص إعداد OAuth؛ بلا مزامنة حية ولا كتابة في Graph.",
  },
  microsoftBusyRead: {
    slotPreviewTitle: "التوفر المشغول (عرض للقراءة فقط)",
    slotPreviewLead: "معاينة فترات الإشغال في Microsoft Graph — Calendars.Read فقط، تفاصيل الأحداث مخفية.",
    noInviteSent: "لا يتم إرسال دعوات — إثبات توفر للقراءة فقط.",
    noCalendarSync: "لا تتم مزامنة التقويم — معاينة فقط في هذه المرحلة.",
    crossLinkTitle: "جاهزية قراءة إشغال التقويم",
    crossLinkLead:
      "إثبات توفر للقراءة فقط للجدولة — OAuth يطلب Calendars.Read فقط، بلا إجراء حي.",
  },
  calendarReadinessEvidence: {
    panelTitle: "مواد جاهزية التقويم",
    panelLead:
      "معاينة جاهزية OAuth — للقراءة فقط، بلا جدولة تلقائية للمقابلات ولا كتابة في التقويم.",
    boundaryNote:
      "مواد جاهزية فقط · الكتابة معطّلة · إنشاء أحداث Microsoft Graph محظور · بلا استطلاع",
  },
  boardOfferReadiness: {
    pageTitle: "مراقب الاستعداد للعرض",
    headerLead: "إثبات تجريبي للاستعداد عبر الأدوار — معاينة داخلية، بلا عرض مضمون.",
    safetyNote: "يُظهر مركز الاستعداد القيمة دون إرسال عرض ولا عقد ولا دفع ولا قبول تلقائي.",
  },
  boardPlacementEvidence: {
    pageTitle: "مراقب مواد التوظيف",
    headerLead: "صحة مواد التوظيف عبر الأدوار — إثبات تجريبي داخلي، ليس تحققًا قانونيًا.",
  },
  schedulingProposal: {
    pageTitle: "حزمة اقتراح الجدولة",
    readOnlyBadge: "معاينة للقراءة فقط",
    subtitleCandidate: "راجع السياق قبل إرسال أي دعوة — بلا إجراء تلقائي في التقويم.",
    subtitleRecruiter: "عرض تحضيري قبل الجدولة اليدوية — تتطلب مراجعة بشرية.",
    subtitleCompany: "لم يُنشأ دعوة ولا حدث تقويم — سياق الموافقة فقط.",
    subtitleBoard: "يُظهر منطق الجاهزية وليس الجدولة الحية — مواد وحواجز فقط.",
    blockedActionsTitle: "إجراءات محظورة",
    humanReviewTitle: "قائمة المراجعة البشرية",
    auditTrailTitle: "أدلة / تدقيق",
  },
};

export const OFFER_READINESS_PLACEMENT_CALENDAR_OVERLAYS: Partial<
  Record<Locale, OfferPlacementCalendarOverlay>
> = { es, it, fr, de, zh, ar };
