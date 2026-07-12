export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function formatPercent(fraction: number): string {
  return (fraction * 100).toFixed(2);
}

/** UN/ECE Recommendation 20 unit codes for the unit strings this product
 * actually offers (see packages/shared-types Product.unit); anything else
 * falls back to C62 (the generic "unit/piece" code) rather than guessing. */
const UNIT_CODE_BY_LABEL: Record<string, string> = {
  unite: "C62",
  heure: "HUR",
  jour: "DAY",
  mois: "MON",
  kg: "KGM",
  litre: "LTR",
  metre: "MTR",
};

export function toUnitCode(unit: string): string {
  return UNIT_CODE_BY_LABEL[unit.toLowerCase()] ?? "C62";
}
