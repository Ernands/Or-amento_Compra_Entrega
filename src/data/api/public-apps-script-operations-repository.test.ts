import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicAppsScriptClient } from "./apps-script-client";
import { PublicAppsScriptOperationsRepository } from "./public-apps-script-operations-repository";

describe("PublicAppsScriptOperationsRepository", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hidrata somente campos públicos e mantém todas as permissões de escrita negadas", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      const request = JSON.parse(String(options.body));
      const data = request.action === "publicBootstrap" ? {
        source: { kind: "public", status: "connected", readOnly: true, checkedAt: "2026-08-13T12:00:00.000Z", message: "Somente leitura", spreadsheetId: "NAO_EXPOR" },
        stores: [{ id: "LOJ-001", name: "Loja 01", city: "Fortaleza", state: "CE", status: "Ativa", manager: "NAO_EXPOR" }],
        items: [{ id: "ITM-00001", operationalCode: "MOB-001", group: "Mobiliário", area: "Transacional", name: "Balcão", definitionStatus: "LIBERADO_PARA_COTACAO", duplicateOperationalCode: false, notes: "NAO_EXPOR" }],
        necessities: [{ id: "NEC-000001", storeId: "LOJ-001", itemId: "ITM-00001", quantity: 1, priority: "MEDIA", status: "EM_COTACAO", created_by: "NAO_EXPOR" }],
        activeQuoteNecessityIds: ["NEC-000001"],
      } : {
        suppliers: [{ id: "PUB-FOR-001", name: "Fornecedor 01", taxId: "NAO_EXPOR" }],
        quotes: [{ id: "PUB-COT-000001", necessityId: "NEC-000001", storeId: "LOJ-001", itemId: "ITM-00001", supplierId: "PUB-FOR-001", quantity: 1, total: 579, leadTimeDays: 10, status: "RECEBIDA", selected: false, link: "NAO_EXPOR", created_by: "NAO_EXPOR" }],
        checkedAt: "2026-08-13T12:00:00.000Z",
      };
      return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const repository = new PublicAppsScriptOperationsRepository(new PublicAppsScriptClient("https://script.google.com/macros/s/DEV/exec"));

    const bootstrap = await repository.getBootstrap();
    const workspace = await repository.getQuotesWorkspace();

    expect(bootstrap.source).not.toHaveProperty("spreadsheetId");
    expect(bootstrap.stores[0]).not.toHaveProperty("manager", "NAO_EXPOR");
    expect(bootstrap.stores[0].manager).toBe("");
    expect(bootstrap.necessities[0]).not.toHaveProperty("created_by");
    expect(workspace.suppliers[0].taxId).toBe("");
    expect(workspace.quotes[0].link).toBe("");
    expect(workspace.quotes[0]).not.toHaveProperty("created_by");
    expect(workspace.permissions).toEqual({ view: true, create: false, edit: false, delete: false, select: false, createSupplier: false });
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1].body)))).toEqual([
      { action: "publicBootstrap", payload: {} },
      { action: "publicQuotesWorkspace", payload: {} },
    ]);
    await expect(repository.createQuote()).rejects.toThrow("Entre com Google para realizar alterações.");
  });
});
