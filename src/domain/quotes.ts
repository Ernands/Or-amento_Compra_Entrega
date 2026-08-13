export interface QuoteTotalsInput {
  quantityTotal: number;
  unitPrice: number;
  freight: number;
  otherCosts: number;
}

export function calculateQuoteTotals(input: QuoteTotalsInput) {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value < 0) || input.quantityTotal <= 0) {
    throw new Error("Quantidade deve ser maior que zero e valores não podem ser negativos.");
  }

  const subtotal = roundCurrency(input.quantityTotal * input.unitPrice);
  const total = roundCurrency(subtotal + input.freight + input.otherCosts);
  return { subtotal, total };
}

export function areQuoteQuantitiesComparable(quantities: number[]): boolean {
  if (quantities.length < 2) return true;
  const reference = quantities[0];
  return quantities.every((quantity) => Number.isFinite(quantity) && Math.abs(quantity - reference) < 0.000001);
}

export function buildQuoteScopeSignature(lines: Array<{ necessityId: string; itemId: string; quantity: number }>): string {
  return lines
    .map((line) => `${line.necessityId}:${line.itemId}:${normalizeQuantity(line.quantity)}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

export function haveIdenticalQuoteScope(
  left: Array<{ necessityId: string; itemId: string; quantity: number }>,
  right: Array<{ necessityId: string; itemId: string; quantity: number }>,
): boolean {
  return buildQuoteScopeSignature(left) === buildQuoteScopeSignature(right);
}

function normalizeQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) throw new Error("A assinatura de escopo exige quantidades positivas.");
  return Number(value.toFixed(6)).toString();
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
