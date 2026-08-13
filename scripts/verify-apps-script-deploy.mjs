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
assert.match(deployCode, /function updateStore\(/, "updateStore ausente.");
assert.match(deployCode, /function updateItem\(/, "updateItem ausente.");
for (const action of ["quotesWorkspace", "createSupplier", "createQuote", "updateQuote", "deleteQuote", "selectQuote"]) {
  assert.match(deployCode, new RegExp(`case "${action}":`), `A ação ${action} não está no dispatch autenticado.`);
}
for (const operation of ["createSupplier", "createQuote", "updateQuote", "deleteQuote", "selectQuote"]) {
  assert.match(deployCode, new RegExp(`function ${operation}\\(`), `${operation} ausente.`);
}
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
assert.match(deployCode, /function buildQuotesWorkspace[\s\S]*?isActiveQuoteRow/, "quotesWorkspace deve ocultar cotações excluídas.");
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
  Utilities: { getUuid: () => "local-request-id" },
};

vm.createContext(sandbox);
vm.runInContext(deployCode, sandbox, { filename: "Code.gs" });

const getHealth = JSON.parse(sandbox.doGet({ parameter: { action: "health" } }).getContent());
assert.equal(getHealth.ok, true);
assert.equal(getHealth.data.status, "ok");

const postHealth = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "health", payload: {} }) },
}).getContent());
assert.equal(postHealth.ok, true);
assert.equal(postHealth.data.status, "ok");
assert.equal(postHealth.requestId, "local-request-id");

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
const validatedQuote = sandbox.validateQuoteValues({
  supplierId: "FOR-000001",
  origin: "Matriz",
  unitPrice: 125.5,
  quantity: 2,
  freight: 10,
  otherCosts: 4.25,
  paymentMethod: "30 dias",
  leadTimeDays: 7,
  proposalValidUntil: "2026-08-31",
  link: "https://example.com/proposta",
  status: "RECEBIDA",
  quoteDate: "2026-08-13",
  notes: "Teste de contrato",
}, quoteOptions);
assert.equal(validatedQuote.total, 265.25, "O backend deve calcular quantidade × preço + frete + outros custos.");
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
console.log("✓ updateStore e updateItem compilados com permissão centralizada");
console.log("✓ technicalStatus autenticado verifica 12 abas lendo no máximo 10 linhas por aba");
console.log("✓ contrato de Cotações compilado com lock, version e dispatch autenticado");
console.log("✓ exclusão de cotação é lógica, versionada e removida das consultas ativas");
console.log("✓ totais são calculados no backend e opções são validadas por 14_LISTAS");
console.log("✓ quantidade deriva de Qtd_Planejada e divergências são rejeitadas");
console.log("✓ PENDENTE_DEFINICAO é bloqueada e CNPJ/CPF normalizado não duplica");
console.log("✓ Status e Selecionada permanecem consistentes ao trocar a proposta escolhida");
console.log("✓ primeira linha de ID vazia é usada mesmo com fórmulas até o fim da grade");
console.log("✓ linhas físicas são preservadas e IDs duplicados bloqueiam edições ambíguas");
