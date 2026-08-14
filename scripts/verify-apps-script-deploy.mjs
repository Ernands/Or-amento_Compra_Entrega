import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [compiled, deployCode, sourceManifest, deployManifest] = await Promise.all([
  readFile(new URL("apps-script/dist/Code.js", root), "utf8"),
  readFile(new URL("apps-script/deploy/Code.gs", root), "utf8"),
  readFile(new URL("apps-script/appsscript.json", root), "utf8"),
  readFile(new URL("apps-script/deploy/appsscript.json", root), "utf8"),
]);

assert.equal(deployCode, compiled, "Code.gs diverge do JavaScript compilado.");
assert.equal(deployManifest, sourceManifest, "O manifesto de implantação está desatualizado.");
const manifest = JSON.parse(deployManifest);
assert.deepEqual(
  manifest.urlFetchWhitelist,
  ["https://oauth2.googleapis.com/tokeninfo"],
  "urlFetchWhitelist deve permitir somente o endpoint tokeninfo.",
);
assert.match(deployCode, /function doGet\(event\)/, "doGet(event) ausente.");
assert.match(deployCode, /function doPost\(event\)/, "doPost(event) ausente.");
assert.match(deployCode, /function dispatchPublicReadAction\(/, "Dispatch público isolado ausente.");
assert.match(deployCode, /function dispatchAuthenticatedAction\(/, "Dispatch autenticado ausente.");
assert.match(deployCode, /getProperty\("PUBLIC_READ_ACCESS"\)/, "PUBLIC_READ_ACCESS não usa PropertiesService.");
assert.match(deployCode, /verifyGoogleCredential\(requireGoogleCredential\(request\.credential\)\)[\s\S]*?const spreadsheet = openConfiguredSpreadsheet\(\)/, "Ações autenticadas devem exigir credencial antes de abrir a planilha.");
const publicDispatchCode = deployCode.slice(deployCode.indexOf("function dispatchPublicReadAction"), deployCode.indexOf("function dispatchAuthenticatedAction"));
for (const action of ["createSupplier", "createQuote", "updateQuote", "deleteQuote", "selectQuote", "createQuoteProposal", "updateQuoteProposal", "reopenQuoteProposal", "deleteQuoteProposal", "selectQuoteProposal", "updateNecessity", "updateStore", "createItem", "updateItem", "technicalStatus"]) {
  assert.doesNotMatch(publicDispatchCode, new RegExp(action), `${action} não pode pertencer ao dispatch público.`);
}
for (const action of ["publicBootstrap", "publicQuotesWorkspace"]) {
  assert.match(publicDispatchCode, new RegExp(`case "${action}":`), `${action} deve pertencer ao dispatch público.`);
}
assert.match(deployCode, /function updateStore\(/, "updateStore ausente.");
assert.match(deployCode, /case "createItem":/, "A ação createItem não está no dispatch autenticado.");
assert.match(deployCode, /function createItem[\s\S]*?return withScriptLock\(/, "createItem deve usar LockService.");
assert.match(deployCode, /function createItem[\s\S]*?setTechnicalCreationFields[\s\S]*?appendCreatedRow/, "createItem deve preencher metadados e auditoria.");
assert.match(deployCode, /function updateItem\(/, "updateItem ausente.");
assert.match(deployCode, /function updateItem[\s\S]*?buildItemDefinitionNecessitySyncPlanV1[\s\S]*?performAtomicWritesV1/, "updateItem deve sincronizar necessidades na mesma gravação atômica.");
assert.match(deployCode, /function buildItemDefinitionNecessitySyncPlanV1\(/, "Planejamento da sincronização Item → Necessidades ausente.");
assert.match(deployCode, /function updateStore[\s\S]*?validateStoreStatusV1/, "Status de loja deve ser validado no backend.");
assert.match(deployCode, /function createQuoteProposal[\s\S]*?assertQuotePaymentTermsSchemaV1/, "Criação de proposta deve exigir colunas de parcelas e entrada.");
assert.match(deployCode, /function updateQuoteProposal[\s\S]*?QUOTE_INSTALLMENTS_HEADER_V1[\s\S]*?QUOTE_DOWN_PAYMENT_HEADER_V1/, "Edição de proposta deve persistir parcelas e entrada.");
for (const action of ["quotesWorkspace", "createSupplier", "createQuote", "updateQuote", "deleteQuote", "selectQuote"]) {
  assert.match(deployCode, new RegExp(`case "${action}":`), `A ação ${action} não está no dispatch autenticado.`);
}
for (const operation of ["createSupplier", "createQuote", "updateQuote", "deleteQuote", "selectQuote"]) {
  assert.match(deployCode, new RegExp(`function ${operation}\\(`), `${operation} ausente.`);
}
for (const action of ["createQuoteProposal", "updateQuoteProposal", "reopenQuoteProposal", "deleteQuoteProposal", "selectQuoteProposal"]) {
  assert.match(deployCode, new RegExp(`case "${action}":`), `A acao agrupada ${action} nao esta no dispatch autenticado.`);
  assert.match(deployCode, new RegExp(`function ${action}\\(`), `A operacao agrupada ${action} esta ausente.`);
}
for (const operation of ["createQuoteProposal", "updateQuoteProposal", "reopenQuoteProposal", "deleteQuoteProposal", "selectQuoteProposal"]) {
  assert.match(deployCode, new RegExp(`function ${operation}[\\s\\S]*?return withScriptLock\\(`), `${operation} deve usar LockService.`);
  assert.match(deployCode, new RegExp(`function ${operation}[\\s\\S]*?assertGroupedQuoteSchemaV1`), `${operation} deve bloquear gravacao antes da migracao.`);
}
assert.match(deployCode, /function updateQuoteProposal[\s\S]*?findVersionedRow/, "updateQuoteProposal deve validar version.");
assert.match(deployCode, /function reopenQuoteProposal[\s\S]*?RECEBIDA/, "reopenQuoteProposal deve exigir estado RECEBIDA.");
assert.match(deployCode, /function selectQuoteProposal[\s\S]*?SELECTED_SCOPE_CONFLICT/, "selectQuoteProposal deve bloquear sobreposicao selecionada.");
assert.match(deployCode, /function resolveGroupedQuoteScopeV1[\s\S]*?MIXED_ITEMS_NOT_SUPPORTED/, "O escopo V1 deve aceitar um item em varias lojas.");
assert.match(deployCode, /function quoteScopeSignatureV1/, "Assinatura canonica de escopo ausente.");
assert.match(deployCode, /function dispatchAuthenticatedAction[\s\S]*?CLIENT_UPDATE_REQUIRED/, "As acoes legadas devem exigir atualizacao do frontend.");
assert.match(deployCode, /function createQuote[\s\S]*?return withScriptLock\(/, "createQuote deve usar LockService.");
assert.match(deployCode, /function updateQuote[\s\S]*?findVersionedRow\(/, "updateQuote deve validar version.");
assert.match(deployCode, /function deleteQuote[\s\S]*?return withScriptLock\(/, "deleteQuote deve usar LockService.");
assert.match(deployCode, /function deleteQuote[\s\S]*?findVersionedRow\(/, "deleteQuote deve validar version.");
assert.match(deployCode, /function deleteQuote[\s\S]*?applyChange\(table, found\.current, "ativo", false/, "deleteQuote deve realizar exclusão lógica.");
assert.match(deployCode, /function selectQuote[\s\S]*?findVersionedRow\(/, "selectQuote deve validar version.");
assert.match(deployCode, /APP_CONFIG\.sheets\.lists/, "Cotações deve validar opções pela aba 14_LISTAS.");
assert.match(deployCode, /function createQuote[\s\S]*?derivePlannedQuoteQuantity/, "createQuote deve derivar a quantidade planejada.");
assert.match(deployCode, /function updateQuote[\s\S]*?derivePlannedQuoteQuantity/, "updateQuote deve preservar a quantidade planejada.");
assert.match(deployCode, /function updateQuote[\s\S]*?"ID_Necessidade"[\s\S]*?"ID_Loja"[\s\S]*?"ID_Item"/, "updateQuote deve derivar loja e item da necessidade escolhida.");
assert.match(deployCode, /function selectQuote[\s\S]*?isQuoteMarkedSelected/, "selectQuote deve remover qualquer seleção anterior inconsistente.");
assert.match(deployCode, /function createSupplier[\s\S]*?hasDuplicateNormalizedTaxId/, "createSupplier deve bloquear CNPJ/CPF normalizado duplicado.");
assert.match(deployCode, /function createQuote[\s\S]*?assertNecessityCanBeQuoted/, "createQuote deve validar o status da necessidade.");
assert.match(deployCode, /function buildBootstrap[\s\S]*?activeQuoteNecessityIds/, "bootstrap deve informar necessidades com cotação ativa.");
assert.match(deployCode, /function buildBootstrap[\s\S]*?capabilities[\s\S]*?createItem: true[\s\S]*?itemProductLink:/, "bootstrap deve negociar as capacidades do catálogo.");
assert.match(deployCode, /function buildQuotesWorkspace[\s\S]*?isActiveQuoteRow/, "quotesWorkspace deve ocultar cotações excluídas.");
const legacyWorkspaceCode = deployCode.slice(deployCode.indexOf("function buildLegacyQuotesWorkspace"), deployCode.indexOf("function quoteSchemaMode"));
assert.match(legacyWorkspaceCode, /mapLegacyQuoteProposal\(quotesTable, row\)/, "quotesWorkspace LEGACY autenticado deve devolver o contrato de proposta usado pela tela.");
assert.doesNotMatch(legacyWorkspaceCode, /mapQuote\(quotesTable, row\)/, "quotesWorkspace LEGACY não pode devolver o registro plano incompatível com a tela.");
assert.match(deployCode, /findFirstWritableRow\(table, "ID_Cotação"\)/, "createQuote deve usar a primeira linha com ID vazio.");
assert.match(deployCode, /function readTable[\s\S]*?rowNumbers/, "readTable deve preservar os números físicos das linhas.");
assert.doesNotMatch(deployCode, /getLastRow\(\) \+ 1/, "Gravações não podem depender de getLastRow() + 1.");
assert.match(deployCode, /case "technicalStatus":/, "A ação technicalStatus não está no dispatch autenticado.");
assert.match(deployCode, /function buildTechnicalStatus\(/, "buildTechnicalStatus ausente.");
assert.match(deployCode, /function inspectTechnicalTable\(/, "Inspeção técnica leve ausente.");
assert.match(deployCode, /function assertModulePermission\(/, "Validação central de permissões ausente.");
assert.match(deployCode, /getProperty\("SPREADSHEET_ID"\)/, "SPREADSHEET_ID não usa PropertiesService.");
assert.match(deployCode, /getProperty\("GOOGLE_CLIENT_ID"\)/, "GOOGLE_CLIENT_ID não usa PropertiesService.");
assert.doesNotMatch(
  deployCode,
  /1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c/,
  "O ID DEV não pode estar hardcoded em Code.gs.",
);
assert.equal(
  (deployCode.match(/UrlFetchApp\.fetch\(/g) || []).length,
  1,
  "Code.gs deve possuir exatamente uma chamada externa por UrlFetchApp.",
);
assert.match(
  deployCode,
  /UrlFetchApp\.fetch\(`https:\/\/oauth2\.googleapis\.com\/tokeninfo\?id_token=/,
  "A única chamada UrlFetchApp deve usar o endpoint tokeninfo permitido.",
);

assert.match(deployCode, /function prevalidateQuoteProposalsV1\(/, "Prevalidacao manual da migracao de propostas ausente.");
assert.match(deployCode, /function migrateQuoteProposalsV1\(/, "Migracao manual de propostas ausente.");
assert.match(deployCode, /ALLOW_MIGRATE_QUOTE_PROPOSALS_V1/, "A migracao deve exigir uma propriedade temporaria propria.");
const migrationEntryCode = deployCode.slice(
  deployCode.indexOf("function migrateQuoteProposalsV1"),
  deployCode.indexOf("function buildQuoteProposalMigrationPlanV1"),
);
assert.match(
  migrationEntryCode,
  /buildQuoteProposalMigrationPlanV1\(spreadsheet\)[\s\S]*?if \(!plan\.report\.ready_to_migrate\)[\s\S]*?executeQuoteProposalMigrationV1\(spreadsheet, plan\)/,
  "A migracao deve abortar pela prevalidacao antes de chamar a primeira rotina de escrita.",
);
assert.match(migrationEntryCode, /deleteProperty\(QUOTE_PROPOSAL_MIGRATION_PROPERTY_V1\)/, "A propriedade temporaria deve ser consumida ao final.");
assert.doesNotMatch(migrationEntryCode, /setupTechnicalColumns/, "A migracao nao pode executar setupTechnicalColumns().");
const migrationPrevalidationCode = deployCode.slice(
  deployCode.indexOf("function prevalidateQuoteProposalsV1"),
  deployCode.indexOf("function migrateQuoteProposalsV1"),
);
assert.doesNotMatch(
  migrationPrevalidationCode,
  /setValue|setValues|clear\(|copyTo\(|insertSheet|deleteSheet|appendAudit/,
  "A funcao publica de prevalidacao deve ser estritamente somente leitura.",
);

assert.match(deployCode, /function prevalidateImplantationV1\(/, "prevalidateImplantationV1 ausente.");
assert.match(deployCode, /function setupImplantationV1\(/, "setupImplantationV1 ausente.");
assert.match(deployCode, /function validateImplantationV1\(/, "validateImplantationV1 ausente.");
assert.match(deployCode, /ALLOW_SETUP_IMPLANTATION_V1/, "O setup de Implantacao deve exigir propriedade temporaria propria.");
const authenticatedDispatchCode = deployCode.slice(
  deployCode.indexOf("function dispatchAuthenticatedAction"),
  deployCode.indexOf("function buildPublicBootstrap"),
);
for (const action of ["prevalidateImplantationV1", "setupImplantationV1", "validateImplantationV1"]) {
  assert.doesNotMatch(publicDispatchCode, new RegExp(action), `${action} nao pode pertencer ao dispatch publico.`);
  assert.doesNotMatch(authenticatedDispatchCode, new RegExp(action), `${action} deve permanecer somente como funcao manual do editor.`);
}
const implantationPrevalidationCode = deployCode.slice(
  deployCode.indexOf("function prevalidateImplantationV1"),
  deployCode.indexOf("function setupImplantationV1"),
);
assert.doesNotMatch(
  implantationPrevalidationCode,
  /\.setValue|\.setValues|\.clear\(|\.copyTo\(|\.insertSheet|\.deleteSheet|appendAudit/,
  "A pre-validacao de Implantacao e seus auxiliares devem ser estritamente somente leitura.",
);
const implantationSetupEntryCode = deployCode.slice(
  deployCode.indexOf("function setupImplantationV1"),
  deployCode.indexOf("function validateImplantationV1"),
);
assert.match(implantationSetupEntryCode, /getScriptLock\(\)/, "O setup de Implantacao deve adquirir ScriptLock.");
assert.match(implantationSetupEntryCode, /buildImplantationPrevalidationV1\(spreadsheet\)/, "O setup deve repetir a pre-validacao dentro do lock.");
assert.match(implantationSetupEntryCode, /if \(!reportBefore\.ready_to_setup\)/, "O setup deve abortar antes da escrita quando a pre-validacao falhar.");
assert.match(implantationSetupEntryCode, /deleteProperty\(IMPLANTATION_SETUP_PROPERTY_V1\)/, "A propriedade temporaria de Implantacao deve ser consumida.");
assert.doesNotMatch(implantationSetupEntryCode, /setupTechnicalColumns/, "O setup de Implantacao nao pode chamar setupTechnicalColumns().");
assert.match(deployCode, /function rollbackImplantationSetupV1\(/, "Rollback integral do setup de Implantacao ausente.");
assert.deepEqual(
  manifest.oauthScopes,
  ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/script.external_request"],
  "A preparacao de Implantacao nao pode incluir escopo do Drive.",
);

const scriptProperties = { PUBLIC_READ_ACCESS: "SIM", SPREADSHEET_ID: "DEV_TEST" };
const sandbox = {
  console,
  ContentService: {
    MimeType: { JSON: "application/json" },
    createTextOutput(content) {
      return {
        content,
        getContent() { return this.content; },
        setMimeType() { return this; },
      };
    },
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (name) => scriptProperties[name] || null,
      deleteProperty: (name) => { delete scriptProperties[name]; },
    }),
  },
  LockService: {
    getScriptLock: () => ({ tryLock: () => true, releaseLock: () => undefined }),
  },
  SpreadsheetApp: { CopyPasteType: { PASTE_NORMAL: "PASTE_NORMAL" } },
  Utilities: { getUuid: () => "local-request-id" },
};

vm.createContext(sandbox);
vm.runInContext(deployCode, sandbox, { filename: "Code.gs" });

const implantationSeedReport = sandbox.emptyImplantationPrevalidationV1();
sandbox.validateImplantationSeedV1(implantationSeedReport);
assert.equal(implantationSeedReport.checklist_model.activities, 30);
assert.equal(implantationSeedReport.checklist_model.evidence_rules, 16);
assert.equal(implantationSeedReport.checklist_model.checksum_sha256, "9433f887315bbd5db40e4b94fa726a79edc0db639905347fcbb3a8fe8d78da39");
for (const field of ["duplicate_seed_activity_codes", "invalid_offsets", "invalid_responsible_roles", "invalid_evidence_rules", "invalid_critical_rules", "structural_issues"]) {
  assert.equal(implantationSeedReport[field].length, 0, `Seed de Implantacao invalido em ${field}.`);
}
assert.equal(sandbox.validateImplantationTransitionV1({ from: "NAO_INICIADO", to: "EM_ANDAMENTO", currentProgress: 0, requestedProgress: 25 }), 25);
assert.equal(sandbox.validateImplantationTransitionV1({ from: "EM_ANDAMENTO", to: "BLOQUEADO", currentProgress: 50, reason: "Aguardando BB" }), 50);
assert.throws(
  () => sandbox.validateImplantationTransitionV1({ from: "EM_ANDAMENTO", to: "CANCELADO", currentProgress: 50, canCancel: true }),
  /Motivo obrigat.rio/,
);
assert.equal(sandbox.calculateImplantationStoreProgressV1([
  { status: "CONCLUIDO", progress: 100, active: true },
  { status: "EM_ANDAMENTO", progress: 50, active: true },
  { status: "NAO_APLICAVEL", progress: 0, active: true },
]), 75);
assert.equal(sandbox.calculateImplantationTargetDateV1("2026-09-30", -30), "2026-08-31");
assert.equal(sandbox.isUpcomingImplantationV1("2026-08-14", "2026-09-13"), true);
assert.equal(sandbox.isCriticalUpcomingImplantationV1("2026-08-14", "2026-08-21"), true);
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.missingImplantationEvidenceV1("CHK-MOD-00024", [
    { type: "FOTO", active: true },
    { type: "DOCUMENTO", active: true },
  ]))),
  [{ type: "FOTO", required: 2, found: 1 }],
);
assert.equal(sandbox.isImplantationStoreReadyV1([]), false);

const originalOpenConfiguredSpreadsheet = sandbox.openConfiguredSpreadsheet;
const originalBuildImplantationPrevalidation = sandbox.buildImplantationPrevalidationV1;
const originalExecuteImplantationSetup = sandbox.executeImplantationSetupV1;
scriptProperties.ALLOW_SETUP_IMPLANTATION_V1 = "SIM";
sandbox.openConfiguredSpreadsheet = () => ({});
sandbox.buildImplantationPrevalidationV1 = () => ({ already_initialized: true, ready_to_setup: false });
sandbox.executeImplantationSetupV1 = () => { throw new Error("Setup idempotente não pode escrever."); };
const idempotentSetup = sandbox.setupImplantationV1();
assert.equal(idempotentSetup.status, "already_initialized");
assert.equal(scriptProperties.ALLOW_SETUP_IMPLANTATION_V1, undefined, "A propriedade temporaria deve ser consumida mesmo no retorno idempotente.");
sandbox.openConfiguredSpreadsheet = originalOpenConfiguredSpreadsheet;
sandbox.buildImplantationPrevalidationV1 = originalBuildImplantationPrevalidation;
sandbox.executeImplantationSetupV1 = originalExecuteImplantationSetup;

let copiedBackup = 0;
const originalSheet = {
  getName: () => "01_LOJAS",
  getMaxRows: () => 10,
  getMaxColumns: () => 5,
  getRange: () => ({ clear: () => undefined }),
  setFrozenRows: () => undefined,
  setFrozenColumns: () => undefined,
};
const backupSheet = {
  getName: () => "BKP_IMPL_V1_01_LOJAS",
  getMaxRows: () => 10,
  getMaxColumns: () => 5,
  getRange: () => ({ copyTo: () => { copiedBackup += 1; } }),
  getFrozenRows: () => 4,
  getFrozenColumns: () => 0,
};
const createdSheet = { getName: () => "17_CHECKLIST_MODELOS" };
const rollbackSheets = { "17_CHECKLIST_MODELOS": createdSheet, "BKP_IMPL_V1_01_LOJAS": backupSheet };
const removedRollbackSheets = [];
const rollbackReport = sandbox.rollbackImplantationSetupV1({
  getSheetByName: (name) => rollbackSheets[name] || null,
  deleteSheet: (sheet) => { removedRollbackSheets.push(sheet.getName()); delete rollbackSheets[sheet.getName()]; },
}, { backups: [{ original: originalSheet, backup: backupSheet }], createdSheets: [createdSheet] });
assert.equal(rollbackReport.ok, true);
assert.equal(copiedBackup, 1, "O rollback deve restaurar a aba original a partir do backup.");
assert.deepEqual(Array.from(rollbackReport.restored), ["01_LOJAS"]);
assert.deepEqual(Array.from(rollbackReport.removed), ["17_CHECKLIST_MODELOS"]);
assert.deepEqual(removedRollbackSheets, ["17_CHECKLIST_MODELOS", "BKP_IMPL_V1_01_LOJAS"]);

const getHealth = JSON.parse(sandbox.doGet({ parameter: { action: "health" } }).getContent());
assert.equal(getHealth.ok, true);
assert.equal(getHealth.data.status, "ok");

const postHealth = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "health", payload: {} }) },
}).getContent());
assert.equal(postHealth.ok, true);
assert.equal(postHealth.data.status, "ok");
assert.equal(postHealth.requestId, "local-request-id");

const unauthenticatedWrite = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "createQuote", payload: {} }) },
}).getContent());
assert.equal(unauthenticatedWrite.ok, false);
assert.equal(unauthenticatedWrite.error.code, "AUTH_REQUIRED");
assert.match(unauthenticatedWrite.error.message, /Entre com Google/);

function fakeDataSheet(headers, rows) {
  const values = [[""], [""], [""], headers, ...rows];
  return {
    getLastColumn: () => headers.length,
    getLastRow: () => values.length,
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowIndex) => Array.from({ length: columnCount }, (_entry, columnIndex) => values[row - 1 + rowIndex]?.[column - 1 + columnIndex] ?? "")),
    }),
  };
}

const legacyQuoteHeaders = [
  "ID_Cotacao", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Origem_Cotacao",
  "Preco_Unitario", "Quantidade", "Frete", "Outros_Custos", "Valor_Total", "Forma_Pagamento",
  "Prazo_Dias", "Validade_Proposta", "Link", "Nota_Fornecedor", "Status", "Selecionada",
  "Data_Cotacao", "Responsavel", "Observacoes", "created_at", "created_by", "updated_at",
  "updated_by", "version", "ativo",
];
const groupedProposalHeaders = [
  "ID_Proposta", "ID_Fornecedor", "Origem_Cotacao", "Quantidade_Total", "Subtotal_Itens", "Frete_Total",
  "Outros_Custos_Total", "Valor_Total_Proposta", "Forma_Pagamento", "Prazo_Dias", "Validade_Proposta", "Link",
  "Nota_Fornecedor", "Status", "Selecionada", "Data_Cotacao", "Responsavel", "Observacoes", "created_at",
  "created_by", "updated_at", "updated_by", "version", "ativo",
];
const groupedLineHeaders = [
  "ID_Cotacao", "ID_Proposta", "ID_Necessidade", "ID_Loja", "ID_Item", "Preco_Unitario", "Quantidade",
  "Subtotal_Linha", "created_at", "created_by", "updated_at", "updated_by", "version", "ativo",
];
const legacyQuoteRow = [
  "COT-000001", "NEC-000001", "LOJ-001", "ITM-00001", "FOR-000001", "Matriz",
  575, 1, 2, 2, 579, "PIX", 10, "2026-08-31", "https://example.com/proposta", 5,
  "Recebida", "Nao", "2026-08-13", "Ernands Santos", "Registro legado", "2026-08-13",
  "USR-000001", "2026-08-13", "USR-000001", 1, "Sim",
];
function legacyMigrationSpreadsheet(quoteRows = [legacyQuoteRow], supplierRows = [["FOR-000001"]]) {
  const sheets = {
    "05_COTACOES": fakeDataSheet(legacyQuoteHeaders, quoteRows),
    "03_NECESSIDADES": fakeDataSheet(
      ["ID_Necessidade", "ID_Loja", "ID_Item"],
      [["NEC-000001", "LOJ-001", "ITM-00001"]],
    ),
    "04_FORNECEDORES": fakeDataSheet(["ID_Fornecedor"], supplierRows),
    "12_HISTORICO": fakeDataSheet(
      ["ID_Historico", "Data_Hora", "ID_Usuario", "Modulo", "ID_Registro", "Acao", "Campo", "Valor_Anterior", "Valor_Novo", "Origem", "Referencia", "Observacoes"],
      [],
    ),
    "14_LISTAS": {
      getRange: (range) => ({
        getValues: () => range === "I5:I6" ? [["Sim"], ["Nao"]] : [["Opcao"], [""], [""], [""], [""], [""]],
      }),
    },
  };
  return { getSheetByName: (name) => sheets[name] || null };
}

const migrationPlan = sandbox.buildQuoteProposalMigrationPlanV1(legacyMigrationSpreadsheet());
assert.equal(migrationPlan.report.current_quotes, 1);
assert.equal(migrationPlan.report.proposals_to_create, 1);
assert.equal(migrationPlan.report.links_to_create, 1);
assert.equal(migrationPlan.report.ready_to_migrate, true);
assert.equal(migrationPlan.records[0].quoteId, "COT-000001");
assert.equal(migrationPlan.records[0].proposalId, "PRP-000001");
assert.equal(migrationPlan.records[0].subtotal, 575);
assert.equal(migrationPlan.records[0].total, 579);

const legacyQuotesTable = sandbox.readTable(legacyMigrationSpreadsheet(), "05_COTACOES", ["ID_Cotacao", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor"]);
const authenticatedLegacyQuote = sandbox.mapLegacyQuoteProposal(legacyQuotesTable, legacyQuotesTable.rows[0]);
assert.equal(authenticatedLegacyQuote.id, "COT-000001");
assert.equal(authenticatedLegacyQuote.storeIds.length, 1);
assert.equal(authenticatedLegacyQuote.storeIds[0], "LOJ-001");
assert.equal(authenticatedLegacyQuote.necessityIds.length, 1);
assert.equal(authenticatedLegacyQuote.necessityIds[0], "NEC-000001");
assert.equal(authenticatedLegacyQuote.lines.length, 1);
assert.equal(authenticatedLegacyQuote.lines[0].necessityId, "NEC-000001");

function itemDefinitionSyncTable(rows) {
  const spreadsheet = {
    getSheetByName: (name) => name === "03_NECESSIDADES" ? fakeDataSheet(
      ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"],
      rows,
    ) : null,
  };
  return sandbox.readTable(spreadsheet, "03_NECESSIDADES", ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
}

const releaseDefinitionPlan = sandbox.buildItemDefinitionNecessitySyncPlanV1(itemDefinitionSyncTable([
  ["NEC-000001", "LOJ-001", "ITM-00002", 1, "Pendente definição", 1, "", ""],
  ["NEC-000002", "LOJ-002", "ITM-00002", 2, "Pendente definição", 1, "", ""],
  ["NEC-000003", "LOJ-003", "ITM-00003", 1, "Pendente definição", 1, "", ""],
]), "ITM-00002", "PENDENTE_DEFINICAO", "LIBERADO_PARA_COTACAO");
assert.equal(releaseDefinitionPlan.length, 2);
assert.equal(releaseDefinitionPlan[0].necessityId, "NEC-000001");
assert.equal(releaseDefinitionPlan[1].necessityId, "NEC-000002");

const returnToPendingPlan = sandbox.buildItemDefinitionNecessitySyncPlanV1(itemDefinitionSyncTable([
  ["NEC-000001", "LOJ-001", "ITM-00002", 1, "Não iniciado", 2, "", ""],
  ["NEC-000002", "LOJ-002", "ITM-00002", 1, "Pendente definição", 1, "", ""],
]), "ITM-00002", "LIBERADO_PARA_COTACAO", "PENDENTE_DEFINICAO");
assert.equal(returnToPendingPlan.length, 1);
assert.equal(returnToPendingPlan[0].necessityId, "NEC-000001");

assert.throws(
  () => sandbox.buildItemDefinitionNecessitySyncPlanV1(itemDefinitionSyncTable([
    ["NEC-000001", "LOJ-001", "ITM-00002", 1, "Em cotação", 3, "", ""],
  ]), "ITM-00002", "LIBERADO_PARA_COTACAO", "PENDENTE_DEFINICAO"),
  /cotação ou etapa posterior/i,
  "Item em uso não pode retornar para Pendente definição.",
);

const invalidTotalRow = legacyQuoteRow.slice();
invalidTotalRow[10] = 999;
const invalidTotalPlan = sandbox.buildQuoteProposalMigrationPlanV1(legacyMigrationSpreadsheet([invalidTotalRow]));
assert.equal(invalidTotalPlan.report.ready_to_migrate, false);
assert.equal(invalidTotalPlan.report.invalid_values_totals.length, 1);

const missingSupplierPlan = sandbox.buildQuoteProposalMigrationPlanV1(legacyMigrationSpreadsheet([legacyQuoteRow], []));
assert.equal(missingSupplierPlan.report.ready_to_migrate, false);
assert.equal(missingSupplierPlan.report.missing_suppliers.length, 1);

const duplicateQuotePlan = sandbox.buildQuoteProposalMigrationPlanV1(legacyMigrationSpreadsheet([legacyQuoteRow, legacyQuoteRow]));
assert.equal(duplicateQuotePlan.report.ready_to_migrate, false);
assert.equal(duplicateQuotePlan.report.duplicate_ids.length, 1);

assert.equal(sandbox.quoteSchemaMode(legacyMigrationSpreadsheet()), "LEGACY");
assert.throws(
  () => sandbox.assertGroupedQuoteSchemaV1(legacyMigrationSpreadsheet()),
  /pré-migração|pre-migração/i,
  "O backend nao pode gravar no formato agrupado antes da migracao.",
);
const groupedSchemaSpreadsheet = {
  getSheetByName: (name) => ({
    "05_COTACOES": fakeDataSheet(["ID_Cotacao", "ID_Proposta"], []),
    "16_PROPOSTAS_COTACAO": fakeDataSheet(["ID_Proposta"], []),
  })[name] || null,
};
assert.equal(sandbox.quoteSchemaMode(groupedSchemaSpreadsheet), "GROUPED");
assert.throws(
  () => sandbox.quoteSchemaMode({ getSheetByName: (name) => name === "05_COTACOES" ? fakeDataSheet(["ID_Cotacao", "ID_Proposta"], []) : null }),
  /parcial/i,
  "Uma migracao parcial deve bloquear o runtime.",
);

const scopeSpreadsheet = {
  getSheetByName: () => fakeDataSheet(
    ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"],
    [
      ["NEC-000002", "LOJ-002", "ITM-00001", 2, "Em cotacao", 1, "", ""],
      ["NEC-000001", "LOJ-001", "ITM-00001", 1, "Nao iniciado", 1, "", ""],
    ],
  ),
};
const scopeTable = sandbox.readTable(scopeSpreadsheet, "03_NECESSIDADES", ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
const groupedScope = sandbox.resolveGroupedQuoteScopeV1({ allowedStoreIds: "TODAS" }, ["NEC-000002", "NEC-000001"], scopeTable);
assert.deepEqual(Array.from(groupedScope, (line) => line.necessityId), ["NEC-000001", "NEC-000002"]);
assert.equal(groupedScope.reduce((sum, line) => sum + line.quantity, 0), 3);
assert.equal(sandbox.quoteScopeSignatureV1(groupedScope), "NEC-000001:ITM-00001:1|NEC-000002:ITM-00001:2");
assert.throws(
  () => sandbox.resolveGroupedQuoteScopeV1({ allowedStoreIds: ["LOJ-001"] }, ["NEC-000001", "NEC-000002"], scopeTable),
  /escopo de acesso/i,
  "Todas as lojas da proposta devem pertencer a Lojas_Permitidas.",
);
const mixedScopeTable = sandbox.readTable({ getSheetByName: () => fakeDataSheet(
  ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"],
  [["NEC-000001", "LOJ-001", "ITM-00001", 1, "Nao iniciado", 1, "", ""], ["NEC-000002", "LOJ-002", "ITM-00002", 1, "Nao iniciado", 1, "", ""]],
) }, "03_NECESSIDADES", ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "version", "updated_at", "updated_by"]);
assert.throws(
  () => sandbox.resolveGroupedQuoteScopeV1({ allowedStoreIds: "TODAS" }, ["NEC-000001", "NEC-000002"], mixedScopeTable),
  /exatamente um item/i,
  "A fase V1 nao pode misturar itens na mesma proposta.",
);

const proposalConflictTable = sandbox.readTable({ getSheetByName: () => fakeDataSheet(
  ["ID_Proposta", "Status", "Selecionada", "ativo"],
  [["PRP-000001", "Selecionada", "Sim", "Sim"], ["PRP-000002", "Recebida", "Nao", "Sim"]],
) }, "16_PROPOSTAS_COTACAO", ["ID_Proposta", "Status", "Selecionada", "ativo"]);
const lineConflictTable = sandbox.readTable({ getSheetByName: () => fakeDataSheet(
  ["ID_Cotacao", "ID_Proposta", "ID_Necessidade", "ativo"],
  [["COT-000001", "PRP-000001", "NEC-000001", "Sim"], ["COT-000002", "PRP-000002", "NEC-000001", "Sim"]],
) }, "05_COTACOES", ["ID_Cotacao", "ID_Proposta", "ID_Necessidade", "ativo"]);
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.findSelectedScopeConflictsV1(proposalConflictTable, lineConflictTable, { "NEC-000001": true }, "PRP-000002"))),
  [{ proposalId: "PRP-000001", necessityId: "NEC-000001" }],
  "Uma proposta selecionada sobreposta deve bloquear a nova selecao sem ser desmontada.",
);

const publicSheets = {
  "01_LOJAS": fakeDataSheet(
    ["ID_Loja", "Loja", "Cidade", "UF", "Status", "Responsável", "E-mail", "Telefone"],
    [["LOJ-001", "Loja 01", "Fortaleza", "CE", "Ativa", "Pessoa privada", "privado@example.com", "85999999999"]],
  ),
  "02_ITENS": fakeDataSheet(
    ["ID_Item", "Código_Original", "Grupo", "Área", "Item", "Status_Especificação", "Código_Duplicado", "Observações"],
    [["ITM-00001", "MOB-001", "Mobiliário", "Transacional", "Balcão", "Liberado para cotação", "Não", "Nota privada"]],
  ),
  "03_NECESSIDADES": fakeDataSheet(
    ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Prioridade", "Status", "created_by"],
    [["NEC-000001", "LOJ-001", "ITM-00001", 1, "Média", "Em cotação", "privado@example.com"]],
  ),
  "05_COTACOES": fakeDataSheet(
    ["ID_Cotação", "ID_Necessidade", "ID_Loja", "ID_Item", "ID_Fornecedor", "Quantidade", "Valor_Total", "Prazo_Dias", "Status", "Selecionada", "Link_Proposta", "Observações", "created_by", "ativo"],
    [["COT-999999", "NEC-000001", "LOJ-001", "ITM-00001", "FOR-999999", 1, 579, 10, "Recebida", "Não", "https://privado.example/proposta", "Nota privada", "privado@example.com", "Sim"]],
  ),
};
const publicSpreadsheet = { getSheetByName: (name) => publicSheets[name] || null };
const publicBootstrap = sandbox.buildPublicBootstrap(publicSpreadsheet);
assert.deepEqual(Object.keys(publicBootstrap.stores[0]), ["id", "name", "city", "state", "status"]);
assert.deepEqual(Object.keys(publicBootstrap.necessities[0]), ["id", "storeId", "itemId", "quantity", "priority", "status"]);
assert.doesNotMatch(JSON.stringify(publicBootstrap), /Pessoa privada|privado@example\.com|Nota privada/);
const publicQuotes = sandbox.buildPublicQuotesWorkspace(publicSpreadsheet);
assert.deepEqual(Object.keys(publicQuotes.suppliers[0]), ["id", "name"]);
assert.deepEqual(Object.keys(publicQuotes.quotes[0]), ["id", "itemId", "supplierId", "lines", "necessityIds", "storeIds", "scopeSignature", "quantityTotal", "total", "leadTimeDays", "status", "selected"]);
assert.equal(publicQuotes.suppliers[0].name, "Fornecedor 01");
assert.equal(publicQuotes.quotes[0].id, "PUB-COT-000001");
assert.equal(publicQuotes.schemaMode, "LEGACY");
assert.doesNotMatch(JSON.stringify(publicQuotes), /FOR-999999|COT-999999|privado|proposta|Nota privada/i);

const groupedPublicSheets = {
  "16_PROPOSTAS_COTACAO": fakeDataSheet(groupedProposalHeaders, [[
    "PRP-000001", "FOR-000001", "Matriz", 3, 300, 20, 5, 325, "PIX", 10, "2026-08-31", "https://privado.example/proposta",
    5, "Recebida", "Nao", "2026-08-13", "Pessoa privada", "Nota privada", "", "privado@example.com", "", "privado@example.com", 2, "Sim",
  ]]),
  "05_COTACOES": fakeDataSheet(groupedLineHeaders, [
    ["COT-000001", "PRP-000001", "NEC-000001", "LOJ-001", "ITM-00001", 100, 1, 100, "", "privado@example.com", "", "privado@example.com", 1, "Sim"],
    ["COT-000002", "PRP-000001", "NEC-000002", "LOJ-002", "ITM-00001", 100, 2, 200, "", "privado@example.com", "", "privado@example.com", 1, "Sim"],
  ]),
};
const groupedPublicQuotes = sandbox.buildPublicQuotesWorkspace({ getSheetByName: (name) => groupedPublicSheets[name] || null });
assert.equal(groupedPublicQuotes.schemaMode, "GROUPED");
assert.equal(groupedPublicQuotes.quotes.length, 1);
assert.equal(groupedPublicQuotes.quotes[0].lines.length, 2);
assert.equal(groupedPublicQuotes.quotes[0].quantityTotal, 3);
assert.equal(groupedPublicQuotes.quotes[0].total, 325);
assert.doesNotMatch(JSON.stringify(groupedPublicQuotes), /"PRP-000001"|"FOR-000001"|privado|https:\/\/privado|Nota privada/i);

sandbox.SpreadsheetApp = { openById: (id) => {
  assert.equal(id, "DEV_TEST");
  return publicSpreadsheet;
} };
const publicPost = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "publicBootstrap", payload: {} }) },
}).getContent());
assert.equal(publicPost.ok, true);
assert.equal(publicPost.data.source.kind, "public");
scriptProperties.PUBLIC_READ_ACCESS = "NAO";
const disabledPublicPost = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "publicBootstrap", payload: {} }) },
}).getContent());
assert.equal(disabledPublicPost.ok, false);
assert.equal(disabledPublicPost.error.code, "PUBLIC_ACCESS_DISABLED");
scriptProperties.PUBLIC_READ_ACCESS = "SIM";

const technicalHeaders = ["created_at", "created_by", "updated_at", "updated_by", "version", "ativo"];
const setupTables = [
  ["01_LOJAS", "ID_Loja"],
  ["02_ITENS", "ID_Item"],
  ["03_NECESSIDADES", "ID_Necessidade"],
  ["04_FORNECEDORES", "ID_Fornecedor"],
  ["05_COTACOES", "ID_Cotação"],
  ["06_APROVACOES", "ID_Aprovação"],
  ["07_COMPRAS", "ID_Compra"],
  ["08_ENTREGAS", "ID_Entrega"],
  ["09_USUARIOS", "ID_Usuário"],
  ["11_SOLIC_ACESSO", "ID_Solicitação"],
  ["13_IMPORTACAO", "Tipo_Registro"],
  ["15_ROTAS_COMPRA", "ID_Rota"],
];
let maximumRowsRead = 0;
const fakeSheets = Object.fromEntries(setupTables.map(([sheetName, keyHeader]) => [sheetName, {
  getLastColumn: () => technicalHeaders.length + 1,
  getLastRow: () => 2500,
  getRange: (row, column, rowCount, columnCount) => {
    assert.equal(row, 1);
    assert.equal(column, 1);
    assert.equal(columnCount, technicalHeaders.length + 1);
    maximumRowsRead = Math.max(maximumRowsRead, rowCount);
    const values = Array.from({ length: rowCount }, () => Array(columnCount).fill(""));
    values[3] = [keyHeader, ...technicalHeaders];
    return { getValues: () => values };
  },
}]));
const technicalStatus = sandbox.buildTechnicalStatus({ getSheetByName: (name) => fakeSheets[name] || null });
assert.equal(technicalStatus.ready, true);
assert.equal(technicalStatus.tables.length, 12);
assert.equal(technicalStatus.tables.every((table) => table.headerRow === 4 && table.missing.length === 0), true);
assert.equal(maximumRowsRead, 10, "O diagnóstico técnico deve limitar a leitura às primeiras 10 linhas.");

const quoteOptions = {
  statuses: ["RASCUNHO", "EM_ANDAMENTO", "RECEBIDA"],
  origins: ["Matriz", "Loja"],
  paymentMethods: ["À vista", "30 dias"],
};
const paymentTermsTable = sandbox.readTable({ getSheetByName: () => fakeDataSheet(
  ["ID_Proposta", "Quantidade_Parcelas", "Possui_Entrada"],
  [],
) }, "16_PROPOSTAS_COTACAO", ["ID_Proposta"]);
assert.doesNotThrow(() => sandbox.assertQuotePaymentTermsSchemaV1(paymentTermsTable, { installments: 2, hasDownPayment: false }));
const missingPaymentTermsTable = sandbox.readTable({ getSheetByName: () => fakeDataSheet(["ID_Proposta"], []) }, "16_PROPOSTAS_COTACAO", ["ID_Proposta"]);
assert.throws(
  () => sandbox.assertQuotePaymentTermsSchemaV1(missingPaymentTermsTable, { installments: 2, hasDownPayment: false }),
  /Quantidade_Parcelas.*Possui_Entrada/,
  "A escrita deve ser bloqueada até que as novas colunas existam.",
);
const validatedQuote = sandbox.validateQuoteValues({
  supplierId: "FOR-000001",
  origin: "Matriz",
  unitPrice: 125.5,
  quantity: 2,
  freight: 10,
  otherCosts: 4.25,
  paymentMethod: "30 dias",
  installments: 3,
  hasDownPayment: true,
  leadTimeDays: 7,
  proposalValidUntil: "2026-08-31",
  link: "https://example.com/proposta",
  status: "RECEBIDA",
  quoteDate: "2026-08-13",
  notes: "Teste de contrato",
}, quoteOptions);
assert.equal(validatedQuote.total, 265.25, "O backend deve calcular quantidade × preço + frete + outros custos.");
assert.equal(validatedQuote.installments, 3);
assert.equal(validatedQuote.hasDownPayment, true);
assert.throws(
  () => sandbox.validateQuoteValues({ ...validatedQuote, installments: 0 }, quoteOptions),
  /parcelas/i,
  "O backend deve rejeitar quantidade de parcelas inválida.",
);
assert.equal(sandbox.validateStoreStatusV1("Ativa"), "Ativa");
assert.equal(sandbox.validateStoreStatusV1("A cadastrar"), "A cadastrar");
assert.throws(() => sandbox.validateStoreStatusV1("Status inventado"), /Status da loja/);
assert.throws(
  () => sandbox.validateQuoteValues({ ...validatedQuote, origin: "Valor inventado" }, quoteOptions),
  /14_LISTAS/,
  "O backend deve rejeitar origem ausente de 14_LISTAS.",
);
assert.throws(
  () => sandbox.validateQuoteValues({ ...validatedQuote, status: "Status inventado" }, quoteOptions),
  /Status de cotação inválido/,
  "O backend deve rejeitar status desconhecido em vez de convertê-lo em rascunho.",
);

assert.equal(sandbox.derivePlannedQuoteQuantity(27, 27), 27);
assert.equal(sandbox.derivePlannedQuoteQuantity(undefined, 27), 27);
assert.throws(
  () => sandbox.derivePlannedQuoteQuantity(10, 27),
  /Qtd_Planejada/,
  "A quantidade enviada pelo cliente não pode divergir de Qtd_Planejada.",
);
assert.equal(sandbox.areQuoteQuantitiesComparable([27, 27]), true);
assert.equal(sandbox.areQuoteQuantitiesComparable([27, 10]), false);
assert.throws(
  () => sandbox.assertNecessityCanBeQuoted("Pendente definição"),
  /Defina o item/,
  "PENDENTE_DEFINICAO não pode ser cotada.",
);
assert.equal(sandbox.assertNecessityCanBeQuoted("Não iniciado"), "NAO_INICIADO");
assert.throws(
  () => sandbox.assertNecessityCanBeQuoted("Status desconhecido"),
  /não aceita novas cotações/,
  "Status desconhecido não pode ser tratado como NAO_INICIADO.",
);

assert.equal(sandbox.hasDuplicateNormalizedTaxId(["12.345.678/0001-90"], "12345678000190"), true);
assert.equal(sandbox.hasDuplicateNormalizedTaxId(["123.456.789-01"], "98765432100"), false);

const selectionTable = { normalizedHeaders: ["status", "selecionada"] };
const targetQuote = ["Recebida", "Não"];
const previousQuote = ["Selecionada", "Não"];
assert.equal(sandbox.isQuoteMarkedSelected(selectionTable, previousQuote), true, "Status=Selecionada deve ser reconhecido mesmo com flag inconsistente.");
sandbox.applyQuoteSelectionState(selectionTable, targetQuote, true, []);
sandbox.applyQuoteSelectionState(selectionTable, previousQuote, false, []);
assert.deepEqual(targetQuote, ["Selecionada", "Sim"]);
assert.deepEqual(previousQuote, ["Recebida", "Não"]);
assert.equal(sandbox.isQuoteSelectionConsistent(selectionTable, targetQuote), true);
assert.equal(sandbox.isQuoteSelectionConsistent(selectionTable, previousQuote), false);

const activeQuoteTable = {
  normalizedHeaders: ["idcotacao", "idnecessidade", "ativo"],
  rows: [["COT-000001", "NEC-000001", "Sim"], ["COT-000002", "NEC-000001", "Não"]],
};
assert.equal(sandbox.isActiveQuoteRow(activeQuoteTable, ["COT-000001", "NEC-000001", "Sim"]), true);
assert.equal(sandbox.isActiveQuoteRow(activeQuoteTable, ["COT-000002", "NEC-000001", "Não"]), false);
assert.equal(sandbox.hasOtherActiveQuoteForNecessity(activeQuoteTable, "NEC-000001", "COT-000002"), true);
assert.equal(sandbox.hasOtherActiveQuoteForNecessity(activeQuoteTable, "NEC-000001", "COT-000001"), false);

let insertedRows = 0;
const formulaPaddedSheet = {
  getMaxRows: () => 1004,
  getRange: (row, column, rowCount, columnCount) => {
    assert.deepEqual([row, column, rowCount, columnCount], [5, 1, 1000, 1]);
    return {
      getDisplayValues: () => Array.from({ length: 1000 }, (_, index) => [index === 0 ? "COT-000001" : ""]),
    };
  },
  insertRowsAfter: () => { insertedRows += 1; },
};
const formulaPaddedTable = {
  sheet: formulaPaddedSheet,
  headerRow: 4,
  headers: ["ID_Cotação"],
  normalizedHeaders: ["idcotacao"],
  rows: [["COT-000001"]],
  rowNumbers: [5],
};
assert.equal(sandbox.findFirstWritableRow(formulaPaddedTable, "ID_Cotação"), 6, "Fórmulas vazias em outras colunas não podem empurrar a gravação para o fim da grade.");
assert.equal(insertedRows, 0);

const sparseValues = [
  ["COTAÇÕES", ""],
  ["Descrição", ""],
  ["", ""],
  ["ID_Cotação", "Valor_Total"],
  ["COT-000001", 600],
  ["", ""],
  ["", ""],
  ["COT-000004", 885],
];
const sparseSheet = {
  getLastColumn: () => 2,
  getLastRow: () => 8,
  getRange: (row, column, rowCount, columnCount) => ({
    getValues: () => sparseValues.slice(row - 1, row - 1 + rowCount).map((values) => values.slice(column - 1, column - 1 + columnCount)),
  }),
};
const sparseTable = sandbox.readTable({ getSheetByName: () => sparseSheet }, "05_COTACOES", ["ID_Cotação", "Valor_Total"]);
assert.deepEqual(Array.from(sparseTable.rowNumbers), [5, 8], "readTable deve preservar as linhas físicas mesmo ao filtrar vazios.");
assert.equal(sandbox.physicalRowNumber(sparseTable, 1), 8);
assert.equal(sandbox.findUniqueRowIndex(sparseTable, "ID_Cotação", "COT-000004", "Cotação"), 1);
assert.throws(
  () => sandbox.findUniqueRowIndex({ ...sparseTable, rows: [["COT-000001", 600], ["COT-000001", 700]], rowNumbers: [5, 8] }, "ID_Cotação", "COT-000001", "Cotação"),
  /duplicado/,
  "IDs duplicados devem bloquear edições ambíguas.",
);

console.log("✓ Code.gs corresponde ao JavaScript compilado");
console.log("✓ Manifesto de implantação sincronizado");
console.log("✓ urlFetchWhitelist limitada a https://oauth2.googleapis.com/tokeninfo");
console.log("✓ SPREADSHEET_ID e GOOGLE_CLIENT_ID usam PropertiesService");
console.log("✓ ID da planilha DEV não está hardcoded em Code.gs");
console.log("✓ doGet health e doPost health responderam corretamente");
console.log("✓ updateStore e updateItem compilados com permissão centralizada; status do item sincroniza necessidades atomicamente");
console.log("✓ technicalStatus autenticado verifica 12 abas lendo no máximo 10 linhas por aba");
console.log("✓ contrato de Cotações compilado com lock, version e dispatch autenticado");
console.log("✓ exclusão de cotação é lógica, versionada e removida das consultas ativas");
console.log("✓ totais são calculados no backend e opções são validadas por 14_LISTAS");
console.log("✓ quantidade deriva de Qtd_Planejada e divergências são rejeitadas");
console.log("✓ PENDENTE_DEFINICAO é bloqueada e CNPJ/CPF normalizado não duplica");
console.log("✓ Status e Selecionada permanecem consistentes ao trocar a proposta escolhida");
console.log("✓ primeira linha de ID vazia é usada mesmo com fórmulas até o fim da grade");
console.log("✓ linhas físicas são preservadas e IDs duplicados bloqueiam edições ambíguas");
console.log("✓ runtime dual bloqueia gravações antes da migração e detecta estrutura parcial");
console.log("✓ escopo agrupado deriva quantidades, respeita Lojas_Permitidas e limita a um item");
console.log("✓ comparação usa assinatura canônica e seleção sobreposta é bloqueada sem desmontagem automática");
console.log("✓ DTO público agrupado preserva totais e escopo sem expor fornecedor, proposta ou campos internos reais");
console.log("✓ Implantação V1 compila com 30 atividades, 16 regras e checksum versionado");
console.log("✓ prevalidateImplantationV1 permanece somente leitura e as três funções de setup estão fora dos dispatches HTTP");
console.log("✓ setupImplantationV1 exige propriedade temporária, lock, pré-validação, backups, validação e rollback; manifesto segue sem Drive");
