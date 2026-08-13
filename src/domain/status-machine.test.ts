import { describe, expect, it } from "vitest";

import { assertTransition, canTransition } from "./status-machine";

describe("status machine", () => {
  it("permite o avanço principal e bloqueia saltos", () => {
    expect(canTransition("NAO_INICIADO", "EM_COTACAO")).toBe(true);
    expect(canTransition("NAO_INICIADO", "APROVADO")).toBe(false);
  });

  it("mantém concluído bloqueado", () => {
    expect(() => assertTransition("CONCLUIDO", "EM_COTACAO")).toThrow("Transição inválida");
  });
});
