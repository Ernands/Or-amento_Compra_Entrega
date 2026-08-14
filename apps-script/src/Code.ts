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
  rowNumbers: number[];
}

interface TechnicalTableStatus {
  sheet: string;
  ok: boolean;
  headerRow: number | null;
  missing: string[];
  error?: string;
}

interface AuditEntry {
  module: string;
  recordId: string;
  changes: Array<{ field: string; previous: unknown; next: unknown }>;
  reason: string;
  action?: string;
  origin?: string;
  reference?: string;
}

interface QuoteProposalMigrationReportV1 {
  migration: "QUOTE_PROPOSALS_V1";
  checked_at: string;
  already_migrated: boolean;
  current_quotes: number;
  proposals_to_create: number;
  links_to_create: number;
  duplicate_ids: Array<Record<string, unknown>>;
  orphan_records: Array<Record<string, unknown>>;
  invalid_values_totals: Array<Record<string, unknown>>;
  missing_necessities: Array<Record<string, unknown>>;
  missing_suppliers: Array<Record<string, unknown>>;
  incompatible_statuses: Array<Record<string, unknown>>;
  structural_issues: Array<Record<string, unknown>>;
  ready_to_migrate: boolean;
}

interface LegacyQuoteMigrationRecordV1 {
  quoteId: string;
  proposalId: string;
  necessityId: string;
  storeId: string;
  itemId: string;
  supplierId: string;
  origin: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  freight: number;
  otherCosts: number;
  total: number;
  paymentMethod: string;
  leadTimeDays: number;
  proposalValidUntil: unknown;
  link: string;
  supplierRating: unknown;
  status: string;
  selected: string;
  quoteDate: unknown;
  responsible: string;
  notes: string;
  createdAt: unknown;
  createdBy: string;
  updatedAt: unknown;
  updatedBy: string;
  version: number;
  active: string;
}

interface QuoteProposalMigrationPlanV1 {
  report: QuoteProposalMigrationReportV1;
  records: LegacyQuoteMigrationRecordV1[];
}

interface GroupedQuoteScopeLineV1 {
  necessityId: string;
  storeId: string;
  itemId: string;
  quantity: number;
  necessityRow: unknown[];
  necessityRowIndex: number;
}

interface AtomicSheetWriteV1 {
  range: GoogleAppsScript.Spreadsheet.Range;
  previous: unknown[][];
  next: unknown[][];
}

interface QuoteValidatedValues {
  supplierId: string;
  origin: string;
  unitPrice: number;
  quantity: number;
  freight: number;
  otherCosts: number;
  total: number;
  paymentMethod: string;
  leadTimeDays: number;
  proposalValidUntil: string;
  link: string;
  status: string;
  quoteDate: string;
  notes: string;
}

interface QuoteOptionValues {
  statuses: string[];
  origins: string[];
  paymentMethods: string[];
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
    suppliers: "04_FORNECEDORES",
    quotes: "05_COTACOES",
    users: "09_USUARIOS",
    permissions: "10_PERMISSOES",
    history: "12_HISTORICO",
    routes: "15_ROTAS_COMPRA",
    quoteProposals: "16_PROPOSTAS_COTACAO",
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
    const action = request.action || "";
    if (isPublicReadAction(action)) {
      assertPublicReadAccessEnabled();
      const spreadsheet = openConfiguredSpreadsheet();
      const data = dispatchPublicReadAction(action, spreadsheet);
      return jsonOutput({ ok: true, data, requestId });
    }
    const claims = verifyGoogleCredential(requireGoogleCredential(request.credential));
    const spreadsheet = openConfiguredSpreadsheet();
    const user = findAuthorizedUser(spreadsheet, claims);
    const data = dispatchAuthenticatedAction(action, request.payload || {}, spreadsheet, user);
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

function isPublicReadAction(action: string): boolean {
  return ["publicBootstrap", "publicQuotesWorkspace"].indexOf(action) >= 0;
}

function dispatchPublicReadAction(action: string, spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): unknown {
  switch (action) {
    case "publicBootstrap":
      return buildPublicBootstrap(spreadsheet);
    case "publicQuotesWorkspace":
      return buildPublicQuotesWorkspace(spreadsheet);
    default:
      throw new ApiException("UNKNOWN_PUBLIC_ACTION", "Ação pública não foi reconhecida.");
  }
}

function dispatchAuthenticatedAction(action: string, payload: Record<string, unknown>, spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
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
    case "updateQuote":
    case "deleteQuote":
    case "selectQuote":
      throw new ApiException("CLIENT_UPDATE_REQUIRED", "Atualize o frontend para usar o fluxo de propostas agrupadas.");
    case "createQuoteProposal":
      return createQuoteProposal(spreadsheet, user, payload);
    case "updateQuoteProposal":
      return updateQuoteProposal(spreadsheet, user, payload);
    case "reopenQuoteProposal":
      return reopenQuoteProposal(spreadsheet, user, payload);
    case "deleteQuoteProposal":
      return deleteQuoteProposal(spreadsheet, user, payload);
    case "selectQuoteProposal":
      return selectQuoteProposal(spreadsheet, user, payload);
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

function buildPublicBootstrap(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): unknown {
  const storesTable = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status"]);
  const itemsTable = readTable(spreadsheet, APP_CONFIG.sheets.items, ["ID_Item", "Código_Original", "Item", "Status_Especificação"]);
  const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status"]);
  const quotesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ativo"]);
  const necessities = necessitiesTable.rows.map((row) => ({
    id: cell(necessitiesTable, row, "ID_Necessidade"),
    storeId: cell(necessitiesTable, row, "ID_Loja"),
    itemId: cell(necessitiesTable, row, "ID_Item"),
    quantity: Number(cell(necessitiesTable, row, "Qtd_Planejada") || 1),
    priority: normalizePriority(cell(necessitiesTable, row, "Prioridade")),
    status: normalizeStatus(cell(necessitiesTable, row, "Status")),
  }));
  const activeQuoteNecessityIds = Object.keys(Object.fromEntries(quotesTable.rows
    .filter((row) => isActiveQuoteRow(quotesTable, row))
    .map((row) => [cell(quotesTable, row, "ID_Necessidade"), true]))).filter(Boolean);
  return {
    source: {
      kind: "public",
      status: "connected",
      readOnly: true,
      checkedAt: new Date().toISOString(),
      message: "Modo visitante com dados operacionais ao vivo e acesso estritamente somente leitura.",
    },
    stores: storesTable.rows.map((row) => ({
      id: cell(storesTable, row, "ID_Loja"),
      name: cell(storesTable, row, "Loja") || cell(storesTable, row, "Nome"),
      city: cell(storesTable, row, "Cidade"),
      state: cell(storesTable, row, "UF"),
      status: cell(storesTable, row, "Status"),
    })),
    items: itemsTable.rows.map((row) => ({
      id: cell(itemsTable, row, "ID_Item"),
      operationalCode: cell(itemsTable, row, "Código_Original"),
      group: cell(itemsTable, row, "Grupo"),
      area: cell(itemsTable, row, "Área"),
      name: cell(itemsTable, row, "Item"),
      definitionStatus: normalizeText(cell(itemsTable, row, "Status_Especificação")).indexOf("pendente") >= 0 ? "PENDENTE_DEFINICAO" : "LIBERADO_PARA_COTACAO",
      duplicateOperationalCode: isYes(cell(itemsTable, row, "Código_Duplicado")),
    })),
    necessities,
    activeQuoteNecessityIds,
  };
}

function buildPublicQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): unknown {
  return quoteSchemaMode(spreadsheet) === "GROUPED"
    ? buildGroupedPublicQuotesWorkspace(spreadsheet)
    : buildLegacyPublicQuotesWorkspace(spreadsheet);
}

function buildLegacyPublicQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): unknown {
  const quotesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Quantidade", "Valor_Total", "Prazo_Dias", "Status", "ativo"]);
  const activeRows = quotesTable.rows
    .filter((row) => isActiveQuoteRow(quotesTable, row))
    .slice()
    .sort((left, right) => cell(quotesTable, left, "ID_Cotação").localeCompare(cell(quotesTable, right, "ID_Cotação")));
  const supplierIds = Array.from(new Set(activeRows.map((row) => cell(quotesTable, row, "ID_Fornecedor")).filter(Boolean))).sort();
  const publicSupplierIds = Object.fromEntries(supplierIds.map((id, index) => [id, `PUB-FOR-${String(index + 1).padStart(3, "0")}`]));
  return {
    suppliers: supplierIds.map((id, index) => ({ id: publicSupplierIds[id], name: `Fornecedor ${String(index + 1).padStart(2, "0")}` })),
    quotes: activeRows.map((row, index) => {
      const id = `PUB-COT-${String(index + 1).padStart(6, "0")}`;
      const necessityId = cell(quotesTable, row, "ID_Necessidade");
      const storeId = cell(quotesTable, row, "ID_Loja");
      const itemId = cell(quotesTable, row, "ID_Item");
      const quantity = Number(cell(quotesTable, row, "Quantidade") || 0);
      return {
        id,
        itemId,
        supplierId: publicSupplierIds[cell(quotesTable, row, "ID_Fornecedor")],
        lines: [{ id: `PUB-LIN-${String(index + 1).padStart(6, "0")}`, proposalId: id, necessityId, storeId, itemId, quantity }],
        necessityIds: [necessityId],
        storeIds: [storeId],
        scopeSignature: quoteScopeSignatureV1([{ necessityId, itemId, quantity }]),
        quantityTotal: quantity,
        total: Number(cell(quotesTable, row, "Valor_Total") || 0),
        leadTimeDays: Number(cell(quotesTable, row, "Prazo_Dias") || 0),
        status: normalizeQuoteStatus(cell(quotesTable, row, "Status")),
        selected: isYes(cell(quotesTable, row, "Selecionada")),
      };
    }),
    schemaMode: "LEGACY",
    checkedAt: new Date().toISOString(),
  };
}

function buildBootstrap(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  const storesTable = readTable(spreadsheet, APP_CONFIG.sheets.stores, ["ID_Loja", "Loja", "Status"]);
  const itemsTable = readTable(spreadsheet, APP_CONFIG.sheets.items, ["ID_Item", "Código_Original", "Item", "Status_Especificação"]);
  const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status"]);
  const quotesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ativo"]);

  const allStores = storesTable.rows.map((row) => mapStore(storesTable, row));
  const stores = user.allowedStoreIds === "TODAS" ? allStores : allStores.filter((store) => user.allowedStoreIds.indexOf(store.id) >= 0);
  const allowedStoreIds = Object.fromEntries(stores.map((store) => [store.id, true]));
  const necessities = necessitiesTable.rows
    .map((row) => mapNecessity(necessitiesTable, row))
    .filter((need) => Boolean(allowedStoreIds[need.storeId]));
  const referencedItems = Object.fromEntries(necessities.map((need) => [need.itemId, true]));
  const items = itemsTable.rows.map((row) => mapItem(itemsTable, row)).filter((item) => Boolean(referencedItems[item.id]));
  const activeQuoteNecessityIds = Object.keys(Object.fromEntries(quotesTable.rows
    .filter((row) => isStoreAllowed(user, cell(quotesTable, row, "ID_Loja")) && isActiveQuoteRow(quotesTable, row))
    .map((row) => [cell(quotesTable, row, "ID_Necessidade"), true]))).filter(Boolean);

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
    activeQuoteNecessityIds,
  };
}

function buildQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  return quoteSchemaMode(spreadsheet) === "GROUPED"
    ? buildGroupedQuotesWorkspace(spreadsheet, user)
    : buildLegacyQuotesWorkspace(spreadsheet, user);
}

function buildLegacyQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Visualizar");
  const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "Ativo", "version"]);
  const quotesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Valor_Total", "Status", "version", "ativo"]);
  const routesTable = readTable(spreadsheet, APP_CONFIG.sheets.routes, ["ID_Rota", "ID_Item", "Ordem", "Origem_Destino", "Ativo"]);
  const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item"]);
  const permissionTable = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Excluir"]);
  const options = readQuoteOptions(spreadsheet);
  const allowedNeeds = necessitiesTable.rows.filter((row) => isStoreAllowed(user, cell(necessitiesTable, row, "ID_Loja")));
  const allowedItemIds = Object.fromEntries(allowedNeeds.map((row) => [cell(necessitiesTable, row, "ID_Item"), true]));
  return {
    suppliers: suppliersTable.rows.map((row) => mapSupplier(suppliersTable, row)),
    quotes: quotesTable.rows.filter((row) => isStoreAllowed(user, cell(quotesTable, row, "ID_Loja")) && isActiveQuoteRow(quotesTable, row)).map((row) => mapLegacyQuoteProposal(quotesTable, row)),
    routes: routesTable.rows.filter((row) => Boolean(allowedItemIds[cell(routesTable, row, "ID_Item")])).map((row) => mapPurchaseRoute(routesTable, row)),
    options,
    permissions: {
      view: hasModulePermission(permissionTable, user, "Cotações", "Visualizar"),
      create: false,
      edit: false,
      delete: false,
      select: false,
      createSupplier: false,
    },
    schemaMode: "LEGACY",
    checkedAt: new Date().toISOString(),
  };
}

function quoteSchemaMode(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): "LEGACY" | "GROUPED" {
  const quotes = spreadsheet.getSheetByName(APP_CONFIG.sheets.quotes);
  if (!quotes) throw new ApiException("STRUCTURE_ERROR", "Aba 05_COTACOES não encontrada.");
  const hasProposalId = inspectMigrationHeadersV1(quotes, "ID_Cotação").normalizedHeaders.indexOf(normalizeHeader("ID_Proposta")) >= 0;
  const hasProposalSheet = Boolean(spreadsheet.getSheetByName(APP_CONFIG.sheets.quoteProposals));
  if (hasProposalId !== hasProposalSheet) {
    throw new ApiException("MIGRATION_PARTIAL", "Estrutura parcial detectada. ID_Proposta e 16_PROPOSTAS_COTACAO devem existir juntos.");
  }
  return hasProposalId ? "GROUPED" : "LEGACY";
}

function assertGroupedQuoteSchemaV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  if (quoteSchemaMode(spreadsheet) !== "GROUPED") {
    throw new ApiException(
      "QUOTE_MIGRATION_REQUIRED",
      "As propostas estão em modo de pré-migração e permanecem somente leitura. Execute a migração manual aprovada antes de gravar.",
    );
  }
}

function rejectLegacyQuoteMutationV1(): never {
  throw new ApiException("CLIENT_UPDATE_REQUIRED", "O fluxo legado de gravação foi desativado. Use as ações de propostas agrupadas.");
}

function buildGroupedQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, user: SystemUser): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Visualizar");
  const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "Ativo", "version"]);
  const proposalsTable = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
  const linesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
  const routesTable = readTable(spreadsheet, APP_CONFIG.sheets.routes, ["ID_Rota", "ID_Item", "Ordem", "Origem_Destino", "Ativo"]);
  const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item"]);
  const permissionTable = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Excluir"]);
  const allowedNeeds = necessitiesTable.rows.filter((row) => isStoreAllowed(user, cell(necessitiesTable, row, "ID_Loja")));
  const allowedItemIds = Object.fromEntries(allowedNeeds.map((row) => [cell(necessitiesTable, row, "ID_Item"), true]));
  const activeLines = linesTable.rows.filter((row) => isActiveQuoteRow(linesTable, row));
  const proposals = proposalsTable.rows.flatMap((row) => {
    if (!isActiveQuoteRow(proposalsTable, row)) return [];
    const proposalId = cell(proposalsTable, row, "ID_Proposta");
    const linked = activeLines.filter((line) => cell(linesTable, line, "ID_Proposta") === proposalId);
    if (!linked.length || !linked.every((line) => isStoreAllowed(user, cell(linesTable, line, "ID_Loja")))) return [];
    return [mapGroupedQuoteProposalV1(proposalsTable, row, linesTable, linked)];
  });
  return {
    suppliers: suppliersTable.rows.map((row) => mapSupplier(suppliersTable, row)),
    quotes: proposals,
    routes: routesTable.rows.filter((row) => Boolean(allowedItemIds[cell(routesTable, row, "ID_Item")])).map((row) => mapPurchaseRoute(routesTable, row)),
    options: readQuoteOptions(spreadsheet),
    permissions: {
      view: hasModulePermission(permissionTable, user, "Cotações", "Visualizar"),
      create: hasModulePermission(permissionTable, user, "Cotações", "Criar"),
      edit: hasModulePermission(permissionTable, user, "Cotações", "Editar"),
      delete: hasModulePermission(permissionTable, user, "Cotações", "Excluir"),
      select: hasModulePermission(permissionTable, user, "Cotações", "Editar"),
      createSupplier: hasModulePermission(permissionTable, user, "Fornecedores", "Criar"),
    },
    schemaMode: "GROUPED",
    checkedAt: new Date().toISOString(),
  };
}

