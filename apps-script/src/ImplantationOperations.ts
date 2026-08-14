interface ImplantationCapabilitiesV1 {
  view: boolean;
  viewUpdates: boolean;
  viewMaster: boolean;
  setOpeningDate: boolean;
  previewOpeningDateChange: boolean;
  changePlannedOpeningDate: boolean;
  start: boolean;
  updateActivity: boolean;
  blockActivity: boolean;
  unblockActivity: boolean;
  markNotApplicable: boolean;
  completeActivity: boolean;
  cancelActivity: boolean;
  reopenActivity: boolean;
  evidenceFilesEnabled: false;
}

interface ImplantationDateImpactV1 {
  activityId: string;
  action: string;
  status: string;
  previousTargetDate: string;
  nextTargetDate: string;
  version: number;
}

const IMPLANTATION_MODULE_V1 = "Implantação";
const IMPLANTATION_UPDATES_MODULE_V1 = "Implantação Atualizações";
const IMPLANTATION_MASTER_MODULE_V1 = "Checklist Mestre";

function buildImplantationCapabilitiesV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
): ImplantationCapabilitiesV1 {
  const permissions = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Excluir", "Reabrir"]);
  const canEditImplantation = hasModulePermission(permissions, user, IMPLANTATION_MODULE_V1, "Editar");
  const canCreateUpdates = hasModulePermission(permissions, user, IMPLANTATION_UPDATES_MODULE_V1, "Criar");
  return {
    view: hasModulePermission(permissions, user, IMPLANTATION_MODULE_V1, "Visualizar"),
    viewUpdates: hasModulePermission(permissions, user, IMPLANTATION_UPDATES_MODULE_V1, "Visualizar"),
    viewMaster: hasModulePermission(permissions, user, IMPLANTATION_MASTER_MODULE_V1, "Visualizar"),
    setOpeningDate: canEditImplantation,
    previewOpeningDateChange: canEditImplantation,
    changePlannedOpeningDate: canEditImplantation,
    start: hasModulePermission(permissions, user, IMPLANTATION_MODULE_V1, "Criar"),
    updateActivity: canCreateUpdates,
    blockActivity: canCreateUpdates,
    unblockActivity: canCreateUpdates,
    markNotApplicable: canCreateUpdates,
    completeActivity: canCreateUpdates,
    cancelActivity: canCreateUpdates && hasModulePermission(permissions, user, IMPLANTATION_MODULE_V1, "Excluir"),
    reopenActivity: canCreateUpdates && hasModulePermission(permissions, user, IMPLANTATION_MODULE_V1, "Reabrir"),
    evidenceFilesEnabled: false,
  };
}

function assertImplantationViewV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): void {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Visualizar");
}

function allowedImplantationStoresV1(table: SheetTable, user: SystemUser): unknown[][] {
  return table.rows.filter((row) => isStoreAllowed(user, cell(table, row, "ID_Loja")));
}

function isActiveImplantationRowV1(table: SheetTable, row: unknown[]): boolean {
  const value = cell(table, row, "ativo");
  return !value || isYes(value);
}

function implantationStatusCodeV1(value: string): string {
  const key = normalizeHeader(value).toUpperCase();
  const aliases: Record<string, string> = {
    NAOINICIADO: "NAO_INICIADO", EMANDAMENTO: "EM_ANDAMENTO", BLOQUEADO: "BLOQUEADO",
    CONCLUIDO: "CONCLUIDO", NAOAPLICAVEL: "NAO_APLICAVEL", CANCELADO: "CANCELADO",
  };
  const result = aliases[key] || key;
  if (IMPLANTATION_ACTIVITY_STATUSES_V1.indexOf(result) < 0) {
    throw new ApiException("INVALID_STATUS", `Status de implantação inválido: ${value}.`);
  }
  return result;
}

function implantationStatusLabelV1(status: string): string {
  const labels: Record<string, string> = {
    NAO_INICIADO: "Não iniciado", EM_ANDAMENTO: "Em andamento", BLOQUEADO: "Bloqueado",
    CONCLUIDO: "Concluído", NAO_APLICAVEL: "Não aplicável", CANCELADO: "Cancelado",
  };
  return labels[status] || status;
}

function mapImplantationStoreV1(table: SheetTable, row: unknown[]): Record<string, unknown> {
  return {
    id: cell(table, row, "ID_Loja"),
    name: cell(table, row, "Loja") || cell(table, row, "Nome"),
    city: cell(table, row, "Cidade"),
    state: cell(table, row, "UF"),
    status: cell(table, row, "Status"),
    plannedOpeningDate: dateCell(table, row, "Data_Inauguracao_Planejada") || null,
    actualOpeningDate: dateCell(table, row, "Data_Inauguracao_Real") || null,
    version: Number(cell(table, row, "version") || 1),
  };
}

function mapImplantationCycleV1(table: SheetTable, row: unknown[]): Record<string, unknown> {
  return {
    id: cell(table, row, "ID_Implantacao"), storeId: cell(table, row, "ID_Loja"),
    modelVersionId: cell(table, row, "ID_Modelo_Versao"), coordinatorUserId: cell(table, row, "ID_Usuario_Coordenador"),
    baseOpeningDate: dateCell(table, row, "Data_Inauguracao_Base"),
    plannedOpeningDate: dateCell(table, row, "Data_Inauguracao_Planejada_Atual"),
    actualOpeningDate: dateCell(table, row, "Data_Inauguracao_Real") || null,
    status: normalizeHeader(cell(table, row, "Status_Ciclo")).toUpperCase(),
    startedAt: implantationDateTimeV1(table, row, "Iniciada_Em"), startedBy: cell(table, row, "Iniciada_Por"),
    notes: cell(table, row, "Observacoes"), version: Number(cell(table, row, "version") || 1),
  };
}

function mapImplantationActivityV1(table: SheetTable, row: unknown[]): Record<string, unknown> {
  return {
    id: cell(table, row, "ID_Checklist_Loja"), implantationId: cell(table, row, "ID_Implantacao"),
    storeId: cell(table, row, "ID_Loja"), modelActivityId: cell(table, row, "ID_Modelo_Atividade"),
    modelVersion: Number(cell(table, row, "Versao_Modelo") || 1), phaseId: cell(table, row, "ID_Fase"),
    phase: cell(table, row, "Fase_Snapshot"), phaseOrder: Number(cell(table, row, "Ordem_Fase") || 0),
    activityOrder: Number(cell(table, row, "Ordem_Atividade") || 0), action: cell(table, row, "Acao_Snapshot"),
    offsetDays: Number(cell(table, row, "Offset_Dias_Snapshot") || 0),
    defaultResponsibleRole: cell(table, row, "Papel_Responsavel_Padrao_Snapshot"),
    mandatory: isYes(cell(table, row, "Obrigatoria_Snapshot")), critical: isYes(cell(table, row, "Critica_Snapshot")),
    evidenceRequired: isYes(cell(table, row, "Evidencia_Obrigatoria_Snapshot")),
    minimumEvidence: Number(cell(table, row, "Qtd_Min_Evidencias_Snapshot") || 0),
    originalTargetDate: dateCell(table, row, "Data_Alvo_Original"), currentTargetDate: dateCell(table, row, "Data_Alvo_Atual"),
    responsibleUserId: cell(table, row, "ID_Usuario_Responsavel"), status: implantationStatusCodeV1(cell(table, row, "Status")),
    progress: Number(cell(table, row, "Percentual_Concluido") || 0),
    actualStartDate: dateCell(table, row, "Data_Inicio_Real") || null,
    actualCompletionDate: dateCell(table, row, "Data_Conclusao_Real") || null,
    lastObservation: cell(table, row, "Ultima_Observacao"),
    lastUpdatedAt: implantationDateTimeV1(table, row, "Ultima_Atualizacao_Em"),
    version: Number(cell(table, row, "version") || 1), evidenceValidationPending: isYes(cell(table, row, "Evidencia_Obrigatoria_Snapshot")),
  };
}

function implantationDateTimeV1(table: SheetTable, row: unknown[], header: string): string {
  const index = table.normalizedHeaders.indexOf(normalizeHeader(header));
  if (index < 0 || !row[index]) return "";
  return row[index] instanceof Date ? (row[index] as Date).toISOString() : String(row[index]);
}

function currentImplantationForStoreV1(table: SheetTable, storeId: string): unknown[] | undefined {
  return table.rows.find((row) => isActiveImplantationRowV1(table, row)
    && cell(table, row, "ID_Loja") === storeId
    && normalizeHeader(cell(table, row, "Status_Ciclo")) === "ativo");
}

