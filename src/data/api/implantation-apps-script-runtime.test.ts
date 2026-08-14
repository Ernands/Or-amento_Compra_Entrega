import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";

type UnknownFunction = (...args: unknown[]) => unknown;

interface RuntimeHarness {
  buildCapabilities: UnknownFunction;
  buildImpacts: UnknownFunction;
  block: UnknownFunction;
  calculateTargetDate: UnknownFunction;
  cancel: UnknownFunction;
  changeDate: UnknownFunction;
  complete: UnknownFunction;
  markNotApplicable: UnknownFunction;
  overview: UnknownFunction;
  performAtomicWrites: UnknownFunction;
  reopen: UnknownFunction;
  start: UnknownFunction;
  timeline: UnknownFunction;
  unblock: UnknownFunction;
  update: UnknownFunction;
  validateTransition: UnknownFunction;
  setDependency: (name: string, value: unknown) => void;
}

interface TestTable {
  sheet: ReturnType<typeof sheetFixture>;
  headerRow: number;
  headers: string[];
  normalizedHeaders: string[];
  rows: unknown[][];
  rowNumbers: number[];
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

function rowFixture(headers: string[], values: Record<string, unknown>) {
  return headers.map((header) => values[header] ?? "");
}

function rangeFixture(initial: unknown[][] = [[]]) {
  let values = initial.map((row) => row.slice());
  return {
    getValues: vi.fn(() => values.map((row) => row.slice())),
    getFormulas: vi.fn(() => values.map((row) => row.map(() => ""))),
    getDisplayValues: vi.fn(() => values.map((row) => row.map((value) => String(value ?? "")))),
    setValues: vi.fn((next: unknown[][]) => { values = next.map((row) => row.slice()); }),
  };
}

function sheetFixture() {
  const range = rangeFixture();
  return {
    range,
    getRange: vi.fn((...args: number[]) => { void args; return range; }),
    getRangeList: vi.fn((addresses: string[]) => { void addresses; return { getRanges: () => [] as ReturnType<typeof rangeFixture>[] }; }),
    getLastRow: vi.fn(() => 4),
    getLastColumn: vi.fn(() => 1),
    getMaxRows: vi.fn(() => 100),
    insertRowsAfter: vi.fn(),
  };
}

function tableFixture(headers: string[], records: Array<Record<string, unknown>> = []): TestTable {
  return {
    sheet: sheetFixture(),
    headerRow: 4,
    headers,
    normalizedHeaders: headers.map(normalize),
    rows: records.map((record) => rowFixture(headers, record)),
    rowNumbers: records.map((_, index) => index + 5),
  };
}

function loadRuntime(): RuntimeHarness {
  const code = readFileSync(resolve(process.cwd(), "apps-script/deploy/Code.gs"), "utf8");
  const context = {
    console,
    SpreadsheetApp: { flush: vi.fn() },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: vi.fn() }) },
    Utilities: {
      formatDate: (value: Date) => value.toISOString().slice(0, 10),
      getUuid: () => "UUID-TEST",
    },
  };
  createContext(context);
  runInContext(`${code}\n;globalThis.__implantationTest = {
    buildCapabilities: buildImplantationCapabilitiesV1,
    buildImpacts: buildOpeningDateImpactsV1,
    block: blockImplantationActivityV1,
    calculateTargetDate: calculateImplantationTargetDateV1,
    cancel: cancelImplantationActivityV1,
    changeDate: changePlannedOpeningDateV1,
    complete: completeImplantationActivityV1,
    markNotApplicable: markImplantationActivityNotApplicableV1,
    overview: buildImplantationOverviewV1,
    performAtomicWrites: performAtomicWritesV1,
    reopen: reopenImplantationActivityV1,
    start: startImplantationV1,
    timeline: buildImplantationTimelineV1,
    unblock: unblockImplantationActivityV1,
    update: updateImplantationActivityV1,
    validateTransition: validateImplantationTransitionV1,
    setDependency: function(name, value) {
      if (name === "appendAuditBatch") appendAuditBatch = value;
      else if (name === "assertImplantationViewV1") assertImplantationViewV1 = value;
      else if (name === "assertModulePermission") assertModulePermission = value;
      else if (name === "assertStoreScope") assertStoreScope = value;
      else if (name === "findFirstWritableRow") findFirstWritableRow = value;
      else if (name === "performAtomicWritesV1") performAtomicWritesV1 = value;
      else if (name === "buildImplantationCapabilitiesV1") buildImplantationCapabilitiesV1 = value;
      else if (name === "readImplantationTableStructureV1") readImplantationTableStructureV1 = value;
      else if (name === "readImplantationUpdateIndexV1") readImplantationUpdateIndexV1 = value;
      else if (name === "readTable") readTable = value;
      else if (name === "restorableMatrixV1") restorableMatrixV1 = value;
      else if (name === "revalidateImplantationWriteAccessV1") revalidateImplantationWriteAccessV1 = value;
      else throw new Error("Dependência de teste desconhecida: " + name);
    }
  };`, context);
  return (context as typeof context & { __implantationTest: RuntimeHarness }).__implantationTest;
}