function buildGroupedPublicQuotesWorkspace(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): unknown {
  const proposalsTable = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
  const linesTable = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
  const activeLines = linesTable.rows.filter((row) => isActiveQuoteRow(linesTable, row));
  const source = proposalsTable.rows.flatMap((row) => {
    if (!isActiveQuoteRow(proposalsTable, row)) return [];
    const linked = activeLines.filter((line) => cell(linesTable, line, "ID_Proposta") === cell(proposalsTable, row, "ID_Proposta"));
    return linked.length ? [mapGroupedQuoteProposalV1(proposalsTable, row, linesTable, linked)] : [];
  });
  const supplierIds = Array.from(new Set(source.map((proposal) => proposal.supplierId))).sort();
  const publicSupplierIds = Object.fromEntries(supplierIds.map((id, index) => [id, `PUB-FOR-${String(index + 1).padStart(3, "0")}`]));
  return {
    suppliers: supplierIds.map((id, index) => ({ id: publicSupplierIds[id], name: `Fornecedor ${String(index + 1).padStart(2, "0")}` })),
    quotes: source.map((proposal, proposalIndex) => {
      const id = `PUB-PRP-${String(proposalIndex + 1).padStart(6, "0")}`;
      const lines = proposal.lines.map((line: ReturnType<typeof mapGroupedQuoteLineV1>, lineIndex: number) => ({
        id: `PUB-LIN-${String(proposalIndex + 1).padStart(4, "0")}-${String(lineIndex + 1).padStart(3, "0")}`,
        proposalId: id,
        necessityId: line.necessityId,
        storeId: line.storeId,
        itemId: line.itemId,
        quantity: line.quantity,
      }));
      return {
        id,
        itemId: proposal.itemId,
        supplierId: publicSupplierIds[proposal.supplierId],
        lines,
        necessityIds: proposal.necessityIds,
        storeIds: proposal.storeIds,
        scopeSignature: proposal.scopeSignature,
        quantityTotal: proposal.quantityTotal,
        total: proposal.total,
        leadTimeDays: proposal.leadTimeDays,
        status: proposal.status,
        selected: proposal.selected,
      };
    }),
    schemaMode: "GROUPED",
    checkedAt: new Date().toISOString(),
  };
}

function mapLegacyQuoteProposal(table: SheetTable, row: unknown[]): unknown {
  const legacy = mapQuote(table, row);
  const line = {
    id: legacy.id,
    proposalId: legacy.id,
    necessityId: legacy.necessityId,
    storeId: legacy.storeId,
    itemId: legacy.itemId,
    unitPrice: legacy.unitPrice,
    quantity: legacy.quantity,
    subtotal: roundMoneyV1(legacy.unitPrice * legacy.quantity),
    version: legacy.version,
    active: legacy.active,
  };
  return {
    id: legacy.id,
    itemId: legacy.itemId,
    supplierId: legacy.supplierId,
    lines: [line],
    necessityIds: [legacy.necessityId],
    storeIds: [legacy.storeId],
    scopeSignature: quoteScopeSignatureV1([line]),
    origin: legacy.origin,
    unitPrice: legacy.unitPrice,
    quantityTotal: legacy.quantity,
    subtotalItems: line.subtotal,
    freight: legacy.freight,
    otherCosts: legacy.otherCosts,
    total: legacy.total,
    paymentMethod: legacy.paymentMethod,
    leadTimeDays: legacy.leadTimeDays,
    proposalValidUntil: legacy.proposalValidUntil,
    link: legacy.link,
    supplierRating: legacy.supplierRating,
    status: legacy.status,
    selected: legacy.selected,
    quoteDate: legacy.quoteDate,
    responsible: legacy.responsible,
    notes: legacy.notes,
    version: legacy.version,
    active: legacy.active,
  };
}

function mapGroupedQuoteProposalV1(proposals: SheetTable, row: unknown[], lines: SheetTable, linkedRows: unknown[][]) {
  const mappedLines = linkedRows.map((line) => mapGroupedQuoteLineV1(lines, line));
  const itemIds = Array.from(new Set(mappedLines.map((line) => line.itemId)));
  return {
    id: cell(proposals, row, "ID_Proposta"),
    itemId: itemIds.length === 1 ? itemIds[0] : "",
    supplierId: cell(proposals, row, "ID_Fornecedor"),
    lines: mappedLines,
    necessityIds: mappedLines.map((line) => line.necessityId),
    storeIds: mappedLines.map((line) => line.storeId),
    scopeSignature: quoteScopeSignatureV1(mappedLines),
    origin: cell(proposals, row, "Origem_Cotação"),
    unitPrice: mappedLines[0]?.unitPrice || 0,
    quantityTotal: Number(cell(proposals, row, "Quantidade_Total") || 0),
    subtotalItems: Number(cell(proposals, row, "Subtotal_Itens") || 0),
    freight: Number(cell(proposals, row, "Frete_Total") || 0),
    otherCosts: Number(cell(proposals, row, "Outros_Custos_Total") || 0),
    total: Number(cell(proposals, row, "Valor_Total_Proposta") || 0),
    paymentMethod: cell(proposals, row, "Forma_Pagamento"),
    leadTimeDays: Number(cell(proposals, row, "Prazo_Dias") || 0),
    proposalValidUntil: dateCell(proposals, row, "Validade_Proposta"),
    link: cell(proposals, row, "Link"),
    supplierRating: optionalNumberCellV1(proposals, row, "Nota_Fornecedor"),
    status: normalizeQuoteStatus(cell(proposals, row, "Status")),
    selected: isYes(cell(proposals, row, "Selecionada")),
    quoteDate: dateCell(proposals, row, "Data_Cotação"),
    responsible: cell(proposals, row, "Responsável"),
    notes: cell(proposals, row, "Observações"),
    version: Number(cell(proposals, row, "version") || 1),
    active: isActiveQuoteRow(proposals, row),
  };
}

function mapGroupedQuoteLineV1(table: SheetTable, row: unknown[]) {
  return {
    id: cell(table, row, "ID_Cotação"),
    proposalId: cell(table, row, "ID_Proposta"),
    necessityId: cell(table, row, "ID_Necessidade"),
    storeId: cell(table, row, "ID_Loja"),
    itemId: cell(table, row, "ID_Item"),
    unitPrice: Number(cell(table, row, "Preço_Unitário") || 0),
    quantity: Number(cell(table, row, "Quantidade") || 0),
    subtotal: Number(cell(table, row, "Subtotal_Linha") || 0),
    version: Number(cell(table, row, "version") || 1),
    active: isActiveQuoteRow(table, row),
  };
}

function optionalNumberCellV1(table: SheetTable, row: unknown[], header: string): number | null {
  const value = cell(table, row, header);
  return value === "" ? null : Number(value);
}

function createSupplier(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Fornecedores", "Criar");
  return withScriptLock(() => {
    const table = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "CNPJ_CPF", "Ativo", "created_at", "created_by", "updated_at", "updated_by", "version"]);
    const name = validateRequiredText(payload.name);
    const taxId = validateTaxId(payload.taxId);
    const registeredTaxIds = table.rows.map((row) => cell(table, row, "CNPJ_CPF"));
    if (taxId && hasDuplicateNormalizedTaxId(registeredTaxIds, taxId)) throw new ApiException("DUPLICATE_RECORD", "Já existe um fornecedor com este CNPJ/CPF.");
    const id = nextInternalId(table, "ID_Fornecedor", "FOR", 6);
    assertInternalIdAvailable(table, "ID_Fornecedor", id);
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
    appendCreatedRow(spreadsheet, table, "ID_Fornecedor", row, user, {
      module: "FORNECEDORES",
      recordId: id,
      changes: [{ field: "Fornecedor", previous: "", next: name }],
      reason: "Cadastro realizado pelo módulo Cotações.",
      action: "CRIACAO",
    });
    return { supplier: mapSupplier(table, row) };
  });
}

function createQuoteProposal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Criar");
  return withScriptLock(() => {
    assertGroupedQuoteSchemaV1(spreadsheet);
    const proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    const lines = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    const necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const suppliers = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Nota_Fornecedor", "Ativo"]);
    const scope = resolveGroupedQuoteScopeV1(user, payload.necessityIds, necessities);
    const supplier = requireActiveSupplierV1(suppliers, payload.supplierId);
    const quantityTotal = scope.reduce((sum, line) => sum + line.quantity, 0);
    const values = validateGroupedQuoteValuesV1(payload, readQuoteOptions(spreadsheet), quantityTotal);
    const proposalId = nextInternalId(proposals, "ID_Proposta", "PRP", 6);
    const lineIds = nextInternalIdsV1(lines, "ID_Cotação", "COT", 6, scope.length);
    const now = new Date();
    const proposalRow = Array(proposals.headers.length).fill("");
    writeGroupedProposalRowV1(proposals, proposalRow, proposalId, supplier, suppliers, values, scope, user, now);
    const lineRows = scope.map((scopeLine, index) => buildGroupedLineRowV1(lines, lineIds[index], proposalId, scopeLine, values.unitPrice, user, now));
    const proposalRange = proposals.sheet.getRange(findFirstWritableRow(proposals, "ID_Proposta"), 1, 1, proposals.headers.length);
    const linesRange = lines.sheet.getRange(findFirstWritableRow(lines, "ID_Cotação", lineRows.length), 1, lineRows.length, lines.headers.length);
    const writes: AtomicSheetWriteV1[] = [
      { range: proposalRange, previous: restorableMatrixV1(proposalRange), next: [proposalRow] },
      { range: linesRange, previous: restorableMatrixV1(linesRange), next: lineRows },
    ];
    const audits: AuditEntry[] = [{
      module: "COTACOES_PROPOSTA",
      recordId: proposalId,
      changes: [
        { field: "ID_Fornecedor", previous: "", next: values.supplierId },
        { field: "Assinatura_Escopo", previous: "", next: quoteScopeSignatureV1(scope) },
        { field: "Quantidade_Total", previous: "", next: quantityTotal },
        { field: "Valor_Total_Proposta", previous: "", next: values.total },
        { field: "Status", previous: "", next: values.status },
      ],
      reason: values.notes || "Proposta agrupada criada.",
      action: "CRIACAO",
    }];
    scope.forEach((scopeLine, index) => {
      audits.push({
        module: "COTACOES_VINCULO",
        recordId: lineIds[index],
        changes: [
          { field: "ID_Proposta", previous: "", next: proposalId },
          { field: "ID_Necessidade", previous: "", next: scopeLine.necessityId },
          { field: "Quantidade", previous: "", next: scopeLine.quantity },
          { field: "Subtotal_Linha", previous: "", next: roundMoneyV1(scopeLine.quantity * values.unitPrice) },
        ],
        reason: "Necessidade incluída na proposta agrupada.",
        action: "CRIACAO",
      });
      if (normalizeStatus(cell(necessities, scopeLine.necessityRow, "Status")) === "NAO_INICIADO") {
        appendNecessityStatusWriteV1(necessities, scopeLine, "EM_COTACAO", user, now, writes, audits, `Incluída na proposta ${proposalId}.`);
      }
    });
    performAtomicWritesV1(spreadsheet, user, writes, audits);
    return { quote: mapGroupedQuoteProposalV1(proposals, proposalRow, lines, lineRows) };
  });
}