function activeActivitiesForImplantationV1(table: SheetTable, implantationId: string): unknown[][] {
  return table.rows.filter((row) => isActiveImplantationRowV1(table, row) && cell(table, row, "ID_Implantacao") === implantationId);
}

function implantationSummaryV1(activityTable: SheetTable, rows: unknown[][]): Record<string, unknown> {
  const mapped = rows.map((row) => mapImplantationActivityV1(activityTable, row));
  const statuses: Record<string, number> = {};
  mapped.forEach((activity) => {
    const status = String(activity.status);
    statuses[status] = (statuses[status] || 0) + 1;
  });
  return {
    total: mapped.length,
    progress: calculateImplantationStoreProgressV1(mapped.map((item) => ({
      status: String(item.status), progress: Number(item.progress), active: true,
    }))),
    statuses,
    criticalOpen: mapped.filter((item) => Boolean(item.critical) && item.status !== "CONCLUIDO" && item.status !== "NAO_APLICAVEL" && item.status !== "CANCELADO").length,
    blocked: statuses.BLOQUEADO || 0,
    completed: statuses.CONCLUIDO || 0,
  };
}

function buildImplantationOverviewV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
): unknown {
  assertImplantationViewV1(spreadsheet, user);
  const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada", "version"]);
  const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "version", "ativo"]);
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "version", "ativo"]);
  const storeRows = allowedImplantationStoresV1(stores, user);
  const storeItems = storeRows.map((storeRow) => {
    const storeId = cell(stores, storeRow, "ID_Loja");
    const cycle = currentImplantationForStoreV1(cycles, storeId);
    const activityRows = cycle ? activeActivitiesForImplantationV1(activities, cell(cycles, cycle, "ID_Implantacao")) : [];
    return {
      store: mapImplantationStoreV1(stores, storeRow),
      implantation: cycle ? mapImplantationCycleV1(cycles, cycle) : null,
      summary: implantationSummaryV1(activities, activityRows),
    };
  });
  return {
    checkedAt: new Date().toISOString(), capabilities: buildImplantationCapabilitiesV1(spreadsheet, user), stores: storeItems,
    totals: {
      stores: storeItems.length,
      withOpeningDate: storeItems.filter((entry) => Boolean((entry.store as Record<string, unknown>).plannedOpeningDate)).length,
      started: storeItems.filter((entry) => Boolean(entry.implantation)).length,
      notStarted: storeItems.filter((entry) => !entry.implantation).length,
      blocked: storeItems.reduce((sum, entry) => sum + Number((entry.summary as Record<string, unknown>).blocked || 0), 0),
      completedActivities: storeItems.reduce((sum, entry) => sum + Number((entry.summary as Record<string, unknown>).completed || 0), 0),
    },
    evidenceValidationPending: true,
  };
}

function buildImplantationChecklistsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
): unknown {
  const overview = buildImplantationOverviewV1(spreadsheet, user) as Record<string, unknown>;
  return { ...overview, stores: (overview.stores as Array<Record<string, unknown>>).filter((entry) => Boolean(entry.implantation)) };
}

function buildImplantationPendenciesV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
): unknown {
  assertImplantationViewV1(spreadsheet, user);
  const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada"]);
  const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "ativo"]);
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Data_Alvo_Atual", "version", "ativo"]);
  const storeMap: Record<string, Record<string, unknown>> = {};
  allowedImplantationStoresV1(stores, user).forEach((row) => { storeMap[cell(stores, row, "ID_Loja")] = mapImplantationStoreV1(stores, row); });
  const allowedCycleIds: Record<string, boolean> = {};
  cycles.rows.forEach((row) => {
    if (isActiveImplantationRowV1(cycles, row) && storeMap[cell(cycles, row, "ID_Loja")]) allowedCycleIds[cell(cycles, row, "ID_Implantacao")] = true;
  });
  const today = Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyy-MM-dd");
  const items = activities.rows.filter((row) => isActiveImplantationRowV1(activities, row)
    && Boolean(allowedCycleIds[cell(activities, row, "ID_Implantacao")]))
    .map((row) => ({ activity: mapImplantationActivityV1(activities, row), store: storeMap[cell(activities, row, "ID_Loja")] }))
    .filter((entry) => {
      const status = String((entry.activity as Record<string, unknown>).status);
      const target = String((entry.activity as Record<string, unknown>).currentTargetDate || "");
      return status === "BLOQUEADO" || (!(["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].indexOf(status) >= 0) && Boolean(target) && target <= today)
        || (!(["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].indexOf(status) >= 0) && !(entry.activity as Record<string, unknown>).responsibleUserId);
    });
  return { checkedAt: new Date().toISOString(), today, capabilities: buildImplantationCapabilitiesV1(spreadsheet, user), items, evidenceValidationPending: true };
}

function buildImplantationStoreDetailV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertImplantationViewV1(spreadsheet, user);
  const storeId = requireString(payload.storeId, "storeId");
  assertStoreScope(user, storeId);
  const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada", "version"]);
  const storeRow = findRowById(stores, "ID_Loja", storeId, "Loja").row;
  const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "version", "ativo"]);
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "version", "ativo"]);
  const cycle = currentImplantationForStoreV1(cycles, storeId);
  const activityRows = cycle ? activeActivitiesForImplantationV1(activities, cell(cycles, cycle, "ID_Implantacao")) : [];
  const users = readTable(spreadsheet, APP_CONFIG.sheets.users, ["ID_Usuário", "Nome", "Perfil", "Lojas_Permitidas", "Ativo"]);
  const eligibleUsers = users.rows.filter((row) => isYes(cell(users, row, "Ativo")) && implantationUserAllowsStoreV1(users, row, storeId)).map((row) => ({
    id: cell(users, row, "ID_Usuário"), name: cell(users, row, "Nome"), profile: cell(users, row, "Perfil"),
  }));
  return {
    checkedAt: new Date().toISOString(), capabilities: buildImplantationCapabilitiesV1(spreadsheet, user),
    store: mapImplantationStoreV1(stores, storeRow), implantation: cycle ? mapImplantationCycleV1(cycles, cycle) : null,
    activities: activityRows.map((row) => mapImplantationActivityV1(activities, row)),
    summary: implantationSummaryV1(activities, activityRows), eligibleUsers, evidenceValidationPending: true,
  };
}

function implantationUserAllowsStoreV1(table: SheetTable, row: unknown[], storeId: string): boolean {
  const scope = cell(table, row, "Lojas_Permitidas");
  return normalizeText(scope) === "todas" || scope.split(",").map((value) => value.trim()).indexOf(storeId) >= 0;
}

function buildImplantationActivityDetailV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertImplantationViewV1(spreadsheet, user);
  const activityId = requireString(payload.activityId, "activityId");
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "ID_Modelo_Atividade", "Status", "version", "ativo"]);
  const activityRow = findRowById(activities, "ID_Checklist_Loja", activityId, "Atividade").row;
  const storeId = cell(activities, activityRow, "ID_Loja");
  assertStoreScope(user, storeId);
  const storeDetail = buildImplantationStoreDetailV1(spreadsheet, user, { storeId }) as Record<string, unknown>;
  const blocks = readTable(spreadsheet, APP_CONFIG.sheets.implantationBlocks, ["ID_Bloqueio", "ID_Checklist_Loja", "Data_Desbloqueio", "version", "ativo"]);
  const activeBlock = blocks.rows.find((row) => isActiveImplantationRowV1(blocks, row)
    && cell(blocks, row, "ID_Checklist_Loja") === activityId && !dateCell(blocks, row, "Data_Desbloqueio"));
  const rules = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelEvidence, ["ID_Regra_Evidencia", "ID_Modelo_Atividade", "Tipo_Evidencia", "Quantidade_Minima", "ativo"]);
  const modelActivityId = cell(activities, activityRow, "ID_Modelo_Atividade");
  return {
    ...storeDetail,
    activity: mapImplantationActivityV1(activities, activityRow),
    activeBlock: activeBlock ? {
      id: cell(blocks, activeBlock, "ID_Bloqueio"), reason: cell(blocks, activeBlock, "Motivo_Bloqueio"),
      previousStatus: implantationStatusCodeV1(cell(blocks, activeBlock, "Status_Anterior")),
      progress: Number(cell(blocks, activeBlock, "Progresso_No_Bloqueio") || 0),
      responsibleRole: cell(blocks, activeBlock, "Papel_Responsavel_Desbloqueio"), version: Number(cell(blocks, activeBlock, "version") || 1),
    } : null,
    evidenceRules: rules.rows.filter((row) => isActiveImplantationRowV1(rules, row) && cell(rules, row, "ID_Modelo_Atividade") === modelActivityId).map((row) => ({
      id: cell(rules, row, "ID_Regra_Evidencia"), type: cell(rules, row, "Tipo_Evidencia"), minimum: Number(cell(rules, row, "Quantidade_Minima") || 0),
      requiredForCompletion: isYes(cell(rules, row, "Obrigatoria_Para_Conclusao")),
    })),
  };
}

