interface PostEvent {
  postData?: { contents?: string };
}

interface GetEvent {
  parameter?: { action?: string };
}

interface ApiRequest {
  action?: string;
  credential?: string;
  payload?: Record<string, unknown>;
}

interface TokenClaims {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
  exp: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  profile: string;
  allowedStoreIds: string[] | "TODAS";
}

interface SheetTable {
  sheet: GoogleAppsScript.Spreadsheet.Sheet;
  headerRow: number;
  headers: string[];
  normalizedHeaders: string[];
  rows: unknown[][];
}

interface TechnicalTableStatus {
  sheet: string;
  ok: boolean;
  headerRow: number | null;
  missing: string[];
  error?: string;
}

class ApiException extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

const APP_CONFIG = {
  sheets: {
    stores: "01_LOJAS",
    items: "02_ITENS",
    necessities: "03_NECESSIDADES",
    users: "09_USUARIOS",
    permissions: "10_PERMISSOES",
    history: "12_HISTORICO",
  },
  technicalHeaders: ["created_at", "created_by", "updated_at", "updated_by", "version", "ativo"],
  setupTables: [
    { sheet: "01_LOJAS", keyHeader: "ID_Loja" },
    { sheet: "02_ITENS", keyHeader: "ID_Item" },
    { sheet: "03_NECESSIDADES", keyHeader: "ID_Necessidade" },
    { sheet: "04_FORNECEDORES", keyHeader: "ID_Fornecedor" },
    { sheet: "05_COTACOES", keyHeader: "ID_Cotação" },
    { sheet: "06_APROVACOES", keyHeader: "ID_Aprovação" },
    { sheet: "07_COMPRAS", keyHeader: "ID_Compra" },
    { sheet: "08_ENTREGAS", keyHeader: "ID_Entrega" },
    { sheet: "09_USUARIOS", keyHeader: "ID_Usuário" },
    { sheet: "11_SOLIC_ACESSO", keyHeader: "ID_Solicitação" },
    { sheet: "13_IMPORTACAO", keyHeader: "Tipo_Registro" },
    { sheet: "15_ROTAS_COMPRA", keyHeader: "ID_Rota" },
  ],
};

const TECHNICAL_HEADER_PREVIEW_ROWS = 10;

function doGet(event?: GetEvent): GoogleAppsScript.Content.TextOutput {
  const action = event?.parameter?.action || "health";
  if (action !== "health") {
    return jsonOutput({ ok: false, error: { code: "UNKNOWN_ROUTE", message: "Rota GET não reconhecida." } });
  }
  return jsonOutput({ ok: true, data: healthPayload() });
}

function doPost(event: PostEvent): GoogleAppsScript.Content.TextOutput {
  const requestId = Utilities.getUuid();
  try {
    const request = parseRequest(event);
    if (request.action === "health") {
      return jsonOutput({ ok: true, data: healthPayload(), requestId });
    }
    const claims = verifyGoogleCredential(requireString(request.credential, "credential"));
    const spreadsheet = openConfiguredSpreadsheet();
    const user = findAuthorizedUser(spreadsheet, claims);
    const data = dispatchAction(request.action || "", request.payload || {}, spreadsheet, user);
    return jsonOutput({ ok: true, data, requestId });
  } catch (error) {
    const safe = toSafeError(error);
    console.error(JSON.stringify({ requestId, code: safe.code, message: safe.message, details: safe.details || null }));
    return jsonOutput({ ok: false, error: safe, requestId });
  }
}

function healthPayload(): { status: string; service: string; timestamp: string } {
  return { status: "ok", service: "Implanta 27 Apps Script API", timestamp: new Date().toISOString() };
}

function dispatchAction(action: string, payload: Record<string, unknown>, spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  switch (action) {
    case "bootstrap":
      return buildBootstrap(spreadsheet, user);
    case "technicalStatus":
      return buildTechnicalStatus(spreadsheet);
    case "updateNecessity":
      return updateNecessity(spreadsheet, user, payload);
    case "updateStore":
      return updateStore(spreadsheet, user, payload);
    case "updateItem":
      return updateItem(spreadsheet, user, payload);
    default:
      throw new ApiException("UNKNOWN_ACTION", "Ação não reconhecida.");
  }
}

