import { describe, expect, it } from "vitest";

import { createNextId } from "./ids";

describe("createNextId", () => {
  it("ignora IDs de outras entidades e avança o maior número", () => {
    expect(createNextId("COT", ["COT-000001", "COT-000009", "CMP-000999"], 6)).toBe("COT-000010");
  });
});