function buildImplantationTimelineV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_UPDATES_MODULE_V1, "Visualizar");
  const activityId = requireString(payload.activityId, "activityId");
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Loja"]);
  const activity = findRowById(activities, "ID_Checklist_Loja", activityId, "Atividade").row;
  assertStoreScope(user, cell(activities, activity, "ID_Loja"));
  const requestedPageSize = Number(payload.pageSize || 20);
  if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) throw new ApiException("VALIDATION_ERROR", "Tamanho da página da timeline inválido.");
  const pageSize = Math.min(requestedPageSize, 50);
  const requestedCursor = Number(payload.cursor || 0);
  if (!Number.isInteger(requestedCursor) || requestedCursor < 0) throw new ApiException("VALIDATION_ERROR", "Cursor da timeline inválido.");
  const cursor = requestedCursor;
  const table = readImplantationTableStructureV1(spreadsheet, APP_CONFIG.sheets.implantationUpdates, ["ID_Atualizacao", "ID_Checklist_Loja", "Data_Hora", "Request_ID", "ativo"]);
  const dataStart = table.headerRow + 1;
  const rowCount = Math.max(table.sheet.getLastRow() - table.headerRow, 0);
  const activityValues = rowCount ? table.sheet.getRange(dataStart, columnIndex(table, "ID_Checklist_Loja") + 1, rowCount, 1).getDisplayValues() : [];
  const activeValues = rowCount ? table.sheet.getRange(dataStart, columnIndex(table, "ativo") + 1, rowCount, 1).getDisplayValues() : [];
  const matchingRows = activityValues.reduce<number[]>((result, row, index) => {
    const active = String(activeValues[index]?.[0] || "");
    if (String(row[0] || "").trim() === activityId && (!active || isYes(active))) result.push(dataStart + index);
    return result;
  }, []).reverse();
  const pageNumbers = matchingRows.slice(cursor, cursor + pageSize);
  const page = pageNumbers.length
    ? table.sheet.getRangeList(pageNumbers.map((row) => `A${row}:${columnLetterV1(table.headers.length)}${row}`)).getRanges().map((range) => range.getValues()[0])
    : [];
  return {
    items: page.map((row) => ({
      id: cell(table, row, "ID_Atualizacao"), type: cell(table, row, "Tipo_Atualizacao"), text: cell(table, row, "Texto"),
      previousStatus: cell(table, row, "Status_Anterior"), nextStatus: cell(table, row, "Status_Novo"),
      previousProgress: cell(table, row, "Progresso_Anterior"), nextProgress: cell(table, row, "Progresso_Novo"),
      previousResponsibleUserId: cell(table, row, "ID_Responsavel_Anterior"), nextResponsibleUserId: cell(table, row, "ID_Responsavel_Novo"),
      occurredAt: implantationDateTimeV1(table, row, "Data_Hora"), userId: cell(table, row, "ID_Usuario"), origin: cell(table, row, "Origem"),
    })),
    nextCursor: cursor + page.length < matchingRows.length ? cursor + page.length : null, total: matchingRows.length,
  };
}

function buildImplantationMasterChecklistV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MASTER_MODULE_V1, "Visualizar");
  const models = readTable(spreadsheet, APP_CONFIG.sheets.checklistModels, ["ID_Modelo_Versao", "Versao_Modelo", "Status_Modelo", "Checksum_Definicao", "ativo"]);
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelActivities, ["ID_Modelo_Atividade", "ID_Modelo_Versao", "Codigo_Atividade", "ativo"]);
  const evidence = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelEvidence, ["ID_Regra_Evidencia", "ID_Modelo_Atividade", "Tipo_Evidencia", "ativo"]);
  const published = models.rows.filter((row) => isActiveImplantationRowV1(models, row) && normalizeHeader(cell(models, row, "Status_Modelo")) === "publicado");
  if (published.length !== 1) throw new ApiException("MODEL_NOT_READY", "Deve existir exatamente um Checklist Mestre publicado e ativo.");
  const model = published[0];
  const modelId = cell(models, model, "ID_Modelo_Versao");
  return {
    readOnly: true,
    model: {
      id: modelId, version: Number(cell(models, model, "Versao_Modelo") || 1), name: cell(models, model, "Nome"),
      status: cell(models, model, "Status_Modelo"), description: cell(models, model, "Descricao"),
      publishedAt: implantationDateTimeV1(models, model, "Data_Publicacao"), checksum: cell(models, model, "Checksum_Definicao"),
    },
    activities: activities.rows.filter((row) => isActiveImplantationRowV1(activities, row) && cell(activities, row, "ID_Modelo_Versao") === modelId).map((row) => ({
      id: cell(activities, row, "ID_Modelo_Atividade"), code: cell(activities, row, "Codigo_Atividade"),
      phaseId: cell(activities, row, "ID_Fase"), phase: cell(activities, row, "Fase"),
      phaseOrder: Number(cell(activities, row, "Ordem_Fase") || 0), order: Number(cell(activities, row, "Ordem_Atividade") || 0),
      action: cell(activities, row, "Acao"), description: cell(activities, row, "Descricao"), offsetDays: Number(cell(activities, row, "Offset_Dias") || 0),
      responsibleRole: cell(activities, row, "Papel_Responsavel_Padrao"), mandatory: isYes(cell(activities, row, "Obrigatoria")),
      critical: isYes(cell(activities, row, "Critica")), evidenceRequired: isYes(cell(activities, row, "Evidencia_Obrigatoria")),
      minimumEvidence: Number(cell(activities, row, "Qtd_Min_Evidencias") || 0),
    })),
    evidenceRules: evidence.rows.filter((row) => isActiveImplantationRowV1(evidence, row)).map((row) => ({
      id: cell(evidence, row, "ID_Regra_Evidencia"), modelActivityId: cell(evidence, row, "ID_Modelo_Atividade"),
      type: cell(evidence, row, "Tipo_Evidencia"), minimum: Number(cell(evidence, row, "Quantidade_Minima") || 0),
      requiredForCompletion: isYes(cell(evidence, row, "Obrigatoria_Para_Conclusao")),
    })),
    evidenceValidationPending: true,
  };
}

function requireImplantationRequestIdV1(payload: Record<string, unknown>): string {
  const requestId = requireString(payload.requestId, "requestId");
  if (requestId.length > 120) throw new ApiException("VALIDATION_ERROR", "Request_ID excede o limite permitido.");
  return requestId;
}

interface ImplantationPermissionRequirementV1 {
  module: string;
  action: string;
}

function revalidateImplantationWriteAccessV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  storeId: string,
  requirements: ImplantationPermissionRequirementV1[],
): void {
  const users = readTable(spreadsheet, APP_CONFIG.sheets.users, ["ID_Usuário", "E-mail", "Perfil", "Lojas_Permitidas", "Ativo"]);
  const row = users.rows.find((candidate) => cell(users, candidate, "ID_Usuário") === user.id
    && cell(users, candidate, "E-mail").toLocaleLowerCase() === user.email.toLocaleLowerCase());
  if (!row || !isYes(cell(users, row, "Ativo"))) {
    throw new ApiException("ACCESS_DENIED", "Seu usuário não possui mais acesso ativo ao sistema.");
  }
  const stores = cell(users, row, "Lojas_Permitidas").trim();
  const refreshedUser: SystemUser = {
    ...user,
    profile: normalizeProfile(cell(users, row, "Perfil")),
    allowedStoreIds: normalizeText(stores) === "todas" ? "TODAS" : stores.split(",").map((value) => value.trim()).filter(Boolean),
  };
  requirements.forEach((requirement) => assertModulePermission(spreadsheet, refreshedUser, requirement.module, requirement.action));
  assertStoreScope(refreshedUser, storeId);
}

function implantationAuditRequestExistsV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  requestId: string,
): boolean {
  const table = readImplantationTableStructureV1(spreadsheet, APP_CONFIG.sheets.history, ["ID_Histórico", "Referência"]);
  const rowCount = Math.max(table.sheet.getLastRow() - table.headerRow, 0);
  if (!rowCount) return false;
  return table.sheet
    .getRange(table.headerRow + 1, columnIndex(table, "Referência") + 1, rowCount, 1)
    .getDisplayValues()
    .some((row) => String(row[0] || "").trim() === requestId);
}