function buildBootstrap(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  const storesTable = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status"]);
  const itemsTable = readTable(spreadsheet, APP_CONFIG.sheets.items, ["ID_Item", "Código_Original", "Item", "Status_Especificação"]);
  const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status"]);

  const allStores = storesTable.rows.map((row) => mapStore(storesTable, row));
  const stores = user.allowedStoreIds === "TODAS" ? allStores : allStores.filter((store) => user.allowedStoreIds.indexOf(store.id) >= 0);
  const allowedStoreIds = Object.fromEntries(stores.map((store) => [store.id, true]));
  const necessities = necessitiesTable.rows
    .map((row) => mapNecessity(necessitiesTable, row))
    .filter((need) => Boolean(allowedStoreIds[need.storeId]));
  const referencedItems = Object.fromEntries(necessities.map((need) => [need.itemId, true]));
  const items = itemsTable.rows.map((row) => mapItem(itemsTable, row)).filter((item) => Boolean(referencedItems[item.id]));

  return {
    source: {
      kind: "apps-script",
      label: spreadsheet.getName(),
      status: "connected",
      readOnly: false,
      spreadsheetId: spreadsheet.getId(),
      checkedAt: new Date().toISOString(),
      message: "Dados ao vivo pelo Google Apps Script Web App, com autenticação e permissões validadas no backend.",
    },
    user,
    stores,
    items,
    necessities,
  };
}

function updateNecessity(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  const id = requireString(payload.id, "id");
  const expectedVersion = requirePositiveInteger(payload.version, "version");
  const changes = isRecord(payload.changes) ? payload.changes : {};
  const allowedKeys = ["quantity", "priority", "status", "notes"];
  const invalidKey = Object.keys(changes).find((key) => allowedKeys.indexOf(key) < 0);
  if (invalidKey) throw new ApiException("VALIDATION_ERROR", `Campo não permitido: ${invalidKey}`);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new ApiException("CONCURRENT_REQUEST", "Outro usuário está atualizando a planilha. Tente novamente.");
  try {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "Status", "version", "updated_at", "updated_by"]);
    const idColumn = columnIndex(table, "ID_Necessidade");
    const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === id);
    if (rowIndex < 0) throw new ApiException("NOT_FOUND", "Necessidade não encontrada.");
    const current = table.rows[rowIndex].slice();
    const storeId = cell(table, current, "ID_Loja");
    assertCanEditNecessity(spreadsheet, user, storeId);
    const versionColumn = columnIndex(table, "version");
    const currentVersion = Number(current[versionColumn] || 1);
    if (currentVersion !== expectedVersion) {
      throw new ApiException("VERSION_CONFLICT", "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar novamente.", { currentVersion });
    }

    const auditedChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(table, current, "Qtd_Planejada", changes.quantity, validatePositiveNumber, auditedChanges);
    applyChange(table, current, "Prioridade", changes.priority, validatePriority, auditedChanges);
    if (changes.status !== undefined) {
      const previousStatus = cell(table, current, "Status");
      const nextStatus = validateStatus(changes.status);
      assertStatusTransition(previousStatus, nextStatus);
      applyChange(table, current, "Status", nextStatus, (value) => value, auditedChanges);
    }
    applyChange(table, current, "Observações", changes.notes, validateText, auditedChanges);
    if (!auditedChanges.length) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");

    current[versionColumn] = currentVersion + 1;
    current[columnIndex(table, "updated_at")] = new Date();
    current[columnIndex(table, "updated_by")] = user.id;
    const absoluteRow = table.headerRow + rowIndex + 1;
    const range = table.sheet.getRange(absoluteRow, 1, 1, table.headers.length);
    const previousRow = range.getValues()[0];
    try {
      range.setValues([current]);
      appendAudit(spreadsheet, user, "NECESSIDADES", id, auditedChanges, String(payload.reason || ""));
      SpreadsheetApp.flush();
    } catch (error) {
      range.setValues([previousRow]);
      SpreadsheetApp.flush();
      throw error;
    }
    return { id, version: currentVersion + 1, updatedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function updateStore(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  const id = requireString(payload.id, "id");
  const expectedVersion = requirePositiveInteger(payload.version, "version");
  const changes = requireChanges(payload.changes, ["name", "city", "state", "capitalUf", "address", "manager", "email", "phone", "status", "notes"]);
  assertModulePermission(spreadsheet, user, "Lojas", "Editar");
  assertStoreScope(user, id);

  return withScriptLock(() => {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "version", "updated_at", "updated_by"]);
    const { current, rowIndex, currentVersion } = findVersionedRow(table, "ID_Loja", id, expectedVersion, "Loja");
    const auditedChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(table, current, "Loja", changes.name, validateRequiredText, auditedChanges);
    applyChange(table, current, "Cidade", changes.city, validateShortText, auditedChanges);
    applyChange(table, current, "UF", changes.state, validateUf, auditedChanges);
    applyChange(table, current, "Capital_UF", changes.capitalUf, validateShortText, auditedChanges);
    applyChange(table, current, "Endereço", changes.address, validateText, auditedChanges);
    applyChange(table, current, "Responsável", changes.manager, validateShortText, auditedChanges);
    applyChange(table, current, "E-mail", changes.email, validateOptionalEmail, auditedChanges);
    applyChange(table, current, "Telefone", changes.phone, validateShortText, auditedChanges);
    applyChange(table, current, "Status", changes.status, validateRequiredText, auditedChanges);
    applyChange(table, current, "Observações", changes.notes, validateText, auditedChanges);
    persistUpdatedRow(spreadsheet, table, rowIndex, current, currentVersion, user, "LOJAS", id, auditedChanges, String(payload.reason || ""));
    return { store: mapStore(table, current) };
  });
}

