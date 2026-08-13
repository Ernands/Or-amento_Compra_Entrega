import { afterEach, describe, expect, it, vi } from "vitest";

import { AppsScriptClient } from "./apps-script-client";

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
      "https://script.google.com/macros/s/DEV/exec",
      expect.objectContaining({
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "bootstrap", credential: "GOOGLE_ID_TOKEN", payload: {} }),
      }),
    );
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
});

function successfulFetch(data: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}
