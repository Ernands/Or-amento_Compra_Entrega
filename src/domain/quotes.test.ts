import { describe, expect, it } from "vitest";

import { areQuoteQuantitiesComparable, calculateQuoteTotals } from "./quotes";

describe("calculateQuoteTotals", () => {
  it("calcula subtotal e total com arredondamento monetário", () => {
    expect(calculateQuoteTotals({ quantity: 3, unitPrice: 10.115, freight: 2, otherCosts: 1 })).toEqual({ subtotal: 30.35, total: 33.35 });
  });

  it("rejeita quantidade zero e valores negativos", () => {
    expect(() => calculateQuoteTotals({ quantity: 0, unitPrice: 10, freight: 0, otherCosts: 0 })).toThrow();
    expect(() => calculateQuoteTotals({ quantity: 1, unitPrice: -1, freight: 0, otherCosts: 0 })).toThrow();
  });
});

describe("areQuoteQuantitiesComparable", () => {
  it("permite comparar totais somente quando todas as quantidades são iguais", () => {
    expect(areQuoteQuantitiesComparable([27, 27, 27])).toBe(true);
    expect(areQuoteQuantitiesComparable([27, 10])).toBe(false);
  });
});