function updateItem(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  const id = requireString(payload.id, "id");
  const expectedVersion = requirePositiveInteger(payload.version, "version");
  const changes = requireChanges(payload.changes, ["operationalCode", "group", "area", "name", "specification", "defaultQuantity", "definitionStatus", "active", "route1", "route2", "route3", "notes"]);
  assertModulePermission(spreadsheet, user, "Itens", "Editar");

  return withScriptLock(() => {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.items, ["ID_Item", "Item", "version", "updated_at", "updated_by"]);
    const { current, rowIndex, currentVersion } = findVersionedRow(table, "ID_Item", id, expectedVersion, "Item");
    const auditedChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(table, current, "Código_Original", changes.operationalCode, validateRequiredText, auditedChanges);
    applyChange(table, current, "Grupo", changes.group, validateRequiredText, auditedChanges);
    applyChange(table, current, "Área", changes.area, validateRequiredText, auditedChanges);
    applyChange(table, current, "Item", changes.name, validateRequiredText, auditedChanges);
    applyChange(table, current, "Especificação", changes.specification, validateText, auditedChanges);
    applyChange(table, current, "Qtd_Padrão_Loja", changes.defaultQuantity, validatePositiveNumber, auditedChanges);
    applyChange(table, current, "Status_Especificação", changes.definitionStatus, validateDefinitionStatus, auditedChanges);
    applyChange(table, current, "Ativo", changes.active, validateYesNo, auditedChanges);
    applyChange(table, current, "Rota_1", changes.route1, validateShortText, auditedChanges);
    applyChange(table, current, "Rota_2", changes.route2, validateShortText, auditedChanges);
    applyChange(table, current, "Rota_3", changes.route3, validateShortText, auditedChanges);
    applyChange(table, current, "Observações", changes.notes, validateText, auditedChanges);
    persistUpdatedRow(spreadsheet, table, rowIndex, current, currentVersion, user, "ITENS", id, auditedChanges, String(payload.reason || ""));
    return { item: mapItem(table, current) };
  });
}

