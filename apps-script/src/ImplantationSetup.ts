interface ImplantationModelSeedV1 {
  id: string;
  version: number;
  name: string;
  status: string;
  description: string;
}

interface ImplantationSeedActivityV1 {
  id: string;
  code: string;
  phaseId: string;
  phase: string;
  phaseOrder: number;
  order: number;
  action: string;
  offsetDays: number;
  defaultRole: string;
  mandatory: boolean;
  critical: boolean;
}

interface ImplantationEvidenceRuleSeedV1 {
  id: string;
  activityId: string;
  activityCode: string;
  type: string;
  minimum: number;
}

interface ImplantationPermissionPlanV1 {
  profile: string;
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  remove: boolean;
  export: boolean;
  reopen: boolean;
  notes: string;
}

interface ImplantationListPlanV1 {
  name: string;
  values: string[];
}

interface ImplantationPrevalidationReportV1 {
  migration: "IMPLANTATION_V1";
  checked_at: string;
  already_initialized: boolean;
  ready_to_setup: boolean;
  stores_found: number;
  required_new_store_columns: string[];
  sheet_conflicts: Array<Record<string, unknown>>;
  header_conflicts: Array<Record<string, unknown>>;
  permission_conflicts: Array<Record<string, unknown>>;
  list_conflicts: Array<Record<string, unknown>>;
  duplicate_seed_activity_codes: Array<Record<string, unknown>>;
  invalid_offsets: Array<Record<string, unknown>>;
  invalid_responsible_roles: Array<Record<string, unknown>>;
  invalid_evidence_rules: Array<Record<string, unknown>>;
  invalid_critical_rules: Array<Record<string, unknown>>;
  structural_issues: Array<Record<string, unknown>>;
  sheets_to_create: string[];
  backups_required: string[];
  columns_to_add: Array<{ sheet: string; columns: string[] }>;
  permission_rows_to_add: Array<Record<string, unknown>>;
  permission_rows_to_add_count: number;
  list_values_to_add: Array<{ list: string; values: string[] }>;
  list_values_to_add_count: number;
  checklist_model: {
    id: string;
    version: number;
    checksum_sha256: string;
    activities: number;
    evidence_rules: number;
  };
}

interface ImplantationValidationReportV1 {
  migration: "IMPLANTATION_V1";
  checked_at: string;
  valid: boolean;
  model_id: string;
  model_version: number;
  checksum_sha256: string;
  activities_found: number;
  evidence_rules_found: number;
  permission_rows_found: number;
  lists_found: number;
  technical_audit_found: boolean;
  issues: Array<Record<string, unknown>>;
}

interface ImplantationSetupContextV1 {
  backups: Array<{ original: GoogleAppsScript.Spreadsheet.Sheet; backup: GoogleAppsScript.Spreadsheet.Sheet }>;
  createdSheets: GoogleAppsScript.Spreadsheet.Sheet[];
}

const IMPLANTATION_SETUP_PROPERTY_V1 = "ALLOW_SETUP_IMPLANTATION_V1";
const IMPLANTATION_MIGRATION_ID_V1 = "IMPLANTATION_V1";
const IMPLANTATION_STORE_COLUMNS_V1 = ["Data_Inauguracao_Planejada", "Data_Inauguracao_Real"];
const IMPLANTATION_CRITICAL_CODES_V1 = [
  "ATV-007", "ATV-014", "ATV-015", "ATV-016", "ATV-017", "ATV-018", "ATV-020", "ATV-022",
  "ATV-023", "ATV-024", "ATV-025", "ATV-026", "ATV-028", "ATV-029", "ATV-030",
];
const IMPLANTATION_ALLOWED_OFFSETS_V1 = [-30, -25, -20, -5, 0];
const IMPLANTATION_RESPONSIBLE_ROLES_V1 = ["Equipe interna", "Equipe de campo", "RH", "Contratado"];
const IMPLANTATION_EVIDENCE_TYPES_V1 = ["FOTO", "DOCUMENTO", "EVIDENCIA"];
const IMPLANTATION_ACTIVITY_STATUSES_V1 = ["NAO_INICIADO", "EM_ANDAMENTO", "BLOQUEADO", "CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"];
const IMPLANTATION_PROGRESS_VALUES_V1 = [0, 25, 50, 75, 100];
const IMPLANTATION_UPCOMING_DAYS_V1 = 30;
const IMPLANTATION_CRITICAL_UPCOMING_DAYS_V1 = 7;
const IMPLANTATION_ACTIVITY_TRANSITIONS_V1: Record<string, string[]> = {
  NAO_INICIADO: ["EM_ANDAMENTO", "BLOQUEADO", "NAO_APLICAVEL", "CANCELADO"],
  EM_ANDAMENTO: ["BLOQUEADO", "CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"],
  BLOQUEADO: ["NAO_INICIADO", "EM_ANDAMENTO", "NAO_APLICAVEL", "CANCELADO"],
  CONCLUIDO: ["EM_ANDAMENTO"],
  NAO_APLICAVEL: ["NAO_INICIADO"],
  CANCELADO: ["NAO_INICIADO"],
};
const IMPLANTATION_NEW_SHEETS_V1 = [
  APP_CONFIG.sheets.checklistModels,
  APP_CONFIG.sheets.checklistModelActivities,
  APP_CONFIG.sheets.checklistModelEvidence,
  APP_CONFIG.sheets.storeImplantations,
  APP_CONFIG.sheets.implantationActivities,
  APP_CONFIG.sheets.implantationUpdates,
  APP_CONFIG.sheets.implantationBlocks,
  APP_CONFIG.sheets.files,
];
const IMPLANTATION_BACKUP_SHEETS_V1 = [
  APP_CONFIG.sheets.stores,
  APP_CONFIG.sheets.permissions,
  APP_CONFIG.sheets.history,
  APP_CONFIG.sheets.lists,
];

