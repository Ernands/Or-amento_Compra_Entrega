import { afterEach, describe, expect, it, vi } from "vitest";

import { AppsScriptClient } from "./apps-script-client";

describe("AppsScriptClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o Google ID token no POST bootstrap esperado pelo Apps Script", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { user: {}, stores: [], items: [], necessities: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
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
});
