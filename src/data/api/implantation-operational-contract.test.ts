import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const backend = readProjectFile("apps-script/src/ImplantationOperations.ts");
const dispatch = readProjectFile("apps-script/src/Code.ts");
const compiled = readProjectFile("apps-script/deploy/Code.gs");
const app = readProjectFile("src/App.tsx");
const activityPage = readProjectFile("src/pages/implantation-activity-page.tsx");
const storePanel = readProjectFile("src/components/implantation/store-implantation-panel.tsx");
const navigation = readProjectFile("src/components/layout/navigation.tsx");
const errorBoundary = readProjectFile("src/components/implantation/implantation-error-boundary.tsx");
const manifest = JSON.parse(readProjectFile("apps-script/deploy/appsscript.json")) as { oauthScopes?: string[] };

function functionSection(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`);
  expect(start, `função ${name} ausente`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nfunction ", start + 10);
  return source.slice(start, next < 0 ? source.length : next);
}

describe("contrato operacional real da Implantação", () => {
  it("mantém todas as actions autenticadas registradas no dispatch", () => {
    const actions = [
      "implantationCapabilities", "implantationOverview", "implantationChecklists", "implantationPendencies", "implantationStoreDetail",
      "implantationActivityDetail", "implantationTimeline", "implantationMasterChecklist", "setPlannedOpeningDate", "startImplantation",
      "updateImplantationActivity", "blockImplantationActivity", "unblockImplantationActivity", "markImplantationActivityNotApplicable",
      "cancelImplantationActivity", "completeImplantationActivity", "reopenImplantationActivity", "previewOpeningDateChange", "changePlannedOpeningDate",
    ];
    actions.forEach((action) => expect(dispatch).toContain(`case "${action}"`));
  });

  it("não inclui Implantação no dispatch público do visitante", () => {
    expect(functionSection(dispatch, "isPublicReadAction")).toContain('["publicBootstrap", "publicQuotesWorkspace"]');
    expect(functionSection(dispatch, "dispatchPublicReadAction")).not.toMatch(/Implantation|implantacao|implantation/i);
  });

  it("protege todas as mutações com ScriptLock direto ou pelo mutador comum", () => {
    ["setPlannedOpeningDateV1", "startImplantationV1", "mutateImplantationActivityV1", "blockImplantationActivityV1", "unblockImplantationActivityV1", "changePlannedOpeningDateV1"]
      .forEach((name) => expect(functionSection(backend, name)).toContain("withScriptLock"));
    ["updateImplantationActivityV1", "markImplantationActivityNotApplicableV1", "cancelImplantationActivityV1", "completeImplantationActivityV1", "reopenImplantationActivityV1"]
      .forEach((name) => expect(functionSection(backend, name)).toContain("mutateImplantationActivityV1"));
  });

  it("revalida usuário ativo, matriz e Lojas_Permitidas dentro das escritas", () => {
    const guard = functionSection(backend, "revalidateImplantationWriteAccessV1");
    expect(guard).toMatch(/ID_Usuário[\s\S]*Ativo/);
    expect(guard).toContain("assertModulePermission");
    expect(guard).toContain("assertStoreScope");
    ["setPlannedOpeningDateV1", "startImplantationV1", "mutateImplantationActivityV1", "blockImplantationActivityV1", "unblockImplantationActivityV1", "changePlannedOpeningDateV1"]
      .forEach((name) => expect(functionSection(backend, name)).toContain("revalidateImplantationWriteAccessV1"));
  });

  it("mantém version e Request_ID em todas as mutações", () => {
    expect(functionSection(backend, "setPlannedOpeningDateV1")).toMatch(/expectedVersion[\s\S]*requestId/);
    expect(functionSection(backend, "startImplantationV1")).toMatch(/storeVersion[\s\S]*requestId/);
    expect(functionSection(backend, "mutateImplantationActivityV1")).toMatch(/expectedVersion[\s\S]*requestId/);
    expect(functionSection(backend, "blockImplantationActivityV1")).toMatch(/expectedVersion[\s\S]*requestId/);
    expect(functionSection(backend, "unblockImplantationActivityV1")).toMatch(/expectedVersion[\s\S]*requestId/);
    expect(functionSection(backend, "changePlannedOpeningDateV1")).toMatch(/implantationVersion[\s\S]*storeVersion[\s\S]*requestId[\s\S]*activityVersions/);
  });

  it("deriva capabilities de cada ação e compõe cancelar/reabrir com Atualizações.Criar", () => {
    const capabilities = functionSection(backend, "buildImplantationCapabilitiesV1");
    expect(capabilities).toMatch(/blockActivity: canCreateUpdates/);
    expect(capabilities).toMatch(/unblockActivity: canCreateUpdates/);
    expect(capabilities).toMatch(/markNotApplicable: canCreateUpdates/);
    expect(capabilities).toMatch(/completeActivity: canCreateUpdates/);
    expect(capabilities).toMatch(/cancelActivity: canCreateUpdates &&/);
    expect(capabilities).toMatch(/reopenActivity: canCreateUpdates &&/);
    expect(activityPage).toMatch(/capabilities\.blockActivity[\s\S]*capabilities\.unblockActivity[\s\S]*capabilities\.markNotApplicable[\s\S]*capabilities\.completeActivity/);
    expect(storePanel).toMatch(/previewOpeningDateChange[\s\S]*changePlannedOpeningDate/);
  });

  it("mantém preview de inauguração estritamente somente leitura", () => {
    const preview = functionSection(backend, "previewOpeningDateChangeV1");
    expect(preview).not.toMatch(/setCell|setValues|performAtomicWrites|withScriptLock/);
    expect(preview).toContain("buildOpeningDateImpactsV1");
  });

  it("reprograma loja, ciclo e somente Data_Alvo_Atual sem tocar na original", () => {
    const change = functionSection(backend, "changePlannedOpeningDateV1");
    expect(change).toContain('setCell(stores, storeFound.current, "Data_Inauguracao_Planejada"');
    expect(change).toContain('setCell(cycles, cycleFound.current, "Data_Inauguracao_Planejada_Atual"');
    expect(change).toContain('setCell(activities, next, "Data_Alvo_Atual"');
    expect(change).not.toContain('setCell(activities, next, "Data_Alvo_Original"');
    expect(change).toContain("performAtomicWritesV1");
  });

  it("pagina a timeline em 20, limita a 50 e lê linhas completas somente da página", () => {
    const timeline = functionSection(backend, "buildImplantationTimelineV1");
    expect(timeline).toContain("payload.pageSize || 20");
    expect(timeline).toContain(", 50)");
    expect(timeline).toContain("ID_Checklist_Loja");
    expect(timeline).toContain(".reverse()");
    expect(timeline).toContain("matchingRows.slice(cursor, cursor + pageSize)");
    expect(timeline).toContain("getRangeList(pageNumbers.map");
    expect(timeline).toContain("assertStoreScope");
  });

  it("grava timeline e auditoria atômicas para as alterações operacionais", () => {
    const mutate = functionSection(backend, "mutateImplantationActivityV1");
    expect(mutate).toContain("buildImplantationUpdateRowV1");
    expect(mutate).toContain("performAtomicWritesV1");
    expect(mutate).toMatch(/IMPLANTACAO_ATIVIDADES[\s\S]*reference: requestId/);
    expect(functionSection(backend, "blockImplantationActivityV1")).toMatch(/buildImplantationUpdateRowV1[\s\S]*IMPLANTACAO_BLOQUEIOS/);
  });

  it("mantém evidências pendentes sem bloquear conclusão e sem Drive/24_ARQUIVOS", () => {
    expect(functionSection(backend, "completeImplantationActivityV1")).toContain('targetStatus: "CONCLUIDO"');
    expect(functionSection(backend, "mutateImplantationActivityV1")).toContain('evidenceValidationPending: targetStatus === "CONCLUIDO"');
    expect(backend).not.toMatch(/DriveApp|APP_CONFIG\.sheets\.files/);
    expect(compiled).not.toMatch(/DriveApp/);
    expect(manifest.oauthScopes ?? []).not.toContain("https://www.googleapis.com/auth/drive");
  });

  it("registra todas as rotas e a aba da loja", () => {
    ["implantacao", "implantacao/checklists", "implantacao/pendencias", "implantacao/checklist-mestre", "implantacao/atividades/:id"]
      .forEach((route) => expect(app).toContain(`path="${route}"`));
    expect(storePanel).toContain("/implantacao/atividades/");
    expect(readProjectFile("src/pages/store-detail-page.tsx")).toContain('setSearchParams({ tab: "implantacao" })');
  });

  it("isola falhas, nega visitante/sem permissão e não expõe menu indevido", () => {
    expect(app).toContain('accessMode !== "authenticated"');
    expect(app).toContain("!capabilities?.view");
    expect(app).toContain("ImplantationErrorBoundary");
    expect(errorBoundary).toContain("A falha ficou isolada neste módulo");
    expect(navigation).toContain('accessMode === "authenticated" && (loading || canView === true)');
    expect(navigation).toContain("shouldShowImplantationNavigation(accessMode, implantationAccessLoading, capabilities?.view)");
  });

  it("mantém o Code.gs compilado sem ID DEV hardcoded nem novos escopos", () => {
    expect(compiled).not.toContain("1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c");
    expect(compiled).toContain("function startImplantationV1");
    expect(compiled).toContain("function changePlannedOpeningDateV1");
    expect(manifest.oauthScopes ?? []).toEqual(expect.not.arrayContaining([expect.stringContaining("drive")]));
  });
});