const IMPLANTATION_HEADERS_V1: Record<string, string[]> = {
  [APP_CONFIG.sheets.checklistModels]: [
    "ID_Modelo_Versao", "Versao_Modelo", "Nome", "Status_Modelo", "Descricao", "Data_Publicacao",
    "ID_Usuario_Publicacao", "Checksum_Definicao", "Observacoes", "created_at", "created_by", "updated_at",
    "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.checklistModelActivities]: [
    "ID_Modelo_Atividade", "ID_Modelo_Versao", "Codigo_Atividade", "ID_Fase", "Fase", "Ordem_Fase",
    "Ordem_Atividade", "Acao", "Descricao", "Offset_Dias", "Papel_Responsavel_Padrao", "Obrigatoria", "Critica",
    "Evidencia_Obrigatoria", "Qtd_Min_Evidencias", "Observacoes", "created_at", "created_by", "updated_at",
    "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.checklistModelEvidence]: [
    "ID_Regra_Evidencia", "ID_Modelo_Atividade", "Tipo_Evidencia", "Quantidade_Minima",
    "Obrigatoria_Para_Conclusao", "Observacoes", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.storeImplantations]: [
    "ID_Implantacao", "ID_Loja", "ID_Modelo_Versao", "ID_Usuario_Coordenador", "Data_Inauguracao_Base",
    "Data_Inauguracao_Planejada_Atual", "Data_Inauguracao_Real", "Status_Ciclo", "Iniciada_Em", "Iniciada_Por",
    "Encerrada_Em", "Encerrada_Por", "Observacoes", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.implantationActivities]: [
    "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "ID_Modelo_Atividade", "Versao_Modelo", "ID_Fase",
    "Fase_Snapshot", "Ordem_Fase", "Ordem_Atividade", "Acao_Snapshot", "Offset_Dias_Snapshot",
    "Papel_Responsavel_Padrao_Snapshot", "Obrigatoria_Snapshot", "Critica_Snapshot", "Evidencia_Obrigatoria_Snapshot",
    "Qtd_Min_Evidencias_Snapshot", "Data_Alvo_Original", "Data_Alvo_Atual", "ID_Usuario_Responsavel", "Status",
    "Percentual_Concluido", "Data_Inicio_Real", "Data_Conclusao_Real", "Ultima_Observacao", "Ultima_Atualizacao_Em",
    "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.implantationUpdates]: [
    "ID_Atualizacao", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Tipo_Atualizacao", "Texto", "Status_Anterior",
    "Status_Novo", "Progresso_Anterior", "Progresso_Novo", "ID_Responsavel_Anterior", "ID_Responsavel_Novo", "Data_Hora",
    "ID_Usuario", "Origem", "Request_ID", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.implantationBlocks]: [
    "ID_Bloqueio", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Motivo_Bloqueio", "Status_Anterior",
    "Progresso_No_Bloqueio", "Papel_Responsavel_Desbloqueio", "ID_Usuario_Responsavel_Desbloqueio", "Data_Bloqueio",
    "ID_Usuario_Bloqueio", "Data_Desbloqueio", "ID_Usuario_Desbloqueio", "Observacao_Desbloqueio", "created_at",
    "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
  [APP_CONFIG.sheets.files]: [
    "ID_Arquivo", "Modulo", "ID_Registro", "ID_Implantacao", "ID_Loja", "ID_Atualizacao", "Tipo_Arquivo",
    "Categoria_Evidencia", "Evidencia", "Nome_Original", "Nome_Armazenado", "Mime_Type", "Tamanho_Bytes",
    "Drive_File_ID", "Drive_Folder_ID", "Hash_SHA256", "Descricao", "Visibilidade", "Request_ID", "Data_Remocao",
    "Removido_Por", "Motivo_Remocao", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
  ],
};

const IMPLANTATION_SHEET_DESCRIPTIONS_V1: Record<string, string> = {
  [APP_CONFIG.sheets.checklistModels]: "Versões publicadas do Checklist Mestre. Uma loja iniciada mantém a versão recebida.",
  [APP_CONFIG.sheets.checklistModelActivities]: "Atividades versionadas do Checklist Mestre de Implantação.",
  [APP_CONFIG.sheets.checklistModelEvidence]: "Regras de evidência por tipo para concluir atividades do modelo.",
  [APP_CONFIG.sheets.storeImplantations]: "Cabeçalho do ciclo de implantação de cada loja.",
  [APP_CONFIG.sheets.implantationActivities]: "Snapshot operacional independente das atividades de cada loja.",
  [APP_CONFIG.sheets.implantationUpdates]: "Linha do tempo operacional; não substitui a auditoria técnica de 12_HISTORICO.",
  [APP_CONFIG.sheets.implantationBlocks]: "Histórico de bloqueios e desbloqueios das atividades.",
  [APP_CONFIG.sheets.files]: "Metadados de arquivos. Binários não são armazenados na planilha; Drive permanece desativado nesta fase.",
};

const implantationPermission = (
  profile: string,
  module: string,
  values: Omit<ImplantationPermissionPlanV1, "profile" | "module" | "notes">,
  notes: string,
): ImplantationPermissionPlanV1 => ({ profile, module, ...values, notes });
const IMPLANTATION_PERMISSION_FULL_V1 = { view: true, create: true, edit: true, approve: true, remove: true, export: true, reopen: true };
const IMPLANTATION_PERMISSION_READ_V1 = { view: true, create: false, edit: false, approve: false, remove: false, export: true, reopen: false };
const IMPLANTATION_PERMISSION_NONE_V1 = { view: false, create: false, edit: false, approve: false, remove: false, export: false, reopen: false };
const IMPLANTATION_PERMISSION_ROWS_V1: ReadonlyArray<ImplantationPermissionPlanV1> = [
  implantationPermission("Administrador", "Implantação", IMPLANTATION_PERMISSION_FULL_V1, "Acesso administrativo; cancelamentos continuam lógicos e auditados."),
  implantationPermission("Administrador", "Implantação Atualizações", IMPLANTATION_PERMISSION_FULL_V1, "Acesso administrativo às atualizações operacionais."),
  implantationPermission("Administrador", "Implantação Arquivos", IMPLANTATION_PERMISSION_FULL_V1, "Metadados preparados; arquivos dependem da futura autorização do Drive."),
  implantationPermission("Administrador", "Checklist Mestre", IMPLANTATION_PERMISSION_FULL_V1, "Administra e publica versões do Checklist Mestre."),
  implantationPermission("Gestor/Aprovador", "Implantação", IMPLANTATION_PERMISSION_FULL_V1, "Acesso de gestor sujeito a Lojas_Permitidas."),
  implantationPermission("Gestor/Aprovador", "Implantação Atualizações", IMPLANTATION_PERMISSION_FULL_V1, "Atualizações sujeitas a Lojas_Permitidas."),
  implantationPermission("Gestor/Aprovador", "Implantação Arquivos", { ...IMPLANTATION_PERMISSION_FULL_V1, remove: false }, "Arquivos sujeitos a Lojas_Permitidas; remoção lógica restrita."),
  implantationPermission("Gestor/Aprovador", "Checklist Mestre", { ...IMPLANTATION_PERMISSION_FULL_V1, remove: false }, "Gestor autorizado pode editar e publicar; não há exclusão física."),
  implantationPermission("Compras", "Implantação", IMPLANTATION_PERMISSION_READ_V1, "Consulta autenticada para integração futura com Suprimentos."),
  implantationPermission("Compras", "Implantação Atualizações", IMPLANTATION_PERMISSION_READ_V1, "Consulta autenticada."),
  implantationPermission("Compras", "Implantação Arquivos", IMPLANTATION_PERMISSION_NONE_V1, "Sem acesso inicial a arquivos internos."),
  implantationPermission("Compras", "Checklist Mestre", IMPLANTATION_PERMISSION_NONE_V1, "Sem acesso ao cadastro administrativo."),
  implantationPermission("Responsável Loja", "Implantação", { ...IMPLANTATION_PERMISSION_READ_V1, export: false }, "Visualiza somente Lojas_Permitidas."),
  implantationPermission("Responsável Loja", "Implantação Atualizações", { ...IMPLANTATION_PERMISSION_NONE_V1, view: true, create: true }, "Cria atualizações somente em Lojas_Permitidas e quando responsável/autorizado."),
  implantationPermission("Responsável Loja", "Implantação Arquivos", { ...IMPLANTATION_PERMISSION_NONE_V1, view: true, create: true }, "Futuro upload somente em Lojas_Permitidas; Drive ainda desativado."),
  implantationPermission("Responsável Loja", "Checklist Mestre", IMPLANTATION_PERMISSION_NONE_V1, "Sem acesso ao cadastro administrativo."),
  implantationPermission("Consulta", "Implantação", IMPLANTATION_PERMISSION_READ_V1, "Somente leitura autenticada e limitada por Lojas_Permitidas."),
  implantationPermission("Consulta", "Implantação Atualizações", IMPLANTATION_PERMISSION_READ_V1, "Somente leitura autenticada e limitada por Lojas_Permitidas."),
  implantationPermission("Consulta", "Implantação Arquivos", IMPLANTATION_PERMISSION_NONE_V1, "Sem acesso a arquivos internos."),
  implantationPermission("Consulta", "Checklist Mestre", IMPLANTATION_PERMISSION_NONE_V1, "Sem acesso ao cadastro administrativo."),
];

const IMPLANTATION_LISTS_V1: ReadonlyArray<ImplantationListPlanV1> = [
  { name: "Status Atividade Implantação", values: ["Não iniciado", "Em andamento", "Bloqueado", "Concluído", "Não aplicável", "Cancelado"] },
  { name: "Status Ciclo Implantação", values: ["Ativo", "Encerrado", "Cancelado"] },
  { name: "Status Modelo Checklist", values: ["Rascunho", "Publicado", "Inativo"] },
  { name: "Papel Responsável Implantação", values: ["Equipe interna", "Equipe de campo", "RH", "Contratado"] },
  { name: "Tipo Atualização Implantação", values: ["Comentário", "Mudança de status", "Mudança de progresso", "Mudança de responsável", "Reprogramação", "Bloqueio", "Desbloqueio", "Evidência adicionada", "Arquivo removido", "Conclusão", "Reabertura", "Cancelamento"] },
  { name: "Tipo Evidência Implantação", values: ["FOTO", "DOCUMENTO", "EVIDENCIA"] },
  { name: "Visibilidade Arquivo", values: ["INTERNO"] },
];

/** Pré-validação manual, estritamente somente leitura e sem exigir propriedade de setup. */
function prevalidateImplantationV1(): ImplantationPrevalidationReportV1 {
  const report = buildImplantationPrevalidationV1(openConfiguredSpreadsheet());
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function buildImplantationPrevalidationV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): ImplantationPrevalidationReportV1 {
  const report = emptyImplantationPrevalidationV1();
  validateImplantationSeedV1(report);
  inspectImplantationBaseStructureV1(spreadsheet, report);
  inspectImplantationNewSheetsV1(spreadsheet, report);
  inspectImplantationPermissionsV1(spreadsheet, report);
  inspectImplantationListsV1(spreadsheet, report);
  report.permission_rows_to_add_count = report.permission_rows_to_add.length;
  report.list_values_to_add_count = report.list_values_to_add.length;
  const hasIssues = [
    report.sheet_conflicts,
    report.header_conflicts,
    report.permission_conflicts,
    report.list_conflicts,
    report.duplicate_seed_activity_codes,
    report.invalid_offsets,
    report.invalid_responsible_roles,
    report.invalid_evidence_rules,
    report.invalid_critical_rules,
    report.structural_issues,
  ].some((issues) => issues.length > 0);
  report.ready_to_setup = !report.already_initialized && !hasIssues;
  return report;
}

function emptyImplantationPrevalidationV1(): ImplantationPrevalidationReportV1 {
  return {
    migration: "IMPLANTATION_V1",
    checked_at: new Date().toISOString(),
    already_initialized: false,
    ready_to_setup: false,
    stores_found: 0,
    required_new_store_columns: [],
    sheet_conflicts: [],
    header_conflicts: [],
    permission_conflicts: [],
    list_conflicts: [],
    duplicate_seed_activity_codes: [],
    invalid_offsets: [],
    invalid_responsible_roles: [],
    invalid_evidence_rules: [],
    invalid_critical_rules: [],
    structural_issues: [],
    sheets_to_create: IMPLANTATION_NEW_SHEETS_V1.slice(),
    backups_required: IMPLANTATION_BACKUP_SHEETS_V1.slice(),
    columns_to_add: [],
    permission_rows_to_add: [],
    permission_rows_to_add_count: 0,
    list_values_to_add: [],
    list_values_to_add_count: 0,
    checklist_model: {
      id: IMPLANTATION_MODEL_SEED_V1.id,
      version: IMPLANTATION_MODEL_SEED_V1.version,
      checksum_sha256: IMPLANTATION_CHECKLIST_CHECKSUM_V1,
      activities: IMPLANTATION_ACTIVITY_SEED_V1.length,
      evidence_rules: IMPLANTATION_EVIDENCE_SEED_V1.length,
    },
  };
}

function validateImplantationSeedV1(report: ImplantationPrevalidationReportV1): void {
  const codeOccurrences: Record<string, number> = {};
  const idOccurrences: Record<string, number> = {};
  const orderOccurrences: Record<string, number> = {};
  IMPLANTATION_ACTIVITY_SEED_V1.forEach((activity) => {
    codeOccurrences[activity.code] = (codeOccurrences[activity.code] || 0) + 1;
    idOccurrences[activity.id] = (idOccurrences[activity.id] || 0) + 1;
    orderOccurrences[String(activity.order)] = (orderOccurrences[String(activity.order)] || 0) + 1;
    const expectedOffset = activity.order <= 7 ? -30 : activity.order <= 19 ? -25 : activity.order <= 24 ? -20 : activity.order <= 29 ? -5 : 0;
    if (IMPLANTATION_ALLOWED_OFFSETS_V1.indexOf(activity.offsetDays) < 0 || activity.offsetDays !== expectedOffset) {
      report.invalid_offsets.push({ code: activity.code, offset_days: activity.offsetDays, expected_offset: expectedOffset });
    }
    if (IMPLANTATION_RESPONSIBLE_ROLES_V1.indexOf(activity.defaultRole) < 0) {
      report.invalid_responsible_roles.push({ code: activity.code, role: activity.defaultRole });
    }
    if (!activity.mandatory) report.structural_issues.push({ code: activity.code, issue: "As 30 atividades da V1 devem ser obrigatórias por padrão." });
  });
  Object.keys(codeOccurrences).filter((code) => codeOccurrences[code] > 1).forEach((code) => {
    report.duplicate_seed_activity_codes.push({ code, occurrences: codeOccurrences[code] });
  });
  Object.keys(idOccurrences).filter((id) => idOccurrences[id] > 1).forEach((id) => {
    report.duplicate_seed_activity_codes.push({ id, occurrences: idOccurrences[id] });
  });
  Object.keys(orderOccurrences).filter((order) => orderOccurrences[order] > 1).forEach((order) => {
    report.duplicate_seed_activity_codes.push({ order: Number(order), occurrences: orderOccurrences[order] });
  });
  if (IMPLANTATION_ACTIVITY_SEED_V1.length !== 30) {
    report.structural_issues.push({ issue: "O Checklist Mestre V1 deve possuir exatamente 30 atividades.", found: IMPLANTATION_ACTIVITY_SEED_V1.length });
  }
  const actualCritical = IMPLANTATION_ACTIVITY_SEED_V1.filter((activity) => activity.critical).map((activity) => activity.code).sort();
  const expectedCritical = IMPLANTATION_CRITICAL_CODES_V1.slice().sort();
  const missingCritical = expectedCritical.filter((code) => actualCritical.indexOf(code) < 0);
  const unexpectedCritical = actualCritical.filter((code) => expectedCritical.indexOf(code) < 0);
  if (missingCritical.length || unexpectedCritical.length) {
    report.invalid_critical_rules.push({ missing: missingCritical, unexpected: unexpectedCritical });
  }
  const activitiesById = Object.fromEntries(IMPLANTATION_ACTIVITY_SEED_V1.map((activity) => [activity.id, activity]));
  const evidenceKeys: Record<string, number> = {};
  const evidenceIds: Record<string, number> = {};
  IMPLANTATION_EVIDENCE_SEED_V1.forEach((rule) => {
    const activity = activitiesById[rule.activityId];
    const key = `${rule.activityId}|${rule.type}`;
    evidenceKeys[key] = (evidenceKeys[key] || 0) + 1;
    evidenceIds[rule.id] = (evidenceIds[rule.id] || 0) + 1;
    if (!activity || activity.code !== rule.activityCode || IMPLANTATION_EVIDENCE_TYPES_V1.indexOf(rule.type) < 0
      || !Number.isInteger(rule.minimum) || rule.minimum < 1) {
      report.invalid_evidence_rules.push({ rule_id: rule.id, activity_id: rule.activityId, activity_code: rule.activityCode, type: rule.type, minimum: rule.minimum });
    }
  });
  Object.keys(evidenceKeys).filter((key) => evidenceKeys[key] > 1).forEach((key) => {
    report.invalid_evidence_rules.push({ key, issue: "Regra de evidência duplicada para atividade/tipo." });
  });
  Object.keys(evidenceIds).filter((id) => evidenceIds[id] > 1).forEach((id) => {
    report.invalid_evidence_rules.push({ rule_id: id, issue: "ID de regra de evidência duplicado." });
  });
  if (IMPLANTATION_EVIDENCE_SEED_V1.length !== 16) {
    report.invalid_evidence_rules.push({ issue: "A V1 deve possuir exatamente 16 regras de evidência.", found: IMPLANTATION_EVIDENCE_SEED_V1.length });
  }
}

function inspectImplantationBaseStructureV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationPrevalidationReportV1,
): void {
  const requirements = [
    { sheet: APP_CONFIG.sheets.stores, key: "ID_Loja", headers: ["ID_Loja", ...APP_CONFIG.technicalHeaders] },
    { sheet: APP_CONFIG.sheets.users, key: "ID_Usuário", headers: ["ID_Usuário", "Perfil", "Lojas_Permitidas", "Ativo"] },
    { sheet: APP_CONFIG.sheets.permissions, key: "Perfil", headers: ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Aprovar", "Excluir", "Exportar", "Reabrir", "Observações"] },
    { sheet: APP_CONFIG.sheets.history, key: "ID_Histórico", headers: ["ID_Histórico", "Data_Hora", "ID_Usuário", "Módulo", "ID_Registro", "Ação", "Campo", "Valor_Anterior", "Valor_Novo", "Origem", "Referência", "Observações"] },
  ];
  requirements.forEach((requirement) => inspectImplantationHeadersV1(spreadsheet, requirement.sheet, requirement.key, requirement.headers, report));
  const stores = spreadsheet.getSheetByName(APP_CONFIG.sheets.stores);
  if (stores) {
    const header = inspectMigrationHeadersV1(stores, "ID_Loja");
    if (header.headerRow) {
      const missingColumns = IMPLANTATION_STORE_COLUMNS_V1.filter((column) => header.normalizedHeaders.indexOf(normalizeHeader(column)) < 0);
      report.required_new_store_columns = missingColumns;
      if (missingColumns.length) report.columns_to_add.push({ sheet: APP_CONFIG.sheets.stores, columns: missingColumns.slice() });
      const duplicates = duplicateNormalizedHeadersV1(header.normalizedHeaders, IMPLANTATION_STORE_COLUMNS_V1);
      duplicates.forEach((column) => report.header_conflicts.push({ sheet: APP_CONFIG.sheets.stores, header: column, issue: "Cabeçalho duplicado." }));
      try {
        const table = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja"]);
        const ids = table.rows.map((row) => cell(table, row, "ID_Loja")).filter(Boolean);
        report.stores_found = ids.length;
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length) report.structural_issues.push({ sheet: APP_CONFIG.sheets.stores, issue: "IDs de loja duplicados.", ids: Array.from(new Set(duplicateIds)) });
        if (ids.length !== 27) report.structural_issues.push({ sheet: APP_CONFIG.sheets.stores, issue: "A preparação V1 espera exatamente 27 lojas.", found: ids.length });
      } catch (error) {
        report.structural_issues.push({ sheet: APP_CONFIG.sheets.stores, issue: safeImplantationErrorV1(error) });
      }
    }
  }
  const lists = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!lists) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.lists, issue: "Aba obrigatória não encontrada." });
  } else if (lists.getLastRow() < 4 || lists.getLastColumn() < 1) {
    report.header_conflicts.push({ sheet: APP_CONFIG.sheets.lists, issue: "A linha 4 de cabeçalhos não foi localizada." });
  }
}