function readImplantationTableStructureV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string,
  requiredHeaders: string[],
): SheetTable {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new ApiException("STRUCTURE_ERROR", `Aba obrigatória não encontrada: ${sheetName}`);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const previewRows = Math.min(Math.max(sheet.getLastRow(), 1), 10);
  const preview = sheet.getRange(1, 1, previewRows, lastColumn).getValues();
  const required = requiredHeaders.map(normalizeHeader);
  const headerOffset = preview.findIndex((row) => required.every((header) => row.some((value) => normalizeHeader(value) === header)));
  if (headerOffset < 0) throw new ApiException("STRUCTURE_ERROR", `Cabeçalhos obrigatórios não encontrados em ${sheetName}.`, { requiredHeaders });
  const headers = preview[headerOffset].map((header) => String(header || "").trim());
  return { sheet, headerRow: headerOffset + 1, headers, normalizedHeaders: headers.map(normalizeHeader), rows: [], rowNumbers: [] };
}

function readImplantationUpdateIndexV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): SheetTable {
  const table = readImplantationTableStructureV1(spreadsheet, APP_CONFIG.sheets.implantationUpdates, ["ID_Atualizacao", "Request_ID", "version", "ativo"]);
  const dataStart = table.headerRow + 1;
  const rowCount = Math.max(table.sheet.getLastRow() - table.headerRow, 0);
  if (!rowCount) return table;
  const idValues = table.sheet.getRange(dataStart, columnIndex(table, "ID_Atualizacao") + 1, rowCount, 1).getDisplayValues();
  const requestValues = table.sheet.getRange(dataStart, columnIndex(table, "Request_ID") + 1, rowCount, 1).getDisplayValues();
  idValues.forEach((value, index) => {
    const id = String(value[0] || "").trim();
    if (!id) return;
    const row = Array(table.headers.length).fill("");
    setCell(table, row, "ID_Atualizacao", id);
    setCell(table, row, "Request_ID", String(requestValues[index]?.[0] || "").trim());
    table.rows.push(row);
    table.rowNumbers.push(dataStart + index);
  });
  return table;
}

function columnLetterV1(columnCount: number): string {
  let value = columnCount;
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

function validateOpeningDateV1(value: unknown): string {
  const date = requireString(value, "plannedOpeningDate");
  calculateImplantationTargetDateV1(date, 0);
  return date;
}

function assertStoreOperationalForImplantationV1(table: SheetTable, row: unknown[]): void {
  const status = normalizeHeader(cell(table, row, "Status"));
  if (status !== "ativa") throw new ApiException("STORE_NOT_ACTIVE", "A loja deve estar com status Ativa antes de iniciar a implantação.");
}

function setPlannedOpeningDateV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Editar");
  const storeId = requireString(payload.storeId, "storeId");
  const expectedVersion = Number(payload.version);
  const plannedDate = validateOpeningDateV1(payload.plannedOpeningDate);
  const requestId = requireImplantationRequestIdV1(payload);
  assertStoreScope(user, storeId);
  return withScriptLock(() => {
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, [{ module: IMPLANTATION_MODULE_V1, action: "Editar" }]);
    const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Status", "Data_Inauguracao_Planejada", "version"]);
    const currentStore = findRowById(stores, "ID_Loja", storeId, "Loja").row;
    if (implantationAuditRequestExistsV1(spreadsheet, requestId)) {
      return { store: mapImplantationStoreV1(stores, currentStore), idempotent: true, requestId };
    }
    const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "ativo"]);
    if (currentImplantationForStoreV1(cycles, storeId)) throw new ApiException("USE_DATE_CHANGE_FLOW", "Use a reprogramação com prévia para alterar a data de uma implantação iniciada.");
    const found = findVersionedRow(stores, "ID_Loja", storeId, expectedVersion, "Loja");
    const previous = dateCell(stores, found.current, "Data_Inauguracao_Planejada");
    if (previous === plannedDate) return { store: mapImplantationStoreV1(stores, found.current), idempotent: true };
    const now = new Date();
    setCell(stores, found.current, "Data_Inauguracao_Planejada", plannedDate);
    setCell(stores, found.current, "version", found.currentVersion + 1);
    setCell(stores, found.current, "updated_at", now);
    setCell(stores, found.current, "updated_by", user.id);
    const range = stores.sheet.getRange(physicalRowNumber(stores, found.rowIndex), 1, 1, stores.headers.length);
    performAtomicWritesV1(spreadsheet, user, [{ range, previous: restorableMatrixV1(range), next: [found.current] }], [{
      module: "IMPLANTACAO_LOJA", recordId: storeId, reference: requestId,
      changes: [{ field: "Data_Inauguracao_Planejada", previous, next: plannedDate }],
      reason: "Data planejada definida antes do início da implantação.",
    }]);
    return { store: { ...mapImplantationStoreV1(stores, found.current), version: found.currentVersion + 1 }, requestId };
  });
}

function startImplantationV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Criar");
  const storeId = requireString(payload.storeId, "storeId");
  const storeVersion = Number(payload.storeVersion);
  const requestId = requireImplantationRequestIdV1(payload);
  assertStoreScope(user, storeId);
  return withScriptLock(() => {
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, [{ module: IMPLANTATION_MODULE_V1, action: "Criar" }]);
    const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Status", "Data_Inauguracao_Planejada", "version"]);
    const currentStore = findRowById(stores, "ID_Loja", storeId, "Loja").row;
    assertStoreOperationalForImplantationV1(stores, currentStore);
    const currentOpeningDate = dateCell(stores, currentStore, "Data_Inauguracao_Planejada");
    if (!currentOpeningDate) throw new ApiException("OPENING_DATE_REQUIRED", "Defina a data planejada de inauguração antes de iniciar.");
    const updates = readImplantationUpdateIndexV1(spreadsheet);
    if (updates.rows.some((row) => cell(updates, row, "Request_ID") === requestId)) return { idempotent: true, requestId };
    const storeFound = findVersionedRow(stores, "ID_Loja", storeId, storeVersion, "Loja");
    assertStoreOperationalForImplantationV1(stores, storeFound.current);
    const openingDate = dateCell(stores, storeFound.current, "Data_Inauguracao_Planejada");
    if (!openingDate) throw new ApiException("OPENING_DATE_REQUIRED", "Defina a data planejada de inauguração antes de iniciar.");
    const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "version", "ativo"]);
    if (currentImplantationForStoreV1(cycles, storeId)) throw new ApiException("IMPLANTATION_EXISTS", "Esta loja já possui uma implantação ativa.");
    const models = readTable(spreadsheet, APP_CONFIG.sheets.checklistModels, ["ID_Modelo_Versao", "Versao_Modelo", "Status_Modelo", "ativo"]);
    const published = models.rows.filter((row) => isActiveImplantationRowV1(models, row) && normalizeHeader(cell(models, row, "Status_Modelo")) === "publicado");
    if (published.length !== 1) throw new ApiException("MODEL_NOT_READY", "Deve existir exatamente um Checklist Mestre publicado e ativo.");
    const modelId = cell(models, published[0], "ID_Modelo_Versao");
    const version = Number(cell(models, published[0], "Versao_Modelo") || 1);
    const modelActivities = readTable(spreadsheet, APP_CONFIG.sheets.checklistModelActivities, ["ID_Modelo_Atividade", "ID_Modelo_Versao", "Codigo_Atividade", "ativo"]);
    const templates = modelActivities.rows.filter((row) => isActiveImplantationRowV1(modelActivities, row) && cell(modelActivities, row, "ID_Modelo_Versao") === modelId);
    if (templates.length !== 30) throw new ApiException("MODEL_NOT_READY", "O Checklist Mestre publicado deve possuir exatamente 30 atividades ativas.");
    const activityTable = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "version", "ativo"]);
    const now = new Date();
    const implantationId = nextInternalId(cycles, "ID_Implantacao", "IMP", 6);
    const activityIds = nextInternalIdsV1(activityTable, "ID_Checklist_Loja", "CHK-LOJ", 6, templates.length);
    const cycleRow = Array(cycles.headers.length).fill("");
    setCell(cycles, cycleRow, "ID_Implantacao", implantationId); setCell(cycles, cycleRow, "ID_Loja", storeId);
    setCell(cycles, cycleRow, "ID_Modelo_Versao", modelId); setCell(cycles, cycleRow, "ID_Usuario_Coordenador", user.id);
    setCell(cycles, cycleRow, "Data_Inauguracao_Base", openingDate); setCell(cycles, cycleRow, "Data_Inauguracao_Planejada_Atual", openingDate);
    setCell(cycles, cycleRow, "Status_Ciclo", "Ativo"); setCell(cycles, cycleRow, "Iniciada_Em", now); setCell(cycles, cycleRow, "Iniciada_Por", user.id);
    setCell(cycles, cycleRow, "ativo", "Sim"); setTechnicalCreationFields(cycles, cycleRow, user, now);
    const activityRows = templates.map((template, index) => buildStartedActivityRowV1(activityTable, template, modelActivities, activityIds[index], implantationId, storeId, version, openingDate, user, now));
    const updateRow = buildImplantationUpdateRowV1(updates, nextInternalId(updates, "ID_Atualizacao", "ATU", 6), {
      activityId: "", implantationId, storeId, type: "Início", text: "Implantação iniciada com 30 atividades do Checklist Mestre publicado.",
      previousStatus: "", nextStatus: "ATIVO", previousProgress: "", nextProgress: 0, previousResponsible: "", nextResponsible: "", requestId,
    }, user, now);
    const cycleStart = findFirstWritableRow(cycles, "ID_Implantacao");
    const activityStart = findFirstWritableRow(activityTable, "ID_Checklist_Loja", activityRows.length);
    const updateStart = findFirstWritableRow(updates, "ID_Atualizacao");
    const writes: AtomicSheetWriteV1[] = [
      { range: cycles.sheet.getRange(cycleStart, 1, 1, cycles.headers.length), previous: restorableMatrixV1(cycles.sheet.getRange(cycleStart, 1, 1, cycles.headers.length)), next: [cycleRow] },
      { range: activityTable.sheet.getRange(activityStart, 1, activityRows.length, activityTable.headers.length), previous: restorableMatrixV1(activityTable.sheet.getRange(activityStart, 1, activityRows.length, activityTable.headers.length)), next: activityRows },
      { range: updates.sheet.getRange(updateStart, 1, 1, updates.headers.length), previous: restorableMatrixV1(updates.sheet.getRange(updateStart, 1, 1, updates.headers.length)), next: [updateRow] },
    ];
    performAtomicWritesV1(spreadsheet, user, writes, [{
      module: "IMPLANTACAO", recordId: implantationId, action: "CRIACAO", reference: requestId,
      changes: [{ field: "Status_Ciclo", previous: "", next: "Ativo" }, { field: "Atividades_Geradas", previous: 0, next: activityRows.length }],
      reason: "Início explícito da implantação da loja.",
    }]);
    return { implantationId, activitiesCreated: activityRows.length, requestId, evidenceValidationPending: true };
  });
}