function updateQuoteProposal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Editar");
  return withScriptLock(() => {
    assertGroupedQuoteSchemaV1(spreadsheet);
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const changes = requireChanges(payload.changes, ["necessityIds", "supplierId", "origin", "unitPrice", "freight", "otherCosts", "paymentMethod", "leadTimeDays", "proposalValidUntil", "link", "status", "quoteDate", "notes"]);
    const proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    const found = findVersionedRow(proposals, "ID_Proposta", id, expectedVersion, "Proposta");
    if (!isActiveQuoteRow(proposals, found.current)) throw new ApiException("LOCKED_RECORD", "A proposta está inativa.");
    const currentStatus = normalizeQuoteStatus(cell(proposals, found.current, "Status"));
    if (currentStatus === "SELECIONADA" || isYes(cell(proposals, found.current, "Selecionada"))) throw new ApiException("LOCKED_RECORD", "A proposta selecionada está bloqueada para alterações.");
    if (currentStatus === "RECEBIDA") throw new ApiException("REOPEN_REQUIRED", "Reabra explicitamente a proposta recebida antes de alterar escopo ou valores.");
    if (["RASCUNHO", "EM_ANDAMENTO"].indexOf(currentStatus) < 0) throw new ApiException("LOCKED_RECORD", "O status atual não permite edição.");

    const lines = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    const currentEntries = lines.rows.map((row, rowIndex) => ({ row, rowIndex }))
      .filter((entry) => isActiveQuoteRow(lines, entry.row) && cell(lines, entry.row, "ID_Proposta") === id);
    assertGroupedProposalScopeAllowedV1(user, lines, currentEntries.map((entry) => entry.row));
    const necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const scope = resolveGroupedQuoteScopeV1(user, changes.necessityIds, necessities);
    const suppliers = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Nota_Fornecedor", "Ativo"]);
    const supplier = requireActiveSupplierV1(suppliers, changes.supplierId);
    const quantityTotal = scope.reduce((sum, line) => sum + line.quantity, 0);
    const values = validateGroupedQuoteValuesV1(changes, readQuoteOptions(spreadsheet), quantityTotal);
    const now = new Date();
    const writes: AtomicSheetWriteV1[] = [];
    const audits: AuditEntry[] = [];
    const headerChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
    const previousScope = quoteScopeSignatureV1(currentEntries.map((entry) => mapGroupedQuoteLineV1(lines, entry.row)));
    const nextScope = quoteScopeSignatureV1(scope);
    applyChange(proposals, found.current, "ID_Fornecedor", values.supplierId, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Origem_Cotação", values.origin, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Quantidade_Total", quantityTotal, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Subtotal_Itens", roundMoneyV1(quantityTotal * values.unitPrice), (value) => value, headerChanges);
    applyChange(proposals, found.current, "Frete_Total", values.freight, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Outros_Custos_Total", values.otherCosts, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Valor_Total_Proposta", values.total, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Forma_Pagamento", values.paymentMethod, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Prazo_Dias", values.leadTimeDays, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Validade_Proposta", values.proposalValidUntil, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Link", values.link, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Nota_Fornecedor", cell(suppliers, supplier, "Nota_Fornecedor"), (value) => value, headerChanges);
    applyChange(proposals, found.current, "Status", quoteStatusToSheet(values.status), (value) => value, headerChanges);
    applyChange(proposals, found.current, "Data_Cotação", values.quoteDate, (value) => value, headerChanges);
    applyChange(proposals, found.current, "Observações", values.notes, (value) => value, headerChanges);
    if (previousScope !== nextScope) headerChanges.push({ field: "Assinatura_Escopo", previous: previousScope, next: nextScope });
    const previousUnitPrice = currentEntries.length ? Number(cell(lines, currentEntries[0].row, "Preço_Unitário") || 0) : 0;
    if (Math.abs(previousUnitPrice - values.unitPrice) > 0.000001) headerChanges.push({ field: "Preço_Unitário", previous: previousUnitPrice, next: values.unitPrice });

    const currentByNeed: Record<string, { row: unknown[]; rowIndex: number }> = {};
    currentEntries.forEach((entry) => {
      const necessityId = cell(lines, entry.row, "ID_Necessidade");
      if (currentByNeed[necessityId]) throw new ApiException("DUPLICATE_RECORD", `A necessidade ${necessityId} está duplicada na proposta ${id}.`);
      currentByNeed[necessityId] = entry;
    });
    const targetNeedIds = Object.fromEntries(scope.map((line) => [line.necessityId, true]));
    const resultingLineRows: unknown[][] = [];
    const addedScope = scope.filter((scopeLine) => !currentByNeed[scopeLine.necessityId]);
    const addedIds = nextInternalIdsV1(lines, "ID_Cotação", "COT", 6, addedScope.length);
    let addedIndex = 0;
    scope.forEach((scopeLine) => {
      const existing = currentByNeed[scopeLine.necessityId];
      if (existing) {
        const next = existing.row.slice();
        const lineChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
        applyChange(lines, next, "Preço_Unitário", values.unitPrice, (value) => value, lineChanges);
        applyChange(lines, next, "Quantidade", scopeLine.quantity, (value) => value, lineChanges);
        applyChange(lines, next, "Subtotal_Linha", roundMoneyV1(scopeLine.quantity * values.unitPrice), (value) => value, lineChanges);
        if (lineChanges.length) {
          setCell(lines, next, "version", Number(cell(lines, next, "version") || 1) + 1);
          setCell(lines, next, "updated_at", now);
          setCell(lines, next, "updated_by", user.id);
          const range = lines.sheet.getRange(physicalRowNumber(lines, existing.rowIndex), 1, 1, lines.headers.length);
          writes.push({ range, previous: restorableMatrixV1(range), next: [next] });
          audits.push({ module: "COTACOES_VINCULO", recordId: cell(lines, next, "ID_Cotação"), changes: lineChanges, reason: String(payload.reason || "Vínculo da proposta atualizado."), action: "ALTERACAO" });
        }
        resultingLineRows.push(next);
      } else {
        const lineId = addedIds[addedIndex++];
        const next = buildGroupedLineRowV1(lines, lineId, id, scopeLine, values.unitPrice, user, now);
        resultingLineRows.push(next);
        audits.push({ module: "COTACOES_VINCULO", recordId: lineId, changes: [{ field: "ID_Necessidade", previous: "", next: scopeLine.necessityId }], reason: "Necessidade adicionada ao escopo da proposta.", action: "CRIACAO" });
        if (normalizeStatus(cell(necessities, scopeLine.necessityRow, "Status")) === "NAO_INICIADO") {
          appendNecessityStatusWriteV1(necessities, scopeLine, "EM_COTACAO", user, now, writes, audits, `Incluída na proposta ${id}.`);
        }
      }
    });
    if (addedScope.length) {
      const firstRow = findFirstWritableRow(lines, "ID_Cotação", addedScope.length);
      const range = lines.sheet.getRange(firstRow, 1, addedScope.length, lines.headers.length);
      const addedRows = resultingLineRows.filter((row) => addedIds.indexOf(cell(lines, row, "ID_Cotação")) >= 0);
      writes.push({ range, previous: restorableMatrixV1(range), next: addedRows });
    }
    currentEntries.filter((entry) => !targetNeedIds[cell(lines, entry.row, "ID_Necessidade")]).forEach((entry) => {
      const next = entry.row.slice();
      const lineId = cell(lines, next, "ID_Cotação");
      const necessityId = cell(lines, next, "ID_Necessidade");
      setCell(lines, next, "ativo", "Não");
      setCell(lines, next, "version", Number(cell(lines, next, "version") || 1) + 1);
      setCell(lines, next, "updated_at", now);
      setCell(lines, next, "updated_by", user.id);
      const range = lines.sheet.getRange(physicalRowNumber(lines, entry.rowIndex), 1, 1, lines.headers.length);
      writes.push({ range, previous: restorableMatrixV1(range), next: [next] });
      audits.push({ module: "COTACOES_VINCULO", recordId: lineId, changes: [{ field: "ativo", previous: cell(lines, entry.row, "ativo"), next: "Não" }], reason: "Necessidade removida do escopo da proposta.", action: "EXCLUSAO" });
      const necessityMatch = findRowById(necessities, "ID_Necessidade", necessityId, "Necessidade");
      if (normalizeStatus(cell(necessities, necessityMatch.row, "Status")) === "EM_COTACAO" && !hasOtherActiveGroupedLineV1(lines, necessityId, id)) {
        appendNecessityStatusWriteV1(necessities, {
          necessityId,
          storeId: cell(necessities, necessityMatch.row, "ID_Loja"),
          itemId: cell(necessities, necessityMatch.row, "ID_Item"),
          quantity: Number(cell(necessities, necessityMatch.row, "Qtd_Planejada")),
          necessityRow: necessityMatch.row,
          necessityRowIndex: necessityMatch.rowIndex,
        }, "NAO_INICIADO", user, now, writes, audits, `Removida da última proposta ativa ${id}.`);
      }
    });
    if (!headerChanges.length && !writes.length) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");
    setCell(proposals, found.current, "version", found.currentVersion + 1);
    setCell(proposals, found.current, "updated_at", now);
    setCell(proposals, found.current, "updated_by", user.id);
    const proposalRange = proposals.sheet.getRange(physicalRowNumber(proposals, found.rowIndex), 1, 1, proposals.headers.length);
    writes.unshift({ range: proposalRange, previous: restorableMatrixV1(proposalRange), next: [found.current] });
    audits.unshift({ module: "COTACOES_PROPOSTA", recordId: id, changes: headerChanges.length ? headerChanges : [{ field: "Vínculos", previous: previousScope, next: nextScope }], reason: String(payload.reason || "Proposta agrupada atualizada."), action: "ALTERACAO" });
    performAtomicWritesV1(spreadsheet, user, writes, audits);
    return { quote: mapGroupedQuoteProposalV1(proposals, found.current, lines, resultingLineRows) };
  });
}

function reopenQuoteProposal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Editar");
  return withScriptLock(() => {
    assertGroupedQuoteSchemaV1(spreadsheet);
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const reason = validateRequiredText(payload.reason);
    const proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    const found = findVersionedRow(proposals, "ID_Proposta", id, expectedVersion, "Proposta");
    if (!isActiveQuoteRow(proposals, found.current)) throw new ApiException("LOCKED_RECORD", "A proposta está inativa.");
    if (normalizeQuoteStatus(cell(proposals, found.current, "Status")) !== "RECEBIDA" || isYes(cell(proposals, found.current, "Selecionada"))) {
      throw new ApiException("INVALID_STATUS", "Somente uma proposta RECEBIDA e não selecionada pode ser reaberta.");
    }
    const lines = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    const linked = lines.rows.filter((row) => isActiveQuoteRow(lines, row) && cell(lines, row, "ID_Proposta") === id);
    assertGroupedProposalScopeAllowedV1(user, lines, linked);
    const necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "Status"]);
    const blockedNeeds = linked.map((line) => cell(lines, line, "ID_Necessidade")).filter((necessityId) => {
      const necessity = findRowById(necessities, "ID_Necessidade", necessityId, "Necessidade").row;
      return normalizeStatus(cell(necessities, necessity, "Status")) !== "EM_COTACAO";
    });
    if (blockedNeeds.length) {
      throw new ApiException("REOPEN_SCOPE_CONFLICT", "A proposta não pode ser reaberta porque parte do escopo já avançou para outra etapa.", { necessityIds: blockedNeeds });
    }
    const previousStatus = cell(proposals, found.current, "Status");
    setCell(proposals, found.current, "Status", quoteStatusToSheet("EM_ANDAMENTO"));
    setCell(proposals, found.current, "Selecionada", "Não");
    setCell(proposals, found.current, "version", found.currentVersion + 1);
    setCell(proposals, found.current, "updated_at", new Date());
    setCell(proposals, found.current, "updated_by", user.id);
    const range = proposals.sheet.getRange(physicalRowNumber(proposals, found.rowIndex), 1, 1, proposals.headers.length);
    performAtomicWritesV1(spreadsheet, user, [{ range, previous: restorableMatrixV1(range), next: [found.current] }], [{
      module: "COTACOES_PROPOSTA", recordId: id, changes: [{ field: "Status", previous: previousStatus, next: "Em andamento" }], reason, action: "REABERTURA",
    }]);
    return { quote: mapGroupedQuoteProposalV1(proposals, found.current, lines, linked) };
  });
}

function deleteQuoteProposal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Excluir");
  return withScriptLock(() => {
    assertGroupedQuoteSchemaV1(spreadsheet);
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    const found = findVersionedRow(proposals, "ID_Proposta", id, expectedVersion, "Proposta");
    if (!isActiveQuoteRow(proposals, found.current)) throw new ApiException("LOCKED_RECORD", "A proposta já está inativa.");
    if (isQuoteMarkedSelected(proposals, found.current)) throw new ApiException("LOCKED_RECORD", "Uma proposta selecionada não pode ser excluída.");
    const lines = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    const linked = lines.rows.map((row, rowIndex) => ({ row, rowIndex })).filter((entry) => isActiveQuoteRow(lines, entry.row) && cell(lines, entry.row, "ID_Proposta") === id);
    assertGroupedProposalScopeAllowedV1(user, lines, linked.map((entry) => entry.row));
    const necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const now = new Date();
    const writes: AtomicSheetWriteV1[] = [];
    const audits: AuditEntry[] = [];
    const proposalChanges: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(proposals, found.current, "Status", quoteStatusToSheet("DESCARTADA"), (value) => value, proposalChanges);
    applyChange(proposals, found.current, "Selecionada", "Não", (value) => value, proposalChanges);
    applyChange(proposals, found.current, "ativo", "Não", (value) => value, proposalChanges);
    setCell(proposals, found.current, "version", found.currentVersion + 1);
    setCell(proposals, found.current, "updated_at", now);
    setCell(proposals, found.current, "updated_by", user.id);
    const proposalRange = proposals.sheet.getRange(physicalRowNumber(proposals, found.rowIndex), 1, 1, proposals.headers.length);
    writes.push({ range: proposalRange, previous: restorableMatrixV1(proposalRange), next: [found.current] });
    audits.push({ module: "COTACOES_PROPOSTA", recordId: id, changes: proposalChanges, reason: String(payload.reason || "Proposta descartada."), action: "EXCLUSAO" });
    linked.forEach((entry) => {
      const next = entry.row.slice();
      const lineId = cell(lines, next, "ID_Cotação");
      const necessityId = cell(lines, next, "ID_Necessidade");
      setCell(lines, next, "ativo", "Não");
      setCell(lines, next, "version", Number(cell(lines, next, "version") || 1) + 1);
      setCell(lines, next, "updated_at", now);
      setCell(lines, next, "updated_by", user.id);
      const range = lines.sheet.getRange(physicalRowNumber(lines, entry.rowIndex), 1, 1, lines.headers.length);
      writes.push({ range, previous: restorableMatrixV1(range), next: [next] });
      audits.push({ module: "COTACOES_VINCULO", recordId: lineId, changes: [{ field: "ativo", previous: cell(lines, entry.row, "ativo"), next: "Não" }], reason: `Proposta ${id} descartada.`, action: "EXCLUSAO" });
      const necessity = findRowById(necessities, "ID_Necessidade", necessityId, "Necessidade");
      if (normalizeStatus(cell(necessities, necessity.row, "Status")) === "EM_COTACAO" && !hasOtherActiveGroupedLineV1(lines, necessityId, id)) {
        appendNecessityStatusWriteV1(necessities, {
          necessityId,
          storeId: cell(necessities, necessity.row, "ID_Loja"),
          itemId: cell(necessities, necessity.row, "ID_Item"),
          quantity: Number(cell(necessities, necessity.row, "Qtd_Planejada")),
          necessityRow: necessity.row,
          necessityRowIndex: necessity.rowIndex,
        }, "NAO_INICIADO", user, now, writes, audits, `Última proposta ativa removida: ${id}.`);
      }
    });
    performAtomicWritesV1(spreadsheet, user, writes, audits);
    return { id };
  });
}

function selectQuoteProposal(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  assertModulePermission(spreadsheet, user, "Cotações", "Editar");
  return withScriptLock(() => {
    assertGroupedQuoteSchemaV1(spreadsheet);
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    const found = findVersionedRow(proposals, "ID_Proposta", id, expectedVersion, "Proposta");
    if (!isActiveQuoteRow(proposals, found.current)) throw new ApiException("LOCKED_RECORD", "A proposta está inativa.");
    if (normalizeQuoteStatus(cell(proposals, found.current, "Status")) !== "RECEBIDA" || isYes(cell(proposals, found.current, "Selecionada"))) {
      throw new ApiException("INVALID_STATUS", "Somente propostas RECEBIDAS e ainda não selecionadas podem ser escolhidas.");
    }
    const validUntil = dateCell(proposals, found.current, "Validade_Proposta");
    if (validUntil && validUntil < formatDateOnly(new Date())) throw new ApiException("EXPIRED_QUOTE", "A validade desta proposta expirou.");
    const lines = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    const linked = lines.rows.filter((row) => isActiveQuoteRow(lines, row) && cell(lines, row, "ID_Proposta") === id);
    assertGroupedProposalScopeAllowedV1(user, lines, linked);
    const targetNeedIds = Object.fromEntries(linked.map((row) => [cell(lines, row, "ID_Necessidade"), true]));
    const conflicts = findSelectedScopeConflictsV1(proposals, lines, targetNeedIds, id);
    if (conflicts.length) {
      throw new ApiException("SELECTED_SCOPE_CONFLICT", "Uma ou mais necessidades já pertencem a outra proposta selecionada. A seleção anterior não foi alterada.", { conflicts });
    }
    const necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const now = new Date();
    const writes: AtomicSheetWriteV1[] = [];
    const audits: AuditEntry[] = [];
    linked.forEach((line) => {
      const necessityId = cell(lines, line, "ID_Necessidade");
      const necessity = findRowById(necessities, "ID_Necessidade", necessityId, "Necessidade");
      if (normalizeStatus(cell(necessities, necessity.row, "Status")) !== "EM_COTACAO") {
        throw new ApiException("INVALID_NECESSITY_STATUS", `A necessidade ${necessityId} não está em EM_COTACAO e impede a seleção integral.`);
      }
      appendNecessityStatusWriteV1(necessities, {
        necessityId,
        storeId: cell(necessities, necessity.row, "ID_Loja"),
        itemId: cell(necessities, necessity.row, "ID_Item"),
        quantity: Number(cell(necessities, necessity.row, "Qtd_Planejada")),
        necessityRow: necessity.row,
        necessityRowIndex: necessity.rowIndex,
      }, "AGUARDANDO_APROVACAO", user, now, writes, audits, `Proposta ${id} selecionada integralmente.`);
    });
    const previousStatus = cell(proposals, found.current, "Status");
    setCell(proposals, found.current, "Status", quoteStatusToSheet("SELECIONADA"));
    setCell(proposals, found.current, "Selecionada", "Sim");
    setCell(proposals, found.current, "version", found.currentVersion + 1);
    setCell(proposals, found.current, "updated_at", now);
    setCell(proposals, found.current, "updated_by", user.id);
    const range = proposals.sheet.getRange(physicalRowNumber(proposals, found.rowIndex), 1, 1, proposals.headers.length);
    writes.unshift({ range, previous: restorableMatrixV1(range), next: [found.current] });
    audits.unshift({ module: "COTACOES_PROPOSTA", recordId: id, changes: [{ field: "Status", previous: previousStatus, next: "Selecionada" }, { field: "Selecionada", previous: "Não", next: "Sim" }], reason: String(payload.reason || "Proposta selecionada integralmente."), action: "SELECAO" });
    performAtomicWritesV1(spreadsheet, user, writes, audits);
    return { quote: mapGroupedQuoteProposalV1(proposals, found.current, lines, linked) };
  });
}

