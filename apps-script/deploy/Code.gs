"use strict";
class ApiException extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ApiException";
    }
}
const APP_CONFIG = {
    sheets: {
        stores: "01_LOJAS",
        items: "02_ITENS",
        necessities: "03_NECESSIDADES",
        users: "09_USUARIOS",
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
function doGet(event) {
    var _a;
    const action = ((_a = event === null || event === void 0 ? void 0 : event.parameter) === null || _a === void 0 ? void 0 : _a.action) || "health";
    if (action !== "health") {
        return jsonOutput({ ok: false, error: { code: "UNKNOWN_ROUTE", message: "Rota GET não reconhecida." } });
    }
    return jsonOutput({ ok: true, data: healthPayload() });
}
function doPost(event) {
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
    }
    catch (error) {
        const safe = toSafeError(error);
        console.error(JSON.stringify({ requestId, code: safe.code, message: safe.message, details: safe.details || null }));
        return jsonOutput({ ok: false, error: safe, requestId });
    }
}
function healthPayload() {
    return { status: "ok", service: "Implanta 27 Apps Script API", timestamp: new Date().toISOString() };
}
function dispatchAction(action, payload, spreadsheet, user) {
    switch (action) {
        case "bootstrap":
            return buildBootstrap(spreadsheet, user);
        case "updateNecessity":
            return updateNecessity(spreadsheet, user, payload);
        default:
            throw new ApiException("UNKNOWN_ACTION", "Ação não reconhecida.");
    }
}
function buildBootstrap(spreadsheet, user) {
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
            modifiedAt: new Date().toISOString(),
            message: "Dados ao vivo pelo Google Apps Script Web App, com autenticação e permissões validadas no backend.",
        },
        user,
        stores,
        items,
        necessities,
    };
}
function updateNecessity(spreadsheet, user, payload) {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const changes = isRecord(payload.changes) ? payload.changes : {};
    const allowedKeys = ["quantity", "priority", "status", "notes"];
    const invalidKey = Object.keys(changes).find((key) => allowedKeys.indexOf(key) < 0);
    if (invalidKey)
        throw new ApiException("VALIDATION_ERROR", `Campo não permitido: ${invalidKey}`);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000))
        throw new ApiException("CONCURRENT_REQUEST", "Outro usuário está atualizando a planilha. Tente novamente.");
    try {
        const table = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "Status", "version", "updated_at", "updated_by"]);
        const idColumn = columnIndex(table, "ID_Necessidade");
        const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === id);
        if (rowIndex < 0)
            throw new ApiException("NOT_FOUND", "Necessidade não encontrada.");
        const current = table.rows[rowIndex].slice();
        const storeId = cell(table, current, "ID_Loja");
        assertCanEditNecessity(user, storeId);
        const versionColumn = columnIndex(table, "version");
        const currentVersion = Number(current[versionColumn] || 1);
        if (currentVersion !== expectedVersion) {
            throw new ApiException("VERSION_CONFLICT", "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar novamente.", { currentVersion });
        }
        const auditedChanges = [];
        applyChange(table, current, "Qtd_Planejada", changes.quantity, validatePositiveNumber, auditedChanges);
        applyChange(table, current, "Prioridade", changes.priority, validatePriority, auditedChanges);
        if (changes.status !== undefined) {
            const previousStatus = cell(table, current, "Status");
            const nextStatus = validateStatus(changes.status);
            assertStatusTransition(previousStatus, nextStatus);
            applyChange(table, current, "Status", nextStatus, (value) => value, auditedChanges);
        }
        applyChange(table, current, "Observações", changes.notes, validateText, auditedChanges);
        if (!auditedChanges.length)
            throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");
        current[versionColumn] = currentVersion + 1;
        current[columnIndex(table, "updated_at")] = new Date();
        current[columnIndex(table, "updated_by")] = user.id;
        const absoluteRow = table.headerRow + rowIndex + 1;
        const range = table.sheet.getRange(absoluteRow, 1, 1, table.headers.length);
        const previousRow = range.getValues()[0];
        try {
            range.setValues([current]);
            appendAudit(spreadsheet, user, id, auditedChanges, String(payload.reason || ""));
            SpreadsheetApp.flush();
        }
        catch (error) {
            range.setValues([previousRow]);
            SpreadsheetApp.flush();
            throw error;
        }
        return { id, version: currentVersion + 1, updatedAt: new Date().toISOString() };
    }
    finally {
        lock.releaseLock();
    }
}
function verifyGoogleCredential(token) {
    const properties = PropertiesService.getScriptProperties();
    const clientId = properties.getProperty("GOOGLE_CLIENT_ID");
    if (!clientId)
        throw new ApiException("CONFIGURATION_ERROR", "GOOGLE_CLIENT_ID não configurado nas propriedades do script.");
    const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 80);
    const cache = CacheService.getScriptCache();
    const cached = cache.get(`token:${digest}`);
    if (cached)
        return JSON.parse(cached);
    const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200)
        throw new ApiException("INVALID_CREDENTIAL", "Sessão Google inválida ou expirada.");
    const claims = JSON.parse(response.getContentText());
    const validIssuer = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
    const verified = claims.email_verified === true || claims.email_verified === "true";
    if (claims.aud !== clientId || !validIssuer || !verified || Number(claims.exp) * 1000 <= Date.now()) {
        throw new ApiException("INVALID_CREDENTIAL", "Não foi possível validar a identidade Google.");
    }
    cache.put(`token:${digest}`, JSON.stringify(claims), 300);
    return claims;
}
function findAuthorizedUser(spreadsheet, claims) {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.users, ["ID_Usuário", "Nome", "E-mail", "Perfil", "Lojas_Permitidas", "Ativo"]);
    const email = claims.email.toLocaleLowerCase();
    const row = table.rows.find((candidate) => cell(table, candidate, "E-mail").toLocaleLowerCase() === email);
    if (!row || !isYes(cell(table, row, "Ativo")))
        throw new ApiException("ACCESS_DENIED", "Seu usuário não possui acesso ao sistema.");
    const stores = cell(table, row, "Lojas_Permitidas").trim();
    return {
        id: cell(table, row, "ID_Usuário"),
        name: cell(table, row, "Nome") || claims.name || claims.email,
        email: claims.email,
        profile: normalizeProfile(cell(table, row, "Perfil")),
        allowedStoreIds: normalizeText(stores) === "todas" ? "TODAS" : stores.split(",").map((value) => value.trim()).filter(Boolean),
    };
}
function assertCanEditNecessity(user, storeId) {
    const editableProfiles = ["ADMINISTRADOR", "GESTOR", "RESPONSAVEL_LOJA"];
    if (editableProfiles.indexOf(user.profile) < 0)
        throw new ApiException("PERMISSION_DENIED", "Você não possui permissão para alterar necessidades.");
    if (user.allowedStoreIds !== "TODAS" && user.allowedStoreIds.indexOf(storeId) < 0) {
        throw new ApiException("PERMISSION_DENIED", "Esta loja não está no seu escopo de acesso.");
    }
}
function appendAudit(spreadsheet, user, recordId, changes, reason) {
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
        setCell(table, row, "Módulo", "NECESSIDADES");
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
function readTable(spreadsheet, sheetName, requiredHeaders) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet)
        throw new ApiException("STRUCTURE_ERROR", `Aba obrigatória não encontrada: ${sheetName}`);
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const previewRows = Math.min(Math.max(sheet.getLastRow(), 1), 10);
    const preview = sheet.getRange(1, 1, previewRows, lastColumn).getValues();
    const required = requiredHeaders.map(normalizeHeader);
    const headerOffset = preview.findIndex((row) => required.every((header) => row.some((cellValue) => normalizeHeader(cellValue) === header)));
    if (headerOffset < 0)
        throw new ApiException("STRUCTURE_ERROR", `Cabeçalhos obrigatórios não encontrados em ${sheetName}.`, { requiredHeaders });
    const headers = preview[headerOffset].map((header) => String(header || "").trim());
    const dataStartRow = headerOffset + 2;
    const dataRowCount = Math.max(sheet.getLastRow() - headerOffset - 1, 0);
    const rows = dataRowCount ? sheet.getRange(dataStartRow, 1, dataRowCount, headers.length).getValues().filter((row) => row.some((value) => String(value || "").trim() !== "")) : [];
    return { sheet, headerRow: headerOffset + 1, headers, normalizedHeaders: headers.map(normalizeHeader), rows };
}
function mapStore(table, row) {
    const id = cell(table, row, "ID_Loja");
    return { id, code: cell(table, row, "Código") || id, name: cell(table, row, "Loja") || cell(table, row, "Nome"), city: cell(table, row, "Cidade"), state: cell(table, row, "UF"), region: cell(table, row, "Região") || cell(table, row, "Capital_UF"), manager: cell(table, row, "Responsável"), email: cell(table, row, "E-mail"), phone: cell(table, row, "Telefone"), status: cell(table, row, "Status") };
}
function mapItem(table, row) {
    return { id: cell(table, row, "ID_Item"), operationalCode: cell(table, row, "Código_Original"), group: cell(table, row, "Grupo"), area: cell(table, row, "Área"), name: cell(table, row, "Item"), specification: cell(table, row, "Especificação"), defaultQuantity: Number(cell(table, row, "Qtd_Padrão_Loja") || 1), definitionStatus: normalizeText(cell(table, row, "Status_Especificação")).indexOf("pendente") >= 0 ? "PENDENTE_DEFINICAO" : "LIBERADO_PARA_COTACAO", duplicateOperationalCode: isYes(cell(table, row, "Código_Duplicado")), active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")) };
}
function mapNecessity(table, row) {
    return { id: cell(table, row, "ID_Necessidade"), storeId: cell(table, row, "ID_Loja"), itemId: cell(table, row, "ID_Item"), quantity: Number(cell(table, row, "Qtd_Planejada") || 1), priority: normalizePriority(cell(table, row, "Prioridade")), status: normalizeStatus(cell(table, row, "Status")), version: Number(cell(table, row, "version") || 1) };
}
function parseRequest(event) {
    const contents = event.postData && event.postData.contents;
    if (!contents)
        throw new ApiException("INVALID_REQUEST", "Corpo da requisição ausente.");
    try {
        const request = JSON.parse(contents);
        if (!request || typeof request !== "object")
            throw new Error("invalid");
        return request;
    }
    catch {
        throw new ApiException("INVALID_REQUEST", "JSON inválido.");
    }
}
function openConfiguredSpreadsheet() {
    const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!id)
        throw new ApiException("CONFIGURATION_ERROR", "SPREADSHEET_ID não configurado nas propriedades do script.");
    try {
        return SpreadsheetApp.openById(id);
    }
    catch {
        throw new ApiException("SPREADSHEET_UNAVAILABLE", "Não foi possível abrir a planilha. Confirme o ID e o formato Google Sheets nativo.");
    }
}
function jsonOutput(payload) {
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function toSafeError(error) {
    if (error instanceof ApiException)
        return { code: error.code, message: error.message, details: error.details };
    return { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." };
}
function normalizeHeader(value) { return normalizeText(String(value || "")).replace(/[^a-z0-9]/g, ""); }
function normalizeText(value) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }
function columnIndex(table, header) { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index < 0)
    throw new ApiException("STRUCTURE_REQUIRED", `Campo técnico ausente: ${header}`); return index; }