function buildStartedActivityRowV1(
  target: SheetTable,
  template: unknown[],
  source: SheetTable,
  id: string,
  implantationId: string,
  storeId: string,
  modelVersion: number,
  openingDate: string,
  user: SystemUser,
  now: Date,
): unknown[] {
  const row = Array(target.headers.length).fill("");
  const copy: Array<[string, string]> = [
    ["ID_Modelo_Atividade", "ID_Modelo_Atividade"], ["ID_Fase", "ID_Fase"], ["Fase_Snapshot", "Fase"],
    ["Ordem_Fase", "Ordem_Fase"], ["Ordem_Atividade", "Ordem_Atividade"], ["Acao_Snapshot", "Acao"],
    ["Offset_Dias_Snapshot", "Offset_Dias"], ["Papel_Responsavel_Padrao_Snapshot", "Papel_Responsavel_Padrao"],
    ["Obrigatoria_Snapshot", "Obrigatoria"], ["Critica_Snapshot", "Critica"],
    ["Evidencia_Obrigatoria_Snapshot", "Evidencia_Obrigatoria"], ["Qtd_Min_Evidencias_Snapshot", "Qtd_Min_Evidencias"],
  ];
  setCell(target, row, "ID_Checklist_Loja", id); setCell(target, row, "ID_Implantacao", implantationId); setCell(target, row, "ID_Loja", storeId);
  copy.forEach(([to, from]) => setCell(target, row, to, cell(source, template, from)));
  setCell(target, row, "Versao_Modelo", modelVersion);
  const targetDate = calculateImplantationTargetDateV1(openingDate, Number(cell(source, template, "Offset_Dias") || 0));
  setCell(target, row, "Data_Alvo_Original", targetDate); setCell(target, row, "Data_Alvo_Atual", targetDate);
  setCell(target, row, "Status", implantationStatusLabelV1("NAO_INICIADO")); setCell(target, row, "Percentual_Concluido", 0);
  setCell(target, row, "Ultima_Atualizacao_Em", now); setCell(target, row, "ativo", "Sim"); setTechnicalCreationFields(target, row, user, now);
  return row;
}

interface ImplantationUpdateRowInputV1 {
  activityId: string; implantationId: string; storeId: string; type: string; text: string;
  previousStatus: unknown; nextStatus: unknown; previousProgress: unknown; nextProgress: unknown;
  previousResponsible: string; nextResponsible: string; requestId: string;
}

function buildImplantationUpdateRowV1(
  table: SheetTable,
  id: string,
  values: ImplantationUpdateRowInputV1,
  user: SystemUser,
  now: Date,
): unknown[] {
  const row = Array(table.headers.length).fill("");
  setCell(table, row, "ID_Atualizacao", id); setCell(table, row, "ID_Checklist_Loja", values.activityId);
  setCell(table, row, "ID_Implantacao", values.implantationId); setCell(table, row, "ID_Loja", values.storeId);
  setCell(table, row, "Tipo_Atualizacao", values.type); setCell(table, row, "Texto", values.text);
  setCell(table, row, "Status_Anterior", values.previousStatus); setCell(table, row, "Status_Novo", values.nextStatus);
  setCell(table, row, "Progresso_Anterior", values.previousProgress); setCell(table, row, "Progresso_Novo", values.nextProgress);
  setCell(table, row, "ID_Responsavel_Anterior", values.previousResponsible); setCell(table, row, "ID_Responsavel_Novo", values.nextResponsible);
  setCell(table, row, "Data_Hora", now); setCell(table, row, "ID_Usuario", user.id); setCell(table, row, "Origem", "SISTEMA_WEB");
  setCell(table, row, "Request_ID", values.requestId); setCell(table, row, "ativo", "Sim"); setTechnicalCreationFields(table, row, user, now);
  return row;
}

function updateImplantationActivityV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  return mutateImplantationActivityV1(spreadsheet, user, payload, "UPDATE", false);
}

function markImplantationActivityNotApplicableV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser, payload: Record<string, unknown>): unknown {
  return mutateImplantationActivityV1(spreadsheet, user, { ...payload, targetStatus: "NAO_APLICAVEL" }, "Não aplicável", false);
}

function cancelImplantationActivityV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser, payload: Record<string, unknown>): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Excluir");
  return mutateImplantationActivityV1(spreadsheet, user, { ...payload, targetStatus: "CANCELADO" }, "Cancelamento", true, false, "Excluir");
}

function completeImplantationActivityV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser, payload: Record<string, unknown>): unknown {
  return mutateImplantationActivityV1(spreadsheet, user, { ...payload, targetStatus: "CONCLUIDO" }, "Conclusão", false);
}

function reopenImplantationActivityV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser, payload: Record<string, unknown>): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Reabrir");
  return mutateImplantationActivityV1(spreadsheet, user, payload, "Reabertura", false, true, "Reabrir");
}