function inspectImplantationHeadersV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string,
  keyHeader: string,
  requiredHeaders: string[],
  report: ImplantationPrevalidationReportV1,
): void {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    report.structural_issues.push({ sheet: sheetName, issue: "Aba obrigatória não encontrada." });
    return;
  }
  const info = inspectMigrationHeadersV1(sheet, keyHeader);
  if (!info.headerRow) {
    report.header_conflicts.push({ sheet: sheetName, issue: `Cabeçalho ${keyHeader} não localizado nas primeiras 10 linhas.` });
    return;
  }
  const missing = requiredHeaders.filter((header) => info.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
  if (missing.length) report.header_conflicts.push({ sheet: sheetName, header_row: info.headerRow, missing });
  duplicateNormalizedHeadersV1(info.normalizedHeaders, requiredHeaders).forEach((header) => {
    report.header_conflicts.push({ sheet: sheetName, header, issue: "Cabeçalho duplicado." });
  });
}

function inspectImplantationNewSheetsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationPrevalidationReportV1,
): void {
  const existing = IMPLANTATION_NEW_SHEETS_V1.filter((sheetName) => Boolean(spreadsheet.getSheetByName(sheetName)));
  report.sheets_to_create = IMPLANTATION_NEW_SHEETS_V1.filter((sheetName) => existing.indexOf(sheetName) < 0);
  if (!existing.length) return;
  if (existing.length !== IMPLANTATION_NEW_SHEETS_V1.length) {
    report.sheet_conflicts.push({ issue: "Setup parcial detectado.", existing, missing: report.sheets_to_create });
    return;
  }
  const validation = validateImplantationV1Internal(spreadsheet, true);
  if (validation.valid) {
    report.already_initialized = true;
    report.sheets_to_create = [];
  } else {
    report.sheet_conflicts.push({ issue: "As oito abas existem, mas a estrutura não corresponde à V1.", validation_issues: validation.issues });
  }
}

function inspectImplantationPermissionsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationPrevalidationReportV1,
): void {
  let table: SheetTable;
  try {
    table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Aprovar", "Excluir", "Exportar", "Reabrir", "Observações"]);
  } catch (error) {
    report.permission_conflicts.push({ issue: safeImplantationErrorV1(error) });
    return;
  }
  IMPLANTATION_PERMISSION_ROWS_V1.forEach((plan) => {
    const matches = table.rows.filter((row) => normalizeHeader(cell(table, row, "Perfil")) === normalizeHeader(plan.profile)
      && normalizeHeader(cell(table, row, "Módulo")) === normalizeHeader(plan.module));
    if (!matches.length) {
      report.permission_rows_to_add.push(implantationPermissionRecordV1(plan));
    } else if (matches.length > 1) {
      report.permission_conflicts.push({ profile: plan.profile, module: plan.module, issue: "Mais de uma linha existente." });
    } else if (!implantationPermissionMatchesV1(table, matches[0], plan)) {
      report.permission_conflicts.push({ profile: plan.profile, module: plan.module, issue: "Linha existente diverge do plano V1." });
    }
  });
}

function inspectImplantationListsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationPrevalidationReportV1,
): void {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!sheet || sheet.getLastRow() < 4 || sheet.getLastColumn() < 1) return;
  const headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getValues()[0].map((value) => String(value || ""));
  IMPLANTATION_LISTS_V1.forEach((plan) => {
    const matches = headers.map(normalizeHeader).map((header, index) => header === normalizeHeader(plan.name) ? index + 1 : 0).filter(Boolean);
    if (matches.length > 1) {
      report.list_conflicts.push({ list: plan.name, issue: "Cabeçalho de lista duplicado.", columns: matches });
      return;
    }
    const existingValues = matches.length ? readImplantationListValuesV1(sheet, matches[0]) : [];
    const missing = plan.values.filter((value) => existingValues.map(normalizeHeader).indexOf(normalizeHeader(value)) < 0);
    if (missing.length) report.list_values_to_add.push({ list: plan.name, values: missing });
  });
}

function duplicateNormalizedHeadersV1(normalizedHeaders: string[], expectedHeaders: string[]): string[] {
  return expectedHeaders.filter((header) => normalizedHeaders.filter((value) => value === normalizeHeader(header)).length > 1);
}

function safeImplantationErrorV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Erro desconhecido.");
}