function verifyGoogleCredential(token: string): TokenClaims {
  const properties = PropertiesService.getScriptProperties();
  const clientId = properties.getProperty("GOOGLE_CLIENT_ID");
  if (!clientId) throw new ApiException("CONFIGURATION_ERROR", "GOOGLE_CLIENT_ID não configurado nas propriedades do script.");
  const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 80);
  const cache = CacheService.getScriptCache();
  const cached = cache.get(`token:${digest}`);
  if (cached) return JSON.parse(cached) as TokenClaims;

  const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new ApiException("INVALID_CREDENTIAL", "Sessão Google inválida ou expirada.");
  const claims = JSON.parse(response.getContentText()) as TokenClaims;
  const validIssuer = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (claims.aud !== clientId || !validIssuer || !verified || Number(claims.exp) * 1000 <= Date.now()) {
    throw new ApiException("INVALID_CREDENTIAL", "Não foi possível validar a identidade Google.");
  }
  cache.put(`token:${digest}`, JSON.stringify(claims), 300);
  return claims;
}

function findAuthorizedUser(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, claims: TokenClaims): SystemUser {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.users, ["ID_Usuário", "Nome", "E-mail", "Perfil", "Lojas_Permitidas", "Ativo"]);
  const email = claims.email.toLocaleLowerCase();
  const row = table.rows.find((candidate) => cell(table, candidate, "E-mail").toLocaleLowerCase() === email);
  if (!row || !isYes(cell(table, row, "Ativo"))) throw new ApiException("ACCESS_DENIED", "Seu usuário não possui acesso ao sistema.");
  const stores = cell(table, row, "Lojas_Permitidas").trim();
  return {
    id: cell(table, row, "ID_Usuário"),
    name: cell(table, row, "Nome") || claims.name || claims.email,
    email: claims.email,
    profile: normalizeProfile(cell(table, row, "Perfil")),
    allowedStoreIds: normalizeText(stores) === "todas" ? "TODAS" : stores.split(",").map((value) => value.trim()).filter(Boolean),
  };
}

function assertCanEditNecessity(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser, storeId: string): void {
  assertModulePermission(spreadsheet, user, "Necessidades", "Editar");
  assertStoreScope(user, storeId);
}

function assertStoreScope(user: SystemUser, storeId: string): void {
  if (user.allowedStoreIds !== "TODAS" && user.allowedStoreIds.indexOf(storeId) < 0) {
    throw new ApiException("PERMISSION_DENIED", "Esta loja não está no seu escopo de acesso.");
  }
}

function assertModulePermission(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  module: string,
  action: string,
): void {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", action]);
  const row = table.rows.find((candidate) => normalizeProfile(cell(table, candidate, "Perfil")) === user.profile && normalizeHeader(cell(table, candidate, "Módulo")) === normalizeHeader(module));
  if (!row || !isYes(cell(table, row, action))) {
    throw new ApiException("PERMISSION_DENIED", `Você não possui permissão para ${normalizeText(action)} em ${module}.`);
  }
}