const user = { id: "USR-001", name: "Gestor", email: "gestor@example.com", profile: "GESTOR", allowedStoreIds: ["LOJ-001"] };

function startFixtures(options: { date?: string; duplicate?: boolean; repeatedRequest?: boolean } = {}) {
  const storeHeaders = ["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada", "version"];
  const cycleHeaders = ["ID_Implantacao", "ID_Loja", "ID_Modelo_Versao", "ID_Usuario_Coordenador", "Data_Inauguracao_Base", "Data_Inauguracao_Planejada_Atual", "Status_Ciclo", "Iniciada_Em", "Iniciada_Por", "ativo", "created_at", "created_by", "updated_at", "updated_by", "version"];
  const modelHeaders = ["ID_Modelo_Versao", "Versao_Modelo", "Status_Modelo", "ativo"];
  const templateHeaders = ["ID_Modelo_Atividade", "ID_Modelo_Versao", "Codigo_Atividade", "ID_Fase", "Fase", "Ordem_Fase", "Ordem_Atividade", "Acao", "Offset_Dias", "Papel_Responsavel_Padrao", "Obrigatoria", "Critica", "Evidencia_Obrigatoria", "Qtd_Min_Evidencias", "ativo"];
  const activityHeaders = ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "ID_Modelo_Atividade", "Versao_Modelo", "ID_Fase", "Fase_Snapshot", "Ordem_Fase", "Ordem_Atividade", "Acao_Snapshot", "Offset_Dias_Snapshot", "Papel_Responsavel_Padrao_Snapshot", "Obrigatoria_Snapshot", "Critica_Snapshot", "Evidencia_Obrigatoria_Snapshot", "Qtd_Min_Evidencias_Snapshot", "Data_Alvo_Original", "Data_Alvo_Atual", "Status", "Percentual_Concluido", "Ultima_Atualizacao_Em", "ativo", "created_at", "created_by", "updated_at", "updated_by", "version"];
  const updateHeaders = ["ID_Atualizacao", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Tipo_Atualizacao", "Texto", "Status_Anterior", "Status_Novo", "Progresso_Anterior", "Progresso_Novo", "ID_Responsavel_Anterior", "ID_Responsavel_Novo", "Data_Hora", "ID_Usuario", "Origem", "Request_ID", "ativo", "created_at", "created_by", "updated_at", "updated_by", "version"];
  return {
    stores: tableFixture(storeHeaders, [{ ID_Loja: "LOJ-001", Loja: "Loja 01", Status: "Ativa", Data_Inauguracao_Planejada: options.date === undefined ? "2026-09-30" : options.date, version: 3 }]),
    cycles: tableFixture(cycleHeaders, options.duplicate ? [{ ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", Status_Ciclo: "Ativo", ativo: "Sim", version: 1 }] : []),
    models: tableFixture(modelHeaders, [{ ID_Modelo_Versao: "MOD-001", Versao_Modelo: 1, Status_Modelo: "Publicado", ativo: "Sim" }]),
    templates: tableFixture(templateHeaders, Array.from({ length: 30 }, (_, index) => ({
      ID_Modelo_Atividade: `CHK-MOD-${String(index + 1).padStart(5, "0")}`, ID_Modelo_Versao: "MOD-001", Codigo_Atividade: `ATV-${String(index + 1).padStart(3, "0")}`,
      ID_Fase: "FAS-01", Fase: "Preparação", Ordem_Fase: 1, Ordem_Atividade: index + 1, Acao: `Atividade ${index + 1}`, Offset_Dias: index === 0 ? -30 : 0,
      Papel_Responsavel_Padrao: "Equipe interna", Obrigatoria: "Sim", Critica: index < 15 ? "Sim" : "Não", Evidencia_Obrigatoria: "Não", Qtd_Min_Evidencias: 0, ativo: "Sim",
    }))),
    activities: tableFixture(activityHeaders),
    updates: tableFixture(updateHeaders, options.repeatedRequest ? [{ ID_Atualizacao: "ATU-000001", Request_ID: "REQ-START", ativo: "Sim", version: 1 }] : []),
  };
}

function configureStart(runtime: RuntimeHarness, fixtures: ReturnType<typeof startFixtures>) {
  const tables: Record<string, TestTable> = {
    "01_LOJAS": fixtures.stores,
    "20_IMPLANTACOES_LOJA": fixtures.cycles,
    "17_CHECKLIST_MODELOS": fixtures.models,
    "18_CHECKLIST_MODELO_ATIVIDADES": fixtures.templates,
    "21_IMPLANTACAO_ATIVIDADES": fixtures.activities,
  };
  runtime.setDependency("assertModulePermission", vi.fn());
  runtime.setDependency("assertStoreScope", vi.fn());
  runtime.setDependency("revalidateImplantationWriteAccessV1", vi.fn());
  runtime.setDependency("readTable", vi.fn((_spreadsheet: unknown, name: string) => tables[name]));
  runtime.setDependency("readImplantationUpdateIndexV1", vi.fn(() => fixtures.updates));
  runtime.setDependency("findFirstWritableRow", vi.fn(() => 5));
  runtime.setDependency("restorableMatrixV1", vi.fn(() => [[""]]));
}

function activityFixtures(options: { status?: string; version?: number; repeatedRequest?: boolean; activeBlock?: boolean; evidenceRequired?: boolean } = {}) {
  const activityHeaders = [
    "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "ID_Modelo_Atividade", "Versao_Modelo", "ID_Fase", "Fase_Snapshot",
    "Ordem_Fase", "Ordem_Atividade", "Acao_Snapshot", "Offset_Dias_Snapshot", "Papel_Responsavel_Padrao_Snapshot",
    "Obrigatoria_Snapshot", "Critica_Snapshot", "Evidencia_Obrigatoria_Snapshot", "Qtd_Min_Evidencias_Snapshot",
    "Data_Alvo_Original", "Data_Alvo_Atual", "ID_Usuario_Responsavel", "Status", "Percentual_Concluido",
    "Data_Inicio_Real", "Data_Conclusao_Real", "Ultima_Observacao", "Ultima_Atualizacao_Em", "ativo",
    "created_at", "created_by", "updated_at", "updated_by", "version",
  ];
  const updateHeaders = ["ID_Atualizacao", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Tipo_Atualizacao", "Texto", "Status_Anterior", "Status_Novo", "Progresso_Anterior", "Progresso_Novo", "ID_Responsavel_Anterior", "ID_Responsavel_Novo", "Data_Hora", "ID_Usuario", "Origem", "Request_ID", "ativo", "created_at", "created_by", "updated_at", "updated_by", "version"];
  const blockHeaders = ["ID_Bloqueio", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Motivo_Bloqueio", "Status_Anterior", "Progresso_No_Bloqueio", "Papel_Responsavel_Desbloqueio", "ID_Usuario_Responsavel_Desbloqueio", "Data_Bloqueio", "ID_Usuario_Bloqueio", "Data_Desbloqueio", "ID_Usuario_Desbloqueio", "Observacao_Desbloqueio", "ativo", "created_at", "created_by", "updated_at", "updated_by", "version"];
  const status = options.status ?? "Em andamento";
  const progress = status === "Concluído" ? 100 : status === "Não iniciado" ? 0 : 50;
  return {
    activities: tableFixture(activityHeaders, [{
      ID_Checklist_Loja: "CHK-LOJ-000001", ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", ID_Modelo_Atividade: "CHK-MOD-00001",
      Versao_Modelo: 1, ID_Fase: "FAS-01", Fase_Snapshot: "Preparação", Ordem_Fase: 1, Ordem_Atividade: 1,
      Acao_Snapshot: "Validar loja", Offset_Dias_Snapshot: -30, Papel_Responsavel_Padrao_Snapshot: "Equipe interna",
      Obrigatoria_Snapshot: "Sim", Critica_Snapshot: "Sim", Evidencia_Obrigatoria_Snapshot: options.evidenceRequired ? "Sim" : "Não",
      Qtd_Min_Evidencias_Snapshot: options.evidenceRequired ? 1 : 0, Data_Alvo_Original: "2026-08-31", Data_Alvo_Atual: "2026-08-31",
      ID_Usuario_Responsavel: "", Status: status, Percentual_Concluido: progress, Ultima_Observacao: "", ativo: "Sim", version: options.version ?? 2,
    }]),
    updates: tableFixture(updateHeaders, options.repeatedRequest ? [{ ID_Atualizacao: "ATU-000001", Request_ID: "REQ-ACT", ativo: "Sim", version: 1 }] : []),
    blocks: tableFixture(blockHeaders, options.activeBlock ? [{
      ID_Bloqueio: "BLQ-000001", ID_Checklist_Loja: "CHK-LOJ-000001", ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001",
      Motivo_Bloqueio: "Dependência externa", Status_Anterior: "Em andamento", Progresso_No_Bloqueio: 50,
      Data_Bloqueio: "2026-08-14", Data_Desbloqueio: "", ativo: "Sim", version: 1,
    }] : []),
  };
}

function configureActivity(runtime: RuntimeHarness, fixtures: ReturnType<typeof activityFixtures>) {
  const tables: Record<string, TestTable> = {
    "21_IMPLANTACAO_ATIVIDADES": fixtures.activities,
    "23_IMPLANTACAO_BLOQUEIOS": fixtures.blocks,
  };
  const atomic = vi.fn();
  runtime.setDependency("assertModulePermission", vi.fn());
  runtime.setDependency("assertStoreScope", vi.fn());
  runtime.setDependency("revalidateImplantationWriteAccessV1", vi.fn());
  runtime.setDependency("readTable", vi.fn((_spreadsheet: unknown, name: string) => tables[name]));
  runtime.setDependency("readImplantationUpdateIndexV1", vi.fn(() => fixtures.updates));
  runtime.setDependency("findFirstWritableRow", vi.fn(() => 5));
  runtime.setDependency("restorableMatrixV1", vi.fn(() => [[""]]));
  runtime.setDependency("performAtomicWritesV1", atomic);
  return atomic;
}

describe("Apps Script de Implantação com fixtures locais", () => {
  let runtime: RuntimeHarness;

  beforeEach(() => { runtime = loadRuntime(); });

  it("inicia uma implantação e prepara exatamente 30 atividades", () => {
    const fixtures = startFixtures();
    configureStart(runtime, fixtures);
    const atomic = vi.fn();
    runtime.setDependency("performAtomicWritesV1", atomic);

    const result = runtime.start({}, user, { storeId: "LOJ-001", storeVersion: 3, requestId: "REQ-START" }) as { activitiesCreated: number };

    expect(result.activitiesCreated).toBe(30);
    const writes = atomic.mock.calls[0][2] as Array<{ next: unknown[][] }>;
    expect(writes[0].next).toHaveLength(1);
    expect(writes[1].next).toHaveLength(30);
    expect(writes[2].next).toHaveLength(1);
  });

  it("bloqueia uma segunda implantação ativa da mesma loja", () => {
    const fixtures = startFixtures({ duplicate: true });
    configureStart(runtime, fixtures);
    runtime.setDependency("performAtomicWritesV1", vi.fn());
    expect(() => runtime.start({}, user, { storeId: "LOJ-001", storeVersion: 3, requestId: "REQ-NEW" })).toThrow(/implantação ativa/i);
  });

  it("bloqueia o início quando a loja não tem data planejada", () => {
    const fixtures = startFixtures({ date: "" });
    configureStart(runtime, fixtures);
    runtime.setDependency("performAtomicWritesV1", vi.fn());
    expect(() => runtime.start({}, user, { storeId: "LOJ-001", storeVersion: 3, requestId: "REQ-START" })).toThrow(/data planejada/i);
  });

  it("revalida o acesso dentro do lock e nega loja fora do escopo", () => {
    const fixtures = startFixtures();
    configureStart(runtime, fixtures);
    runtime.setDependency("revalidateImplantationWriteAccessV1", vi.fn(() => { throw new Error("fora de Lojas_Permitidas"); }));
    expect(() => runtime.start({}, user, { storeId: "LOJ-001", storeVersion: 3, requestId: "REQ-START" })).toThrow(/Lojas_Permitidas/);
  });

  it("trata retry do mesmo Request_ID antes do conflito de implantação duplicada", () => {
    const fixtures = startFixtures({ duplicate: true, repeatedRequest: true });
    configureStart(runtime, fixtures);
    const atomic = vi.fn();
    runtime.setDependency("performAtomicWritesV1", atomic);
    expect(runtime.start({}, user, { storeId: "LOJ-001", storeVersion: 1, requestId: "REQ-START" })).toMatchObject({ idempotent: true, requestId: "REQ-START" });
    expect(atomic).not.toHaveBeenCalled();
  });

  it("faz rollback das escritas em ordem reversa se auditoria falhar", () => {
    const events: string[] = [];
    const first = { setValues: vi.fn((value: unknown[][]) => events.push(value[0][0] === "novo-1" ? "apply-1" : "rollback-1")) };
    const second = { setValues: vi.fn((value: unknown[][]) => events.push(value[0][0] === "novo-2" ? "apply-2" : "rollback-2")) };
    runtime.setDependency("appendAuditBatch", vi.fn(() => { throw new Error("falha de auditoria"); }));
    expect(() => runtime.performAtomicWrites({}, user, [
      { range: first, previous: [["antigo-1"]], next: [["novo-1"]] },
      { range: second, previous: [["antigo-2"]], next: [["novo-2"]] },
    ], [])).toThrow("falha de auditoria");
    expect(events).toEqual(["apply-1", "apply-2", "rollback-2", "rollback-1"]);
  });

  it("calcula offsets reais relativos à inauguração", () => {
    expect(runtime.calculateTargetDate("2026-09-30", -30)).toBe("2026-08-31");
    expect(runtime.calculateTargetDate("2026-09-30", 0)).toBe("2026-09-30");
  });

  it("preserva concluídas, não aplicáveis e canceladas na prévia de data", () => {
    const headers = ["ID_Checklist_Loja", "Acao_Snapshot", "Status", "Data_Alvo_Atual", "Offset_Dias_Snapshot", "version"];
    const table = tableFixture(headers, [
      { ID_Checklist_Loja: "A", Acao_Snapshot: "Aberta", Status: "Em andamento", Data_Alvo_Atual: "2026-09-01", Offset_Dias_Snapshot: -5, version: 2 },
      { ID_Checklist_Loja: "B", Acao_Snapshot: "Concluída", Status: "Concluído", Data_Alvo_Atual: "2026-09-01", Offset_Dias_Snapshot: -5, version: 2 },
      { ID_Checklist_Loja: "C", Acao_Snapshot: "N/A", Status: "Não aplicável", Data_Alvo_Atual: "2026-09-01", Offset_Dias_Snapshot: -5, version: 2 },
      { ID_Checklist_Loja: "D", Acao_Snapshot: "Cancelada", Status: "Cancelado", Data_Alvo_Atual: "2026-09-01", Offset_Dias_Snapshot: -5, version: 2 },
    ]);
    const impacts = runtime.buildImpacts(table, table.rows, "2026-10-10") as Array<{ activityId: string; nextTargetDate: string }>;
    expect(impacts).toEqual([expect.objectContaining({ activityId: "A", nextTargetDate: "2026-10-05" })]);
  });

  it("aplica a nova inauguração na loja, ciclo e atividade elegível preservando Data_Alvo_Original", () => {
    const stores = tableFixture(["ID_Loja", "Data_Inauguracao_Planejada", "updated_at", "updated_by", "version"], [
      { ID_Loja: "LOJ-001", Data_Inauguracao_Planejada: "2026-09-30", version: 3 },
    ]);
    const cycles = tableFixture(["ID_Implantacao", "ID_Loja", "Data_Inauguracao_Planejada_Atual", "Status_Ciclo", "updated_at", "updated_by", "version", "ativo"], [
      { ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", Data_Inauguracao_Planejada_Atual: "2026-09-30", Status_Ciclo: "Ativo", version: 2, ativo: "Sim" },
    ]);
    const fixtures = activityFixtures();
    const atomic = vi.fn();
    const tables: Record<string, TestTable> = { "01_LOJAS": stores, "20_IMPLANTACOES_LOJA": cycles, "21_IMPLANTACAO_ATIVIDADES": fixtures.activities };
    runtime.setDependency("assertModulePermission", vi.fn());
    runtime.setDependency("assertStoreScope", vi.fn());
    runtime.setDependency("revalidateImplantationWriteAccessV1", vi.fn());
    runtime.setDependency("readTable", vi.fn((_spreadsheet: unknown, name: string) => tables[name]));
    runtime.setDependency("readImplantationUpdateIndexV1", vi.fn(() => fixtures.updates));
    runtime.setDependency("findFirstWritableRow", vi.fn(() => 5));
    runtime.setDependency("restorableMatrixV1", vi.fn(() => [[""]]));
    runtime.setDependency("performAtomicWritesV1", atomic);

    expect(runtime.changeDate({}, user, {
      storeId: "LOJ-001", storeVersion: 3, implantationVersion: 2, plannedOpeningDate: "2026-10-10",
      reason: "Reprogramação contratual", requestId: "REQ-DATE", activityVersions: { "CHK-LOJ-000001": 2 },
    })).toMatchObject({ previousDate: "2026-09-30", nextDate: "2026-10-10", activitiesChanged: 1 });
    const writes = atomic.mock.calls[0][2] as Array<{ next: unknown[][] }>;
    const activityRow = writes[2].next[0];
    expect(activityRow[fixtures.activities.headers.indexOf("Data_Alvo_Original")]).toBe("2026-08-31");
    expect(activityRow[fixtures.activities.headers.indexOf("Data_Alvo_Atual")]).toBe("2026-09-10");
    expect((atomic.mock.calls[0][3] as Array<{ module: string }>).map((audit) => audit.module)).toEqual([
      "IMPLANTACAO_LOJA", "IMPLANTACAO", "IMPLANTACAO_ATIVIDADES",
    ]);
  });

  it("exige motivo para não aplicável e cancelamento", () => {
    expect(() => runtime.validateTransition({ from: "EM_ANDAMENTO", to: "NAO_APLICAVEL", currentProgress: 50, reason: "" })).toThrow(/Motivo/i);
    expect(() => runtime.validateTransition({ from: "EM_ANDAMENTO", to: "CANCELADO", currentProgress: 50, reason: "", canCancel: true })).toThrow(/Motivo/i);
  });

  it("calcula capabilities compostas sem expor cancelar/reabrir parcialmente autorizados", () => {
    const headers = ["Perfil", "Módulo", "Visualizar", "Criar", "Editar", "Excluir", "Reabrir"];
    const permissions = tableFixture(headers, [
      { Perfil: "Gestor/Aprovador", Módulo: "Implantação", Visualizar: "Sim", Criar: "Sim", Editar: "Sim", Excluir: "Sim", Reabrir: "Sim" },
      { Perfil: "Gestor/Aprovador", Módulo: "Implantação Atualizações", Visualizar: "Sim", Criar: "Não" },
      { Perfil: "Gestor/Aprovador", Módulo: "Checklist Mestre", Visualizar: "Sim" },
    ]);
    runtime.setDependency("readTable", vi.fn(() => permissions));
    const result = runtime.buildCapabilities({}, user) as Record<string, boolean>;
    expect(result).toMatchObject({ view: true, setOpeningDate: true, start: true, updateActivity: false, blockActivity: false, cancelActivity: false, reopenActivity: false });
  });

  it("atualiza progresso e incrementa version com timeline e auditoria na mesma escrita", () => {
    const fixtures = activityFixtures();
    const atomic = configureActivity(runtime, fixtures);
    const result = runtime.update({}, user, { activityId: "CHK-LOJ-000001", version: 2, progress: 75, responsibleUserId: "", observation: "Em validação", requestId: "REQ-ACT" }) as { activity: { progress: number; version: number } };
    expect(result.activity).toMatchObject({ progress: 75, version: 3 });
    expect(atomic.mock.calls[0][2]).toHaveLength(2);
    expect(atomic.mock.calls[0][3]).toEqual([expect.objectContaining({ module: "IMPLANTACAO_ATIVIDADES", reference: "REQ-ACT" })]);
  });

  it("rejeita version conflict antes de gravar", () => {
    const fixtures = activityFixtures({ version: 4 });
    const atomic = configureActivity(runtime, fixtures);
    expect(() => runtime.update({}, user, { activityId: "CHK-LOJ-000001", version: 3, progress: 75, responsibleUserId: "", observation: "Concorrente", requestId: "REQ-ACT" })).toThrow(/alterado por outro usuário/i);
    expect(atomic).not.toHaveBeenCalled();
  });

  it("trata Request_ID repetido de atividade antes da version defasada", () => {
    const fixtures = activityFixtures({ version: 4, repeatedRequest: true });
    const atomic = configureActivity(runtime, fixtures);
    expect(runtime.update({}, user, { activityId: "CHK-LOJ-000001", version: 1, progress: 75, responsibleUserId: "", observation: "Retry", requestId: "REQ-ACT" })).toMatchObject({ idempotent: true });
    expect(atomic).not.toHaveBeenCalled();
  });

  it("bloqueia atividade e cria bloqueio, timeline e auditorias", () => {
    const fixtures = activityFixtures();
    const atomic = configureActivity(runtime, fixtures);
    const result = runtime.block({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "Aguardando licença", requestId: "REQ-BLOCK" }) as { blockId: string };
    expect(result.blockId).toBe("BLQ-000001");
    expect(atomic.mock.calls[0][2]).toHaveLength(3);
    expect(atomic.mock.calls[0][3]).toHaveLength(2);
  });

  it("impede bloqueio ativo duplicado", () => {
    const fixtures = activityFixtures({ activeBlock: true });
    const atomic = configureActivity(runtime, fixtures);
    expect(() => runtime.block({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "Duplicado", requestId: "REQ-BLOCK" })).toThrow(/bloqueio ativo/i);
    expect(atomic).not.toHaveBeenCalled();
  });

  it("desbloqueia restaurando o estado operacional anterior", () => {
    const fixtures = activityFixtures({ status: "Bloqueado", activeBlock: true });
    const atomic = configureActivity(runtime, fixtures);
    expect(runtime.unblock({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "Licença emitida", requestId: "REQ-UNBLOCK" })).toMatchObject({ activityId: "CHK-LOJ-000001" });
    expect(atomic.mock.calls[0][2]).toHaveLength(3);
    expect(atomic.mock.calls[0][3]).toEqual(expect.arrayContaining([
      expect.objectContaining({ module: "IMPLANTACAO_ATIVIDADES", reference: "REQ-UNBLOCK" }),
      expect.objectContaining({ module: "IMPLANTACAO_BLOQUEIOS", reference: "REQ-UNBLOCK" }),
    ]));
  });

  it("conclui mesmo com evidência obrigatória e sinaliza validação pendente", () => {
    const fixtures = activityFixtures({ evidenceRequired: true });
    configureActivity(runtime, fixtures);
    expect(runtime.complete({}, user, { activityId: "CHK-LOJ-000001", version: 2, observation: "Concluída em campo", requestId: "REQ-COMPLETE" })).toMatchObject({ evidenceValidationPending: true });
  });

  it("cancela somente com motivo e registra a mudança", () => {
    const fixtures = activityFixtures();
    const atomic = configureActivity(runtime, fixtures);
    expect(() => runtime.cancel({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "", requestId: "REQ-CANCEL" })).toThrow(/Motivo/i);
    expect(runtime.cancel({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "Escopo cancelado", requestId: "REQ-CANCEL-2" })).toMatchObject({ requestId: "REQ-CANCEL-2" });
    expect(atomic).toHaveBeenCalledTimes(1);
  });

  it("reabre atividade concluída com progresso controlado", () => {
    const fixtures = activityFixtures({ status: "Concluído" });
    configureActivity(runtime, fixtures);
    const result = runtime.reopen({}, user, { activityId: "CHK-LOJ-000001", version: 2, reason: "Revisão necessária", requestId: "REQ-REOPEN" }) as { activity: { status: string; progress: number } };
    expect(result.activity).toMatchObject({ status: "EM_ANDAMENTO", progress: 75 });
  });

  it("retorna overview vazio sem criar implantação implicitamente", () => {
    const stores = tableFixture(["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada", "version"], [
      { ID_Loja: "LOJ-001", Loja: "Loja 01", Status: "Ativa", Data_Inauguracao_Planejada: "2026-09-30", version: 1 },
    ]);
    const cycles = tableFixture(["ID_Implantacao", "ID_Loja", "Status_Ciclo", "ativo", "version"]);
    const activities = tableFixture(["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "ativo", "version"]);
    runtime.setDependency("assertImplantationViewV1", vi.fn());
    runtime.setDependency("buildImplantationCapabilitiesV1", vi.fn(() => ({ view: true })));
    runtime.setDependency("readTable", vi.fn((_spreadsheet: unknown, name: string) => ({ "01_LOJAS": stores, "20_IMPLANTACOES_LOJA": cycles, "21_IMPLANTACAO_ATIVIDADES": activities })[name]));
    const result = runtime.overview({}, user) as { stores: Array<{ implantation: unknown; summary: { total: number } }>; totals: Record<string, number> };
    expect(result.stores[0]).toMatchObject({ implantation: null, summary: { total: 0 } });
    expect(result.totals).toMatchObject({ stores: 1, started: 0, notStarted: 1 });
  });

  it("retorna overview iniciado com progresso e status derivados das atividades", () => {
    const stores = tableFixture(["ID_Loja", "Loja", "Status", "Data_Inauguracao_Planejada", "version"], [
      { ID_Loja: "LOJ-001", Loja: "Loja 01", Status: "Ativa", Data_Inauguracao_Planejada: "2026-09-30", version: 1 },
    ]);
    const cycles = tableFixture(["ID_Implantacao", "ID_Loja", "ID_Modelo_Versao", "ID_Usuario_Coordenador", "Data_Inauguracao_Base", "Data_Inauguracao_Planejada_Atual", "Status_Ciclo", "Iniciada_Em", "Iniciada_Por", "ativo", "version"], [
      { ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", ID_Modelo_Versao: "MOD-001", Status_Ciclo: "Ativo", ativo: "Sim", version: 1 },
    ]);
    const activityHeaders = ["ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Status", "Percentual_Concluido", "Critica_Snapshot", "Evidencia_Obrigatoria_Snapshot", "ativo", "version"];
    const activities = tableFixture(activityHeaders, [
      { ID_Checklist_Loja: "A", ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", Status: "Concluído", Percentual_Concluido: 100, Critica_Snapshot: "Sim", ativo: "Sim", version: 1 },
      { ID_Checklist_Loja: "B", ID_Implantacao: "IMP-000001", ID_Loja: "LOJ-001", Status: "Bloqueado", Percentual_Concluido: 50, Critica_Snapshot: "Sim", ativo: "Sim", version: 1 },
    ]);
    runtime.setDependency("assertImplantationViewV1", vi.fn());
    runtime.setDependency("buildImplantationCapabilitiesV1", vi.fn(() => ({ view: true })));
    runtime.setDependency("readTable", vi.fn((_spreadsheet: unknown, name: string) => ({ "01_LOJAS": stores, "20_IMPLANTACOES_LOJA": cycles, "21_IMPLANTACAO_ATIVIDADES": activities })[name]));
    const result = runtime.overview({}, user) as { stores: Array<{ summary: Record<string, number> }>; totals: Record<string, number> };
    expect(result.stores[0].summary).toMatchObject({ total: 2, progress: 75, blocked: 1, completed: 1, criticalOpen: 1 });
    expect(result.totals).toMatchObject({ started: 1, notStarted: 0, blocked: 1, completedActivities: 1 });
  });

  it("pagina timeline por loja, mais recente primeiro, sem carregar linhas completas fora da página", () => {
    const activities = tableFixture(["ID_Checklist_Loja", "ID_Loja"], [{ ID_Checklist_Loja: "CHK-LOJ-000001", ID_Loja: "LOJ-001" }]);
    const headers = ["ID_Atualizacao", "ID_Checklist_Loja", "ID_Implantacao", "ID_Loja", "Tipo_Atualizacao", "Texto", "Status_Anterior", "Status_Novo", "Progresso_Anterior", "Progresso_Novo", "ID_Responsavel_Anterior", "ID_Responsavel_Novo", "Data_Hora", "ID_Usuario", "Origem", "Request_ID", "ativo"];
    const updates = tableFixture(headers, [
      { ID_Atualizacao: "ATU-000001", ID_Checklist_Loja: "OUTRA", ativo: "Sim" },
      { ID_Atualizacao: "ATU-000002", ID_Checklist_Loja: "CHK-LOJ-000001", Tipo_Atualizacao: "A", ativo: "Sim" },
      { ID_Atualizacao: "ATU-000003", ID_Checklist_Loja: "CHK-LOJ-000001", Tipo_Atualizacao: "B", ativo: "Sim" },
      { ID_Atualizacao: "ATU-000004", ID_Checklist_Loja: "CHK-LOJ-000001", Tipo_Atualizacao: "C", ativo: "Sim" },
    ]);
    updates.sheet.getLastRow.mockReturnValue(8);
    updates.sheet.getRange.mockImplementation((_row: number, column: number) => {
      if (column === headers.indexOf("ID_Checklist_Loja") + 1) return rangeFixture(updates.rows.map((row) => [row[headers.indexOf("ID_Checklist_Loja")]]));
      if (column === headers.indexOf("ativo") + 1) return rangeFixture(updates.rows.map((row) => [row[headers.indexOf("ativo")]]));
      return rangeFixture();
    });
    updates.sheet.getRangeList.mockImplementation((addresses: string[]) => ({
      getRanges: () => addresses.map((address) => {
        const physicalRow = Number(address.match(/^A(\d+):/)?.[1]);
        return rangeFixture([updates.rows[physicalRow - 5]]);
      }),
    }));
    const scope = vi.fn();
    runtime.setDependency("assertModulePermission", vi.fn());
    runtime.setDependency("assertStoreScope", scope);
    runtime.setDependency("readTable", vi.fn(() => activities));
    runtime.setDependency("readImplantationTableStructureV1", vi.fn(() => updates));
    const result = runtime.timeline({}, user, { activityId: "CHK-LOJ-000001", cursor: 0, pageSize: 2 }) as { items: Array<{ id: string }>; nextCursor: number; total: number };
    expect(result.items.map((item) => item.id)).toEqual(["ATU-000004", "ATU-000003"]);
    expect(result).toMatchObject({ nextCursor: 2, total: 3 });
    expect(scope).toHaveBeenCalledWith(user, "LOJ-001");
    expect(updates.sheet.getRangeList).toHaveBeenCalledWith(expect.arrayContaining([expect.stringMatching(/^A8:/), expect.stringMatching(/^A7:/)]));
  });
});
