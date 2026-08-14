import { describe, expect, it } from "vitest";

import {
  IMPLANTATION_CRITICAL_ACTIVITY_CODES,
  IMPLANTATION_PERMISSION_ROWS_V1,
  calculateImplantationTargetDate,
  calculateStoreImplantationProgress,
  canAccessImplantation,
  daysUntilImplantationOpening,
  implantationSeedV1,
  isCriticalUpcomingImplantation,
  isStoreReadyForOpening,
  isUpcomingImplantation,
  missingImplantationEvidence,
  planUniqueAdditions,
  runAtomicPreparation,
  validateImplantationTransition,
} from "./implantation";

describe("Checklist Mestre de Implantação V1", () => {
  it("mantém o seed versionado com 30 atividades obrigatórias e quatro fases", () => {
    expect(implantationSeedV1.model.version).toBe(1);
    expect(implantationSeedV1.activities).toHaveLength(30);
    expect(new Set(implantationSeedV1.activities.map((activity) => activity.code)).size).toBe(30);
    expect(new Set(implantationSeedV1.activities.map((activity) => activity.id)).size).toBe(30);
    expect(new Set(implantationSeedV1.activities.map((activity) => activity.phaseId))).toEqual(
      new Set(["FAS-01", "FAS-02", "FAS-03", "FAS-04"]),
    );
    expect(implantationSeedV1.activities.every((activity) => activity.mandatory)).toBe(true);
    expect(new Set(implantationSeedV1.activities.map((activity) => activity.offsetDays))).toEqual(
      new Set([-30, -25, -20, -5, 0]),
    );
  });

  it("preserva responsáveis aprovados das atividades 27 a 30", () => {
    const roles = Object.fromEntries(implantationSeedV1.activities.map((activity) => [activity.code, activity.defaultRole]));
    expect(roles).toMatchObject({
      "ATV-027": "RH",
      "ATV-028": "Equipe interna",
      "ATV-029": "Equipe interna",
      "ATV-030": "Equipe interna",
    });
  });

  it("marca exatamente as 15 atividades críticas aprovadas", () => {
    const actual = implantationSeedV1.activities.filter((activity) => activity.critical).map((activity) => activity.code);
    expect(actual).toEqual([...IMPLANTATION_CRITICAL_ACTIVITY_CODES]);
  });

  it("mantém as 16 regras de evidência e as quantidades por tipo", () => {
    expect(implantationSeedV1.evidenceRules).toHaveLength(16);
    const byActivity = Object.fromEntries(implantationSeedV1.activities.map((activity) => [
      activity.code,
      implantationSeedV1.evidenceRules.filter((rule) => rule.activityId === activity.id).map((rule) => `${rule.type}:${rule.minimum}`).sort(),
    ]));
    expect(byActivity).toMatchObject({
      "ATV-007": ["DOCUMENTO:1"],
      "ATV-014": ["DOCUMENTO:1"],
      "ATV-015": ["FOTO:1"],
      "ATV-016": ["FOTO:1"],
      "ATV-017": ["FOTO:1"],
      "ATV-018": ["DOCUMENTO:1"],
      "ATV-020": ["FOTO:1"],
      "ATV-022": ["FOTO:2"],
      "ATV-023": ["DOCUMENTO:1", "FOTO:1"],
      "ATV-024": ["DOCUMENTO:1", "FOTO:2"],
      "ATV-026": ["DOCUMENTO:1"],
      "ATV-027": ["FOTO:1"],
      "ATV-029": ["EVIDENCIA:1"],
      "ATV-030": ["FOTO:2"],
    });
    expect(missingImplantationEvidence("CHK-MOD-00024", [
      { type: "FOTO", active: true },
      { type: "DOCUMENTO", active: true },
    ])).toEqual([{ type: "FOTO", required: 2, found: 1 }]);
    expect(missingImplantationEvidence("CHK-MOD-00024", [
      { type: "FOTO", active: true },
      { type: "FOTO", active: true },
      { type: "DOCUMENTO", active: true },
    ])).toEqual([]);
  });
});

