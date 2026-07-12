export function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(0)}%`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatAddress(address: { line1: string; line2?: string; city: string; postalCode?: string; country: string }): string[] {
  const lines = [address.line1];
  if (address.line2) lines.push(address.line2);
  lines.push([address.postalCode, address.city].filter(Boolean).join(" "));
  lines.push(address.country);
  return lines;
}

export function formatIdentifiers(identifiers: {
  ice?: string;
  identifiantFiscal?: string;
  registreCommerce?: string;
  patente?: string;
}): string[] {
  const lines: string[] = [];
  if (identifiers.ice) lines.push(`ICE: ${identifiers.ice}`);
  if (identifiers.identifiantFiscal) lines.push(`IF: ${identifiers.identifiantFiscal}`);
  if (identifiers.registreCommerce) lines.push(`RC: ${identifiers.registreCommerce}`);
  if (identifiers.patente) lines.push(`Patente: ${identifiers.patente}`);
  return lines;
}
