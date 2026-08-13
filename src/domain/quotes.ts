export interface QuoteTotalsInput {
  quantity: number;
  unitPrice: number;
  freight: number;
  otherCosts: number;
}

export function calculateQuoteTotals(input: QuoteTotalsInput) {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value < 0) || input.quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero e valores não podem ser negativos.");
  }

  const subtotal = roundCurrency(input.quantity * input.unitPrice);
  const total = roundCurrency(subtotal + input.freight + input.otherCosts);
  return { subtotal, total };
}

export function areQuoteQuantitiesComparable(quantities: number[]): boolean {
  if (quantities.length < 2) return true;
  const reference = quantities[0];
  return quantities.every((quantity) => Number.isFinite(quantity) && Math.abs(quantity - reference) < 0.000001);
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
