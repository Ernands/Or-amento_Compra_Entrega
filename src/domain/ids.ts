const idPattern = /^[A-Z]{3}-\d+$/;

export function createNextId(prefix: string, existingIds: readonly string[], digits: number): string {
  if (!/^[A-Z]{3}$/.test(prefix) || digits < 1) {
    throw new Error("Prefixo ou quantidade de dígitos inválidos.");
  }

  const highest = existingIds.reduce((current, id) => {
    if (!idPattern.test(id) || !id.startsWith(`${prefix}-`)) return current;
    const value = Number(id.slice(4));
    return Number.isSafeInteger(value) ? Math.max(current, value) : current;
  }, 0);

  return `${prefix}-${String(highest + 1).padStart(digits, "0")}`;
}