function validateImplantationTransitionV1(input: {
  from: string;
  to: string;
  currentProgress: number;
  requestedProgress?: number;
  reason?: string;
  canCancel?: boolean;
  canReopen?: boolean;
}): number {
  if (IMPLANTATION_ACTIVITY_STATUSES_V1.indexOf(input.from) < 0 || IMPLANTATION_ACTIVITY_STATUSES_V1.indexOf(input.to) < 0) {
    throw new ApiException("VALIDATION_ERROR", "Status de atividade de implantação inválido.");
  }
  if (input.from !== input.to && IMPLANTATION_ACTIVITY_TRANSITIONS_V1[input.from].indexOf(input.to) < 0) {
    throw new ApiException("INVALID_TRANSITION", `Transição inválida: ${input.from} → ${input.to}.`);
  }
  if (["BLOQUEADO", "NAO_APLICAVEL", "CANCELADO"].indexOf(input.to) >= 0 && !String(input.reason || "").trim()) {
    throw new ApiException("REASON_REQUIRED", `Motivo obrigatório para ${input.to}.`);
  }
  if (input.to === "CANCELADO" && !input.canCancel) throw new ApiException("PERMISSION_DENIED", "Permissão de cancelamento obrigatória.");
  const reopening = ["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].indexOf(input.from) >= 0 && input.from !== input.to;
  if (reopening && !input.canReopen) throw new ApiException("PERMISSION_DENIED", "Permissão de reabertura obrigatória.");
  if (input.to === "NAO_INICIADO") return 0;
  if (input.to === "CONCLUIDO") return 100;
  if (["BLOQUEADO", "NAO_APLICAVEL", "CANCELADO"].indexOf(input.to) >= 0) return input.currentProgress;
  const progress = input.requestedProgress === undefined ? input.currentProgress : input.requestedProgress;
  if ([25, 50, 75].indexOf(progress) < 0) throw new ApiException("VALIDATION_ERROR", "EM_ANDAMENTO aceita somente 25%, 50% ou 75%.");
  return progress;
}

function calculateImplantationStoreProgressV1(
  activities: Array<{ status: string; progress: number; active: boolean }>,
): number {
  const applicable = activities.filter((activity) => activity.active && ["NAO_APLICAVEL", "CANCELADO"].indexOf(activity.status) < 0);
  if (!applicable.length) return 0;
  return Math.round((applicable.reduce((sum, activity) => sum + activity.progress, 0) / applicable.length) * 100) / 100;
}

function calculateImplantationTargetDateV1(openingDate: string, offsetDays: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openingDate) || !Number.isInteger(offsetDays)) {
    throw new ApiException("VALIDATION_ERROR", "Data de inauguração ou Offset_Dias inválido.");
  }
  const date = new Date(`${openingDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== openingDate) {
    throw new ApiException("VALIDATION_ERROR", "Data de inauguração inválida.");
  }
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function daysUntilImplantationOpeningV1(today: string, openingDate: string): number {
  const start = new Date(`${today}T12:00:00.000Z`);
  const end = new Date(`${openingDate}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiException("VALIDATION_ERROR", "Data inválida.");
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function isUpcomingImplantationV1(today: string, openingDate: string): boolean {
  const days = daysUntilImplantationOpeningV1(today, openingDate);
  return days >= 0 && days <= IMPLANTATION_UPCOMING_DAYS_V1;
}

function isCriticalUpcomingImplantationV1(today: string, openingDate: string): boolean {
  const days = daysUntilImplantationOpeningV1(today, openingDate);
  return days >= 0 && days <= IMPLANTATION_CRITICAL_UPCOMING_DAYS_V1;
}

function missingImplantationEvidenceV1(
  activityId: string,
  evidence: Array<{ type: string; active: boolean }>,
): Array<{ type: string; required: number; found: number }> {
  return IMPLANTATION_EVIDENCE_SEED_V1.filter((rule) => rule.activityId === activityId).flatMap((rule) => {
    const found = evidence.filter((file) => file.active && file.type === rule.type).length;
    return found < rule.minimum ? [{ type: rule.type, required: rule.minimum, found }] : [];
  });
}

function isImplantationStoreReadyV1(
  activities: Array<{ mandatory: boolean; status: string; active: boolean }>,
): boolean {
  if (!activities.length) return false;
  return activities.filter((activity) => activity.active && activity.mandatory && ["NAO_APLICAVEL", "CANCELADO"].indexOf(activity.status) < 0)
    .every((activity) => activity.status === "CONCLUIDO");
}

/**
 * Setup manual V1. Não pertence ao dispatch HTTP e nunca é chamado automaticamente.
 * Exige ALLOW_SETUP_IMPLANTATION_V1=SIM, consome a propriedade e faz rollback em qualquer falha.
 */
function setupImplantationV1(): unknown {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(IMPLANTATION_SETUP_PROPERTY_V1) !== "SIM") {
    throw new Error(`Defina ${IMPLANTATION_SETUP_PROPERTY_V1}=SIM temporariamente para autorizar o setup.`);
  }
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    if (!lock.tryLock(10000)) throw new ApiException("CONCURRENT_REQUEST", "Outro processo está alterando a planilha. Tente novamente.");
    locked = true;
    const spreadsheet = openConfiguredSpreadsheet();
    const reportBefore = buildImplantationPrevalidationV1(spreadsheet);
    if (reportBefore.already_initialized) {
      const result = { status: "already_initialized", report: reportBefore };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }
    if (!reportBefore.ready_to_setup) {
      throw new ApiException(
        "IMPLANTATION_PREVALIDATION_FAILED",
        "O setup foi abortado antes da primeira escrita porque a pré-validação encontrou inconsistências.",
        reportBefore,
      );
    }
    return executeImplantationSetupV1(spreadsheet, reportBefore);
  } finally {
    properties.deleteProperty(IMPLANTATION_SETUP_PROPERTY_V1);
    if (locked) lock.releaseLock();
  }
}

/** Validação manual e somente leitura da estrutura já inicializada. */
function validateImplantationV1(): ImplantationValidationReportV1 {
  const report = validateImplantationV1Internal(openConfiguredSpreadsheet(), true);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function executeImplantationSetupV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  reportBefore: ImplantationPrevalidationReportV1,
): unknown {
  const context: ImplantationSetupContextV1 = { backups: [], createdSheets: [] };
  const stamp = Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyyMMdd_HHmmss");
  try {
    IMPLANTATION_BACKUP_SHEETS_V1.forEach((sheetName) => {
      const original = spreadsheet.getSheetByName(sheetName);
      if (!original) throw new ApiException("STRUCTURE_ERROR", `Aba obrigatória ${sheetName} não encontrada.`);
      const backupName = uniqueMigrationSheetNameV1(spreadsheet, `BKP_IMPL_V1_${stamp}_${sheetName}`);
      const backup = original.copyTo(spreadsheet).setName(backupName);
      context.backups.push({ original, backup });
    });
    IMPLANTATION_NEW_SHEETS_V1.forEach((sheetName) => {
      const sheet = spreadsheet.insertSheet(sheetName);
      context.createdSheets.push(sheet);
      prepareImplantationSheetV1(sheet, sheetName);
    });
    addImplantationStoreColumnsV1(spreadsheet);
    appendImplantationPermissionsV1(spreadsheet);
    appendImplantationListsV1(spreadsheet);
    writeImplantationChecklistSeedV1(spreadsheet);
    SpreadsheetApp.flush();
    const validationBeforeAudit = validateImplantationV1Internal(spreadsheet, false);
    if (!validationBeforeAudit.valid) {
      throw new ApiException("IMPLANTATION_POST_VALIDATION_FAILED", "A validação estrutural posterior ao setup encontrou inconsistências.", validationBeforeAudit);
    }
    appendImplantationSetupAuditV1(spreadsheet, context);
    SpreadsheetApp.flush();
    const validationAfter = validateImplantationV1Internal(spreadsheet, true);
    if (!validationAfter.valid) {
      throw new ApiException("IMPLANTATION_POST_VALIDATION_FAILED", "A validação final posterior ao setup encontrou inconsistências.", validationAfter);
    }
    const result = {
      status: "initialized",
      migration: IMPLANTATION_MIGRATION_ID_V1,
      backups: context.backups.map(({ backup }) => backup.getName()),
      sheets_created: context.createdSheets.map((sheet) => sheet.getName()),
      store_columns_added: reportBefore.required_new_store_columns,
      permission_rows_added: reportBefore.permission_rows_to_add.length,
      lists_updated: reportBefore.list_values_to_add.length,
      activities_created: IMPLANTATION_ACTIVITY_SEED_V1.length,
      evidence_rules_created: IMPLANTATION_EVIDENCE_SEED_V1.length,
      checklist_checksum_sha256: IMPLANTATION_CHECKLIST_CHECKSUM_V1,
      report_before: reportBefore,
      validation_after: validationAfter,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const rollback = rollbackImplantationSetupV1(spreadsheet, context);
    SpreadsheetApp.flush();
    throw new ApiException(
      rollback.ok ? "IMPLANTATION_SETUP_ROLLED_BACK" : "IMPLANTATION_ROLLBACK_FAILED",
      rollback.ok
        ? "O setup falhou e todas as alterações foram revertidas."
        : "O setup falhou e o rollback encontrou erros; preserve os backups e faça conferência manual.",
      { cause: safeImplantationErrorV1(error), rollback },
    );
  }
}

function prepareImplantationSheetV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, sheetName: string): void {
  const headers = IMPLANTATION_HEADERS_V1[sheetName];
  if (!headers) throw new ApiException("STRUCTURE_ERROR", `Cabeçalhos não definidos para ${sheetName}.`);
  ensureMigrationSheetSizeV1(sheet, 1000, headers.length);
  sheet.getRange(1, 1).setValue(sheetName.replace(/^\d+_/, "").replace(/_/g, " "));
  sheet.getRange(2, 1).setValue(IMPLANTATION_SHEET_DESCRIPTIONS_V1[sheetName] || "Estrutura do módulo Implantação V1.");
  sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  formatMigrationTableV1(sheet, headers.length, 0);
}