function appendAudit(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  module: string,
  recordId: string,
  changes: Array<{ field: string; previous: unknown; next: unknown }>,
  reason: string,
): void {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.history, ["ID_Histórico", "Data_Hora", "ID_Usuário", "Módulo", "ID_Registro", "Ação", "Campo", "Valor_Anterior", "Valor_Novo"]);
  const idColumn = columnIndex(table, "ID_Histórico");
  let nextNumber = table.rows.reduce((highest, row) => {
    const match = String(row[idColumn] || "").match(/HIS-(\d+)/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  const output = changes.map((change) => {
    const row = Array(table.headers.length).fill("");
    setCell(table, row, "ID_Histórico", `HIS-${String(nextNumber++).padStart(6, "0")}`);
    setCell(table, row, "Data_Hora", new Date());
    setCell(table, row, "ID_Usuário", user.id);
    setCell(table, row, "Módulo", module);
    setCell(table, row, "ID_Registro", recordId);
    setCell(table, row, "Ação", "ALTERACAO");
    setCell(table, row, "Campo", change.field);
    setCell(table, row, "Valor_Anterior", change.previous);
    setCell(table, row, "Valor_Novo", change.next);
    setCell(table, row, "Origem", "SISTEMA_WEB");
    setCell(table, row, "Referência", user.email);
    setCell(table, row, "Observações", reason);
    return row;
  });
  table.sheet.getRange(table.sheet.getLastRow() + 1, 1, output.length, table.headers.length).setValues(output);
}

function withScriptLock<T>(callback: () => T): T {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new ApiException("CONCURRENT_REQUEST", "Outro usuário está atualizando a planilha. Tente novamente.");
  try { return callback(); } finally { lock.releaseLock(); }
}

function requireChanges(value: unknown, allowedKeys: string[]): Record<string, unknown> {
  if (!isRecord(value)) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração foi informada.");
  const invalidKey = Object.keys(value).find((key) => allowedKeys.indexOf(key) < 0);
  if (invalidKey) throw new ApiException("VALIDATION_ERROR", `Campo não permitido: ${invalidKey}`);
  return value;
}

function findVersionedRow(
  table: SheetTable,
  idHeader: string,
  id: string,
  expectedVersion: number,
  entityLabel: string,
): { current: unknown[]; rowIndex: number; currentVersion: number } {
  const idColumn = columnIndex(table, idHeader);
  const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === id);
  if (rowIndex < 0) throw new ApiException("NOT_FOUND", `${entityLabel} não encontrado(a).`);
  const current = table.rows[rowIndex].slice();
  const currentVersion = Number(current[columnIndex(table, "version")] || 1);
  if (currentVersion !== expectedVersion) {
    throw new ApiException("VERSION_CONFLICT", "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar novamente.", { currentVersion });
  }
  return { current, rowIndex, currentVersion };
}

function persistUpdatedRow(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  table: SheetTable,
  rowIndex: number,
  current: unknown[],
  currentVersion: number,
  user: SystemUser,
  module: string,
  recordId: string,
  auditedChanges: Array<{ field: string; previous: unknown; next: unknown }>,
  reason: string,
): void {
  if (!auditedChanges.length) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");
  current[columnIndex(table, "version")] = currentVersion + 1;
  current[columnIndex(table, "updated_at")] = new Date();
  current[columnIndex(table, "updated_by")] = user.id;
  const range = table.sheet.getRange(table.headerRow + rowIndex + 1, 1, 1, table.headers.length);
  const previousRow = range.getValues()[0];
  try {
    range.setValues([current]);
    appendAudit(spreadsheet, user, module, recordId, auditedChanges, reason);
    SpreadsheetApp.flush();
  } catch (error) {
    range.setValues([previousRow]);
    SpreadsheetApp.flush();
    throw error;
  }
}

function readTable(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, sheetName: string, requiredHeaders: string[]): SheetTable {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new ApiException("STRUCTURE_ERROR", `Aba obrigatória não encontrada: ${sheetName}`);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const previewRows = Math.min(Math.max(sheet.getLastRow(), 1), 10);
  const preview = sheet.getRange(1, 1, previewRows, lastColumn).getValues();
  const required = requiredHeaders.map(normalizeHeader);
  const headerOffset = preview.findIndex((row) => required.every((header) => row.some((cellValue) => normalizeHeader(cellValue) === header)));
  if (headerOffset < 0) throw new ApiException("STRUCTURE_ERROR", `Cabeçalhos obrigatórios não encontrados em ${sheetName}.`, { requiredHeaders });
  const headers = preview[headerOffset].map((header) => String(header || "").trim());
  const dataStartRow = headerOffset + 2;
  const dataRowCount = Math.max(sheet.getLastRow() - headerOffset - 1, 0);
  const rows = dataRowCount ? sheet.getRange(dataStartRow, 1, dataRowCount, headers.length).getValues().filter((row) => row.some((value) => String(value || "").trim() !== "")) : [];
  return { sheet, headerRow: headerOffset + 1, headers, normalizedHeaders: headers.map(normalizeHeader), rows };
}

function mapStore(table: SheetTable, row: unknown[]) {
  const id = cell(table, row, "ID_Loja");
  return { id, code: cell(table, row, "Código") || id, name: cell(table, row, "Loja") || cell(table, row, "Nome"), city: cell(table, row, "Cidade"), state: cell(table, row, "UF"), region: cell(table, row, "Região") || cell(table, row, "Capital_UF"), manager: cell(table, row, "Responsável"), email: cell(table, row, "E-mail"), phone: cell(table, row, "Telefone"), status: cell(table, row, "Status"), address: cell(table, row, "Endereço"), notes: cell(table, row, "Observações"), version: Number(cell(table, row, "version") || 1) };
}

function mapItem(table: SheetTable, row: unknown[]) {
  return { id: cell(table, row, "ID_Item"), operationalCode: cell(table, row, "Código_Original"), group: cell(table, row, "Grupo"), area: cell(table, row, "Área"), name: cell(table, row, "Item"), specification: cell(table, row, "Especificação"), defaultQuantity: Number(cell(table, row, "Qtd_Padrão_Loja") || 1), definitionStatus: normalizeText(cell(table, row, "Status_Especificação")).indexOf("pendente") >= 0 ? "PENDENTE_DEFINICAO" : "LIBERADO_PARA_COTACAO", duplicateOperationalCode: isYes(cell(table, row, "Código_Duplicado")), active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")), route1: cell(table, row, "Rota_1"), route2: cell(table, row, "Rota_2"), route3: cell(table, row, "Rota_3"), notes: cell(table, row, "Observações"), version: Number(cell(table, row, "version") || 1) };
}

function mapNecessity(table: SheetTable, row: unknown[]) {
  return { id: cell(table, row, "ID_Necessidade"), storeId: cell(table, row, "ID_Loja"), itemId: cell(table, row, "ID_Item"), quantity: Number(cell(table, row, "Qtd_Planejada") || 1), priority: normalizePriority(cell(table, row, "Prioridade")), status: normalizeStatus(cell(table, row, "Status")), version: Number(cell(table, row, "version") || 1) };
}

function parseRequest(event: PostEvent): ApiRequest {
  const contents = event.postData && event.postData.contents;
  if (!contents) throw new ApiException("INVALID_REQUEST", "Corpo da requisição ausente.");
  try {
    const request = JSON.parse(contents) as ApiRequest;
    if (!request || typeof request !== "object") throw new Error("invalid");
    return request;
  } catch {
    throw new ApiException("INVALID_REQUEST", "JSON inválido.");
  }
}

function openConfiguredSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new ApiException("CONFIGURATION_ERROR", "SPREADSHEET_ID não configurado nas propriedades do script.");
  try { return SpreadsheetApp.openById(id); } catch { throw new ApiException("SPREADSHEET_UNAVAILABLE", "Não foi possível abrir a planilha. Confirme o ID e o formato Google Sheets nativo."); }
}

function jsonOutput(payload: unknown): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function toSafeError(error: unknown): { code: string; message: string; details?: unknown } {
  if (error instanceof ApiException) return { code: error.code, message: error.message, details: error.details };
  return { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." };
}

function normalizeHeader(value: unknown): string { return normalizeText(String(value || "")).replace(/[^a-z0-9]/g, ""); }
function normalizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }
function columnIndex(table: SheetTable, header: string): number { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index < 0) throw new ApiException("STRUCTURE_REQUIRED", `Campo técnico ausente: ${header}`); return index; }
function cell(table: SheetTable, row: unknown[], header: string): string { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); return index < 0 ? "" : String(row[index] || "").trim(); }
function setCell(table: SheetTable, row: unknown[], header: string, value: unknown): void { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index >= 0) row[index] = value; }
function isYes(value: string): boolean { return ["sim", "true", "1", "ativo"].indexOf(normalizeText(value)) >= 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function requireString(value: unknown, field: string): string { if (typeof value !== "string" || !value.trim()) throw new ApiException("VALIDATION_ERROR", `Campo obrigatório: ${field}`); return value.trim(); }
function requirePositiveInteger(value: unknown, field: string): number { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new ApiException("VALIDATION_ERROR", `${field} deve ser inteiro positivo.`); return parsed; }
function validatePositiveNumber(value: unknown): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new ApiException("VALIDATION_ERROR", "Quantidade deve ser maior que zero."); return parsed; }
function validateRequiredText(value: unknown): string { const result = requireString(value, "valor"); if (result.length > 500) throw new ApiException("VALIDATION_ERROR", "Texto obrigatório muito longo."); return result; }
function validateShortText(value: unknown): string { if (typeof value !== "string" || value.length > 500) throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateUf(value: unknown): string { const result = validateShortText(value).toLocaleUpperCase(); if (result && !/^[A-Z]{2}$/.test(result)) throw new ApiException("VALIDATION_ERROR", "UF deve conter duas letras."); return result; }
function validateOptionalEmail(value: unknown): string { const result = validateShortText(value).toLocaleLowerCase(); if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ApiException("VALIDATION_ERROR", "E-mail inválido."); return result; }
function validateDefinitionStatus(value: unknown): string { const status = requireString(value, "definitionStatus"); if (status === "PENDENTE_DEFINICAO") return "Pendente definição"; if (status === "LIBERADO_PARA_COTACAO") return "Liberado para cotação"; throw new ApiException("VALIDATION_ERROR", "Status de especificação inválido."); }
function validateYesNo(value: unknown): string { if (typeof value !== "boolean") throw new ApiException("VALIDATION_ERROR", "Ativo deve ser verdadeiro ou falso."); return value ? "Sim" : "Não"; }
function validatePriority(value: unknown): string { const result = requireString(value, "priority").toLocaleUpperCase(); if (["BAIXA", "MEDIA", "ALTA", "CRITICA"].indexOf(normalizeText(result).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase()) < 0) throw new ApiException("VALIDATION_ERROR", "Prioridade inválida."); return result; }
function validateText(value: unknown): string { if (typeof value !== "string" || value.length > 2000) throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateStatus(value: unknown): string { const status = requireString(value, "status").toLocaleUpperCase(); if (!(status in STATUS_TRANSITIONS)) throw new ApiException("VALIDATION_ERROR", "Status inválido."); return status; }

function applyChange(table: SheetTable, row: unknown[], header: string, rawValue: unknown, validator: (value: unknown) => unknown, audit: Array<{ field: string; previous: unknown; next: unknown }>): void {
  if (rawValue === undefined) return;
  const index = columnIndex(table, header);
  const next = validator(rawValue);
  if (String(row[index] || "") === String(next)) return;
  audit.push({ field: header, previous: row[index], next });
  row[index] = next;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDENTE_DEFINICAO: ["NAO_INICIADO", "CANCELADO"], NAO_INICIADO: ["EM_COTACAO", "CANCELADO"], EM_COTACAO: ["AGUARDANDO_APROVACAO", "CANCELADO"], AGUARDANDO_APROVACAO: ["APROVADO", "EM_COTACAO", "CANCELADO"], APROVADO: ["COMPRADO", "EM_COTACAO", "CANCELADO"], COMPRADO: ["EM_TRANSPORTE", "CANCELADO"], EM_TRANSPORTE: ["ENTREGUE", "DIVERGENCIA"], ENTREGUE: ["CONFERIDO", "DIVERGENCIA"], CONFERIDO: ["CONCLUIDO", "DIVERGENCIA"], CONCLUIDO: [], CANCELADO: [], DIVERGENCIA: ["EM_TRANSPORTE", "ENTREGUE", "CONFERIDO"],
};

function normalizeStatus(value: string): string { const key = normalizeHeader(value).toLocaleUpperCase(); const aliases: Record<string, string> = { PENDENTEDEFINICAO: "PENDENTE_DEFINICAO", NAOINICIADO: "NAO_INICIADO", EMCOTACAO: "EM_COTACAO", AGUARDANDOAPROVACAO: "AGUARDANDO_APROVACAO", APROVADO: "APROVADO", COMPRADO: "COMPRADO", EMTRANSPORTE: "EM_TRANSPORTE", ENTREGUE: "ENTREGUE", CONFERIDO: "CONFERIDO", CONCLUIDO: "CONCLUIDO", CANCELADO: "CANCELADO", DIVERGENCIA: "DIVERGENCIA", COMDIVERGENCIA: "DIVERGENCIA" }; return aliases[key] || "NAO_INICIADO"; }
function normalizePriority(value: string): string { const key = normalizeHeader(value); const aliases: Record<string, string> = { baixa: "BAIXA", media: "MEDIA", alta: "ALTA", critica: "CRITICA" }; return aliases[key] || "MEDIA"; }
function normalizeProfile(value: string): string { const key = normalizeHeader(value); const aliases: Record<string, string> = { administrador: "ADMINISTRADOR", gestoraprovador: "GESTOR", gestor: "GESTOR", compras: "COMPRAS", responsavelloja: "RESPONSAVEL_LOJA", consulta: "CONSULTA" }; return aliases[key] || "CONSULTA"; }
function assertStatusTransition(previous: string, next: string): void { const from = normalizeStatus(previous); const to = normalizeStatus(next); if ((STATUS_TRANSITIONS[from] || []).indexOf(to) < 0) throw new ApiException("INVALID_STATUS_TRANSITION", `Transição inválida: ${from} → ${to}`); }

function buildTechnicalStatus(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): {
  ready: boolean;
  checkedAt: string;
  tables: TechnicalTableStatus[];
} {
  const tables = APP_CONFIG.setupTables.map(({ sheet, keyHeader }) => inspectTechnicalTable(spreadsheet, sheet, keyHeader));
  return {
    ready: tables.every((table) => table.ok && table.missing.length === 0),
    checkedAt: new Date().toISOString(),
    tables,
  };
}

function inspectTechnicalTable(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string,
  keyHeader: string,
): TechnicalTableStatus {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, ok: false, headerRow: null, missing: APP_CONFIG.technicalHeaders.slice(), error: "Aba não encontrada." };
  }
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    return { sheet: sheetName, ok: false, headerRow: null, missing: APP_CONFIG.technicalHeaders.slice(), error: "Aba vazia." };
  }
  const previewRowCount = Math.min(Math.max(sheet.getLastRow(), 1), TECHNICAL_HEADER_PREVIEW_ROWS);
  const preview = sheet.getRange(1, 1, previewRowCount, lastColumn).getValues();
  const normalizedKeyHeader = normalizeHeader(keyHeader);
  const headerOffset = preview.findIndex((row) => row.some((value) => normalizeHeader(value) === normalizedKeyHeader));
  if (headerOffset < 0) {
    return {
      sheet: sheetName,
      ok: false,
      headerRow: null,
      missing: APP_CONFIG.technicalHeaders.slice(),
      error: `Cabeçalho ${keyHeader} não localizado nas primeiras ${previewRowCount} linhas.`,
    };
  }
  const normalizedHeaders = preview[headerOffset].map(normalizeHeader);
  const missing = APP_CONFIG.technicalHeaders.filter((header) => normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
  return { sheet: sheetName, ok: true, headerRow: headerOffset + 1, missing };
}