function cell(table, row, header) { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); return index < 0 ? "" : String(row[index] || "").trim(); }
function setCell(table, row, header, value) { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index >= 0)
    row[index] = value; }
function isYes(value) { return ["sim", "true", "1", "ativo"].indexOf(normalizeText(value)) >= 0; }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function requireString(value, field) { if (typeof value !== "string" || !value.trim())
    throw new ApiException("VALIDATION_ERROR", `Campo obrigatório: ${field}`); return value.trim(); }
function requirePositiveInteger(value, field) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1)
    throw new ApiException("VALIDATION_ERROR", `${field} deve ser inteiro positivo.`); return parsed; }
function validatePositiveNumber(value) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0)
    throw new ApiException("VALIDATION_ERROR", "Quantidade deve ser maior que zero."); return parsed; }
function validatePriority(value) { const result = requireString(value, "priority").toLocaleUpperCase(); if (["BAIXA", "MEDIA", "ALTA", "CRITICA"].indexOf(normalizeText(result).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase()) < 0)
    throw new ApiException("VALIDATION_ERROR", "Prioridade inválida."); return result; }
function validateText(value) { if (typeof value !== "string" || value.length > 2000)
    throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateStatus(value) { const status = requireString(value, "status").toLocaleUpperCase(); if (!(status in STATUS_TRANSITIONS))
    throw new ApiException("VALIDATION_ERROR", "Status inválido."); return status; }
function applyChange(table, row, header, rawValue, validator, audit) {
    if (rawValue === undefined)
        return;
    const index = columnIndex(table, header);
    const next = validator(rawValue);
    if (String(row[index] || "") === String(next))
        return;
    audit.push({ field: header, previous: row[index], next });
    row[index] = next;
}
const STATUS_TRANSITIONS = {
    PENDENTE_DEFINICAO: ["NAO_INICIADO", "CANCELADO"], NAO_INICIADO: ["EM_COTACAO", "CANCELADO"], EM_COTACAO: ["AGUARDANDO_APROVACAO", "CANCELADO"], AGUARDANDO_APROVACAO: ["APROVADO", "EM_COTACAO", "CANCELADO"], APROVADO: ["COMPRADO", "EM_COTACAO", "CANCELADO"], COMPRADO: ["EM_TRANSPORTE", "CANCELADO"], EM_TRANSPORTE: ["ENTREGUE", "DIVERGENCIA"], ENTREGUE: ["CONFERIDO", "DIVERGENCIA"], CONFERIDO: ["CONCLUIDO", "DIVERGENCIA"], CONCLUIDO: [], CANCELADO: [], DIVERGENCIA: ["EM_TRANSPORTE", "ENTREGUE", "CONFERIDO"],
};
function normalizeStatus(value) { const key = normalizeHeader(value).toLocaleUpperCase(); const aliases = { PENDENTEDEFINICAO: "PENDENTE_DEFINICAO", NAOINICIADO: "NAO_INICIADO", EMCOTACAO: "EM_COTACAO", AGUARDANDOAPROVACAO: "AGUARDANDO_APROVACAO", APROVADO: "APROVADO", COMPRADO: "COMPRADO", EMTRANSPORTE: "EM_TRANSPORTE", ENTREGUE: "ENTREGUE", CONFERIDO: "CONFERIDO", CONCLUIDO: "CONCLUIDO", CANCELADO: "CANCELADO", DIVERGENCIA: "DIVERGENCIA", COMDIVERGENCIA: "DIVERGENCIA" }; return aliases[key] || "NAO_INICIADO"; }
function normalizePriority(value) { const key = normalizeHeader(value); const aliases = { baixa: "BAIXA", media: "MEDIA", alta: "ALTA", critica: "CRITICA" }; return aliases[key] || "MEDIA"; }
function normalizeProfile(value) { const key = normalizeHeader(value); const aliases = { administrador: "ADMINISTRADOR", gestoraprovador: "GESTOR", gestor: "GESTOR", compras: "COMPRAS", responsavelloja: "RESPONSAVEL_LOJA", consulta: "CONSULTA" }; return aliases[key] || "CONSULTA"; }
function assertStatusTransition(previous, next) { const from = normalizeStatus(previous); const to = normalizeStatus(next); if ((STATUS_TRANSITIONS[from] || []).indexOf(to) < 0)
    throw new ApiException("INVALID_STATUS_TRANSITION", `Transição inválida: ${from} → ${to}`); }
function diagnoseSpreadsheet() {
    const spreadsheet = openConfiguredSpreadsheet();
    return APP_CONFIG.setupTables.map(({ sheet: sheetName, keyHeader }) => {
        try {
            const table = readTable(spreadsheet, sheetName, [keyHeader]);
            const missing = APP_CONFIG.technicalHeaders.filter((header) => table.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
            return { sheet: sheetName, ok: true, headerRow: table.headerRow, missing };
        }
        catch (error) {
            return { sheet: sheetName, ok: false, error: toSafeError(error).message };
        }
    });
}
function testHealthCheck() {
    const response = doGet({ parameter: { action: "health" } }).getContent();
    console.log(response);
    return response;
}
function testPostHealthCheck() {
    const response = doPost({ postData: { contents: JSON.stringify({ action: "health", payload: {} }) } }).getContent();
    console.log(response);
    return response;
}
function setupTechnicalColumns() {
    if (PropertiesService.getScriptProperties().getProperty("ALLOW_SETUP") !== "SIM")
        throw new Error("Defina ALLOW_SETUP=SIM temporariamente para autorizar a preparação.");
    const spreadsheet = openConfiguredSpreadsheet();
    const stamp = Utilities.formatDate(new Date(), "America/Fortaleza", "yyyyMMdd_HHmmss");
    const report = APP_CONFIG.setupTables.map(({ sheet: sheetName, keyHeader }) => {
        const table = readTable(spreadsheet, sheetName, [keyHeader]);
        const missing = APP_CONFIG.technicalHeaders.filter((header) => table.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
        if (!missing.length)
            return { sheet: sheetName, added: [], backup: "" };
        const backupName = `BKP_${stamp}_${sheetName}`.slice(0, 99);
        table.sheet.copyTo(spreadsheet).setName(backupName);
        table.sheet.getRange(table.headerRow, table.headers.length + 1, 1, missing.length).setValues([missing]);
        return { sheet: sheetName, added: missing, backup: backupName };
    });
    PropertiesService.getScriptProperties().deleteProperty("ALLOW_SETUP");
    return report;
}
