export interface UblPartyIdentifiers {
  ice?: string;
  identifiantFiscal?: string;
  registreCommerce?: string;
  patente?: string;
}

export interface UblAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string;
}

export interface UblParty {
  name: string;
  address: UblAddress;
  identifiers: UblPartyIdentifiers;
}

export interface UblInvoiceLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Fraction, e.g. 0.20 for 20%. */
  tvaRate: number;
  lineTotalExclTax: number;
}

export interface UblInvoiceXmlInput {
  invoiceNumber: string;
  issueDate: Date;
  currency: string;
  supplier: UblParty;
  customer: UblParty;
  lines: UblInvoiceLine[];
  totals: {
    exclTax: number;
    tax: number;
    inclTax: number;
  };
}
