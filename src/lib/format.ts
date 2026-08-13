export const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatStatus(status: string): string {
  return status
    .toLocaleLowerCase("pt-BR")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}