function mutateImplantationActivityV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
  updateType: string,
  canCancel: boolean,
  canReopen = false,
  additionalImplantationPermission = "",
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_UPDATES_MODULE_V1, "Criar");
  const activityId = requireString(payload.activityId, "activityId");
  const expectedVersion = Number(payload.version);
  const requestId = requireImplantationRequestIdV1(payload);
  const reason = String(payload.reason || payload.observation || "").trim();
  return withScriptLock(() => {
    const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "version", "ativo"]);
    const currentActivity = findRowById(activities, "ID_Checklist_Loja", activityId, "Atividade").row;
    const storeId = cell(activities, currentActivity, "ID_Loja");
    const requirements: ImplantationPermissionRequirementV1[] = [{ module: IMPLANTATION_UPDATES_MODULE_V1, action: "Criar" }];
    if (additionalImplantationPermission) requirements.push({ module: IMPLANTATION_MODULE_V1, action: additionalImplantationPermission });
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, requirements);
    const updates = readImplantationUpdateIndexV1(spreadsheet);
    if (updates.rows.some((row) => cell(updates, row, "Request_ID") === requestId)) return { idempotent: true, requestId };
    const found = findVersionedRow(activities, "ID_Checklist_Loja", activityId, expectedVersion, "Atividade");
    const previousStatus = implantationStatusCodeV1(cell(activities, found.current, "Status"));
    const previousProgress = Number(cell(activities, found.current, "Percentual_Concluido") || 0);
    const previousResponsible = cell(activities, found.current, "ID_Usuario_Responsavel");
    let targetStatus = String(payload.targetStatus || previousStatus);
    let requestedProgress = payload.progress === undefined ? previousProgress : Number(payload.progress);
    if (updateType === "Reabertura") {
      if (["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].indexOf(previousStatus) < 0) throw new ApiException("INVALID_TRANSITION", "Somente atividades encerradas podem ser reabertas.");
      targetStatus = previousStatus === "CONCLUIDO" ? "EM_ANDAMENTO" : "NAO_INICIADO";
      requestedProgress = previousStatus === "CONCLUIDO" ? 75 : 0;
    } else if (updateType === "UPDATE" && previousStatus === "NAO_INICIADO" && requestedProgress > 0) {
      targetStatus = "EM_ANDAMENTO";
    }
    if (previousStatus === "BLOQUEADO" && targetStatus !== "BLOQUEADO") {
      throw new ApiException("UNBLOCK_REQUIRED", "Desbloqueie a atividade antes de realizar outra mudança de status.");
    }
    const nextProgress = validateImplantationTransitionV1({ from: previousStatus, to: targetStatus, currentProgress: previousProgress, requestedProgress, reason, canCancel, canReopen });
    const nextResponsible = payload.responsibleUserId === undefined ? previousResponsible : String(payload.responsibleUserId || "").trim();
    if (nextResponsible) assertEligibleImplantationResponsibleV1(spreadsheet, nextResponsible, storeId);
    const changes: Array<{ field: string; previous: unknown; next: unknown }> = [];
    if (targetStatus !== previousStatus) changes.push({ field: "Status", previous: previousStatus, next: targetStatus });
    if (nextProgress !== previousProgress) changes.push({ field: "Percentual_Concluido", previous: previousProgress, next: nextProgress });
    if (nextResponsible !== previousResponsible) changes.push({ field: "ID_Usuario_Responsavel", previous: previousResponsible, next: nextResponsible });
    if (reason && reason !== cell(activities, found.current, "Ultima_Observacao")) changes.push({ field: "Ultima_Observacao", previous: cell(activities, found.current, "Ultima_Observacao"), next: reason });
    if (!changes.length) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");
    const now = new Date();
    setCell(activities, found.current, "Status", implantationStatusLabelV1(targetStatus));
    setCell(activities, found.current, "Percentual_Concluido", nextProgress); setCell(activities, found.current, "ID_Usuario_Responsavel", nextResponsible);
    if (reason) setCell(activities, found.current, "Ultima_Observacao", reason);
    if (previousStatus === "NAO_INICIADO" && targetStatus === "EM_ANDAMENTO") setCell(activities, found.current, "Data_Inicio_Real", formatDateOnly(now));
    if (targetStatus === "CONCLUIDO") setCell(activities, found.current, "Data_Conclusao_Real", formatDateOnly(now));
    if (targetStatus !== "CONCLUIDO" && previousStatus === "CONCLUIDO") setCell(activities, found.current, "Data_Conclusao_Real", "");
    setCell(activities, found.current, "Ultima_Atualizacao_Em", now); setCell(activities, found.current, "version", found.currentVersion + 1);
    setCell(activities, found.current, "updated_at", now); setCell(activities, found.current, "updated_by", user.id);
    const updateId = nextInternalId(updates, "ID_Atualizacao", "ATU", 6);
    const updateRow = buildImplantationUpdateRowV1(updates, updateId, {
      activityId, implantationId: cell(activities, found.current, "ID_Implantacao"), storeId, type: updateType,
      text: reason || "Atividade atualizada.", previousStatus, nextStatus: targetStatus,
      previousProgress, nextProgress, previousResponsible, nextResponsible, requestId,
    }, user, now);
    const activityRange = activities.sheet.getRange(physicalRowNumber(activities, found.rowIndex), 1, 1, activities.headers.length);
    const updateStart = findFirstWritableRow(updates, "ID_Atualizacao");
    const updateRange = updates.sheet.getRange(updateStart, 1, 1, updates.headers.length);
    performAtomicWritesV1(spreadsheet, user, [
      { range: activityRange, previous: restorableMatrixV1(activityRange), next: [found.current] },
      { range: updateRange, previous: restorableMatrixV1(updateRange), next: [updateRow] },
    ], [{ module: "IMPLANTACAO_ATIVIDADES", recordId: activityId, changes, reason: reason || updateType, reference: requestId }]);
    return { activity: { ...mapImplantationActivityV1(activities, found.current), version: found.currentVersion + 1 }, updateId, requestId, evidenceValidationPending: targetStatus === "CONCLUIDO" && isYes(cell(activities, found.current, "Evidencia_Obrigatoria_Snapshot")) };
  });
}

function assertEligibleImplantationResponsibleV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, userId: string, storeId: string): void {
  const users = readTable(spreadsheet, APP_CONFIG.sheets.users, ["ID_Usuário", "Lojas_Permitidas", "Ativo"]);
  const row = findRowById(users, "ID_Usuário", userId, "Usuário responsável").row;
  if (!isYes(cell(users, row, "Ativo")) || !implantationUserAllowsStoreV1(users, row, storeId)) {
    throw new ApiException("INVALID_RESPONSIBLE", "O responsável deve estar ativo e possuir acesso à loja.");
  }
}