function resolveGroupedQuoteScopeV1(user: SystemUser, value: unknown, necessities: SheetTable): GroupedQuoteScopeLineV1[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new ApiException("VALIDATION_ERROR", "Selecione de uma a 100 necessidades.");
  const ids = value.map((entry) => requireString(entry, "necessityIds"));
  if (new Set(ids).size !== ids.length) throw new ApiException("VALIDATION_ERROR", "A mesma necessidade não pode aparecer duas vezes na proposta.");
  const scope = ids.map((necessityId) => {
    const match = findRowById(necessities, "ID_Necessidade", necessityId, "Necessidade");
    const storeId = cell(necessities, match.row, "ID_Loja");
    const itemId = cell(necessities, match.row, "ID_Item");
    if (!storeId || !itemId) throw new ApiException("INVALID_SCOPE", `A necessidade ${necessityId} não possui loja e item válidos.`);
    assertStoreScope(user, storeId);
    assertNecessityCanBeQuoted(cell(necessities, match.row, "Status"));
    return {
      necessityId,
      storeId,
      itemId,
      quantity: validatePositiveNumber(cell(necessities, match.row, "Qtd_Planejada")),
      necessityRow: match.row,
      necessityRowIndex: match.rowIndex,
    };
  });
  const itemIds = Array.from(new Set(scope.map((line) => line.itemId)));
  if (itemIds.length !== 1) throw new ApiException("MIXED_ITEMS_NOT_SUPPORTED", "Nesta fase, uma proposta deve conter exatamente um item em uma ou mais lojas.");
  return scope.sort((left, right) => left.necessityId.localeCompare(right.necessityId));
}

function requireActiveSupplierV1(table: SheetTable, value: unknown): unknown[] {
  const supplierId = requireString(value, "supplierId");
  const supplier = findRowById(table, "ID_Fornecedor", supplierId, "Fornecedor").row;
  if (!isYes(cell(table, supplier, "Ativo"))) throw new ApiException("VALIDATION_ERROR", "O fornecedor selecionado está inativo.");
  return supplier;
}

function validateGroupedQuoteValuesV1(payload: Record<string, unknown>, options: QuoteOptionValues, quantityTotal: number): QuoteValidatedValues {
  return validateQuoteValues({ ...payload, quantity: quantityTotal }, options, quantityTotal);
}

function writeGroupedProposalRowV1(
  table: SheetTable,
  row: unknown[],
  proposalId: string,
  supplier: unknown[],
  supplierTable: SheetTable,
  values: QuoteValidatedValues,
  scope: GroupedQuoteScopeLineV1[],
  user: SystemUser,
  now: Date,
): void {
  const quantityTotal = scope.reduce((sum, line) => sum + line.quantity, 0);
  setCell(table, row, "ID_Proposta", proposalId);
  setCell(table, row, "ID_Fornecedor", values.supplierId);
  setCell(table, row, "Origem_Cotação", values.origin);
  setCell(table, row, "Quantidade_Total", quantityTotal);
  setCell(table, row, "Subtotal_Itens", roundMoneyV1(quantityTotal * values.unitPrice));
  setCell(table, row, "Frete_Total", values.freight);
  setCell(table, row, "Outros_Custos_Total", values.otherCosts);
  setCell(table, row, "Valor_Total_Proposta", values.total);
  setCell(table, row, "Forma_Pagamento", values.paymentMethod);
  setCell(table, row, "Prazo_Dias", values.leadTimeDays);
  setCell(table, row, "Validade_Proposta", values.proposalValidUntil);
  setCell(table, row, "Link", values.link);
  setCell(table, row, "Nota_Fornecedor", cell(supplierTable, supplier, "Nota_Fornecedor"));
  setCell(table, row, "Status", quoteStatusToSheet(values.status));
  setCell(table, row, "Selecionada", "Não");
  setCell(table, row, "Data_Cotação", values.quoteDate);
  setCell(table, row, "Responsável", user.name);
  setCell(table, row, "Observações", values.notes);
  setCell(table, row, "ativo", "Sim");
  setTechnicalCreationFields(table, row, user, now);
}

function buildGroupedLineRowV1(
  table: SheetTable,
  lineId: string,
  proposalId: string,
  scope: GroupedQuoteScopeLineV1,
  unitPrice: number,
  user: SystemUser,
  now: Date,
): unknown[] {
  const row = Array(table.headers.length).fill("");
  setCell(table, row, "ID_Cotação", lineId);
  setCell(table, row, "ID_Proposta", proposalId);
  setCell(table, row, "ID_Necessidade", scope.necessityId);
  setCell(table, row, "ID_Loja", scope.storeId);
  setCell(table, row, "ID_Item", scope.itemId);
  setCell(table, row, "Preço_Unitário", unitPrice);
  setCell(table, row, "Quantidade", scope.quantity);
  setCell(table, row, "Subtotal_Linha", roundMoneyV1(scope.quantity * unitPrice));
  setCell(table, row, "ativo", "Sim");
  setTechnicalCreationFields(table, row, user, now);
  return row;
}