describe("máquina de estados e progresso da Implantação", () => {
  it("normaliza o progresso dos estados determinísticos", () => {
    expect(validateImplantationTransition({ from: "NAO_INICIADO", to: "NAO_INICIADO", currentProgress: 75 })).toBe(0);
    expect(validateImplantationTransition({ from: "EM_ANDAMENTO", to: "CONCLUIDO", currentProgress: 75 })).toBe(100);
    expect(validateImplantationTransition({ from: "EM_ANDAMENTO", to: "BLOQUEADO", currentProgress: 50, reason: "Aguardando BB" })).toBe(50);
  });

  it("aceita somente 25, 50 ou 75 por cento em andamento", () => {
    expect(validateImplantationTransition({ from: "NAO_INICIADO", to: "EM_ANDAMENTO", currentProgress: 0, requestedProgress: 25 })).toBe(25);
    expect(() => validateImplantationTransition({ from: "NAO_INICIADO", to: "EM_ANDAMENTO", currentProgress: 0, requestedProgress: 30 })).toThrow(/25%/);
  });

  it("exige motivo e permissão para cancelamento, e permissão para reabertura", () => {
    expect(() => validateImplantationTransition({ from: "EM_ANDAMENTO", to: "CANCELADO", currentProgress: 50, canCancel: true })).toThrow(/Motivo/);
    expect(() => validateImplantationTransition({ from: "EM_ANDAMENTO", to: "CANCELADO", currentProgress: 50, reason: "Cancelada" })).toThrow(/Permissão/);
    expect(() => validateImplantationTransition({ from: "CONCLUIDO", to: "EM_ANDAMENTO", currentProgress: 100, requestedProgress: 75 })).toThrow(/reabertura/);
  });

  it("exclui não aplicável e cancelado do denominador da loja", () => {
    expect(calculateStoreImplantationProgress([
      { status: "CONCLUIDO", progress: 100, active: true },
      { status: "EM_ANDAMENTO", progress: 50, active: true },
      { status: "NAO_APLICAVEL", progress: 0, active: true },
      { status: "CANCELADO", progress: 25, active: true },
      { status: "CONCLUIDO", progress: 100, active: false },
    ])).toBe(75);
  });

  it("considera pronta somente a loja sem obrigatória aplicável pendente", () => {
    expect(isStoreReadyForOpening([])).toBe(false);
    expect(isStoreReadyForOpening([
      { mandatory: true, status: "CONCLUIDO", active: true },
      { mandatory: true, status: "NAO_APLICAVEL", active: true },
      { mandatory: true, status: "CANCELADO", active: true },
    ])).toBe(true);
    expect(isStoreReadyForOpening([{ mandatory: true, status: "EM_ANDAMENTO", active: true }])).toBe(false);
  });
});

describe("datas de implantação", () => {
  it("calcula Data_Alvo a partir da inauguração e do offset", () => {
    expect(calculateImplantationTargetDate("2026-09-30", -30)).toBe("2026-08-31");
    expect(calculateImplantationTargetDate("2026-09-30", -25)).toBe("2026-09-05");
    expect(calculateImplantationTargetDate("2026-09-30", -5)).toBe("2026-09-25");
    expect(calculateImplantationTargetDate("2026-09-30", 0)).toBe("2026-09-30");
  });

  it("identifica próximas inaugurações em 30 dias e críticas em 7 dias", () => {
    expect(daysUntilImplantationOpening("2026-08-14", "2026-09-13")).toBe(30);
    expect(isUpcomingImplantation("2026-08-14", "2026-09-13")).toBe(true);
    expect(isUpcomingImplantation("2026-08-14", "2026-09-14")).toBe(false);
    expect(isCriticalUpcomingImplantation("2026-08-14", "2026-08-21")).toBe(true);
    expect(isCriticalUpcomingImplantation("2026-08-14", "2026-08-22")).toBe(false);
  });
});

describe("permissões e escopo da Implantação", () => {
  it("planeja uma linha única para cada combinação de cinco perfis e quatro módulos", () => {
    expect(IMPLANTATION_PERMISSION_ROWS_V1).toHaveLength(20);
    expect(new Set(IMPLANTATION_PERMISSION_ROWS_V1.map((row) => `${row.profile}|${row.module}`)).size).toBe(20);
  });

  it("nega visitante e limita Responsável Loja por Lojas_Permitidas", () => {
    expect(canAccessImplantation({ authenticated: false, profile: "ADMINISTRADOR", module: "Implantação", action: "view", allowedStoreIds: "TODAS" })).toBe(false);
    expect(canAccessImplantation({ authenticated: true, profile: "RESPONSAVEL_LOJA", module: "Implantação Atualizações", action: "create", allowedStoreIds: ["LOJ-006"], storeId: "LOJ-006" })).toBe(true);
    expect(canAccessImplantation({ authenticated: true, profile: "RESPONSAVEL_LOJA", module: "Implantação Atualizações", action: "create", allowedStoreIds: ["LOJ-006"], storeId: "LOJ-014" })).toBe(false);
  });

  it("restringe Checklist Mestre a Administrador e Gestor", () => {
    expect(canAccessImplantation({ authenticated: true, profile: "ADMINISTRADOR", module: "Checklist Mestre", action: "edit", allowedStoreIds: "TODAS" })).toBe(true);
    expect(canAccessImplantation({ authenticated: true, profile: "GESTOR", module: "Checklist Mestre", action: "edit", allowedStoreIds: "TODAS" })).toBe(true);
    expect(canAccessImplantation({ authenticated: true, profile: "COMPRAS", module: "Checklist Mestre", action: "view", allowedStoreIds: "TODAS" })).toBe(false);
  });
});

describe("preparação idempotente e rollback", () => {
  it("planeja apenas chaves ainda inexistentes", () => {
    const planned = planUniqueAdditions([{ id: "A" }], [{ id: "A" }, { id: "B" }, { id: "B" }], (value) => value.id);
    expect(planned).toEqual([{ id: "B" }]);
  });

  it("desfaz em ordem reversa quando uma etapa falha", () => {
    const events: string[] = [];
    expect(() => runAtomicPreparation([
      { apply: () => events.push("apply-1"), rollback: () => events.push("rollback-1") },
      { apply: () => events.push("apply-2"), rollback: () => events.push("rollback-2") },
      { apply: () => { throw new Error("falha controlada"); }, rollback: () => events.push("rollback-3") },
    ])).toThrow("falha controlada");
    expect(events).toEqual(["apply-1", "apply-2", "rollback-2", "rollback-1"]);
  });
});