function diagnoseSpreadsheet(): unknown {
  return buildTechnicalStatus(openConfiguredSpreadsheet());
}

function testHealthCheck(): string {
  const response = doGet({ parameter: { action: "health" } }).getContent();
  console.log(response);
  return response;
}

function testPostHealthCheck(): string {
  const response = doPost({ postData: { contents: JSON.stringify({ action: "health", payload: {} }) } }).getContent();
  console.log(response);
  return response;
}

function setupTechnicalColumns(): unknown {
  if (PropertiesService.getScriptProperties().getProperty("ALLOW_SETUP") !== "SIM") throw new Error("Defina ALLOW_SETUP=SIM temporariamente para autorizar a preparação.");
  const spreadsheet = openConfiguredSpreadsheet();
  const stamp = Utilities.formatDate(new Date(), "America/Fortaleza", "yyyyMMdd_HHmmss");
  const report = APP_CONFIG.setupTables.map(({ sheet: sheetName, keyHeader }) => {
    const table = readTable(spreadsheet, sheetName, [keyHeader]);
    const missing = APP_CONFIG.technicalHeaders.filter((header) => table.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
    if (!missing.length) return { sheet: sheetName, added: [], backup: "" };
    const backupName = `BKP_${stamp}_${sheetName}`.slice(0, 99);
    table.sheet.copyTo(spreadsheet).setName(backupName);
    table.sheet.getRange(table.headerRow, table.headers.length + 1, 1, missing.length).setValues([missing]);
    return { sheet: sheetName, added: missing, backup: backupName };
  });
  PropertiesService.getScriptProperties().deleteProperty("ALLOW_SETUP");
  return report;
}