function nextInternalIdsV1(table: SheetTable, idHeader: string, prefix: string, width: number, count: number): string[] {
  if (!count) return [];
  const first = nextInternalId(table, idHeader, prefix, width);
  const firstNumber = Number(first.slice(prefix.length + 1));
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(firstNumber + index).padStart(width, "0")}`);
}

function appendNecessityStatusWriteV1(
  table: SheetTable,
  scope: GroupedQuoteScopeLineV1,
  nextStatus: string,
  user: SystemUser,
  now: Date,
  writes: AtomicSheetWriteV1[],
  audits: AuditEntry[],
  reason: string,
): void {
  const next = scope.necessityRow.slice();
  const previousStatus = cell(table, next, "Status");
  if (normalizeStatus(previousStatus) === nextStatus) return;
  setCell(table, next, "Status", nextStatus);
  setCell(table, next, "version", Number(cell(table, next, "version") || 1) + 1);
  setCell(table, next, "updated_at", now);
  setCell(table, next, "updated_by", user.id);
  const range = table.sheet.getRange(physicalRowNumber(table, scope.necessityRowIndex), 1, 1, table.headers.length);
  writes.push({ range, previous: restorableMatrixV1(range), next: [next] });
  audits.push({ module: "NECESSIDADES", recordId: scope.necessityId, changes: [{ field: "Status", previous: previousStatus, next: nextStatus }], reason, action: "ALTERACAO" });
}

function assertGroupedProposalScopeAllowedV1(user: SystemUser, lines: SheetTable, rows: unknown[][]): void {
  if (!rows.length) throw new ApiException("ORPHAN_PROPOSAL", "A proposta não possui vínculos ativos.");
  rows.forEach((row) => assertStoreScope(user, cell(lines, row, "ID_Loja")));
}

function hasOtherActiveGroupedLineV1(lines: SheetTable, necessityId: string, excludedProposalId: string): boolean {
  return lines.rows.some((row) => isActiveQuoteRow(lines, row)
    && cell(lines, row, "ID_Necessidade") === necessityId
    && cell(lines, row, "ID_Proposta") !== excludedProposalId);
}

function findSelectedScopeConflictsV1(
  proposals: SheetTable,
  lines: SheetTable,
  targetNeedIds: Record<string, boolean>,
  targetProposalId: string,
): Array<{ proposalId: string; necessityId: string }> {
  const selectedProposalIds = Object.fromEntries(proposals.rows
    .filter((row) => isActiveQuoteRow(proposals, row) && cell(proposals, row, "ID_Proposta") !== targetProposalId && isQuoteMarkedSelected(proposals, row))
    .map((row) => [cell(proposals, row, "ID_Proposta"), true]));
  return lines.rows.filter((row) => isActiveQuoteRow(lines, row)
    && Boolean(selectedProposalIds[cell(lines, row, "ID_Proposta")])
    && Boolean(targetNeedIds[cell(lines, row, "ID_Necessidade")]))
    .map((row) => ({ proposalId: cell(lines, row, "ID_Proposta"), necessityId: cell(lines, row, "ID_Necessidade") }));
}

function quoteScopeSignatureV1(lines: Array<{ necessityId: string; itemId: string; quantity: number }>): string {
  return lines.map((line) => {
    if (!line.necessityId || !line.itemId || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ApiException("INVALID_SCOPE", "A assinatura de escopo contém necessidade, item ou quantidade inválida.");
    }
    return `${line.necessityId}:${line.itemId}:${Number(line.quantity.toFixed(6))}`;
  }).sort().join("|");
}

function restorableMatrixV1(range: GoogleAppsScript.Spreadsheet.Range): unknown[][] {
  const values = range.getValues();
  const formulas = range.getFormulas();
  return values.map((row, rowIndex) => row.map((value, columnIndex) => formulas[rowIndex][columnIndex] || value));
}

function performAtomicWritesV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  writes: AtomicSheetWriteV1[],
  audits: AuditEntry[],
): void {
  try {
    writes.forEach((write) => write.range.setValues(write.next));
    appendAuditBatch(spreadsheet, user, audits);
    SpreadsheetApp.flush();
  } catch (error) {
    writes.slice().reverse().forEach((write) => write.range.setValues(write.previous));
    SpreadsheetApp.flush();
    throw error;
  }
}

function createQuote(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  rejectLegacyQuoteMutationV1();
  assertModulePermission(spreadsheet, user, "Cotações", "Criar");
  return withScriptLock(() => {
    const necessityId = requireString(payload.necessityId, "necessityId");
    const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const necessityMatch = findRowById(necessitiesTable, "ID_Necessidade", necessityId, "Necessidade");
    const necessityRow = necessityMatch.row.slice();
    const storeId = cell(necessitiesTable, necessityRow, "ID_Loja");
    const itemId = cell(necessitiesTable, necessityRow, "ID_Item");
    assertStoreScope(user, storeId);
    const necessityStatus = assertNecessityCanBeQuoted(cell(necessitiesTable, necessityRow, "Status"));
    const plannedQuantity = validatePositiveNumber(cell(necessitiesTable, necessityRow, "Qtd_Planejada"));

    const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Fornecedor", "Nota_Fornecedor", "Ativo"]);
    const supplierId = requireString(payload.supplierId, "supplierId");
    const supplier = findRowById(suppliersTable, "ID_Fornecedor", supplierId, "Fornecedor").row;
    if (!isYes(cell(suppliersTable, supplier, "Ativo"))) throw new ApiException("VALIDATION_ERROR", "O fornecedor selecionado está inativo.");

    const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Valor_Total", "Status", "Selecionada", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo"]);
    const values = validateQuoteValues(payload, readQuoteOptions(spreadsheet), plannedQuantity);
    const id = nextInternalId(table, "ID_Cotação", "COT", 6);
    assertInternalIdAvailable(table, "ID_Cotação", id);
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

    const quoteRange = table.sheet.getRange(findFirstWritableRow(table, "ID_Cotação"), 1, 1, table.headers.length);
    const necessityRange = necessitiesTable.sheet.getRange(physicalRowNumber(necessitiesTable, necessityMatch.rowIndex), 1, 1, necessitiesTable.headers.length);
    const previousQuote = restorableRowValues(quoteRange);
    const previousNecessity = necessityRange.getValues()[0];
    const auditEntries: AuditEntry[] = [{
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
    } catch (error) {
      quoteRange.setValues([previousQuote]);
      necessityRange.setValues([previousNecessity]);
      SpreadsheetApp.flush();
      throw error;
    }
    return { quote: mapQuote(table, row) };
  });
}

function updateQuote(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  rejectLegacyQuoteMutationV1();
  assertModulePermission(spreadsheet, user, "Cotações", "Editar");
  return withScriptLock(() => {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const changes = requireChanges(payload.changes, ["necessityId", "supplierId", "origin", "unitPrice", "quantity", "freight", "otherCosts", "paymentMethod", "leadTimeDays", "proposalValidUntil", "link", "status", "quoteDate", "notes"]);
    const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Status", "Selecionada", "version", "updated_at", "updated_by", "ativo"]);
    const found = findVersionedRow(table, "ID_Cotação", id, expectedVersion, "Cotação");
    assertStoreScope(user, cell(table, found.current, "ID_Loja"));
    if (!isActiveQuoteRow(table, found.current)) throw new ApiException("LOCKED_RECORD", "A cotação foi excluída e não pode mais ser editada.");
    if (isYes(cell(table, found.current, "Selecionada")) || normalizeQuoteStatus(cell(table, found.current, "Status")) === "SELECIONADA") {
      throw new ApiException("LOCKED_RECORD", "A proposta selecionada está bloqueada. Selecione outra proposta antes de editá-la.");
    }
    const suppliersTable = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor", "Nota_Fornecedor", "Ativo"]);
    const supplierId = requireString(changes.supplierId, "supplierId");
    const supplier = findRowById(suppliersTable, "ID_Fornecedor", supplierId, "Fornecedor").row;
    if (!isYes(cell(suppliersTable, supplier, "Ativo"))) throw new ApiException("VALIDATION_ERROR", "O fornecedor selecionado está inativo.");
    const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
    const previousNecessityId = cell(table, found.current, "ID_Necessidade");
    const necessityId = changes.necessityId === undefined ? previousNecessityId : requireString(changes.necessityId, "necessityId");
    const necessityMatch = findRowById(necessitiesTable, "ID_Necessidade", necessityId, "Necessidade");
    const necessity = necessityMatch.row.slice();
    const storeId = cell(necessitiesTable, necessity, "ID_Loja");
    const itemId = cell(necessitiesTable, necessity, "ID_Item");
    assertStoreScope(user, storeId);
    const targetNecessityStatus = assertNecessityCanBeQuoted(cell(necessitiesTable, necessity, "Status"));
    const plannedQuantity = validatePositiveNumber(cell(necessitiesTable, necessity, "Qtd_Planejada"));
    const values = validateQuoteValues(changes, readQuoteOptions(spreadsheet), plannedQuantity);
    const audited: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(table, found.current, "ID_Necessidade", necessityId, (value) => value, audited);
    applyChange(table, found.current, "ID_Loja", storeId, (value) => value, audited);
    applyChange(table, found.current, "ID_Item", itemId, (value) => value, audited);
    applyChange(table, found.current, "ID_Fornecedor", supplierId, (value) => value, audited);
    applyQuoteChanges(table, found.current, values, audited);
    applyChange(table, found.current, "Nota_Fornecedor", cell(suppliersTable, supplier, "Nota_Fornecedor"), (value) => value, audited);
    if (!audited.length) throw new ApiException("VALIDATION_ERROR", "Nenhuma alteração válida foi informada.");

    const now = new Date();
    setCell(table, found.current, "version", found.currentVersion + 1);
    setCell(table, found.current, "updated_at", now);
    setCell(table, found.current, "updated_by", user.id);
    const writes: Array<{ range: GoogleAppsScript.Spreadsheet.Range; previous: unknown[]; next: unknown[] }> = [];
    const quoteRange = table.sheet.getRange(physicalRowNumber(table, found.rowIndex), 1, 1, table.headers.length);
    writes.push({ range: quoteRange, previous: quoteRange.getValues()[0], next: found.current });
    const audits: AuditEntry[] = [{ module: "COTACOES", recordId: id, changes: audited, reason: String(payload.reason || "Cotação editada."), action: "ALTERACAO" }];

    if (necessityId !== previousNecessityId) {
      if (targetNecessityStatus === "NAO_INICIADO") {
        const previousStatus = cell(necessitiesTable, necessity, "Status");
        setCell(necessitiesTable, necessity, "Status", "EM_COTACAO");
        setCell(necessitiesTable, necessity, "version", Number(cell(necessitiesTable, necessity, "version") || 1) + 1);
        setCell(necessitiesTable, necessity, "updated_at", now);
        setCell(necessitiesTable, necessity, "updated_by", user.id);
        const range = necessitiesTable.sheet.getRange(physicalRowNumber(necessitiesTable, necessityMatch.rowIndex), 1, 1, necessitiesTable.headers.length);
        writes.push({ range, previous: range.getValues()[0], next: necessity });
        audits.push({ module: "NECESSIDADES", recordId: necessityId, changes: [{ field: "Status", previous: previousStatus, next: "EM_COTACAO" }], reason: `Cotação vinculada: ${id}`, action: "ALTERACAO" });
      }
      const previousMatch = findRowById(necessitiesTable, "ID_Necessidade", previousNecessityId, "Necessidade");
      const previousNecessity = previousMatch.row.slice();
      if (normalizeStatus(cell(necessitiesTable, previousNecessity, "Status")) === "EM_COTACAO" && !hasOtherActiveQuoteForNecessity(table, previousNecessityId, id)) {
        const previousStatus = cell(necessitiesTable, previousNecessity, "Status");
        setCell(necessitiesTable, previousNecessity, "Status", "NAO_INICIADO");
        setCell(necessitiesTable, previousNecessity, "version", Number(cell(necessitiesTable, previousNecessity, "version") || 1) + 1);
        setCell(necessitiesTable, previousNecessity, "updated_at", now);
        setCell(necessitiesTable, previousNecessity, "updated_by", user.id);
        const range = necessitiesTable.sheet.getRange(physicalRowNumber(necessitiesTable, previousMatch.rowIndex), 1, 1, necessitiesTable.headers.length);
        writes.push({ range, previous: range.getValues()[0], next: previousNecessity });
        audits.push({ module: "NECESSIDADES", recordId: previousNecessityId, changes: [{ field: "Status", previous: previousStatus, next: "NAO_INICIADO" }], reason: `Última cotação removida pelo novo vínculo de ${id}`, action: "ALTERACAO" });
      }
    }
    try {
      writes.forEach((write) => write.range.setValues([write.next]));
      appendAuditBatch(spreadsheet, user, audits);
      SpreadsheetApp.flush();
    } catch (error) {
      writes.forEach((write) => write.range.setValues([write.previous]));
      SpreadsheetApp.flush();
      throw error;
    }
    return { quote: mapQuote(table, found.current) };
  });
}

function deleteQuote(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  rejectLegacyQuoteMutationV1();
  assertModulePermission(spreadsheet, user, "Cotações", "Excluir");
  return withScriptLock(() => {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "Status", "Selecionada", "version", "updated_at", "updated_by", "ativo"]);
    const found = findVersionedRow(table, "ID_Cotação", id, expectedVersion, "Cotação");
    assertStoreScope(user, cell(table, found.current, "ID_Loja"));
    if (!isActiveQuoteRow(table, found.current)) throw new ApiException("LOCKED_RECORD", "A cotação já foi excluída.");
    if (isQuoteMarkedSelected(table, found.current)) throw new ApiException("LOCKED_RECORD", "Uma proposta selecionada não pode ser excluída.");

    const audited: Array<{ field: string; previous: unknown; next: unknown }> = [];
    applyChange(table, found.current, "Status", "Descartada", (value) => value, audited);
    applyChange(table, found.current, "Selecionada", false, validateYesNo, audited);
    applyChange(table, found.current, "ativo", false, validateYesNo, audited);
    const now = new Date();
    setCell(table, found.current, "version", found.currentVersion + 1);
    setCell(table, found.current, "updated_at", now);
    setCell(table, found.current, "updated_by", user.id);

    const quoteRange = table.sheet.getRange(physicalRowNumber(table, found.rowIndex), 1, 1, table.headers.length);
    const writes: Array<{ range: GoogleAppsScript.Spreadsheet.Range; previous: unknown[]; next: unknown[] }> = [{ range: quoteRange, previous: quoteRange.getValues()[0], next: found.current }];
    const audits: AuditEntry[] = [{ module: "COTACOES", recordId: id, changes: audited, reason: String(payload.reason || "Cotação excluída pelo sistema."), action: "EXCLUSAO" }];
    const necessityId = cell(table, found.current, "ID_Necessidade");
    const necessitiesTable = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "Status", "version", "updated_at", "updated_by"]);
    const necessityMatch = findRowById(necessitiesTable, "ID_Necessidade", necessityId, "Necessidade");
    const necessity = necessityMatch.row.slice();
    if (normalizeStatus(cell(necessitiesTable, necessity, "Status")) === "EM_COTACAO" && !hasOtherActiveQuoteForNecessity(table, necessityId, id)) {
      const previousStatus = cell(necessitiesTable, necessity, "Status");
      setCell(necessitiesTable, necessity, "Status", "NAO_INICIADO");
      setCell(necessitiesTable, necessity, "version", Number(cell(necessitiesTable, necessity, "version") || 1) + 1);
      setCell(necessitiesTable, necessity, "updated_at", now);
      setCell(necessitiesTable, necessity, "updated_by", user.id);
      const necessityRange = necessitiesTable.sheet.getRange(physicalRowNumber(necessitiesTable, necessityMatch.rowIndex), 1, 1, necessitiesTable.headers.length);
      writes.push({ range: necessityRange, previous: necessityRange.getValues()[0], next: necessity });
      audits.push({ module: "NECESSIDADES", recordId: necessityId, changes: [{ field: "Status", previous: previousStatus, next: "NAO_INICIADO" }], reason: `Última cotação ativa excluída: ${id}`, action: "ALTERACAO" });
    }
    try {
      writes.forEach((write) => write.range.setValues([write.next]));
      appendAuditBatch(spreadsheet, user, audits);
      SpreadsheetApp.flush();
    } catch (error) {
      writes.forEach((write) => write.range.setValues([write.previous]));
      SpreadsheetApp.flush();
      throw error;
    }
    return { id };
  });
}

function selectQuote(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  payload: Record<string, unknown>,
): unknown {
  rejectLegacyQuoteMutationV1();
  assertModulePermission(spreadsheet, user, "Cotações", "Editar");
  return withScriptLock(() => {
    const id = requireString(payload.id, "id");
    const expectedVersion = requirePositiveInteger(payload.version, "version");
    const table = readTable(spreadsheet, APP_CONFIG.sheets.quotes, ["ID_Cotação", "ID_Necessidade", "ID_Loja", "Quantidade", "Status", "Selecionada", "Validade_Proposta", "version", "updated_at", "updated_by"]);
    const target = findVersionedRow(table, "ID_Cotação", id, expectedVersion, "Cotação");
    assertStoreScope(user, cell(table, target.current, "ID_Loja"));
    if (!isActiveQuoteRow(table, target.current)) throw new ApiException("LOCKED_RECORD", "A cotação foi excluída e não pode ser selecionada.");
    if (normalizeQuoteStatus(cell(table, target.current, "Status")) !== "RECEBIDA") throw new ApiException("INVALID_STATUS", "Somente propostas com status RECEBIDA podem ser selecionadas.");
    const validUntil = dateCell(table, target.current, "Validade_Proposta");
    if (validUntil && validUntil < formatDateOnly(new Date())) throw new ApiException("EXPIRED_QUOTE", "A validade desta proposta expirou.");

    const necessityId = cell(table, target.current, "ID_Necessidade");
    const comparableRows = table.rows.filter((row) => {
      const status = normalizeQuoteStatus(cell(table, row, "Status"));
      return isActiveQuoteRow(table, row) && cell(table, row, "ID_Necessidade") === necessityId && ["RECEBIDA", "SELECIONADA"].indexOf(status) >= 0;
    });
    if (!areQuoteQuantitiesComparable(comparableRows.map((row) => Number(cell(table, row, "Quantidade"))))) {
      throw new ApiException("QUANTITY_MISMATCH", "Existem propostas com quantidades diferentes para esta necessidade. Corrija-as antes de selecionar uma proposta.");
    }
    const affected = table.rows
      .map((row, rowIndex) => ({ row: row.slice(), rowIndex }))
      .filter((entry) => isActiveQuoteRow(table, entry.row) && cell(table, entry.row, "ID_Necessidade") === necessityId && (cell(table, entry.row, "ID_Cotação") === id || isQuoteMarkedSelected(table, entry.row)));
    const writes: Array<{ range: GoogleAppsScript.Spreadsheet.Range; previous: unknown[]; next: unknown[] }> = [];
    const audits: AuditEntry[] = [];
    const now = new Date();
    affected.forEach((entry) => {
      const quoteId = cell(table, entry.row, "ID_Cotação");
      const selecting = quoteId === id;
      const changes: Array<{ field: string; previous: unknown; next: unknown }> = [];
      applyQuoteSelectionState(table, entry.row, selecting, changes);
      if (!changes.length) return;
      setCell(table, entry.row, "version", Number(cell(table, entry.row, "version") || 1) + 1);
      setCell(table, entry.row, "updated_at", now);
      setCell(table, entry.row, "updated_by", user.id);
      const range = table.sheet.getRange(physicalRowNumber(table, entry.rowIndex), 1, 1, table.headers.length);
      writes.push({ range, previous: range.getValues()[0], next: entry.row });
      audits.push({ module: "COTACOES", recordId: quoteId, changes, reason: String(payload.reason || "Proposta escolhida para futura aprovação."), action: "SELECAO" });
    });
    const selectedAfter = affected.filter((entry) => isQuoteSelectionConsistent(table, entry.row));
    if (selectedAfter.length !== 1 || cell(table, selectedAfter[0].row, "ID_Cotação") !== id) throw new ApiException("INTERNAL_ERROR", "Não foi possível garantir uma única proposta selecionada para a necessidade.");
    try {
      writes.forEach((write) => write.range.setValues([write.next]));
      appendAuditBatch(spreadsheet, user, audits);
      SpreadsheetApp.flush();
    } catch (error) {
      writes.forEach((write) => write.range.setValues([write.previous]));
      SpreadsheetApp.flush();
      throw error;
    }
    const selectedRow = writes.find((write) => cell(table, write.next, "ID_Cotação") === id)?.next || target.current;
    return { quote: mapQuote(table, selectedRow) };
  });
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
    const absoluteRow = physicalRowNumber(table, rowIndex);
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
  if (!isStoreAllowed(user, storeId)) {
    throw new ApiException("PERMISSION_DENIED", "Esta loja não está no seu escopo de acesso.");
  }
}

function isStoreAllowed(user: SystemUser, storeId: string): boolean {
  return user.allowedStoreIds === "TODAS" || user.allowedStoreIds.indexOf(storeId) >= 0;
}

function assertModulePermission(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  module: string,
  action: string,
): void {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.permissions, ["Perfil", "Módulo", action]);
  if (!hasModulePermission(table, user, module, action)) {
    throw new ApiException("PERMISSION_DENIED", `Você não possui permissão para ${normalizeText(action)} em ${module}.`);
  }
}

function hasModulePermission(table: SheetTable, user: SystemUser, module: string, action: string): boolean {
  const row = table.rows.find((candidate) => normalizeProfile(cell(table, candidate, "Perfil")) === user.profile && normalizeHeader(cell(table, candidate, "Módulo")) === normalizeHeader(module));
  return Boolean(row && isYes(cell(table, row, action)));
}

function appendAudit(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  module: string,
  recordId: string,
  changes: Array<{ field: string; previous: unknown; next: unknown }>,
  reason: string,
): void {
  appendAuditBatch(spreadsheet, user, [{ module, recordId, changes, reason }]);
}

function appendAuditBatch(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  user: SystemUser,
  entries: AuditEntry[],
): void {
  const validEntries = entries.filter((entry) => entry.changes.length > 0);
  if (!validEntries.length) return;
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
    setCell(table, row, "Origem", entry.origin || "SISTEMA_WEB");
    setCell(table, row, "Referência", entry.reference || user.email);
    setCell(table, row, "Observações", entry.reason);
    return row;
  }));
  table.sheet.getRange(findFirstWritableRow(table, "ID_Histórico", output.length), 1, output.length, table.headers.length).setValues(output);
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
  const rowIndex = findUniqueRowIndex(table, idHeader, id, entityLabel);
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
  const range = table.sheet.getRange(physicalRowNumber(table, rowIndex), 1, 1, table.headers.length);
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

function appendCreatedRow(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  table: SheetTable,
  idHeader: string,
  row: unknown[],
  user: SystemUser,
  audit: AuditEntry,
): void {
  const range = table.sheet.getRange(findFirstWritableRow(table, idHeader), 1, 1, table.headers.length);
  const previousRow = restorableRowValues(range);
  try {
    range.setValues([row]);
    appendAuditBatch(spreadsheet, user, [audit]);
    SpreadsheetApp.flush();
  } catch (error) {
    range.setValues([previousRow]);
    SpreadsheetApp.flush();
    throw error;
  }
}

function restorableRowValues(range: GoogleAppsScript.Spreadsheet.Range): unknown[] {
  const values = range.getValues()[0];
  const formulas = range.getFormulas()[0];
  return values.map((value, index) => formulas[index] || value);
}

function setTechnicalCreationFields(table: SheetTable, row: unknown[], user: SystemUser, now: Date): void {
  setCell(table, row, "created_at", now);
  setCell(table, row, "created_by", user.id);
  setCell(table, row, "updated_at", now);
  setCell(table, row, "updated_by", user.id);
  setCell(table, row, "version", 1);
}

function nextInternalId(table: SheetTable, idHeader: string, prefix: string, width: number): string {
  const idColumn = columnIndex(table, idHeader);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const next = table.rows.reduce((highest, row) => {
    const match = String(row[idColumn] || "").trim().match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  return `${prefix}-${String(next).padStart(width, "0")}`;
}

function assertInternalIdAvailable(table: SheetTable, idHeader: string, id: string): void {
  const idColumn = columnIndex(table, idHeader);
  if (table.rows.some((row) => String(row[idColumn] || "").trim() === id)) {
    throw new ApiException("DUPLICATE_RECORD", `O ID interno ${id} já existe. Atualize os dados antes de tentar novamente.`);
  }
}

function findFirstWritableRow(table: SheetTable, idHeader: string, requiredRows = 1): number {
  if (!Number.isInteger(requiredRows) || requiredRows < 1) throw new ApiException("VALIDATION_ERROR", "Quantidade de linhas para gravação inválida.");
  const firstDataRow = table.headerRow + 1;
  const maxRows = table.sheet.getMaxRows();
  const availableRows = Math.max(maxRows - firstDataRow + 1, 0);
  const idColumn = columnIndex(table, idHeader) + 1;
  const values = availableRows ? table.sheet.getRange(firstDataRow, idColumn, availableRows, 1).getDisplayValues() : [];
  let emptyRun = 0;
  for (let index = 0; index < values.length; index += 1) {
    emptyRun = String(values[index][0] || "").trim() === "" ? emptyRun + 1 : 0;
    if (emptyRun === requiredRows) return firstDataRow + index - requiredRows + 1;
  }
  table.sheet.insertRowsAfter(maxRows, requiredRows);
  return maxRows + 1;
}

function physicalRowNumber(table: SheetTable, rowIndex: number): number {
  const rowNumber = table.rowNumbers[rowIndex];
  if (!Number.isInteger(rowNumber) || rowNumber <= table.headerRow) throw new ApiException("STRUCTURE_ERROR", "Não foi possível localizar a linha física do registro.");
  return rowNumber;
}

function findUniqueRowIndex(table: SheetTable, idHeader: string, id: string, entityLabel: string): number {
  const idColumn = columnIndex(table, idHeader);
  const matches = table.rows.reduce<number[]>((indexes, row, index) => {
    if (String(row[idColumn] || "").trim() === id) indexes.push(index);
    return indexes;
  }, []);
  if (!matches.length) throw new ApiException("NOT_FOUND", `${entityLabel} não encontrado(a).`);
  if (matches.length > 1) throw new ApiException("DUPLICATE_RECORD", `O ID ${id} está duplicado na planilha. Corrija a duplicidade antes de editar.`);
  return matches[0];
}

function findRowById(table: SheetTable, idHeader: string, id: string, entityLabel: string): { row: unknown[]; rowIndex: number } {
  const rowIndex = findUniqueRowIndex(table, idHeader, id, entityLabel);
  return { row: table.rows[rowIndex], rowIndex };
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
  const rawRows = dataRowCount ? sheet.getRange(dataStartRow, 1, dataRowCount, headers.length).getValues() : [];
  const rows: unknown[][] = [];
  const rowNumbers: number[] = [];
  rawRows.forEach((row, index) => {
    if (!row.some((value) => String(value || "").trim() !== "")) return;
    rows.push(row);
    rowNumbers.push(dataStartRow + index);
  });
  return { sheet, headerRow: headerOffset + 1, headers, normalizedHeaders: headers.map(normalizeHeader), rows, rowNumbers };
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

function mapSupplier(table: SheetTable, row: unknown[]) {
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

function mapQuote(table: SheetTable, row: unknown[]) {
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

function mapPurchaseRoute(table: SheetTable, row: unknown[]) {
  return {
    id: cell(table, row, "ID_Rota"),
    itemId: cell(table, row, "ID_Item"),
    order: Number(cell(table, row, "Ordem") || 0),
    originDestination: cell(table, row, "Origem_Destino"),
    active: !cell(table, row, "Ativo") || isYes(cell(table, row, "Ativo")),
    notes: cell(table, row, "Observações"),
  };
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

function assertPublicReadAccessEnabled(): void {
  if (PropertiesService.getScriptProperties().getProperty("PUBLIC_READ_ACCESS") !== "SIM") {
    throw new ApiException("PUBLIC_ACCESS_DISABLED", "O acesso de visitante está temporariamente indisponível.");
  }
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
function dateCell(table: SheetTable, row: unknown[], header: string): string { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index < 0 || !row[index]) return ""; const value = row[index]; return value instanceof Date ? formatDateOnly(value) : String(value).trim().slice(0, 10); }
function setCell(table: SheetTable, row: unknown[], header: string, value: unknown): void { const index = table.normalizedHeaders.indexOf(normalizeHeader(header)); if (index >= 0) row[index] = value; }
function isYes(value: string): boolean { return ["sim", "true", "1", "ativo"].indexOf(normalizeText(value)) >= 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function requireString(value: unknown, field: string): string { if (typeof value !== "string" || !value.trim()) throw new ApiException("VALIDATION_ERROR", `Campo obrigatório: ${field}`); return value.trim(); }
function requireGoogleCredential(value: unknown): string { if (typeof value !== "string" || !value.trim()) throw new ApiException("AUTH_REQUIRED", "Entre com Google para realizar alterações."); return value.trim(); }
function requirePositiveInteger(value: unknown, field: string): number { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new ApiException("VALIDATION_ERROR", `${field} deve ser inteiro positivo.`); return parsed; }
function validatePositiveNumber(value: unknown): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new ApiException("VALIDATION_ERROR", "Quantidade deve ser maior que zero."); return parsed; }
function validateNonNegativeNumber(value: unknown, field = "valor"): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new ApiException("VALIDATION_ERROR", `${field} não pode ser negativo.`); return Math.round((parsed + Number.EPSILON) * 100) / 100; }
function validateNonNegativeInteger(value: unknown, field: string): number { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0) throw new ApiException("VALIDATION_ERROR", `${field} deve ser inteiro igual ou maior que zero.`); return parsed; }
function validateRequiredText(value: unknown): string { const result = requireString(value, "valor"); if (result.length > 500) throw new ApiException("VALIDATION_ERROR", "Texto obrigatório muito longo."); return result; }
function validateShortText(value: unknown): string { if (typeof value !== "string" || value.length > 500) throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateUf(value: unknown): string { const result = validateShortText(value).toLocaleUpperCase(); if (result && !/^[A-Z]{2}$/.test(result)) throw new ApiException("VALIDATION_ERROR", "UF deve conter duas letras."); return result; }
function validateOptionalEmail(value: unknown): string { const result = validateShortText(value).toLocaleLowerCase(); if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ApiException("VALIDATION_ERROR", "E-mail inválido."); return result; }
function validateDefinitionStatus(value: unknown): string { const status = requireString(value, "definitionStatus"); if (status === "PENDENTE_DEFINICAO") return "Pendente definição"; if (status === "LIBERADO_PARA_COTACAO") return "Liberado para cotação"; throw new ApiException("VALIDATION_ERROR", "Status de especificação inválido."); }
function validateYesNo(value: unknown): string { if (typeof value !== "boolean") throw new ApiException("VALIDATION_ERROR", "Ativo deve ser verdadeiro ou falso."); return value ? "Sim" : "Não"; }
function validatePriority(value: unknown): string { const result = requireString(value, "priority").toLocaleUpperCase(); if (["BAIXA", "MEDIA", "ALTA", "CRITICA"].indexOf(normalizeText(result).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase()) < 0) throw new ApiException("VALIDATION_ERROR", "Prioridade inválida."); return result; }
function validateText(value: unknown): string { if (typeof value !== "string" || value.length > 2000) throw new ApiException("VALIDATION_ERROR", "Texto inválido ou muito longo."); return value.trim(); }
function validateStatus(value: unknown): string { const status = requireString(value, "status").toLocaleUpperCase(); if (!(status in STATUS_TRANSITIONS)) throw new ApiException("VALIDATION_ERROR", "Status inválido."); return status; }
function validateTaxId(value: unknown): string { const result = validateShortText(value); const digits = onlyDigits(result); if (result && [11, 14].indexOf(digits.length) < 0) throw new ApiException("VALIDATION_ERROR", "CNPJ/CPF deve conter 11 ou 14 dígitos."); return result; }
function validateOptionalRating(value: unknown): number | "" { if (value === null || value === undefined || value === "") return ""; const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) throw new ApiException("VALIDATION_ERROR", "Nota do fornecedor deve estar entre 0 e 5."); return parsed; }
function validateOptionalUrl(value: unknown): string { const result = validateShortText(value); if (result && !/^https?:\/\//i.test(result)) throw new ApiException("VALIDATION_ERROR", "Informe uma URL iniciada por http:// ou https://."); return result; }
function validateDateOnly(value: unknown, field: string, required = false): string { if ((value === "" || value === null || value === undefined) && !required) return ""; const result = requireString(value, field); if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(new Date(`${result}T12:00:00Z`).getTime())) throw new ApiException("VALIDATION_ERROR", `${field} deve usar uma data válida.`); return result; }
function onlyDigits(value: string): string { return value.replace(/\D/g, ""); }
function formatDateOnly(value: Date): string { return Utilities.formatDate(value, APP_CONFIG.timezone, "yyyy-MM-dd"); }

function hasDuplicateNormalizedTaxId(registeredValues: string[], candidate: string): boolean {
  const normalizedCandidate = onlyDigits(candidate);
  return Boolean(normalizedCandidate) && registeredValues.some((value) => onlyDigits(String(value || "")) === normalizedCandidate);
}

function assertNecessityCanBeQuoted(value: string): string {
  const key = normalizeHeader(value);
  if (["naoiniciado", "emcotacao"].indexOf(key) >= 0) return normalizeStatus(value);
  if (key === "pendentedefinicao") throw new ApiException("INVALID_STATUS", "Defina o item antes de iniciar cotações.");
  throw new ApiException("INVALID_STATUS", "Esta necessidade não aceita novas cotações no status atual.");
}

function derivePlannedQuoteQuantity(requested: unknown, planned: unknown): number {
  const plannedQuantity = validatePositiveNumber(planned);
  if (requested !== undefined && requested !== null && requested !== "") {
    const requestedQuantity = validatePositiveNumber(requested);
    if (Math.abs(requestedQuantity - plannedQuantity) > 0.000001) {
      throw new ApiException("QUANTITY_MISMATCH", "A quantidade da cotação deve ser igual à Qtd_Planejada da necessidade. Atualize os dados e tente novamente.");
    }
  }
  return plannedQuantity;
}

function areQuoteQuantitiesComparable(quantities: number[]): boolean {
  if (quantities.length < 2) return true;
  const reference = quantities[0];
  return quantities.every((quantity) => Number.isFinite(quantity) && Math.abs(quantity - reference) < 0.000001);
}

function readQuoteOptions(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): QuoteOptionValues {
  const table = readTable(spreadsheet, APP_CONFIG.sheets.lists, ["Status Cotação", "Origem Cotação", "Forma Pagamento"]);
  const values = (header: string) => table.rows.map((row) => cell(table, row, header).trim()).filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
  return {
    statuses: values("Status Cotação")
      .filter((status) => ["rascunho", "emandamento", "recebida"].indexOf(normalizeHeader(status)) >= 0)
      .map(normalizeQuoteStatus),
    origins: values("Origem Cotação"),
    paymentMethods: values("Forma Pagamento"),
  };
}

function validateListedValue(value: unknown, options: string[], field: string): string {
  const result = validateRequiredText(value);
  const match = options.find((option) => normalizeText(option) === normalizeText(result));
  if (!match) throw new ApiException("VALIDATION_ERROR", `${field} não consta na aba 14_LISTAS.`);
  return match;
}

function validateQuoteValues(payload: Record<string, unknown>, options?: QuoteOptionValues, plannedQuantity?: number): QuoteValidatedValues {
  const quantity = plannedQuantity === undefined ? validatePositiveNumber(payload.quantity) : derivePlannedQuoteQuantity(payload.quantity, plannedQuantity);
  const unitPrice = validateNonNegativeNumber(payload.unitPrice, "Preço unitário");
  const freight = validateNonNegativeNumber(payload.freight, "Frete");
  const otherCosts = validateNonNegativeNumber(payload.otherCosts, "Outros custos");
  const quoteDate = validateDateOnly(payload.quoteDate, "Data da cotação", true);
  const proposalValidUntil = validateDateOnly(payload.proposalValidUntil, "Validade da proposta");
  if (proposalValidUntil && proposalValidUntil < quoteDate) throw new ApiException("VALIDATION_ERROR", "A validade da proposta não pode ser anterior à data da cotação.");
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
      if (options && options.statuses.indexOf(status) < 0) throw new ApiException("VALIDATION_ERROR", "Status de cotação não consta na aba 14_LISTAS.");
      return status;
    })(),
    quoteDate,
    notes: validateText(payload.notes),
  };
}

function writeQuoteValues(table: SheetTable, row: unknown[], values: QuoteValidatedValues): void {
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

function applyQuoteChanges(table: SheetTable, row: unknown[], values: QuoteValidatedValues, audit: Array<{ field: string; previous: unknown; next: unknown }>): void {
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

function isQuoteMarkedSelected(table: SheetTable, row: unknown[]): boolean {
  return isYes(cell(table, row, "Selecionada")) || normalizeQuoteStatus(cell(table, row, "Status")) === "SELECIONADA";
}

function isActiveQuoteRow(table: SheetTable, row: unknown[]): boolean {
  return !cell(table, row, "ativo") || isYes(cell(table, row, "ativo"));
}

function hasOtherActiveQuoteForNecessity(table: SheetTable, necessityId: string, excludedQuoteId: string): boolean {
  return table.rows.some((row) => cell(table, row, "ID_Cotação") !== excludedQuoteId
    && cell(table, row, "ID_Necessidade") === necessityId
    && isActiveQuoteRow(table, row));
}

function isQuoteSelectionConsistent(table: SheetTable, row: unknown[]): boolean {
  return isYes(cell(table, row, "Selecionada")) && normalizeQuoteStatus(cell(table, row, "Status")) === "SELECIONADA";
}

function applyQuoteSelectionState(
  table: SheetTable,
  row: unknown[],
  selected: boolean,
  audit: Array<{ field: string; previous: unknown; next: unknown }>,
): void {
  applyChange(table, row, "Selecionada", selected, validateYesNo, audit);
  applyChange(table, row, "Status", selected ? "Selecionada" : "Recebida", (value) => value, audit);
}

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
function normalizeQuoteStatus(value: string): string { const key = normalizeHeader(value); const aliases: Record<string, string> = { rascunho: "RASCUNHO", emandamento: "EM_ANDAMENTO", recebida: "RECEBIDA", selecionada: "SELECIONADA", descartada: "DESCARTADA", expirada: "EXPIRADA" }; return aliases[key] || "RASCUNHO"; }
function validateEditableQuoteStatus(value: unknown): string { const raw = requireString(value, "status"); const key = normalizeHeader(raw); if (["rascunho", "emandamento", "recebida"].indexOf(key) < 0) throw new ApiException("VALIDATION_ERROR", "Status de cotação inválido para edição."); return normalizeQuoteStatus(raw); }
function quoteStatusToSheet(status: string): string { const labels: Record<string, string> = { RASCUNHO: "Rascunho", EM_ANDAMENTO: "Em andamento", RECEBIDA: "Recebida", SELECIONADA: "Selecionada", DESCARTADA: "Descartada", EXPIRADA: "Expirada" }; return labels[status] || "Rascunho"; }
function normalizePriority(value: string): string { const key = normalizeHeader(value); const aliases: Record<string, string> = { baixa: "BAIXA", media: "MEDIA", alta: "ALTA", critica: "CRITICA" }; return aliases[key] || "MEDIA"; }
function normalizeProfile(value: string): string { const key = normalizeHeader(value); const aliases: Record<string, string> = { administrador: "ADMINISTRADOR", gestoraprovador: "GESTOR", gestor: "GESTOR", compras: "COMPRAS", responsavelloja: "RESPONSAVEL_LOJA", consulta: "CONSULTA" }; return aliases[key] || "CONSULTA"; }
function assertStatusTransition(previous: string, next: string): void { const from = normalizeStatus(previous); const to = normalizeStatus(next); if ((STATUS_TRANSITIONS[from] || []).indexOf(to) < 0) throw new ApiException("INVALID_STATUS_TRANSITION", `Transição inválida: ${from} → ${to}`); }

function buildTechnicalStatus(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): {
  ready: boolean;
  checkedAt: string;
  tables: TechnicalTableStatus[];
} {
  const tables = APP_CONFIG.setupTables.map(({ sheet, keyHeader }) => inspectTechnicalTable(spreadsheet, sheet, keyHeader));
  if (spreadsheet.getSheetByName(APP_CONFIG.sheets.quoteProposals)) {
    tables.push(inspectTechnicalTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, "ID_Proposta"));
  }
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

const QUOTE_PROPOSAL_MIGRATION_PROPERTY_V1 = "ALLOW_MIGRATE_QUOTE_PROPOSALS_V1";
const QUOTE_PROPOSAL_HEADERS_V1 = [
  "ID_Proposta", "ID_Fornecedor", "Origem_Cotação", "Quantidade_Total", "Subtotal_Itens", "Frete_Total",
  "Outros_Custos_Total", "Valor_Total_Proposta", "Forma_Pagamento", "Prazo_Dias", "Validade_Proposta", "Link",
  "Nota_Fornecedor", "Status", "Selecionada", "Data_Cotação", "Responsável", "Observações", "created_at",
  "created_by", "updated_at", "updated_by", "version", "ativo",
];
const QUOTE_LINK_HEADERS_V1 = [
  "ID_Cotação", "ID_Proposta", "ID_Necessidade", "ID_Loja", "ID_Item", "Preço_Unitário", "Quantidade",
  "Subtotal_Linha", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
];

/**
 * Pré-validação manual e estritamente somente leitura da migração de propostas agrupadas.
 * Não exige nem consome a propriedade temporária de autorização.
 */
function prevalidateQuoteProposalsV1(): QuoteProposalMigrationReportV1 {
  const report = buildQuoteProposalMigrationPlanV1(openConfiguredSpreadsheet()).report;
  console.log(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Migração manual V1. Nunca é chamada pelo frontend ou por setupTechnicalColumns().
 * A primeira escrita na planilha só ocorre após a pré-validação retornar ready_to_migrate=true.
 */
function migrateQuoteProposalsV1(): unknown {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(QUOTE_PROPOSAL_MIGRATION_PROPERTY_V1) !== "SIM") {
    throw new Error(`Defina ${QUOTE_PROPOSAL_MIGRATION_PROPERTY_V1}=SIM temporariamente para autorizar a migração.`);
  }
  try {
    return withScriptLock(() => {
      const spreadsheet = openConfiguredSpreadsheet();
      const plan = buildQuoteProposalMigrationPlanV1(spreadsheet);
      if (!plan.report.ready_to_migrate) {
        console.log(JSON.stringify({ status: "aborted_before_write", report: plan.report }, null, 2));
        throw new ApiException(
          "MIGRATION_PREVALIDATION_FAILED",
          "A migração foi abortada antes da primeira escrita porque a pré-validação encontrou inconsistências.",
          plan.report,
        );
      }
      if (plan.report.already_migrated) {
        const result = { status: "already_migrated", report: plan.report };
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      return executeQuoteProposalMigrationV1(spreadsheet, plan);
    });
  } finally {
    properties.deleteProperty(QUOTE_PROPOSAL_MIGRATION_PROPERTY_V1);
  }
}

function buildQuoteProposalMigrationPlanV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): QuoteProposalMigrationPlanV1 {
  const report = emptyQuoteProposalMigrationReportV1();
  inspectQuoteProposalMigrationPrerequisitesV1(spreadsheet, report);
  const quoteSheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.quotes);
  if (!quoteSheet) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.quotes, issue: "Aba obrigatória não encontrada." });
    return finalizeQuoteProposalMigrationPlanV1(report, []);
  }
  const headerInfo = inspectMigrationHeadersV1(quoteSheet, "ID_Cotação");
  if (!headerInfo.headerRow) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.quotes, issue: "Cabeçalho ID_Cotação não localizado nas primeiras 10 linhas." });
    return finalizeQuoteProposalMigrationPlanV1(report, []);
  }
  const hasProposalId = headerInfo.normalizedHeaders.indexOf(normalizeHeader("ID_Proposta")) >= 0;
  const proposalSheet = spreadsheet.getSheetByName(APP_CONFIG.sheets.quoteProposals);
  if (hasProposalId || proposalSheet) {
    if (!hasProposalId || !proposalSheet) {
      report.structural_issues.push({
        sheet: `${APP_CONFIG.sheets.quotes}/${APP_CONFIG.sheets.quoteProposals}`,
        issue: "Migração parcial detectada: ID_Proposta e 16_PROPOSTAS_COTACAO devem existir juntos.",
      });
      return finalizeQuoteProposalMigrationPlanV1(report, []);
    }
    return buildExistingQuoteProposalMigrationPlanV1(spreadsheet, report);
  }
  return buildLegacyQuoteProposalMigrationPlanV1(spreadsheet, report);
}

function inspectQuoteProposalMigrationPrerequisitesV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: QuoteProposalMigrationReportV1,
): void {
  const history = spreadsheet.getSheetByName(APP_CONFIG.sheets.history);
  if (!history) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.history, issue: "Aba obrigatória não encontrada." });
  } else {
    const headerInfo = inspectMigrationHeadersV1(history, "ID_Histórico");
    const required = [
      "ID_Histórico", "Data_Hora", "ID_Usuário", "Módulo", "ID_Registro", "Ação", "Campo",
      "Valor_Anterior", "Valor_Novo", "Origem", "Referência", "Observações",
    ];
    const missing = required.filter((header) => headerInfo.normalizedHeaders.indexOf(normalizeHeader(header)) < 0);
    if (!headerInfo.headerRow || missing.length) {
      report.structural_issues.push({ sheet: APP_CONFIG.sheets.history, issue: "Cabeçalhos obrigatórios ausentes.", missing });
    }
  }
  const lists = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!lists) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.lists, issue: "Aba obrigatória não encontrada." });
    return;
  }
  try {
    const requiredLists = [
      { range: "C5:C10", field: "Status" },
      { range: "F5:F10", field: "Origem_Cotação" },
      { range: "G5:G10", field: "Forma_Pagamento" },
      { range: "I5:I6", field: "Selecionada" },
    ];
    requiredLists.forEach(({ range, field }) => {
      const values = lists.getRange(range).getValues().flat().filter((value) => String(value || "").trim() !== "");
      if (!values.length) report.structural_issues.push({ sheet: APP_CONFIG.sheets.lists, range, issue: `Lista ${field} vazia.` });
    });
  } catch (error) {
    report.structural_issues.push({ sheet: APP_CONFIG.sheets.lists, issue: error instanceof Error ? error.message : "Não foi possível validar as listas auxiliares." });
  }
}

function buildLegacyQuoteProposalMigrationPlanV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: QuoteProposalMigrationReportV1,
): QuoteProposalMigrationPlanV1 {
  let quotes: SheetTable;
  let necessities: SheetTable;
  let suppliers: SheetTable;
  try {
    quotes = readTable(spreadsheet, APP_CONFIG.sheets.quotes, [
      "ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Preço_Unitário", "Quantidade",
      "Frete", "Outros_Custos", "Valor_Total", "Status", "Selecionada", "version", "ativo",
    ]);
    necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item"]);
    suppliers = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor"]);
  } catch (error) {
    report.structural_issues.push({ issue: error instanceof Error ? error.message : "Estrutura legada inválida." });
    return finalizeQuoteProposalMigrationPlanV1(report, []);
  }
  report.current_quotes = quotes.rows.length;
  report.proposals_to_create = quotes.rows.length;
  report.links_to_create = quotes.rows.length;
  report.duplicate_ids.push(
    ...findDuplicateMigrationIdsV1(quotes, "ID_Cotação", APP_CONFIG.sheets.quotes),
    ...findDuplicateMigrationIdsV1(necessities, "ID_Necessidade", APP_CONFIG.sheets.necessities),
    ...findDuplicateMigrationIdsV1(suppliers, "ID_Fornecedor", APP_CONFIG.sheets.suppliers),
  );
  const necessityMap = uniqueMigrationRowMapV1(necessities, "ID_Necessidade");
  const supplierMap = uniqueMigrationRowMapV1(suppliers, "ID_Fornecedor");
  const proposalIds = legacyProposalIdsV1(quotes);
  const records = quotes.rows.map((row, rowIndex) => {
    const quoteId = cell(quotes, row, "ID_Cotação");
    const necessityId = cell(quotes, row, "ID_Necessidade");
    const supplierId = cell(quotes, row, "ID_Fornecedor");
    const storeId = cell(quotes, row, "ID_Loja");
    const itemId = cell(quotes, row, "ID_Item");
    const unitPrice = migrationNumberV1(rawCellV1(quotes, row, "Preço_Unitário"));
    const quantity = migrationNumberV1(rawCellV1(quotes, row, "Quantidade"));
    const freight = migrationNumberV1(rawCellV1(quotes, row, "Frete"), 0);
    const otherCosts = migrationNumberV1(rawCellV1(quotes, row, "Outros_Custos"), 0);
    const total = migrationNumberV1(rawCellV1(quotes, row, "Valor_Total"));
    const subtotal = roundMoneyV1(unitPrice * quantity);
    const expectedTotal = roundMoneyV1(subtotal + freight + otherCosts);
    if (!quoteId) report.orphan_records.push({ row: physicalRowNumber(quotes, rowIndex), issue: "ID_Cotação vazio." });
    if (!necessityId) report.orphan_records.push({ quote_id: quoteId, issue: "ID_Necessidade vazio." });
    if (!supplierId) report.orphan_records.push({ quote_id: quoteId, issue: "ID_Fornecedor vazio." });
    if (!storeId) report.orphan_records.push({ quote_id: quoteId, issue: "ID_Loja vazio." });
    if (!itemId) report.orphan_records.push({ quote_id: quoteId, issue: "ID_Item vazio." });
    const necessity = necessityMap[necessityId];
    if (necessityId && !necessity) report.missing_necessities.push({ quote_id: quoteId, necessity_id: necessityId });
    if (supplierId && !supplierMap[supplierId]) report.missing_suppliers.push({ quote_id: quoteId, supplier_id: supplierId });
    if (necessity && (cell(necessities, necessity, "ID_Loja") !== storeId || cell(necessities, necessity, "ID_Item") !== itemId)) {
      report.orphan_records.push({
        quote_id: quoteId,
        necessity_id: necessityId,
        issue: "ID_Loja/ID_Item da cotação divergem da necessidade.",
        quote_store_id: storeId,
        necessity_store_id: cell(necessities, necessity, "ID_Loja"),
        quote_item_id: itemId,
        necessity_item_id: cell(necessities, necessity, "ID_Item"),
      });
    }
    const invalidFields: string[] = [];
    if (!Number.isFinite(unitPrice) || unitPrice < 0) invalidFields.push("Preço_Unitário");
    if (!Number.isFinite(quantity) || quantity <= 0) invalidFields.push("Quantidade");
    if (!Number.isFinite(freight) || freight < 0) invalidFields.push("Frete");
    if (!Number.isFinite(otherCosts) || otherCosts < 0) invalidFields.push("Outros_Custos");
    if (!Number.isFinite(total) || total < 0) invalidFields.push("Valor_Total");
    if (!invalidFields.length && Math.abs(total - expectedTotal) > 0.01) invalidFields.push("Valor_Total_divergente");
    if (invalidFields.length) report.invalid_values_totals.push({ quote_id: quoteId, fields: invalidFields, expected_total: expectedTotal, actual_total: total });
    validateLegacyQuoteStatusV1(quotes, row, quoteId, report);
    return {
      quoteId,
      proposalId: proposalIds[rowIndex],
      necessityId,
      storeId,
      itemId,
      supplierId,
      origin: cell(quotes, row, "Origem_Cotação"),
      unitPrice,
      quantity,
      subtotal,
      freight,
      otherCosts,
      total,
      paymentMethod: cell(quotes, row, "Forma_Pagamento"),
      leadTimeDays: migrationNumberV1(rawCellV1(quotes, row, "Prazo_Dias"), 0),
      proposalValidUntil: rawCellV1(quotes, row, "Validade_Proposta"),
      link: cell(quotes, row, "Link"),
      supplierRating: rawCellV1(quotes, row, "Nota_Fornecedor"),
      status: quoteStatusToSheet(knownQuoteStatusV1(cell(quotes, row, "Status")) || "RASCUNHO"),
      selected: isYes(cell(quotes, row, "Selecionada")) ? "Sim" : "Não",
      quoteDate: rawCellV1(quotes, row, "Data_Cotação"),
      responsible: cell(quotes, row, "Responsável"),
      notes: cell(quotes, row, "Observações"),
      createdAt: rawCellV1(quotes, row, "created_at"),
      createdBy: cell(quotes, row, "created_by"),
      updatedAt: rawCellV1(quotes, row, "updated_at"),
      updatedBy: cell(quotes, row, "updated_by"),
      version: Math.max(1, Math.floor(migrationNumberV1(rawCellV1(quotes, row, "version"), 1))),
      active: cell(quotes, row, "ativo") || "Sim",
    } as LegacyQuoteMigrationRecordV1;
  });
  return finalizeQuoteProposalMigrationPlanV1(report, records);
}

function buildExistingQuoteProposalMigrationPlanV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  report: QuoteProposalMigrationReportV1,
): QuoteProposalMigrationPlanV1 {
  report.already_migrated = true;
  let links: SheetTable;
  let proposals: SheetTable;
  let necessities: SheetTable;
  let suppliers: SheetTable;
  try {
    links = readTable(spreadsheet, APP_CONFIG.sheets.quotes, QUOTE_LINK_HEADERS_V1);
    proposals = readTable(spreadsheet, APP_CONFIG.sheets.quoteProposals, QUOTE_PROPOSAL_HEADERS_V1);
    necessities = readTable(spreadsheet, APP_CONFIG.sheets.necessities, ["ID_Necessidade", "ID_Loja", "ID_Item"]);
    suppliers = readTable(spreadsheet, APP_CONFIG.sheets.suppliers, ["ID_Fornecedor"]);
  } catch (error) {
    report.structural_issues.push({ issue: error instanceof Error ? error.message : "Estrutura migrada inválida." });
    return finalizeQuoteProposalMigrationPlanV1(report, []);
  }
  report.current_quotes = links.rows.length;
  report.duplicate_ids.push(
    ...findDuplicateMigrationIdsV1(links, "ID_Cotação", APP_CONFIG.sheets.quotes),
    ...findDuplicateMigrationIdsV1(proposals, "ID_Proposta", APP_CONFIG.sheets.quoteProposals),
    ...findDuplicateMigrationIdsV1(necessities, "ID_Necessidade", APP_CONFIG.sheets.necessities),
    ...findDuplicateMigrationIdsV1(suppliers, "ID_Fornecedor", APP_CONFIG.sheets.suppliers),
  );
  const proposalMap = uniqueMigrationRowMapV1(proposals, "ID_Proposta");
  const necessityMap = uniqueMigrationRowMapV1(necessities, "ID_Necessidade");
  const supplierMap = uniqueMigrationRowMapV1(suppliers, "ID_Fornecedor");
  links.rows.forEach((row, rowIndex) => {
    const quoteId = cell(links, row, "ID_Cotação");
    const proposalId = cell(links, row, "ID_Proposta");
    const necessityId = cell(links, row, "ID_Necessidade");
    const necessity = necessityMap[necessityId];
    if (!quoteId) report.orphan_records.push({ row: physicalRowNumber(links, rowIndex), issue: "ID_Cotação vazio." });
    if (!proposalId || !proposalMap[proposalId]) report.orphan_records.push({ quote_id: quoteId, proposal_id: proposalId, issue: "Proposta vinculada inexistente." });
    if (!necessity) report.missing_necessities.push({ quote_id: quoteId, necessity_id: necessityId });
    if (necessity && (cell(necessities, necessity, "ID_Loja") !== cell(links, row, "ID_Loja") || cell(necessities, necessity, "ID_Item") !== cell(links, row, "ID_Item"))) {
      report.orphan_records.push({ quote_id: quoteId, necessity_id: necessityId, issue: "ID_Loja/ID_Item do vínculo divergem da necessidade." });
    }
    const unitPrice = migrationNumberV1(rawCellV1(links, row, "Preço_Unitário"));
    const quantity = migrationNumberV1(rawCellV1(links, row, "Quantidade"));
    const subtotal = migrationNumberV1(rawCellV1(links, row, "Subtotal_Linha"));
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(subtotal) || subtotal < 0 || Math.abs(subtotal - roundMoneyV1(unitPrice * quantity)) > 0.01) {
      report.invalid_values_totals.push({ quote_id: quoteId, fields: ["Preço_Unitário/Quantidade/Subtotal_Linha"], expected_subtotal: roundMoneyV1(unitPrice * quantity), actual_subtotal: subtotal });
    }
  });
  proposals.rows.forEach((row) => {
    const proposalId = cell(proposals, row, "ID_Proposta");
    const supplierId = cell(proposals, row, "ID_Fornecedor");
    if (!supplierId || !supplierMap[supplierId]) report.missing_suppliers.push({ proposal_id: proposalId, supplier_id: supplierId });
    validateLegacyQuoteStatusV1(proposals, row, proposalId, report);
    const linked = links.rows.filter((link) => cell(links, link, "ID_Proposta") === proposalId);
    if (!linked.length) report.orphan_records.push({ proposal_id: proposalId, issue: "Proposta sem vínculos." });
    const expectedQuantity = linked.reduce((sum, link) => sum + migrationNumberV1(rawCellV1(links, link, "Quantidade"), 0), 0);
    const expectedSubtotal = roundMoneyV1(linked.reduce((sum, link) => sum + migrationNumberV1(rawCellV1(links, link, "Subtotal_Linha"), 0), 0));
    const freight = migrationNumberV1(rawCellV1(proposals, row, "Frete_Total"), 0);
    const otherCosts = migrationNumberV1(rawCellV1(proposals, row, "Outros_Custos_Total"), 0);
    const actualQuantity = migrationNumberV1(rawCellV1(proposals, row, "Quantidade_Total"));
    const actualSubtotal = migrationNumberV1(rawCellV1(proposals, row, "Subtotal_Itens"));
    const actualTotal = migrationNumberV1(rawCellV1(proposals, row, "Valor_Total_Proposta"));
    const expectedTotal = roundMoneyV1(expectedSubtotal + freight + otherCosts);
    if (![actualQuantity, actualSubtotal, freight, otherCosts, actualTotal].every(Number.isFinite)
      || freight < 0 || otherCosts < 0 || Math.abs(actualQuantity - expectedQuantity) > 0.000001
      || Math.abs(actualSubtotal - expectedSubtotal) > 0.01 || Math.abs(actualTotal - expectedTotal) > 0.01) {
      report.invalid_values_totals.push({
        proposal_id: proposalId,
        fields: ["Quantidade_Total/Subtotal_Itens/Frete_Total/Outros_Custos_Total/Valor_Total_Proposta"],
        expected_quantity: expectedQuantity,
        actual_quantity: actualQuantity,
        expected_subtotal: expectedSubtotal,
        actual_subtotal: actualSubtotal,
        expected_total: expectedTotal,
        actual_total: actualTotal,
      });
    }
  });
  return finalizeQuoteProposalMigrationPlanV1(report, []);
}

function executeQuoteProposalMigrationV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  plan: QuoteProposalMigrationPlanV1,
): unknown {
  const stamp = Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyyMMdd_HHmmss");
  const quotes = spreadsheet.getSheetByName(APP_CONFIG.sheets.quotes);
  const history = spreadsheet.getSheetByName(APP_CONFIG.sheets.history);
  if (!quotes || !history) throw new ApiException("STRUCTURE_ERROR", "As abas 05_COTACOES e 12_HISTORICO são obrigatórias.");
  let quoteBackup: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  let historyBackup: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  let proposalsSheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  try {
    quoteBackup = quotes.copyTo(spreadsheet).setName(uniqueMigrationSheetNameV1(spreadsheet, `BKP_MIG_V1_${stamp}_05_COTACOES`));
    historyBackup = history.copyTo(spreadsheet).setName(uniqueMigrationSheetNameV1(spreadsheet, `BKP_MIG_V1_${stamp}_12_HISTORICO`));
    proposalsSheet = spreadsheet.insertSheet(APP_CONFIG.sheets.quoteProposals);
    writeQuoteProposalSheetV1(spreadsheet, proposalsSheet, plan.records);
    rewriteQuoteLinksSheetV1(quotes, quoteBackup, plan.records);
    appendQuoteProposalMigrationAuditV1(spreadsheet, plan.records);
    SpreadsheetApp.flush();
    const validationAfter = buildQuoteProposalMigrationPlanV1(spreadsheet).report;
    if (!validationAfter.already_migrated || !validationAfter.ready_to_migrate) {
      throw new ApiException("MIGRATION_POST_VALIDATION_FAILED", "A conferência posterior à migração encontrou inconsistências.", validationAfter);
    }
    const result = {
      status: "migrated",
      backup_quotes: quoteBackup.getName(),
      backup_history: historyBackup.getName(),
      proposals_created: plan.records.length,
      links_created: plan.records.length,
      report_before: plan.report,
      report_after: validationAfter,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    if (proposalsSheet && spreadsheet.getSheetByName(APP_CONFIG.sheets.quoteProposals)) spreadsheet.deleteSheet(proposalsSheet);
    if (quoteBackup) restoreMigrationSheetV1(quotes, quoteBackup, 1);
    if (historyBackup) restoreMigrationSheetV1(history, historyBackup, 4);
    SpreadsheetApp.flush();
    throw error;
  }
}

function writeQuoteProposalSheetV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  records: LegacyQuoteMigrationRecordV1[],
): void {
  ensureMigrationSheetSizeV1(sheet, Math.max(1000, records.length + 4), QUOTE_PROPOSAL_HEADERS_V1.length);
  sheet.getRange(1, 1).setValue("PROPOSTAS DE COTAÇÃO");
  sheet.getRange(2, 1).setValue("Uma proposta comercial pode abranger várias necessidades. Valores globais pertencem exclusivamente a esta aba.");
  sheet.getRange(4, 1, 1, QUOTE_PROPOSAL_HEADERS_V1.length).setValues([QUOTE_PROPOSAL_HEADERS_V1]);
  if (records.length) {
    const rows = records.map((record) => [
      record.proposalId, record.supplierId, record.origin, record.quantity, record.subtotal, record.freight,
      record.otherCosts, record.total, record.paymentMethod, record.leadTimeDays, record.proposalValidUntil, record.link,
      record.supplierRating, record.status, record.selected, record.quoteDate, record.responsible, record.notes, record.createdAt,
      record.createdBy, record.updatedAt, record.updatedBy, record.version, record.active,
    ]);
    sheet.getRange(5, 1, rows.length, QUOTE_PROPOSAL_HEADERS_V1.length).setValues(rows);
  }
  formatMigrationTableV1(sheet, QUOTE_PROPOSAL_HEADERS_V1.length, records.length);
  applyQuoteProposalValidationV1(spreadsheet, sheet);
  sheet.getRange(5, 4, Math.max(records.length, 1), 5).setNumberFormat("R$ #,##0.00");
  sheet.getRange(5, 4, Math.max(records.length, 1), 1).setNumberFormat("0.00");
}

function rewriteQuoteLinksSheetV1(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  backup: GoogleAppsScript.Spreadsheet.Sheet,
  records: LegacyQuoteMigrationRecordV1[],
): void {
  const lastColumn = Math.max(sheet.getMaxColumns(), QUOTE_LINK_HEADERS_V1.length);
  ensureMigrationSheetSizeV1(sheet, Math.max(sheet.getMaxRows(), records.length + 4), lastColumn);
  sheet.getRange(2, 1).setValue("Cada linha vincula uma necessidade a uma proposta comercial. Frete e demais custos globais ficam em 16_PROPOSTAS_COTACAO.");
  sheet.getRange(4, 1, sheet.getMaxRows() - 3, lastColumn).clear();
  sheet.getRange(4, 1, 1, QUOTE_LINK_HEADERS_V1.length).setValues([QUOTE_LINK_HEADERS_V1]);
  if (records.length) {
    const rows = records.map((record) => [
      record.quoteId, record.proposalId, record.necessityId, record.storeId, record.itemId, record.unitPrice, record.quantity,
      record.subtotal, record.createdAt, record.createdBy, record.updatedAt, record.updatedBy, record.version, record.active,
    ]);
    sheet.getRange(5, 1, rows.length, QUOTE_LINK_HEADERS_V1.length).setValues(rows);
  }
  backup.getRange(4, 1, 1, Math.min(QUOTE_LINK_HEADERS_V1.length, backup.getMaxColumns()))
    .copyTo(sheet.getRange(4, 1, 1, Math.min(QUOTE_LINK_HEADERS_V1.length, backup.getMaxColumns())), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  formatMigrationTableV1(sheet, QUOTE_LINK_HEADERS_V1.length, records.length);
  sheet.getRange(5, 6, Math.max(records.length, 1), 3).setNumberFormat("R$ #,##0.00");
  sheet.getRange(5, 7, Math.max(records.length, 1), 1).setNumberFormat("0.00");
}

function appendQuoteProposalMigrationAuditV1(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  records: LegacyQuoteMigrationRecordV1[],
): void {
  const user: SystemUser = { id: "MIGRACAO_V1", name: "Migração manual V1", email: "EXECUCAO_MANUAL", profile: "ADMINISTRADOR", allowedStoreIds: "TODAS" };
  const entries: AuditEntry[] = records.flatMap((record) => ([
    {
      module: "COTACOES_PROPOSTA",
      recordId: record.proposalId,
      changes: [
        { field: "ID_Fornecedor", previous: "", next: record.supplierId },
        { field: "Quantidade_Total", previous: "", next: record.quantity },
        { field: "Valor_Total_Proposta", previous: "", next: record.total },
        { field: "Status", previous: "", next: record.status },
      ],
      reason: `Proposta individual criada a partir da cotação legada ${record.quoteId}.`,
      action: "MIGRACAO",
      origin: "MIGRACAO_MANUAL",
      reference: "QUOTE_PROPOSALS_V1",
    },
    {
      module: "COTACOES_VINCULO",
      recordId: record.quoteId,
      changes: [
        { field: "ID_Proposta", previous: "", next: record.proposalId },
        { field: "Subtotal_Linha", previous: "", next: record.subtotal },
      ],
      reason: `Vínculo preservado para ${record.necessityId}.`,
      action: "MIGRACAO",
      origin: "MIGRACAO_MANUAL",
      reference: "QUOTE_PROPOSALS_V1",
    },
  ]));
  appendAuditBatch(spreadsheet, user, entries);
}

function validateLegacyQuoteStatusV1(
  table: SheetTable,
  row: unknown[],
  recordId: string,
  report: QuoteProposalMigrationReportV1,
): void {
  const rawStatus = cell(table, row, "Status");
  const status = knownQuoteStatusV1(rawStatus);
  const selectedValue = normalizeHeader(cell(table, row, "Selecionada"));
  const selectedKnown = ["sim", "nao"].indexOf(selectedValue) >= 0;
  const selected = selectedValue === "sim";
  if (!status || !selectedKnown || (status === "SELECIONADA") !== selected) {
    report.incompatible_statuses.push({ record_id: recordId, status: rawStatus, selected: cell(table, row, "Selecionada"), issue: "Status e Selecionada devem ser conhecidos e consistentes." });
  }
}

function knownQuoteStatusV1(value: string): string | null {
  const statuses: Record<string, string> = { rascunho: "RASCUNHO", emandamento: "EM_ANDAMENTO", recebida: "RECEBIDA", selecionada: "SELECIONADA", descartada: "DESCARTADA", expirada: "EXPIRADA" };
  return statuses[normalizeHeader(value)] || null;
}

function emptyQuoteProposalMigrationReportV1(): QuoteProposalMigrationReportV1 {
  return {
    migration: "QUOTE_PROPOSALS_V1",
    checked_at: new Date().toISOString(),
    already_migrated: false,
    current_quotes: 0,
    proposals_to_create: 0,
    links_to_create: 0,
    duplicate_ids: [],
    orphan_records: [],
    invalid_values_totals: [],
    missing_necessities: [],
    missing_suppliers: [],
    incompatible_statuses: [],
    structural_issues: [],
    ready_to_migrate: false,
  };
}

function finalizeQuoteProposalMigrationPlanV1(
  report: QuoteProposalMigrationReportV1,
  records: LegacyQuoteMigrationRecordV1[],
): QuoteProposalMigrationPlanV1 {
  report.ready_to_migrate = [
    report.duplicate_ids,
    report.orphan_records,
    report.invalid_values_totals,
    report.missing_necessities,
    report.missing_suppliers,
    report.incompatible_statuses,
    report.structural_issues,
  ].every((issues) => issues.length === 0);
  return { report, records };
}

function inspectMigrationHeadersV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, keyHeader: string): { headerRow: number | null; normalizedHeaders: string[] } {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const rowCount = Math.min(Math.max(sheet.getLastRow(), 1), 10);
  const rows = sheet.getRange(1, 1, rowCount, lastColumn).getValues();
  const key = normalizeHeader(keyHeader);
  const offset = rows.findIndex((row) => row.some((value) => normalizeHeader(value) === key));
  return offset < 0 ? { headerRow: null, normalizedHeaders: [] } : { headerRow: offset + 1, normalizedHeaders: rows[offset].map(normalizeHeader) };
}

function findDuplicateMigrationIdsV1(table: SheetTable, header: string, sheetName: string): Array<Record<string, unknown>> {
  const idIndex = columnIndex(table, header);
  const occurrences: Record<string, number[]> = {};
  table.rows.forEach((row, index) => {
    const id = String(row[idIndex] || "").trim();
    if (id) (occurrences[id] ||= []).push(physicalRowNumber(table, index));
  });
  return Object.keys(occurrences).filter((id) => occurrences[id].length > 1).map((id) => ({ sheet: sheetName, id, rows: occurrences[id] }));
}

function uniqueMigrationRowMapV1(table: SheetTable, header: string): Record<string, unknown[]> {
  const idIndex = columnIndex(table, header);
  const result: Record<string, unknown[]> = {};
  table.rows.forEach((row) => {
    const id = String(row[idIndex] || "").trim();
    if (id && !result[id]) result[id] = row;
  });
  return result;
}

function legacyProposalIdsV1(table: SheetTable): string[] {
  const used: Record<string, boolean> = {};
  let fallback = 1;
  return table.rows.map((row) => {
    const quoteId = cell(table, row, "ID_Cotação");
    const match = quoteId.match(/^COT-(\d+)$/);
    let candidate = match ? `PRP-${String(Number(match[1])).padStart(6, "0")}` : "";
    while (!candidate || used[candidate]) candidate = `PRP-${String(fallback++).padStart(6, "0")}`;
    used[candidate] = true;
    return candidate;
  });
}

function rawCellV1(table: SheetTable, row: unknown[], header: string): unknown {
  const index = table.normalizedHeaders.indexOf(normalizeHeader(header));
  return index < 0 ? "" : row[index];
}

function migrationNumberV1(value: unknown, emptyDefault = Number.NaN): number {
  if (value === "" || value === null || value === undefined) return emptyDefault;
  return typeof value === "number" ? value : Number(value);
}

function roundMoneyV1(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function uniqueMigrationSheetNameV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, preferred: string): string {
  const base = preferred.slice(0, 95);
  let candidate = base;
  let suffix = 1;
  while (spreadsheet.getSheetByName(candidate)) candidate = `${base}_${suffix++}`.slice(0, 99);
  return candidate;
}

function ensureMigrationSheetSizeV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, rows: number, columns: number): void {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < columns) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
}

function formatMigrationTableV1(sheet: GoogleAppsScript.Spreadsheet.Sheet, columns: number, dataRows: number): void {
  const dark = "#17375E";
  const header = "#1F4E78";
  sheet.getRange(1, 1, 1, columns).setBackground(dark).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(16);
  sheet.getRange(2, 1, 1, columns).setBackground("#FFF2CC").setFontStyle("italic").setWrap(true);
  sheet.getRange(4, 1, 1, columns).setBackground(header).setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  if (dataRows) sheet.getRange(5, 1, dataRows, columns).setVerticalAlignment("middle");
  sheet.setFrozenRows(4);
  sheet.autoResizeColumns(1, columns);
}

function applyQuoteProposalValidationV1(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const lists = spreadsheet.getSheetByName(APP_CONFIG.sheets.lists);
  if (!lists) throw new ApiException("STRUCTURE_ERROR", "Aba 14_LISTAS não encontrada para aplicar validações.");
  const rows = Math.max(sheet.getMaxRows() - 4, 1);
  const validation = (range: GoogleAppsScript.Spreadsheet.Range) => SpreadsheetApp.newDataValidation().requireValueInRange(range, true).setAllowInvalid(false).build();
  sheet.getRange(5, 3, rows, 1).setDataValidation(validation(lists.getRange("F5:F10")));
  sheet.getRange(5, 9, rows, 1).setDataValidation(validation(lists.getRange("G5:G10")));
  sheet.getRange(5, 14, rows, 1).setDataValidation(validation(lists.getRange("C5:C10")));
  sheet.getRange(5, 15, rows, 1).setDataValidation(validation(lists.getRange("I5:I6")));
}

function restoreMigrationSheetV1(target: GoogleAppsScript.Spreadsheet.Sheet, backup: GoogleAppsScript.Spreadsheet.Sheet, startRow: number): void {
  ensureMigrationSheetSizeV1(target, backup.getMaxRows(), backup.getMaxColumns());
  const rowCount = target.getMaxRows() - startRow + 1;
  target.getRange(startRow, 1, rowCount, target.getMaxColumns()).clear();
  backup.getRange(startRow, 1, backup.getMaxRows() - startRow + 1, backup.getMaxColumns())
    .copyTo(target.getRange(startRow, 1, backup.getMaxRows() - startRow + 1, backup.getMaxColumns()), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
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