function addImplantationStoreColumnsV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.stores);
  if (!sheet) throw new ApiException("STRUCTURE_ERROR", "Aba 01_LOJAS não encontrada.");
  const info = inspectMigrationHeadersV1(sheet, "ID_Loja");
  if (!info.headerRow) throw new ApiException("STRUCTURE_ERROR", "Cabeçalho ID_Loja não encontrado.");
  const missing = IMPLANTATION_STORE_COLUMNS_V1.filter((column) => info.normalizedHeaders.indexOf(normalizeHeader(column)) < 0);
  if (!missing.length) return;
  const firstColumn = sheet.getLastColumn() + 1;
  ensureMigrationSheetSizeV1(sheet, sheet.getMaxRows(), firstColumn + missing.length - 1);
  sheet.getRange(info.headerRow, firstColumn, 1, missing.length).setValues([missing]);
  sheet.getRange(info.headerRow, firstColumn, 1, missing.length).setBackground("#1F4E78").setFontColor("#FFFFFF").setFontWeight("bold").setWrap(true);
  const dataRows = Math.max(sheet.getMaxRows() - info.headerRow, 1);
  sheet.getRange(info.headerRow + 1, firstColumn, dataRows, missing.length).setNumberFormat("dd/MM/yyyy");
}

function appendImplantationPermissionsV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Aprovar", "Excluir", "Exportar", "Reabrir", "Observações"]);
  const missing = IMPLANTATION_PERMISSION_ROWS_V1.filter((plan) => !table.rows.some((row) =>
    normalizeHeader(cell(table, row, "Perfil")) === normalizeHeader(plan.profile)
    && normalizeHeader(cell(table, row, "Módulo")) === normalizeHeader(plan.module)));
  if (!missing.length) return;
  const rows = missing.map((plan) => {
    const row = Array(table.headers.length).fill("");
    setCell(table, row, "Perfil", plan.profile);
    setCell(table, row, "Módulo", plan.module);
    setCell(table, row, "Visualizar", yesNoImplantationV1(plan.view));
    setCell(table, row, "Criar", yesNoImplantationV1(plan.create));
    setCell(table, row, "Editar", yesNoImplantationV1(plan.edit));
    setCell(table, row, "Aprovar", yesNoImplantationV1(plan.approve));
    setCell(table, row, "Excluir", yesNoImplantationV1(plan.remove));
    setCell(table, row, "Exportar", yesNoImplantationV1(plan.export));
    setCell(table, row, "Reabrir", yesNoImplantationV1(plan.reopen));
    setCell(table, row, "Observações", plan.notes);
    return row;
  });
  table.sheet.getRange(findFirstWritableRow(table, "Perfil", rows.length), 1, rows.length, table.headers.length).setValues(rows);
}

function appendImplantationListsV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!sheet) throw new ApiException("STRUCTURE_ERROR", "Aba 14_LISTAS não encontrada.");
  IMPLANTATION_LISTS_V1.forEach((plan) => {
    let lastColumn = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(4, 1, 1, lastColumn).getValues()[0].map((value) => String(value || ""));
    let column = headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(plan.name)) + 1;
    if (!column) {
      column = lastColumn + 1;
      ensureMigrationSheetSizeV1(sheet, sheet.getMaxRows(), column);
      sheet.getRange(4, column).setValue(plan.name).setBackground("#1F4E78").setFontColor("#FFFFFF").setFontWeight("bold").setWrap(true);
      lastColumn = column;
    }
    const existing = readImplantationListValuesV1(sheet, column);
    const missing = plan.values.filter((value) => existing.map(normalizeHeader).indexOf(normalizeHeader(value)) < 0);
    missing.forEach((value) => {
      const row = firstEmptyImplantationListRowV1(sheet, column);
      if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
      sheet.getRange(row, column).setValue(value);
    });
    if (lastColumn > sheet.getLastColumn()) ensureMigrationSheetSizeV1(sheet, sheet.getMaxRows(), lastColumn);
  });
}

function writeImplantationChecklistSeedV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const user = implantationSetupUserV1();
  const now = new Date();
  const modelTable = readTable(spreadsheet, APP_CONFIG.sheets.checklistModels, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModels]);
  const modelRow = Array(modelTable.headers.length).fill("");
  setCell(modelTable, modelRow, "ID_Modelo_Versao", IMPLANTATION_MODEL_SEED_V1.id);
  setCell(modelTable, modelRow, "Versao_Modelo", IMPLANTATION_MODEL_SEED_V1.version);
  setCell(modelTable, modelRow, "Nome", IMPLANTATION_MODEL_SEED_V1.name);
  setCell(modelTable, modelRow, "Status_Modelo", "Publicado");
  setCell(modelTable, modelRow, "Descricao", IMPLANTATION_MODEL_SEED_V1.description);
  setCell(modelTable, modelRow, "Data_Publicacao", now);
  setCell(modelTable, modelRow, "ID_Usuario_Publicacao", user.id);
  setCell(modelTable, modelRow, "Checksum_Definicao", IMPLANTATION_CHECKLIST_CHECKSUM_V1);
  setCell(modelTable, modelRow, "Observacoes", "Seed aprovado IMPLANTATION_V1; não alterar retroativamente checklists de lojas iniciadas.");
  setTechnicalCreationFields(modelTable, modelRow, user, now);
  setCell(modelTable, modelRow, "ativo", "Sim");
  modelTable.sheet.getRange(5, 1, 1, modelTable.headers.length).setValues([modelRow]);

  const evidenceByActivity: Record<string, ImplantationEvidenceRuleSeedV1[]> = {};
  IMPLANTATION_EVIDENCE_SEED_V1.forEach((rule) => {
    evidenceByActivity[rule.activityId] = [...(evidenceByActivity[rule.activityId] || []), rule];
  });
  const activityTable = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelActivities, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModelActivities]);
  const activityRows = IMPLANTATION_ACTIVITY_SEED_V1.map((activity) => {
    const rules = evidenceByActivity[activity.id] || [];
    const row = Array(activityTable.headers.length).fill("");
    setCell(activityTable, row, "ID_Modelo_Atividade", activity.id);
    setCell(activityTable, row, "ID_Modelo_Versao", IMPLANTATION_MODEL_SEED_V1.id);
    setCell(activityTable, row, "Codigo_Atividade", activity.code);
    setCell(activityTable, row, "ID_Fase", activity.phaseId);
    setCell(activityTable, row, "Fase", activity.phase);
    setCell(activityTable, row, "Ordem_Fase", activity.phaseOrder);
    setCell(activityTable, row, "Ordem_Atividade", activity.order);
    setCell(activityTable, row, "Acao", activity.action);
    setCell(activityTable, row, "Descricao", "");
    setCell(activityTable, row, "Offset_Dias", activity.offsetDays);
    setCell(activityTable, row, "Papel_Responsavel_Padrao", activity.defaultRole);
    setCell(activityTable, row, "Obrigatoria", yesNoImplantationV1(activity.mandatory));
    setCell(activityTable, row, "Critica", yesNoImplantationV1(activity.critical));
    setCell(activityTable, row, "Evidencia_Obrigatoria", yesNoImplantationV1(rules.length > 0));
    setCell(activityTable, row, "Qtd_Min_Evidencias", rules.reduce((sum, rule) => sum + rule.minimum, 0));
    setCell(activityTable, row, "Observacoes", "");
    setTechnicalCreationFields(activityTable, row, user, now);
    setCell(activityTable, row, "ativo", "Sim");
    return row;
  });
  activityTable.sheet.getRange(5, 1, activityRows.length, activityTable.headers.length).setValues(activityRows);

  const evidenceTable = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelEvidence, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModelEvidence]);
  const evidenceRows = IMPLANTATION_EVIDENCE_SEED_V1.map((rule) => {
    const row = Array(evidenceTable.headers.length).fill("");
    setCell(evidenceTable, row, "ID_Regra_Evidencia", rule.id);
    setCell(evidenceTable, row, "ID_Modelo_Atividade", rule.activityId);
    setCell(evidenceTable, row, "Tipo_Evidencia", rule.type);
    setCell(evidenceTable, row, "Quantidade_Minima", rule.minimum);
    setCell(evidenceTable, row, "Obrigatoria_Para_Conclusao", "Sim");
    setCell(evidenceTable, row, "Observacoes", "");
    setTechnicalCreationFields(evidenceTable, row, user, now);
    setCell(evidenceTable, row, "ativo", "Sim");
    return row;
  });
  evidenceTable.sheet.getRange(5, 1, evidenceRows.length, evidenceTable.headers.length).setValues(evidenceRows);
}

