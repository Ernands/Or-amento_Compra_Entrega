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
        suppliers: "04_FORNECEDORES",
        quotes: "05_COTACOES",
        users: "09_USUARIOS",
        permissions: "10_PERMISSOES",
        history: "12_HISTORICO",
        routes: "15_ROTAS_COMPRA",
        lists: "14_LISTAS",
    },
    timezone: "America/Fortaleza",
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
        case "technicalStatus":
            return buildTechnicalStatus(spreadsheet);
        case "quotesWorkspace":
            return buildQuotesWorkspace(spreadsheet, user);
        case "createSupplier":
            return createSupplier(spreadsheet, user, payload);
        case "createQuote":
            return createQuote(spreadsheet, user, payload);
        case "updateQuote":
            return updateQuote(spreadsheet, user, payload);
        case "selectQuote":
            return selectQuote(spreadsheet, user, payload);
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
            checkedAt: new Date().toISOString(),
            message: "Dados ao vivo pelo Google Apps Script Web App, com autenticação e permissões validadas no backend.",
        },
        user,
        stores,
        items,
        necessities,
    };
}
function buildQuotesWorkspace(spreadsheet, user) {
    assertModulePermission(spreadsheet, user, "Cotações", "Visualizar");
    const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "Ativo", "version"]);
    const quotesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Valor_Total", "Status", "version"]);
    const routesTable = readTable(spreadsheet, APP_CONFIG.sheets.routes, ["ID_Rota", "ID_Item", "Ordem", "Origem_Destino", "Ativo"]);
    const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item"]);
    const permissionTable = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar"]);
    const options = readQuoteOptions(spreadsheet);
    const allowedNeeds = necessitiesTable.rows.filter((row) => isStoreAllowed(user, cell(necessitiesTable, row, "ID_Loja")));
    const allowedItemIds = Object.fromEntries(allowedNeeds.map((row) => [cell(necessitiesTable, row, "ID_Item"), true]));
    return {
        suppliers: suppliersTable.rows.map((row) => mapSupplier(suppliersTable, row)),
        quotes: quotesTable.rows.filter((row) => isStoreAllowed(user, cell(quotesTable, row, "ID_Loja"))).map((row) => mapQuote(quotesTable, row)),
        routes: routesTable.rows.filter((row) => Boolean(allowedItemIds[cell(routesTable, row, "ID_Item")])).map((row) => mapPurchaseRoute(routesTable, row)),
        options,
        permissions: {
            view: hasModulePermission(permissionTable, user, "Cotações", "Visualizar"),
            create: hasModulePermission(permissionTable, user, "Cotações", "Criar"),
            edit: hasModulePermission(permissionTable, user, "Cotações", "Editar"),
            select: hasModulePermission(permissionTable, user, "Cotações", "Editar"),
            createSupplier: hasModulePermission(permissionTable, user, "Fornecedores", "Criar"),
        },
        checkedAt: new Date().toISOString(),
    };
}
function createSupplier(spreadsheet, user, payload) {
    assertModulePermission(spreadsheet, user, "Fornecedores", "Criar");
    return withScriptLock(() => {
        const table = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "CNPJ_CPF", "Ativo", "created_at", "created_by", "updated_at", "updated_by", "version"]);
        const name = validateRequiredText(payload.name);
        const taxId = validateTaxId(payload.taxId);
        if (taxId) {
            const duplicate = table.rows.some((row) => onlyDigits(cell(table, row, "CNPJ_CPF")) === onlyDigits(taxId));
            if (duplicate)
                throw new ApiException("DUPLICATE_RECORD", "Já existe um fornecedor com este CNPJ/CPF.");
        }
        const id = nextInternalId(table, "ID_Fornecedor", "FOR", 6);
        const now = new Date();
        const row = Array(table.headers.length).fill("");
        setCell(table, row, "ID_Fornecedor", id);
        setCell(table, row, "Fornecedor", name);
        setCell(table, row, "CNPJ_CPF", taxId);
        setCell(table, row, "Cidade", validateShortText(payload.city));
        setCell(table, row, "UF", validateUf(payload.state));
        setCell(table, row, "Contato", validateShortText(payload.contact));
        setCell(table, row, "Telefone", validateShortText(payload.phone));
        setCell(table, row, "E-mail", validateOptionalEmail(payload.email));
        setCell(table, row, "Nota_Fornecedor", validateOptionalRating(payload.rating));
        setCell(table, row, "Ativo", validateYesNo(payload.active));
        setCell(table, row, "Observações", validateText(payload.notes));
        setCell(table, row, "Link_Site", validateOptionalUrl(payload.website));
        setTechnicalCreationFields(table, row, user, now);
        appendCreatedRow(spreadsheet, table, row, user, {
            module: "FORNECEDORES",
            recordId: id,
            changes: [{ field: "Fornecedor", previous: "", next: name }],
            reason: "Cadastro realizado pelo módulo Cotações.",
            action: "CRIACAO",
        });
        return { supplier: mapSupplier(table, row) };
    });
}
function createQuote(spreadsheet, user, payload) {
    assertModulePermission(spreadsheet, user, "Cotações", "Criar");
    return withScriptLock(() => {
        const necessityId = requireString(payload.necessityId, "necessityId");
        const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Status", "version", "updated_at", "updated_by"]);
        const necessityMatch = findRowById(necessitiesTable, "ID_Necessidade", necessityId, "Necessidade");
        const necessityRow = necessityMatch.row.slice();
        const storeId = cell(necessitiesTable, necessityRow, "ID_Loja");
        const itemId = cell(necessitiesTable, necessityRow, "ID_Item");
        assertStoreScope(user, storeId);
        const necessityStatus = normalizeStatus(cell(necessitiesTable, necessityRow, "Status"));
        if (["NAO_INICIADO", "EM_COTACAO"].indexOf(necessityStatus) < 0) {
            throw new ApiException("INVALID_STATUS", necessityStatus === "PENDENTE_DEFINICAO" ? "Defina o item antes de iniciar cotações." : "Esta necessidade não aceita novas cotações no status atual.");
        }
        const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "Nota_Fornecedor", "Ativo"]);
        const supplierId = requireString(payload.supplierId, "supplierId");
        const supplier = findRowById(suppliersTable, "ID_Fornecedor", supplierId, "Fornecedor").row;
        if (!isYes(cell(suppliersTable, supplier, "Ativo")))
            throw new ApiException("VALIDATION_ERROR", "O fornecedor selecionado está inativo.");
        const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Valor_Total", "Status", "Selecionada", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo"]);
        const values = validateQuoteValues(payload, readQuoteOptions(spreadsheet));
        const id = nextInternalId(table, "ID_Cotação", "COT", 6);
        const now = new Date();
        const row = Array(table.headers.length).fill("");
        setCell(table, row, "ID_Cotação", id);
        setCell(table, row, "ID_Necessidade", necessityId);
        setCell(table, row, "ID_Loja", storeId);
        setCell(table, row, "ID_Item", itemId);
        setCell(table, row, "ID_Fornecedor", supplierId);
        writeQuoteValues(table, row, values);
        setCell(table, row, "Nota_Fornecedor", cell(suppliersTable, supplier, "Nota_Fornecedor"));
        setCell(table, row, "Selecionada", "Não");
        setCell(table, row, "Responsável", user.name);
        setCell(table, row, "ativo", "Sim");
        setTechnicalCreationFields(table, row, user, now);
        const quoteRange = table.sheet.getRange(table.sheet.getLastRow() + 1, 1, 1, table.headers.length);
        const necessityRange = necessitiesTable.sheet.getRange(necessitiesTable.headerRow + necessityMatch.rowIndex + 1, 1, 1, necessitiesTable.headers.length);
        const previousNecessity = necessityRange.getValues()[0];
        const auditEntries = [{
                module: "COTACOES",
                recordId: id,
                changes: [
                    { field: "ID_Necessidade", previous: "", next: necessityId },
                    { field: "ID_Fornecedor", previous: "", next: supplierId },
                    { field: "Valor_Total", previous: "", next: values.total },
                    { field: "Status", previous: "", next: values.status },
                ],
                reason: String(payload.notes || ""),
                action: "CRIACAO",
            }];
        try {
            quoteRange.setValues([row]);
            if (necessityStatus === "NAO_INICIADO") {
                const previousStatus = cell(necessitiesTable, necessityRow, "Status");
                setCell(necessitiesTable, necessityRow, "Status", "EM_COTACAO");
                setCell(necessitiesTable, necessityRow, "version", Number(cell(necessitiesTable, necessityRow, "version") || 1) + 1);
                setCell(necessitiesTable, necessityRow, "updated_at", now);
                setCell(necessitiesTable, necessityRow, "updated_by", user.id);
                necessityRange.setValues([necessityRow]);
                auditEntries.push({ module: "NECESSIDADES", recordId: necessityId, changes: [{ field: "Status", previous: previousStatus, next: "EM_COTACAO" }], reason: `Primeira cotação registrada: ${id}`, action: "ALTERACAO" });
            }
            appendAuditBatch(spreadsheet, user, auditEntries);
            SpreadsheetApp.flush();
        }
        catch (error) {
            quoteRange.clearContent();
            necessityRange.setValues([previousNecessity]);
            SpreadsheetApp.flush();
            throw error;
        }
        return { quote: mapQuote(table, row) };
    });
}
function updateQuote(spreadsheet, user, payload) {
    assertModulePermission(spreadsheet, user, "Cotações", "Editar");
    return withScriptLock(() => {
        const id = requireString(payload.id, "id");
        const expectedVersion = requirePositiveInteger(payload.version, "version");
        const changes = requireChanges(payload.changes, ["supplierId", "origin", "unitPrice", "quantity", "freight", "otherCosts", "paymentMethod", "leadTimeDays", "proposalValidUntil", "link", "status", "quoteDate", "notes"]);
        const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Loja", "ID_Fornecedor", "Status", "Selecionada", "version", "updated_at", "updated_by"]);
        const found = findVersionedRow(table, "ID_Cotação", id, expectedVersion, "Cotação");
        assertStoreScope(user, cell(table, found.current, "ID_Loja"));
        if (isYes(cell(table, found.current, "Selecionada")) || normalizeQuoteStatus(cell(table, found.current, "Status")) === "SELECIONADA") {
            throw new ApiException("LOCKED_RECORD", "A proposta selecionada está bloqueada. Selecione outra proposta antes de editá-la.");
        }
        const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Nota_Fornecedor", "Ativo"]);
        const supplierId = requireString(changes.supplierId, "supplierId");
        const supplier = findRowById(suppliersTable, "ID_Fornecedor", supplierId, "Fornecedor").row;
        if (!isYes(cell(suppliersTable, supplier, "Ativo")))
            throw new ApiException("VALIDATION_ERROR", "O fornecedor selecionado está inativo.");
        const values = validateQuoteValues(changes, readQuoteOptions(spreadsheet));
        const audited = [];
        applyChange(table, found.current, "ID_Fornecedor", supplierId, (value) => value, audited);
        applyQuoteChanges(table, found.current, values, audited);
        applyChange(table, found.current, "Nota_Fornecedor", cell(suppliersTable, supplier, "Nota_Fornecedor"), (value) => value, audited);
        persistUpdatedRow(spreadsheet, table, found.rowIndex, found.current, found.currentVersion, user, "COTACOES", id, audited, String(payload.reason || ""));
        return { quote: mapQuote(table, found.current) };
    });
}
function selectQuote(spreadsheet, user, payload) {
    assertModulePermission(spreadsheet, user, "Cotações", "Editar");
    return withScriptLock(() => {
        var _a;
        const id = requireString(payload.id, "id");
        const expectedVersion = requirePositiveInteger(payload.version, "version");
        const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "Status", "Selecionada", "Validade_Proposta", "version", "updated_at", "updated_by"]);
        const target = findVersionedRow(table, "ID_Cotação", id, expectedVersion, "Cotação");
        assertStoreScope(user, cell(table, target.current, "ID_Loja"));
        if (normalizeQuoteStatus(cell(table, target.current, "Status")) !== "RECEBIDA")
            throw new ApiException("INVALID_STATUS", "Somente propostas com status RECEBIDA podem ser selecionadas.");
        const validUntil = dateCell(table, target.current, "Validade_Proposta");
        if (validUntil && validUntil < formatDateOnly(new Date()))
            throw new ApiException("EXPIRED_QUOTE", "A validade desta proposta expirou.");
        const necessityId = cell(table, target.current, "ID_Necessidade");
        const affected = table.rows
            .map((row, rowIndex) => ({ row: row.slice(), rowIndex }))
            .filter((entry) => cell(table, entry.row, "ID_Necessidade") === necessityId && (cell(table, entry.row, "ID_Cotação") === id || isYes(cell(table, entry.row, "Selecionada"))));
        const writes = [];
        const audits = [];
        const now = new Date();
        affected.forEach((entry) => {
            const quoteId = cell(table, entry.row, "ID_Cotação");
            const selecting = quoteId === id;
            const changes = [];
            applyChange(table, entry.row, "Selecionada", selecting, validateYesNo, changes);
            applyChange(table, entry.row, "Status", selecting ? "Selecionada" : "Recebida", (value) => value, changes);
            if (!changes.length)
                return;
            setCell(table, entry.row, "version", Number(cell(table, entry.row, "version") || 1) + 1);
            setCell(table, entry.row, "updated_at", now);
            setCell(table, entry.row, "updated_by", user.id);
            const range = table.sheet.getRange(table.headerRow + entry.rowIndex + 1, 1, 1, table.headers.length);
            writes.push({ range, previous: range.getValues()[0], next: entry.row });
            audits.push({ module: "COTACOES", recordId: quoteId, changes, reason: String(payload.reason || "Proposta escolhida para futura aprovação."), action: "SELECAO" });
        });
        try {
            writes.forEach((write) => write.range.setValues([write.next]));
            appendAuditBatch(spreadsheet, user, audits);
            SpreadsheetApp.flush();
        }
        catch (error) {
            writes.forEach((write) => write.range.setValues([write.previous]));
            SpreadsheetApp.flush();
            throw error;
        }
        const selectedRow = ((_a = writes.find((write) => cell(table, write.next, "ID_Cotação") === id)) === null || _a === void 0 ? void 0 : _a.next) || target.current;
        return { quote: mapQuote(table, selectedRow) };
    });
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
        assertCanEditNecessity(spreadsheet, user, storeId);
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
            appendAudit(spreadsheet, user, "NECESSIDADES", id, auditedChanges, String(payload.reason || ""));
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
function updateStore(spreadsheet, user, payload) {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const changes = requireChanges(payload.changes, ["name", "city", "state", "capitalUf", "address", "manager", "email", "phone", "status", "notes"]);
    assertModulePermission(spreadsheet, user, "Lojas", "Editar");
    assertStoreScope(user, id);
    return withScriptLock(() => {
        const table = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "version", "updated_at", "updated_by"]);
        const { current, rowIndex, currentVersion } = findVersionedRow(table, "ID_Loja", id, expectedVersion, "Loja");
        const auditedChanges = [];
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
function updateItem(spreadsheet, user, payload) {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const changes = requireChanges(payload.changes, ["operationalCode", "group", "area", "name", "specification", "defaultQuantity", "definitionStatus", "active", "route1", "route2", "route3", "notes"]);
    assertModulePermission(spreadsheet, user, "Itens", "Editar");
    return withScriptLock(() => {
        const table = readTable(spreadsheet, APP_CONFIG.sheets.items, ["ID_Item", "Item", "version", "updated_at", "updated_by"]);
        const { current, rowIndex, currentVersion } = findVersionedRow(table, "ID_Item", id, expectedVersion, "Item");
        const auditedChanges = [];
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
function assertCanEditNecessity(spreadsheet, user, storeId) {
    assertModulePermission(spreadsheet, user, "Necessidades", "Editar");
    assertStoreScope(user, storeId);
}
function assertStoreScope(user, storeId) {
    if (!isStoreAllowed(user, storeId)) {
        throw new ApiException("PERMISSION_DENIED", "Esta loja não está no seu escopo de acesso.");
    }
}
function isStoreAllowed(user, storeId) {
    return user.allowedStoreIds === "TODAS" || user.allowedStoreIds.indexOf(storeId) >= 0;
}
function assertModulePermission(spreadsheet, user, module, action) {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", action]);
    if (!hasModulePermission(table, user, module, action)) {
        throw new ApiException("PERMISSION_DENIED", `Você não possui permissão para ${normalizeText(action)} em ${module}.`);
    }
}
function hasModulePermission(table, user, module, action) {
    const row = table.rows.find((candidate) => normalizeProfile(cell(table, candidate, "Perfil")) === user.profile && normalizeHeader(cell(table, candidate, "Módulo")) === normalizeHeader(module));
    return Boolean(row && isYes(cell(table, row, action)));
}
function appendAudit(spreadsheet, user, module, recordId, changes, reason) {
    appendAuditBatch(spreadsheet, user, [{ module, recordId, changes, reason }]);
}
function appendAuditBatch(spreadsheet, user, entries) {
    const validEntries = entries.filter((entry) => entry.changes.length > 0);
    if (!validEntries.length)
        return;
    const table = readTable(spreadsheet, APP_CONFIG.sheets.history, ["ID_Histórico", "Data_Hora", "ID_Usuário", "Módulo", "ID_Registro", "Ação", "Campo", "Valor_Anterior", "Valor_Novo"]);
    const idColumn = columnIndex(table, "ID_Histórico");
    let nextNumber = table.rows.reduce((highest, row) => {
        const match = String(row[idColumn] || "").match(/HIS-(\d+)/);
        return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    const output = validEntries.flatMap((entry) => entry.changes.map((change) => {
        const row = Array(table.headers.length).fill("");
        setCell(table, row, "ID_Histórico", `HIS-${String(nextNumber++).padStart(6, "0")}`);
        setCell(table, row, "Data_Hora", new Date());
        setCell(table, row, "ID_Usuário", user.id);
        setCell(table, row, "Módulo", entry.module);
        setCell(table, row, "ID_Registro", entry.recordId);
        setCell(table, row, "Ação", entry.action || "ALTERACAO");
        setCell(table, row, "Campo", change.field);
        setCell(table, row, "Valor_Anterior", change.previous);
        setCell(table, row, "Valor_Novo", change.next);
        setCell(table, row, "Origem", "SISTEMA_WEB");
        setCell(table, row, "Referência", user.email);
        setCell(table, row, "Observações", entry.reason);
        return row;
    }));
    table.sheet.getRange(table.sheet.getLastRow() + 1, 1, output.length, table.headers.length).setValues(output);
}
function withScriptLock(callback) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000))
        throw new ApiException("CONCURRENT_REQUEST", "Outro usuário está atualizando a planilha. Tente novamente.");
    try {
        return callback();
    }
    finally {
        lock.releaseLock();
    }
}
function requireChanges(value, allowedKeys) {
    if (!isRecord(value))
        throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração foi informada.");
    const invalidKey = Object.keys(value).find((key) => allowedKeys.indexOf(key) < 0);
    if (invalidKey)
        throw new ApiException("VALIDATION_ERROR", `Campo não permitido: ${invalidKey}`);
    return value;
}
function findVersionedRow(table, idHeader, id, expectedVersion, entityLabel) {
    const idColumn = columnIndex(table, idHeader);
    const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === id);
    if (rowIndex < 0)
        throw new ApiException("NOT_FOUND", `${entityLabel} não encontrado(a).`);
    const current = table.rows[rowIndex].slice();
    const currentVersion = Number(current[columnIndex(table, "version")] || 1);
    if (currentVersion !== expectedVersion) {
        throw new ApiException("VERSION_CONFLICT", "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar novamente.", { currentVersion });
    }
    return { current, rowIndex, currentVersion };
}
function persistUpdatedRow(spreadsheet, table, rowIndex, current, currentVersion, user, module, recordId, auditedChanges, reason) {
    if (!auditedChanges.length)
        throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");
    current[columnIndex(table, "version")] = currentVersion + 1;
    current[columnIndex(table, "updated_at")] = new Date();
    current[columnIndex(table, "updated_by")] = user.id;
    const range = table.sheet.getRange(table.headerRow + rowIndex + 1, 1, 1, table.headers.length);
    const previousRow = range.getValues()[0];
    try {
        range.setValues([current]);
        appendAudit(spreadsheet, user, module, recordId, auditedChanges, reason);
        SpreadsheetApp.flush();
    }
    catch (error) {
        range.setValues([previousRow]);
        SpreadsheetApp.flush();
        throw error;
    }
}
function appendCreatedRow(spreadsheet, table, row, user, audit) {
    const range = table.sheet.getRange(table.sheet.getLastRow() + 1, 1, 1, table.headers.length);
    try {
        range.setValues([row]);
        appendAuditBatch(spreadsheet, user, [audit]);
        SpreadsheetApp.flush();
    }
    catch (error) {
        range.clearContent();
        SpreadsheetApp.flush();
        throw error;
    }
}
function setTechnicalCreationFields(table, row, user, now) {
    setCell(table, row, "created_at", now);
    setCell(table, row, "created_by", user.id);
    setCell(table, row, "updated_at", now);
    setCell(table, row, "updated_by", user.id);
    setCell(table, row, "version", 1);
}
function nextInternalId(table, idHeader, prefix, width) {
    const idColumn = columnIndex(table, idHeader);
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    const next = table.rows.reduce((highest, row) => {
        const match = String(row[idColumn] || "").trim().match(pattern);
        return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    return `${prefix}-${String(next).padStart(width, "0")}`;
}
function findRowById(table, idHeader, id, entityLabel) {
    const idColumn = columnIndex(table, idHeader);
    const rowIndex = table.rows.findIndex((row) => String(row[idColumn] || "").trim() === id);
    if (rowIndex < 0)
        throw new ApiException("NOT_FOUND", `${entityLabel} não encontrado(a).`);
    return { row: table.rows[rowIndex], rowIndex };
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
    return { id, code: cell(table, row, "Código") || id, name: cell(table, row, "Loja") || cell(table, row, "Nome"), city: cell(table, row, "Cidade"), state: cell(table, row, "UF"), region: cell(table, row, "Região") || cell(table, row, "Capital_UF"), manager: cell(table, row, "Responsável"), email: cell(table, row, "E-mail"), phone: cell(table, row, "Telefone"), status: cell(table, row, "Status"), address: cell(table, row, "Endereço"), notes: cell(table, row, "Observações"), version: Number(cell(table, row, "version") || 1) };
}
function mapItem(table, row) {
    return { id: cell(table, row, "ID_Item"), operationalCode: cell(table, row, "Código_Original"), group: cell(table, row, "Grupo"), area: cell(table, row, "Área"), name: cell(table, row, "Item"), specification: cell(table, row, "Especificação"), defaultQuantity: Number(cell(table, row, "Qtd_Padrão_Loja") || 1), definitionStatus: normalizeText(cell(table, row, "Status_Especificação")).indexOf("pendente") >= 0 ? "PENDENTE_DEFINICAO" : "LIBERADO_PARA_COTACAO", duplicateOperationalCode: isYes(cell(table, row, "Código_Duplicado")), active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")), route1: cell(table, row, "Rota_1"), route2: cell(table, row, "Rota_2"), route3: cell(table, row, "Rota_3"), notes: cell(table, row, "Observações"), version: Number(cell(table, row, "version") || 1) };
}
function mapNecessity(table, row) {
    return { id: cell(table, row, "ID_Necessidade"), storeId: cell(table, row, "ID_Loja"), itemId: cell(table, row, "ID_Item"), quantity: Number(cell(table, row, "Qtd_Planejada") || 1), priority: normalizePriority(cell(table, row, "Prioridade")), status: normalizeStatus(cell(table, row, "Status")), version: Number(cell(table, row, "version") || 1) };
}
function mapSupplier(table, row) {
    const ratingValue = cell(table, row, "Nota_Fornecedor");
    return {
        id: cell(table, row, "ID_Fornecedor"),
        name: cell(table, row, "Fornecedor"),
        taxId: cell(table, row, "CNPJ_CPF"),
        city: cell(table, row, "Cidade"),
        state: cell(table, row, "UF"),
        contact: cell(table, row, "Contato"),
        phone: cell(table, row, "Telefone"),
        email: cell(table, row, "E-mail"),
        rating: ratingValue === "" ? null : Number(ratingValue),
        active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")),
        lastPurchase: dateCell(table, row, "Última_Compra"),
        notes: cell(table, row, "Observações"),
        website: cell(table, row, "Link_Site"),
        version: Number(cell(table, row, "version") || 1),
    };
}
function mapQuote(table, row) {
    const ratingValue = cell(table, row, "Nota_Fornecedor");
    return {
        id: cell(table, row, "ID_Cotação"),
        necessityId: cell(table, row, "ID_Necessidade"),
        storeId: cell(table, row, "ID_Loja"),
        itemId: cell(table, row, "ID_Item"),
        supplierId: cell(table, row, "ID_Fornecedor"),
        origin: cell(table, row, "Origem_Cotação"),
        unitPrice: Number(cell(table, row, "Preço_Unitário") || 0),
        quantity: Number(cell(table, row, "Quantidade") || 0),
        freight: Number(cell(table, row, "Frete") || 0),
        otherCosts: Number(cell(table, row, "Outros_Custos") || 0),
        total: Number(cell(table, row, "Valor_Total") || 0),
        paymentMethod: cell(table, row, "Forma_Pagamento"),
        leadTimeDays: Number(cell(table, row, "Prazo_Dias") || 0),
        proposalValidUntil: dateCell(table, row, "Validade_Proposta"),
        link: cell(table, row, "Link"),
        supplierRating: ratingValue === "" ? null : Number(ratingValue),
        status: normalizeQuoteStatus(cell(table, row, "Status")),
        selected: isYes(cell(table, row, "Selecionada")),
        quoteDate: dateCell(table, row, "Data_Cotação"),
        responsible: cell(table, row, "Responsável"),
        notes: cell(table, row, "Observações"),
        version: Number(cell(table, row, "version") || 1),
        active: !cell(table, row, "ativo") || isYes(cell(table, row, "ativo")),
    };
}
function mapPurchaseRoute(table, row) {
    return {
        id: cell(table, row, "ID_Rota"),
        itemId: cell(table, row, "ID_Item"),
        order: Number(cell(table, row, "Ordem") || 0),
        originDestination: cell(table, row, "Origem_Destino"),
        active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")),
        notes: cell(table, row, "Observações"),
    };
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
function dateCell(table, row, header) { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index < 0 || !row[index])
    return ""; const value = row[index]; return value instanceof Date ? formatDateOnly(value) : String(value).trim().slice(0, 10); }
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
function validateNonNegativeNumber(value, field = "valor") { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0)
    throw new ApiException("VALIDATION_ERROR", `${field} não pode ser negativo.`); return Math.round((parsed + Number.EPSILON) * 100) / 100; }
function validateNonNegativeInteger(value, field) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0)
    throw new ApiException("VALIDATION_ERROR", `${field} deve ser inteiro igual ou maior que zero.`); return parsed; }
function validateRequiredText(value) { const result = requireString(value, "valor"); if (result.length > 500)
    throw new ApiException("VALIDATION_ERROR", "Texto obrigatório muito longo."); return result; }
function validateShortText(value) { if (typeof value !== "string" || value.length > 500)
    throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateUf(value) { const result = validateShortText(value).toLocaleUpperCase(); if (result && !/^[A-Z]{2}$/.test(result))
    throw new ApiException("VALIDATION_ERROR", "UF deve conter duas letras."); return result; }
function validateOptionalEmail(value) { const result = validateShortText(value).toLocaleLowerCase(); if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new ApiException("VALIDATION_ERROR", "E-mail inválido."); return result; }
function validateDefinitionStatus(value) { const status = requireString(value, "definitionStatus"); if (status === "PENDENTE_DEFINICAO")
    return "Pendente definição"; if (status === "LIBERADO_PARA_COTACAO")
    return "Liberado para cotação"; throw new ApiException("VALIDATION_ERROR", "Status de especificação inválido."); }
function validateYesNo(value) { if (typeof value !== "boolean")
    throw new ApiException("VALIDATION_ERROR", "Ativo deve ser verdadeiro ou falso."); return value ? "Sim" : "Não"; }
function validatePriority(value) { const result = requireString(value, "priority").toLocaleUpperCase(); if (["BAIXA", "MEDIA", "ALTA", "CRITICA"].indexOf(normalizeText(result).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase()) < 0)
    throw new ApiException("VALIDATION_ERROR", "Prioridade inválida."); return result; }
function validateText(value) { if (typeof value !== "string" || value.length > 2000)
    throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateStatus(value) { const status = requireString(value, "status").toLocaleUpperCase(); if (!(status in STATUS_TRANSITIONS))
    throw new ApiException("VALIDATION_ERROR", "Status inválido."); return status; }
function validateTaxId(value) { const result = validateShortText(value); const digits = onlyDigits(result); if (result && [11, 14].indexOf(digits.length) < 0)
    throw new ApiException("VALIDATION_ERROR", "CNPJ/CPF deve conter 11 ou 14 dígitos."); return result; }
function validateOptionalRating(value) { if (value === null || value === undefined || value === "")
    return ""; const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5)
    throw new ApiException("VALIDATION_ERROR", "Nota do fornecedor deve estar entre 0 e 5."); return parsed; }
function validateOptionalUrl(value) { const result = validateShortText(value); if (result && !/^https?:\/\//i.test(result))
    throw new ApiException("VALIDATION_ERROR", "Informe uma URL iniciada por http:// ou https://."); return result; }
function validateDateOnly(value, field, required = false) { if ((value === "" || value === null || value === undefined) && !required)
    return ""; const result = requireString(value, field); if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(new Date(`${result}T12:00:00Z`).getTime()))
    throw new ApiException("VALIDATION_ERROR", `${field} deve usar uma data válida.`); return result; }
function onlyDigits(value) { return value.replace(/\D/g, ""); }
function formatDateOnly(value) { return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd"); }
function readQuoteOptions(spreadsheet) {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.lists, ["Status Cotação", "Origem Cotação", "Forma Pagamento"]);
    const values = (header) => table.rows.map((row) => cell(table, row, header).trim()).filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
    return {
        statuses: values("Status Cotação")
            .filter((status) => ["rascunho", "emandamento", "recebida"].indexOf(normalizeHeader(status)) >= 0)
            .map(normalizeQuoteStatus),
        origins: values("Origem Cotação"),
        paymentMethods: values("Forma Pagamento"),
    };
}
function validateListedValue(value, options, field) {
    const result = validateRequiredText(value);
    const match = options.find((option) => normalizeText(option) === normalizeText(result));
    if (!match)
        throw new ApiException("VALIDATION_ERROR", `${field} não consta na aba 14_LISTAS.`);
    return match;
}
function validateQuoteValues(payload, options) {
    const quantity = validatePositiveNumber(payload.quantity);
    const unitPrice = validateNonNegativeNumber(payload.unitPrice, "Preço unitário");
    const freight = validateNonNegativeNumber(payload.freight, "Frete");
    const otherCosts = validateNonNegativeNumber(payload.otherCosts, "Outros custos");
    const quoteDate = validateDateOnly(payload.quoteDate, "Data da cotação", true);
    const proposalValidUntil = validateDateOnly(payload.proposalValidUntil, "Validade da proposta");
    if (proposalValidUntil && proposalValidUntil < quoteDate)
        throw new ApiException("VALIDATION_ERROR", "A validade da proposta não pode ser anterior à data da cotação.");
    return {
        supplierId: requireString(payload.supplierId, "supplierId"),
        origin: options ? validateListedValue(payload.origin, options.origins, "Origem da cotação") : validateRequiredText(payload.origin),
        unitPrice,
        quantity,
        freight,
        otherCosts,
        total: Math.round((quantity * unitPrice + freight + otherCosts + Number.EPSILON) * 100) / 100,
        paymentMethod: options ? validateListedValue(payload.paymentMethod, options.paymentMethods, "Forma de pagamento") : validateRequiredText(payload.paymentMethod),
        leadTimeDays: validateNonNegativeInteger(payload.leadTimeDays, "Prazo em dias"),
        proposalValidUntil,
        link: validateOptionalUrl(payload.link),
        status: (() => {
            const status = validateEditableQuoteStatus(payload.status);
            if (options && options.statuses.indexOf(status) < 0)
                throw new ApiException("VALIDATION_ERROR", "Status de cotação não consta na aba 14_LISTAS.");
            return status;
        })(),
        quoteDate,
        notes: validateText(payload.notes),
    };
}
function writeQuoteValues(table, row, values) {
    setCell(table, row, "Origem_Cotação", values.origin);
    setCell(table, row, "Preço_Unitário", values.unitPrice);
    setCell(table, row, "Quantidade", values.quantity);
    setCell(table, row, "Frete", values.freight);
    setCell(table, row, "Outros_Custos", values.otherCosts);
    setCell(table, row, "Valor_Total", values.total);
    setCell(table, row, "Forma_Pagamento", values.paymentMethod);
    setCell(table, row, "Prazo_Dias", values.leadTimeDays);
    setCell(table, row, "Validade_Proposta", values.proposalValidUntil);
    setCell(table, row, "Link", values.link);
    setCell(table, row, "Status", quoteStatusToSheet(values.status));
    setCell(table, row, "Data_Cotação", values.quoteDate);
    setCell(table, row, "Observações", values.notes);
}
function applyQuoteChanges(table, row, values, audit) {
    applyChange(table, row, "Origem_Cotação", values.origin, (value) => value, audit);
    applyChange(table, row, "Preço_Unitário", values.unitPrice, (value) => value, audit);
    applyChange(table, row, "Quantidade", values.quantity, (value) => value, audit);
    applyChange(table, row, "Frete", values.freight, (value) => value, audit);
    applyChange(table, row, "Outros_Custos", values.otherCosts, (value) => value, audit);
    applyChange(table, row, "Valor_Total", values.total, (value) => value, audit);
    applyChange(table, row, "Forma_Pagamento", values.paymentMethod, (value) => value, audit);
    applyChange(table, row, "Prazo_Dias", values.leadTimeDays, (value) => value, audit);
    applyChange(table, row, "Validade_Proposta", values.proposalValidUntil, (value) => value, audit);
    applyChange(table, row, "Link", values.link, (value) => value, audit);
    applyChange(table, row, "Status", quoteStatusToSheet(values.status), (value) => value, audit);
    applyChange(table, row, "Data_Cotação", values.quoteDate, (value) => value, audit);
    applyChange(table, row, "Observações", values.notes, (value) => value, audit);
}
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
function normalizeQuoteStatus(value) { const key = normalizeHeader(value); const aliases = { rascunho: "RASCUNHO", emandamento: "EM_ANDAMENTO", recebida: "RECEBIDA", selecionada: "SELECIONADA", descartada: "DESCARTADA", expirada: "EXPIRADA" }; return aliases[key] || "RASCUNHO"; }
function validateEditableQuoteStatus(value) { const raw = requireString(value, "status"); const key = normalizeHeader(raw); if (["rascunho", "emandamento", "recebida"].indexOf(key) < 0)
    throw new ApiException("VALIDATION_ERROR", "Status de cotação inválido para edição."); return normalizeQuoteStatus(raw); }
function quoteStatusToSheet(status) { const labels = { RASCUNHO: "Rascunho", EM_ANDAMENTO: "Em andamento", RECEBIDA: "Recebida", SELECIONADA: "Selecionada", DESCARTADA: "Descartada", EXPIRADA: "Expirada" }; return labels[status] || "Rascunho"; }
function normalizePriority(value) { const key = normalizeHeader(value); const aliases = { baixa: "BAIXA", media: "MEDIA", alta: "ALTA", critica: "CRITICA" }; return aliases[key] || "MEDIA"; }
function normalizeProfile(value) { const key = normalizeHeader(value); const aliases = { administrador: "ADMINISTRADOR", gestoraprovador: "GESTOR", gestor: "GESTOR", compras: "COMPRAS", responsavelloja: "RESPONSAVEL_LOJA", consulta: "CONSULTA" }; return aliases[key] || "CONSULTA"; }
function assertStatusTransition(previous, next) { const from = normalizeStatus(previous); const to = normalizeStatus(next); if ((STATUS_TRANSITIONS[from] || []).indexOf(to) < 0)
    throw new ApiException("INVALID_STATUS_TRANSITION", `Transição inválida: ${from} → ${to}`); }
function buildTechnicalStatus(spreadsheet) {
    const tables = APP_CONFIG.setupTables.map(({ sheet, keyHeader }) => inspectTechnicalTable(spreadsheet, sheet, keyHeader));
    return {
        ready: tables.every((table) => table.ok && table.missing.length === 0),
        checkedAt: new Date().toISOString(),
        tables,
    };
}
function inspectTechnicalTable(spreadsheet, sheetName, keyHeader) {
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
function diagnoseSpreadsheet() {
    return buildTechnicalStatus(openConfiguredSpreadsheet());
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