function blockImplantationActivityV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_UPDATES_MODULE_V1, "Criar");
  const reason = requireString(payload.reason, "reason");
  const activityId = requireString(payload.activityId, "activityId");
  const expectedVersion = Number(payload.version);
  const requestId = requireImplantationRequestIdV1(payload);
  return withScriptLock(() => {
    const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "version", "ativo"]);
    const currentActivity = findRowById(activities, "ID_Checklist_Loja", activityId, "Atividade").row;
    const storeId = cell(activities, currentActivity, "ID_Loja");
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, [{ module: IMPLANTATION_UPDATES_MODULE_V1, action: "Criar" }]);
    const updates = readImplantationUpdateIndexV1(spreadsheet);
    if (updates.rows.some((row) => cell(updates, row, "Request_ID") === requestId)) return { idempotent: true, requestId };
    const responsibleRole = String(payload.responsibleRole || "").trim();
    const allowedResponsibleRoles = ["Equipe interna", "Equipe de campo", "RH", "Contratado"];
    if (responsibleRole && allowedResponsibleRoles.indexOf(responsibleRole) < 0) throw new ApiException("VALIDATION_ERROR", "Papel responsável pelo desbloqueio inválido.");
    const unblockResponsibleUserId = String(payload.responsibleUserId || "").trim();
    if (unblockResponsibleUserId) assertEligibleImplantationResponsibleV1(spreadsheet, unblockResponsibleUserId, storeId);
    const found = findVersionedRow(activities, "ID_Checklist_Loja", activityId, expectedVersion, "Atividade");
    const previousStatus = implantationStatusCodeV1(cell(activities, found.current, "Status"));
    const progress = Number(cell(activities, found.current, "Percentual_Concluido") || 0);
    validateImplantationTransitionV1({ from: previousStatus, to: "BLOQUEADO", currentProgress: progress, reason });
    const blocks = readTable(spreadsheet, APP_CONFIG.sheets.implantationBlocks, ["ID_Bloqueio", "ID_Checklist_Loja", "Data_Desbloqueio", "version", "ativo"]);
    if (blocks.rows.some((row) => isActiveImplantationRowV1(blocks, row) && cell(blocks, row, "ID_Checklist_Loja") === activityId && !dateCell(blocks, row, "Data_Desbloqueio"))) {
      throw new ApiException("ACTIVE_BLOCK_EXISTS", "A atividade já possui um bloqueio ativo.");
    }
    const now = new Date();
    setCell(activities, found.current, "Status", implantationStatusLabelV1("BLOQUEADO")); setCell(activities, found.current, "Ultima_Observacao", reason);
    setCell(activities, found.current, "Ultima_Atualizacao_Em", now); setCell(activities, found.current, "version", found.currentVersion + 1);
    setCell(activities, found.current, "updated_at", now); setCell(activities, found.current, "updated_by", user.id);
    const blockId = nextInternalId(blocks, "ID_Bloqueio", "BLQ", 6); const blockRow = Array(blocks.headers.length).fill("");
    setCell(blocks, blockRow, "ID_Bloqueio", blockId); setCell(blocks, blockRow, "ID_Checklist_Loja", activityId);
    setCell(blocks, blockRow, "ID_Implantacao", cell(activities, found.current, "ID_Implantacao")); setCell(blocks, blockRow, "ID_Loja", storeId);
    setCell(blocks, blockRow, "Motivo_Bloqueio", reason); setCell(blocks, blockRow, "Status_Anterior", implantationStatusLabelV1(previousStatus));
    setCell(blocks, blockRow, "Progresso_No_Bloqueio", progress); setCell(blocks, blockRow, "Papel_Responsavel_Desbloqueio", responsibleRole);
    setCell(blocks, blockRow, "ID_Usuario_Responsavel_Desbloqueio", unblockResponsibleUserId);
    setCell(blocks, blockRow, "Data_Bloqueio", now); setCell(blocks, blockRow, "ID_Usuario_Bloqueio", user.id); setCell(blocks, blockRow, "ativo", "Sim");
    setTechnicalCreationFields(blocks, blockRow, user, now);
    const updateId = nextInternalId(updates, "ID_Atualizacao", "ATU", 6);
    const updateRow = buildImplantationUpdateRowV1(updates, updateId, {
      activityId, implantationId: cell(activities, found.current, "ID_Implantacao"), storeId, type: "Bloqueio", text: reason,
      previousStatus, nextStatus: "BLOQUEADO", previousProgress: progress, nextProgress: progress,
      previousResponsible: cell(activities, found.current, "ID_Usuario_Responsavel"), nextResponsible: cell(activities, found.current, "ID_Usuario_Responsavel"), requestId,
    }, user, now);
    const activityRange = activities.sheet.getRange(physicalRowNumber(activities, found.rowIndex), 1, 1, activities.headers.length);
    const blockStart = findFirstWritableRow(blocks, "ID_Bloqueio"); const blockRange = blocks.sheet.getRange(blockStart, 1, 1, blocks.headers.length);
    const updateStart = findFirstWritableRow(updates, "ID_Atualizacao"); const updateRange = updates.sheet.getRange(updateStart, 1, 1, updates.headers.length);
    performAtomicWritesV1(spreadsheet, user, [
      { range: activityRange, previous: restorableMatrixV1(activityRange), next: [found.current] },
      { range: blockRange, previous: restorableMatrixV1(blockRange), next: [blockRow] },
      { range: updateRange, previous: restorableMatrixV1(updateRange), next: [updateRow] },
    ], [
      { module: "IMPLANTACAO_ATIVIDADES", recordId: activityId, changes: [{ field: "Status", previous: previousStatus, next: "BLOQUEADO" }], reason, reference: requestId },
      { module: "IMPLANTACAO_BLOQUEIOS", recordId: blockId, action: "CRIACAO", changes: [{ field: "Motivo_Bloqueio", previous: "", next: reason }], reason, reference: requestId },
    ]);
    return { activityId, blockId, updateId, requestId };
  });
}

function unblockImplantationActivityV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_UPDATES_MODULE_V1, "Criar");
  const activityId = requireString(payload.activityId, "activityId");
  const expectedVersion = Number(payload.version); const requestId = requireImplantationRequestIdV1(payload);
  const observation = requireString(payload.reason, "reason");
  return withScriptLock(() => {
    const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "version", "ativo"]);
    const currentActivity = findRowById(activities, "ID_Checklist_Loja", activityId, "Atividade").row;
    const storeId = cell(activities, currentActivity, "ID_Loja");
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, [{ module: IMPLANTATION_UPDATES_MODULE_V1, action: "Criar" }]);
    const updates = readImplantationUpdateIndexV1(spreadsheet);
    if (updates.rows.some((row) => cell(updates, row, "Request_ID") === requestId)) return { idempotent: true, requestId };
    const found = findVersionedRow(activities, "ID_Checklist_Loja", activityId, expectedVersion, "Atividade");
    if (implantationStatusCodeV1(cell(activities, found.current, "Status")) !== "BLOQUEADO") throw new ApiException("INVALID_TRANSITION", "A atividade não está bloqueada.");
    const blocks = readTable(spreadsheet, APP_CONFIG.sheets.implantationBlocks, ["ID_Bloqueio", "ID_Checklist_Loja", "Status_Anterior", "Data_Desbloqueio", "version", "ativo"]);
    const blockIndex = blocks.rows.findIndex((row) => isActiveImplantationRowV1(blocks, row) && cell(blocks, row, "ID_Checklist_Loja") === activityId && !dateCell(blocks, row, "Data_Desbloqueio"));
    if (blockIndex < 0) throw new ApiException("ACTIVE_BLOCK_NOT_FOUND", "O bloqueio ativo não foi encontrado.");
    const block = blocks.rows[blockIndex].slice(); const blockVersion = Number(cell(blocks, block, "version") || 1);
    const target = implantationStatusCodeV1(cell(blocks, block, "Status_Anterior"));
    const progress = Number(cell(activities, found.current, "Percentual_Concluido") || 0);
    const nextStatus = target === "NAO_INICIADO" ? "NAO_INICIADO" : "EM_ANDAMENTO";
    const nextProgress = nextStatus === "EM_ANDAMENTO" ? Math.max(progress, 25) : 0;
    validateImplantationTransitionV1({ from: "BLOQUEADO", to: nextStatus, currentProgress: progress, requestedProgress: nextProgress });
    const now = new Date();
    setCell(activities, found.current, "Status", implantationStatusLabelV1(nextStatus)); setCell(activities, found.current, "Percentual_Concluido", nextProgress);
    setCell(activities, found.current, "Ultima_Observacao", observation); setCell(activities, found.current, "Ultima_Atualizacao_Em", now);
    setCell(activities, found.current, "version", found.currentVersion + 1); setCell(activities, found.current, "updated_at", now); setCell(activities, found.current, "updated_by", user.id);
    setCell(blocks, block, "Data_Desbloqueio", now); setCell(blocks, block, "ID_Usuario_Desbloqueio", user.id); setCell(blocks, block, "Observacao_Desbloqueio", observation);
    setCell(blocks, block, "version", blockVersion + 1); setCell(blocks, block, "updated_at", now); setCell(blocks, block, "updated_by", user.id);
    const updateId = nextInternalId(updates, "ID_Atualizacao", "ATU", 6);
    const updateRow = buildImplantationUpdateRowV1(updates, updateId, {
      activityId, implantationId: cell(activities, found.current, "ID_Implantacao"), storeId, type: "Desbloqueio", text: observation,
      previousStatus: "BLOQUEADO", nextStatus, previousProgress: progress, nextProgress,
      previousResponsible: cell(activities, found.current, "ID_Usuario_Responsavel"), nextResponsible: cell(activities, found.current, "ID_Usuario_Responsavel"), requestId,
    }, user, now);
    const ar = activities.sheet.getRange(physicalRowNumber(activities, found.rowIndex), 1, 1, activities.headers.length);
    const br = blocks.sheet.getRange(physicalRowNumber(blocks, blockIndex), 1, 1, blocks.headers.length);
    const ur = updates.sheet.getRange(findFirstWritableRow(updates, "ID_Atualizacao"), 1, 1, updates.headers.length);
    performAtomicWritesV1(spreadsheet, user, [
      { range: ar, previous: restorableMatrixV1(ar), next: [found.current] }, { range: br, previous: restorableMatrixV1(br), next: [block] },
      { range: ur, previous: restorableMatrixV1(ur), next: [updateRow] },
    ], [
      { module: "IMPLANTACAO_ATIVIDADES", recordId: activityId, changes: [
        { field: "Status", previous: "BLOQUEADO", next: nextStatus },
        { field: "Percentual_Concluido", previous: progress, next: nextProgress },
      ], reason: observation, reference: requestId },
      { module: "IMPLANTACAO_BLOQUEIOS", recordId: cell(blocks, block, "ID_Bloqueio"), changes: [{ field: "Data_Desbloqueio", previous: "", next: now }], reason: observation, reference: requestId },
    ]);
    return { activityId, updateId, requestId };
  });
}