function validateImplantationV1Internal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  requireAudit: boolean,
): ImplantationValidationReportV1 {
  const report: ImplantationValidationReportV1 = {
    migration: "IMPLANTATION_V1",
    checked_at: new Date().toISOString(),
    valid: false,
    model_id: IMPLANTATION_MODEL_SEED_V1.id,
    model_version: IMPLANTATION_MODEL_SEED_V1.version,
    checksum_sha256: IMPLANTATION_CHECKLIST_CHECKSUM_V1,
    activities_found: 0,
    evidence_rules_found: 0,
    permission_rows_found: 0,
    lists_found: 0,
    technical_audit_found: false,
    issues: [],
  };
  try {
    validateImplantationStoreColumnsV1(spreadsheet, report);
    validateImplantationSheetsV1(spreadsheet, report);
    validateImplantationPermissionsV1(spreadsheet, report);
    validateImplantationListsV1(spreadsheet, report);
    validateImplantationAuditV1(spreadsheet, report, requireAudit);
  } catch (error) {
    report.issues.push({ issue: safeImplantationErrorV1(error) });
  }
  report.valid = report.issues.length === 0;
  return report;
}

function validateImplantationStoreColumnsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationValidationReportV1,
): void {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.stores);
  if (!sheet) {
    report.issues.push({ sheet: APP_CONFIG.sheets.stores, issue: "Aba não encontrada." });
    return;
  }
  const info = inspectMigrationHeadersV1(sheet, "ID_Loja");
  const missing = IMPLANTATION_STORE_COLUMNS_V1.filter((header) => info.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
  if (!info.headerRow || missing.length) report.issues.push({ sheet: APP_CONFIG.sheets.stores, missing });
}

function validateImplantationSheetsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationValidationReportV1,
): void {
  IMPLANTATION_NEW_SHEETS_V1.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const headers = IMPLANTATION_HEADERS_V1[sheetName];
    if (!sheet) {
      report.issues.push({ sheet: sheetName, issue: "Aba não encontrada." });
      return;
    }
    const info = inspectMigrationHeadersV1(sheet, headers[0]);
    const missing = headers.filter((header) => info.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
    const duplicates = duplicateNormalizedHeadersV1(info.normalizedHeaders, headers);
    if (info.headerRow !== 4 || missing.length || duplicates.length) {
      report.issues.push({ sheet: sheetName, header_row: info.headerRow, missing, duplicates });
    }
  });
  if (report.issues.length) return;
  const models = readTable(spreadsheet, APP_CONFIG.sheets.checklistModels, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModels]);
  const modelRows = models.rows.filter((row) => cell(models, row, "ID_Modelo_Versao") === IMPLANTATION_MODEL_SEED_V1.id);
  if (modelRows.length !== 1) {
    report.issues.push({ sheet: APP_CONFIG.sheets.checklistModels, issue: "A versão mestre deve existir exatamente uma vez.", found: modelRows.length });
  } else {
    const row = modelRows[0];
    if (Number(cell(models, row, "Versao_Modelo")) !== IMPLANTATION_MODEL_SEED_V1.version
      || normalizeHeader(cell(models, row, "Status_Modelo")) !== normalizeHeader("Publicado")
      || cell(models, row, "Checksum_Definicao") !== IMPLANTATION_CHECKLIST_CHECKSUM_V1
      || !isYes(cell(models, row, "ativo"))) {
      report.issues.push({ sheet: APP_CONFIG.sheets.checklistModels, issue: "Versão, status, checksum ou ativo do modelo diverge." });
    }
  }
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelActivities, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModelActivities]);
  const activityRows = activities.rows.filter((row) => cell(activities, row, "ID_Modelo_Versao") === IMPLANTATION_MODEL_SEED_V1.id && isYes(cell(activities, row, "ativo")));
  report.activities_found = activityRows.length;
  if (activityRows.length !== IMPLANTATION_ACTIVITY_SEED_V1.length) {
    report.issues.push({ sheet: APP_CONFIG.sheets.checklistModelActivities, expected: IMPLANTATION_ACTIVITY_SEED_V1.length, found: activityRows.length });
  }
  const activityMap = Object.fromEntries(activityRows.map((row) => [cell(activities, row, "ID_Modelo_Atividade"), row]));
  IMPLANTATION_ACTIVITY_SEED_V1.forEach((seed) => {
    const row = activityMap[seed.id];
    if (!row || cell(activities, row, "Codigo_Atividade") !== seed.code || Number(cell(activities, row, "Offset_Dias")) !== seed.offsetDays
      || cell(activities, row, "Papel_Responsavel_Padrao") !== seed.defaultRole || isYes(cell(activities, row, "Obrigatoria")) !== seed.mandatory
      || isYes(cell(activities, row, "Critica")) !== seed.critical) {
      report.issues.push({ sheet: APP_CONFIG.sheets.checklistModelActivities, activity_id: seed.id, issue: "Atividade ausente ou divergente do seed." });
    }
  });
  const evidence = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelEvidence, IMPLANTATION_HEADERS_V1[APP_CONFIG.sheets.checklistModelEvidence]);
  const evidenceRows = evidence.rows.filter((row) => isYes(cell(evidence, row, "ativo")));
  report.evidence_rules_found = evidenceRows.length;
  if (evidenceRows.length !== IMPLANTATION_EVIDENCE_SEED_V1.length) {
    report.issues.push({ sheet: APP_CONFIG.sheets.checklistModelEvidence, expected: IMPLANTATION_EVIDENCE_SEED_V1.length, found: evidenceRows.length });
  }
  const evidenceMap = Object.fromEntries(evidenceRows.map((row) => [cell(evidence, row, "ID_Regra_Evidencia"), row]));
  IMPLANTATION_EVIDENCE_SEED_V1.forEach((seed) => {
    const row = evidenceMap[seed.id];
    if (!row || cell(evidence, row, "ID_Modelo_Atividade") !== seed.activityId || cell(evidence, row, "Tipo_Evidencia") !== seed.type
      || Number(cell(evidence, row, "Quantidade_Minima")) !== seed.minimum || !isYes(cell(evidence, row, "Obrigatoria_Para_Conclusao"))) {
      report.issues.push({ sheet: APP_CONFIG.sheets.checklistModelEvidence, rule_id: seed.id, issue: "Regra ausente ou divergente do seed." });
    }
  });
}

function validateImplantationPermissionsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationValidationReportV1,
): void {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Aprovar", "Excluir", "Exportar", "Reabrir", "Observações"]);
  IMPLANTATION_PERMISSION_ROWS_V1.forEach((plan) => {
    const matches = table.rows.filter((row) => normalizeHeader(cell(table, row, "Perfil")) === normalizeHeader(plan.profile)
      && normalizeHeader(cell(table, row, "Módulo")) === normalizeHeader(plan.module));
    if (matches.length !== 1 || !implantationPermissionMatchesV1(table, matches[0], plan)) {
      report.issues.push({ sheet: APP_CONFIG.sheets.permissions, profile: plan.profile, module: plan.module, issue: "Permissão ausente, duplicada ou divergente." });
    } else {
      report.permission_rows_found += 1;
    }
  });
}

function validateImplantationListsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationValidationReportV1,
): void {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!sheet) {
    report.issues.push({ sheet: APP_CONFIG.sheets.lists, issue: "Aba não encontrada." });
    return;
  }
  const headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getValues()[0].map((value) => String(value || ""));
  IMPLANTATION_LISTS_V1.forEach((plan) => {
    const columns = headers.map(normalizeHeader).map((header, index) => header === normalizeHeader(plan.name) ? index + 1 : 0).filter(Boolean);
    const values = columns.length === 1 ? readImplantationListValuesV1(sheet, columns[0]).map(normalizeHeader) : [];
    const missing = plan.values.filter((value) => values.indexOf(normalizeHeader(value)) < 0);
    if (columns.length !== 1 || missing.length) {
      report.issues.push({ sheet: APP_CONFIG.sheets.lists, list: plan.name, columns, missing });
    } else {
      report.lists_found += 1;
    }
  });
}

function validateImplantationAuditV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: ImplantationValidationReportV1,
  requireAudit: boolean,
): void {
  const history = readTable(spreadsheet, APP_CONFIG.sheets.history, ["ID_Histórico", "Ação", "Referência"]);
  report.technical_audit_found = history.rows.some((row) => cell(history, row, "Referência") === IMPLANTATION_MIGRATION_ID_V1
    && normalizeHeader(cell(history, row, "Ação")) === normalizeHeader("SETUP"));
  if (requireAudit && !report.technical_audit_found) {
    report.issues.push({ sheet: APP_CONFIG.sheets.history, issue: "Auditoria técnica do setup não encontrada." });
  }
}

function appendImplantationSetupAuditV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  context: ImplantationSetupContextV1,
): void {
  const user = implantationSetupUserV1();
  appendAuditBatch(spreadsheet, user, [{
    module: "IMPLANTACAO_SETUP",
    recordId: IMPLANTATION_MODEL_SEED_V1.id,
    changes: [
      { field: "Abas_Criadas", previous: "", next: context.createdSheets.map((sheet) => sheet.getName()).join(", ") },
      { field: "Colunas_01_LOJAS", previous: "", next: IMPLANTATION_STORE_COLUMNS_V1.join(", ") },
      { field: "Permissoes", previous: 0, next: IMPLANTATION_PERMISSION_ROWS_V1.length },
      { field: "Listas", previous: 0, next: IMPLANTATION_LISTS_V1.length },
      { field: "Atividades", previous: 0, next: IMPLANTATION_ACTIVITY_SEED_V1.length },
      { field: "Regras_Evidencia", previous: 0, next: IMPLANTATION_EVIDENCE_SEED_V1.length },
      { field: "Checksum_Definicao", previous: "", next: IMPLANTATION_CHECKLIST_CHECKSUM_V1 },
    ],
    reason: "Preparação estrutural manual e versionada do módulo Implantação V1.",
    action: "SETUP",
    origin: "EXECUCAO_MANUAL_APPS_SCRIPT",
    reference: IMPLANTATION_MIGRATION_ID_V1,
  }]);
}

function rollbackImplantationSetupV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  context: ImplantationSetupContextV1,
): { ok: boolean; restored: string[]; removed: string[]; errors: string[] } {
  const restored: string[] = [];
  const removed: string[] = [];
  const errors: string[] = [];
  context.createdSheets.slice().reverse().forEach((sheet) => {
    try {
      const current = spreadsheet.getSheetByName(sheet.getName());
      if (current) spreadsheet.deleteSheet(current);
      removed.push(sheet.getName());
    } catch (error) {
      errors.push(`Remover ${sheet.getName()}: ${safeImplantationErrorV1(error)}`);
    }
  });
  context.backups.slice().reverse().forEach(({ original, backup }) => {
    try {
      restoreImplantationBackupV1(original, backup);
      restored.push(original.getName());
      spreadsheet.deleteSheet(backup);
    } catch (error) {
      errors.push(`Restaurar ${original.getName()} usando ${backup.getName()}: ${safeImplantationErrorV1(error)}`);
    }
  });
  return { ok: errors.length === 0, restored, removed, errors };
}

function restoreImplantationBackupV1(
  target: GoogleAppsScript.Spreadsheet.Sheet,
  backup: GoogleAppsScript.Spreadsheet.Sheet,
): void {
  if (target.getMaxRows() < backup.getMaxRows()) target.insertRowsAfter(target.getMaxRows(), backup.getMaxRows() - target.getMaxRows());
  if (target.getMaxColumns() < backup.getMaxColumns()) target.insertColumnsAfter(target.getMaxColumns(), backup.getMaxColumns() - target.getMaxColumns());
  target.getRange(1, 1, target.getMaxRows(), target.getMaxColumns()).clear();
  backup.getRange(1, 1, backup.getMaxRows(), backup.getMaxColumns())
    .copyTo(target.getRange(1, 1, backup.getMaxRows(), backup.getMaxColumns()), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
  target.setFrozenRows(backup.getFrozenRows());
  target.setFrozenColumns(backup.getFrozenColumns());
  if (target.getMaxRows() > backup.getMaxRows()) target.deleteRows(backup.getMaxRows() + 1, target.getMaxRows() - backup.getMaxRows());
  if (target.getMaxColumns() > backup.getMaxColumns()) target.deleteColumns(backup.getMaxColumns() + 1, target.getMaxColumns() - backup.getMaxColumns());
}

function implantationPermissionMatchesV1(
  table: SheetTable,
  row: unknown[],
  plan: ImplantationPermissionPlanV1,
): boolean {
  return isYes(cell(table, row, "Visualizar")) === plan.view
    && isYes(cell(table, row, "Criar")) === plan.create
    && isYes(cell(table, row, "Editar")) === plan.edit
    && isYes(cell(table, row, "Aprovar")) === plan.approve
    && isYes(cell(table, row, "Excluir")) === plan.remove
    && isYes(cell(table, row, "Exportar")) === plan.export
    && isYes(cell(table, row, "Reabrir")) === plan.reopen
    && cell(table, row, "Observações") === plan.notes;
}

function implantationPermissionRecordV1(plan: ImplantationPermissionPlanV1): Record<string, unknown> {
  return {
    Perfil: plan.profile,
    "Módulo": plan.module,
    Visualizar: yesNoImplantationV1(plan.view),
    Criar: yesNoImplantationV1(plan.create),
    Editar: yesNoImplantationV1(plan.edit),
    Aprovar: yesNoImplantationV1(plan.approve),
    Excluir: yesNoImplantationV1(plan.remove),
    Exportar: yesNoImplantationV1(plan.export),
    Reabrir: yesNoImplantationV1(plan.reopen),
    "Observações": plan.notes,
  };
}

function readImplantationListValuesV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, column: number): string[] {
  const rowCount = Math.max(sheet.getLastRow() - 4, 0);
  if (!rowCount) return [];
  return sheet.getRange(5, column, rowCount, 1).getValues().flat().map((value) => String(value || "").trim()).filter(Boolean);
}

function firstEmptyImplantationListRowV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, column: number): number {
  const rowCount = Math.max(sheet.getMaxRows() - 4, 1);
  const values = sheet.getRange(5, column, rowCount, 1).getDisplayValues();
  const offset = values.findIndex((row) => String(row[0] || "").trim() === "");
  return offset < 0 ? sheet.getMaxRows() + 1 : offset + 5;
}

function yesNoImplantationV1(value: boolean): string {
  return value ? "Sim" : "Não";
}

function implantationSetupUserV1(): SystemUser {
  let email = "EXECUCAO_MANUAL";
  try {
    email = Session.getEffectiveUser().getEmail() || email;
  } catch (_error) {
    // A identidade efetiva pode não estar disponível em todos os contextos manuais.
  }
  return {
    id: "SETUP_IMPLANTATION_V1",
    name: "Setup manual Implantação V1",
    email,
    profile: "ADMINISTRADOR",
    allowedStoreIds: "TODAS",
  };
}
