import { afterEach, describe, expect, it, vi } from "vitest";

import { AppsScriptClient, PublicAppsScriptClient } from "./apps-script-client";

describe("AppsScriptClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o Google ID token no POST bootstrap esperado pelo Apps Script", async () => {
    const fetchMock = successfulFetch({ user: {}, stores: [], items: [], necessities: [] });
    vi.stubGlobal("fetch", fetchMock);

    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "GOOGLE_ID_TOKEN");
    await client.call("bootstrap", {});

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/script\.google\.com\/macros\/s\/DEV\/exec\?requestId=\d+-\d+$/),
      expect.objectContaining({
        method: "POST",
        redirect: "follow",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "bootstrap", credential: "GOOGLE_ID_TOKEN", payload: {} }),
      }),
    );
  });

  it("envia ações públicas sem Google ID token", async () => {
    const fetchMock = successfulFetch({ stores: [], items: [], necessities: [], activeQuoteNecessityIds: [] });
    vi.stubGlobal("fetch", fetchMock);

    const client = new PublicAppsScriptClient("https://script.google.com/macros/s/DEV/exec");
    await client.call("publicBootstrap");

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toEqual({ action: "publicBootstrap", payload: {} });
    expect(request).not.toHaveProperty("credential");
  });

  it("envia versão e alterações ao editar uma loja", async () => {
    const fetchMock = successfulFetch({ store: { id: "LOJ-001" } });
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");
    const payload = { id: "LOJ-001", version: 1, changes: { name: "Loja Acaraú" }, reason: "Cadastro inicial" };

    await client.call("updateStore", payload);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ action: "updateStore", credential: "TOKEN", payload });
  });

  it("envia versão e alterações ao editar um item", async () => {
    const fetchMock = successfulFetch({ item: { id: "ITM-00001" } });
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");
    const payload = { id: "ITM-00001", version: 1, changes: { specification: "Nova especificação" } };

    await client.call("updateItem", payload);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ action: "updateItem", credential: "TOKEN", payload });
  });

  it("solicita o diagnóstico técnico autenticado sem payload de escrita", async () => {
    const fetchMock = successfulFetch({ ready: true, checkedAt: "2026-08-13T12:00:00.000Z", tables: [] });
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");

    await client.call("technicalStatus");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ action: "technicalStatus", credential: "TOKEN", payload: {} });
  });

  it.each([
    ["quotesWorkspace", {}],
    ["createSupplier", { name: "Fornecedor DEV", active: true }],
    ["createQuote", { necessityId: "NEC-000001", supplierId: "FOR-000001", unitPrice: 10, quantity: 2 }],
    ["updateQuote", { id: "COT-000001", version: 3, changes: { necessityId: "NEC-000428", unitPrice: 12, quantity: 1 } }],
    ["deleteQuote", { id: "COT-000001", version: 4, reason: "Teste de exclusão" }],
    ["selectQuote", { id: "COT-000001", version: 4, reason: "Melhor proposta" }],
  ])("preserva o contrato autenticado da ação %s", async (action, payload) => {
    const fetchMock = successfulFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");

    await client.call(action, payload);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ action, credential: "TOKEN", payload });
  });

  it("não repete automaticamente uma escrita quando o redirecionamento retorna 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");

    await expect(client.call("createQuote", { necessityId: "NEC-000769" })).rejects.toMatchObject({
      code: "HTTP_404",
      message: expect.stringContaining("Atualize os dados antes de tentar novamente"),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("preserva links de proposta com parâmetros extensos no JSON da cotação", async () => {
    const fetchMock = successfulFetch({ quote: { id: "COT-000001" } });
    vi.stubGlobal("fetch", fetchMock);
    const client = new AppsScriptClient("https://script.google.com/macros/s/DEV/exec", "TOKEN");
    const link = "https://www.amazon.com.br/?tag=teste-20&ref=pd_sl_7rwd1q78df_e&adgrpid=155790195778&hvadid=677606588104&hvrand=7280972068615270532&hvlocphy=9213505";

    await client.call("createQuote", { necessityId: "NEC-000769", link });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.payload.link).toBe(link);
  });
});

function successfulFetch(data: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}