function previewOpeningDateChangeV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Editar");
  const storeId = requireString(payload.storeId, "storeId"); const newDate = validateOpeningDateV1(payload.plannedOpeningDate);
  assertStoreScope(user, storeId);
  const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "version", "ativo"]);
  const cycle = currentImplantationForStoreV1(cycles, storeId);
  if (!cycle) throw new ApiException("IMPLANTATION_NOT_STARTED", "A loja ainda não possui implantação iniciada.");
  const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "Status", "Data_Alvo_Atual", "version", "ativo"]);
  const rows = activeActivitiesForImplantationV1(activities, cell(cycles, cycle, "ID_Implantacao"));
  const impacts = buildOpeningDateImpactsV1(activities, rows, newDate);
  return {
    storeId, implantationId: cell(cycles, cycle, "ID_Implantacao"), implantationVersion: Number(cell(cycles, cycle, "version") || 1),
    previousDate: dateCell(cycles, cycle, "Data_Inauguracao_Planejada_Atual"), nextDate: newDate, impacts,
    summary: { changed: impacts.filter((impact) => impact.previousTargetDate !== impact.nextTargetDate).length, preserved: rows.length - impacts.length,
      inProgressOrBlocked: impacts.filter((impact) => ["EM_ANDAMENTO", "BLOQUEADO"].indexOf(impact.status) >= 0).length },
  };
}

function buildOpeningDateImpactsV1(table: SheetTable, rows: unknown[][], newDate: string): ImplantationDateImpactV1[] {
  return rows.flatMap((row) => {
    const status = implantationStatusCodeV1(cell(table, row, "Status"));
    if (["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].indexOf(status) >= 0) return [];
    return [{
      activityId: cell(table, row, "ID_Checklist_Loja"), action: cell(table, row, "Acao_Snapshot"), status,
      previousTargetDate: dateCell(table, row, "Data_Alvo_Atual"),
      nextTargetDate: calculateImplantationTargetDateV1(newDate, Number(cell(table, row, "Offset_Dias_Snapshot") || 0)),
      version: Number(cell(table, row, "version") || 1),
    }];
  });
}

function changePlannedOpeningDateV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, IMPLANTATION_MODULE_V1, "Editar");
  const storeId = requireString(payload.storeId, "storeId"); const newDate = validateOpeningDateV1(payload.plannedOpeningDate);
  const implantationVersion = Number(payload.implantationVersion); const storeVersion = Number(payload.storeVersion);
  const reason = requireString(payload.reason, "reason"); const requestId = requireImplantationRequestIdV1(payload); assertStoreScope(user, storeId);
  return withScriptLock(() => {
    revalidateImplantationWriteAccessV1(spreadsheet, user, storeId, [{ module: IMPLANTATION_MODULE_V1, action: "Editar" }]);
    const updates = readImplantationUpdateIndexV1(spreadsheet);
    if (updates.rows.some((row) => cell(updates, row, "Request_ID") === requestId)) return { idempotent: true, requestId };
    const stores = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Data_Inauguracao_Planejada", "version"]);
    const storeFound = findVersionedRow(stores, "ID_Loja", storeId, storeVersion, "Loja");
    const cycles = readTable(spreadsheet, APP_CONFIG.sheets.storeImplantations, ["ID_Implantacao", "ID_Loja", "Status_Ciclo", "version", "ativo"]);
    const cycleRow = currentImplantationForStoreV1(cycles, storeId);
    if (!cycleRow) throw new ApiException("IMPLANTATION_NOT_STARTED", "A implantação não foi encontrada.");
    const cycleId = cell(cycles, cycleRow, "ID_Implantacao");
    const cycleFound = findVersionedRow(cycles, "ID_Implantacao", cycleId, implantationVersion, "Implantação");
    const activities = readTable(spreadsheet, APP_CONFIG.sheets.implantationActivities, ["ID_Checklist_Loja", "ID_Implantacao", "Status", "Data_Alvo_Atual", "version", "ativo"]);
    const rows = activeActivitiesForImplantationV1(activities, cycleId); const impacts = buildOpeningDateImpactsV1(activities, rows, newDate);
    const versionById = isRecord(payload.activityVersions) ? payload.activityVersions : {};
    impacts.forEach((impact) => {
      if (Number(versionById[impact.activityId]) !== impact.version) throw new ApiException("VERSION_CONFLICT", `A atividade ${impact.activityId} mudou após a prévia.`);
    });
    const previousDate = dateCell(cycles, cycleFound.current, "Data_Inauguracao_Planejada_Atual");
    const previousStoreDate = dateCell(stores, storeFound.current, "Data_Inauguracao_Planejada"); const now = new Date();
    setCell(stores, storeFound.current, "Data_Inauguracao_Planejada", newDate); setCell(stores, storeFound.current, "version", storeFound.currentVersion + 1);
    setCell(stores, storeFound.current, "updated_at", now); setCell(stores, storeFound.current, "updated_by", user.id);
    setCell(cycles, cycleFound.current, "Data_Inauguracao_Planejada_Atual", newDate); setCell(cycles, cycleFound.current, "version", cycleFound.currentVersion + 1);
    setCell(cycles, cycleFound.current, "updated_at", now); setCell(cycles, cycleFound.current, "updated_by", user.id);
    const writes: AtomicSheetWriteV1[] = []; const audits: AuditEntry[] = [];
    const sr = stores.sheet.getRange(physicalRowNumber(stores, storeFound.rowIndex), 1, 1, stores.headers.length);
    const cr = cycles.sheet.getRange(physicalRowNumber(cycles, cycleFound.rowIndex), 1, 1, cycles.headers.length);
    writes.push({ range: sr, previous: restorableMatrixV1(sr), next: [storeFound.current] }, { range: cr, previous: restorableMatrixV1(cr), next: [cycleFound.current] });
    const impactById: Record<string, ImplantationDateImpactV1> = {}; impacts.forEach((impact) => { impactById[impact.activityId] = impact; });
    const changedRows: unknown[][] = []; const changedPhysical: number[] = [];
    rows.forEach((row) => {
      const impact = impactById[cell(activities, row, "ID_Checklist_Loja")]; if (!impact || impact.previousTargetDate === impact.nextTargetDate) return;
      const index = activities.rows.indexOf(row); const next = row.slice(); setCell(activities, next, "Data_Alvo_Atual", impact.nextTargetDate);
      setCell(activities, next, "Ultima_Observacao", reason); setCell(activities, next, "Ultima_Atualizacao_Em", now);
      setCell(activities, next, "version", impact.version + 1); setCell(activities, next, "updated_at", now); setCell(activities, next, "updated_by", user.id);
      changedRows.push(next); changedPhysical.push(physicalRowNumber(activities, index));
      audits.push({ module: "IMPLANTACAO_ATIVIDADES", recordId: impact.activityId, changes: [{ field: "Data_Alvo_Atual", previous: impact.previousTargetDate, next: impact.nextTargetDate }], reason, reference: requestId });
    });
    changedRows.forEach((row, index) => {
      const range = activities.sheet.getRange(changedPhysical[index], 1, 1, activities.headers.length);
      writes.push({ range, previous: restorableMatrixV1(range), next: [row] });
    });
    const updateIds = nextInternalIdsV1(updates, "ID_Atualizacao", "ATU", 6, Math.max(changedRows.length, 1));
    const updateRows = (changedRows.length ? changedRows : [cycleFound.current]).map((row, index) => buildImplantationUpdateRowV1(updates, updateIds[index], {
      activityId: changedRows.length ? cell(activities, row, "ID_Checklist_Loja") : "", implantationId: cycleId, storeId, type: "Reprogramação",
      text: reason, previousStatus: "", nextStatus: "", previousProgress: "", nextProgress: "", previousResponsible: "", nextResponsible: "", requestId,
    }, user, now));
    const updateStart = findFirstWritableRow(updates, "ID_Atualizacao", updateRows.length); const ur = updates.sheet.getRange(updateStart, 1, updateRows.length, updates.headers.length);
    writes.push({ range: ur, previous: restorableMatrixV1(ur), next: updateRows });
    audits.unshift(
      { module: "IMPLANTACAO_LOJA", recordId: storeId, changes: [{ field: "Data_Inauguracao_Planejada", previous: previousStoreDate, next: newDate }], reason, reference: requestId },
      { module: "IMPLANTACAO", recordId: cycleId, changes: [{ field: "Data_Inauguracao_Planejada_Atual", previous: previousDate, next: newDate }], reason, reference: requestId },
    );
    performAtomicWritesV1(spreadsheet, user, writes, audits);
    return { implantationId: cycleId, previousDate, nextDate: newDate, activitiesChanged: changedRows.length, requestId };
  });
}
