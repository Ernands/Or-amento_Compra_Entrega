import { describe, expect, it } from "vitest";

import { can, type UserAccess } from "./permissions";

describe("permissions", () => {
  const user: UserAccess = { id: "USR-0001", profile: "RESPONSAVEL_LOJA", active: true, allowedStoreIds: ["LOJ-001"] };

  it("limita o responsável às lojas permitidas", () => {
    expect(can(user, "EDITAR", { storeId: "LOJ-001" })).toBe(true);
    expect(can(user, "EDITAR", { storeId: "LOJ-002" })).toBe(false);
  });

  it("bloqueia usuários inativos", () => {
    expect(can({ ...user, active: false }, "VER", { storeId: "LOJ-001" })).toBe(false);
  });
});
