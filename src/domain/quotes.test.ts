import { describe, expect, it } from "vitest";

import { areQuoteQuantitiesComparable, buildQuoteScopeSignature, calculateQuoteTotals, haveIdenticalQuoteScope } from "./quotes";

describe("calculateQuoteTotals", () => {
  it("calcula subtotal e total com arredondamento monetário", () => {
    expect(calculateQuoteTotals({ quantityTotal: 3, unitPrice: 10.115, freight: 2, otherCosts: 1 })).toEqual({ subtotal: 30.35, total: 33.35 });
  });

  it("rejeita quantidade zero e valores negativos", () => {
    expect(() => calculateQuoteTotals({ quantityTotal: 0, unitPrice: 10, freight: 0, otherCosts: 0 })).toThrow();
    expect(() => calculateQuoteTotals({ quantityTotal: 1, unitPrice: -1, freight: 0, otherCosts: 0 })).toThrow();
  });
});

describe("assinatura de escopo", () => {
  const scope = [
    { necessityId: "NEC-000002", itemId: "ITM-00001", quantity: 2 },
    { necessityId: "NEC-000001", itemId: "ITM-00001", quantity: 1 },
  ];

  it("é determinística e independe da ordem das lojas", () => {
    expect(buildQuoteScopeSignature(scope)).toBe("NEC-000001:ITM-00001:1|NEC-000002:ITM-00001:2");
    expect(haveIdenticalQuoteScope(scope, [...scope].reverse())).toBe(true);
  });

  it("diferencia quantidade ou conjunto de necessidades", () => {
    expect(haveIdenticalQuoteScope(scope, [{ ...scope[0], quantity: 1 }, scope[1]])).toBe(false);
    expect(haveIdenticalQuoteScope(scope, [scope[0]])).toBe(false);
  });
});

describe("areQuoteQuantitiesComparable", () => {
  it("permite comparar totais somente quando todas as quantidades são iguais", () => {
    expect(areQuoteQuantitiesComparable([27, 27, 27])).toBe(true);
    expect(areQuoteQuantitiesComparable([27, 10])).toBe(false);
  });
});
