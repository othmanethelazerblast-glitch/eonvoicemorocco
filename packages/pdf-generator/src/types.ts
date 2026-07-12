export interface PdfPartyIdentifiers {
  ice?: string;
  identifiantFiscal?: string;
  registreCommerce?: string;
  patente?: string;
}

export interface PdfAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string;
}

export interface PdfParty {
  name: string;
  address: PdfAddress;
  identifiers: PdfPartyIdentifiers;
}

export interface PdfInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Fraction, e.g. 0.20 for 20%. */
  tvaRate: number;
  lineTotalExclTax: number;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  issueDate: Date;
  currency: string;
  supplier: PdfParty;
  customer: PdfParty;
  lines: PdfInvoiceLine[];
  totals: {
    exclTax: number;
    tax: number;
    inclTax: number;
  };
  /** Hash-chain value for this invoice, shown as a tamper-evidence reference. */
  hash?: string;
}
