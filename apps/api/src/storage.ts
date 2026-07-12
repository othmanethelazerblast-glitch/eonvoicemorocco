import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { InvoiceDocumentKind } from "@app/db";

const CONTENT_TYPE_BY_KIND: Record<InvoiceDocumentKind, string> = {
  pdf: "application/pdf",
  ubl_xml: "application/xml",
  cii_xml: "application/xml",
  dgi_receipt: "application/json",
};

let cachedClient: ReturnType<typeof createClient> | null | undefined;

/**
 * Object storage for invoice artifacts (Supabase Storage). Returns null when
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't set — callers must fail
 * loudly rather than silently drop a compliance document, so this is a
 * config-check, not a resilience fallback.
 */
function getStorageClient() {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cachedClient = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;
  return cachedClient;
}

export interface UploadInvoiceDocumentParams {
  companyId: string;
  invoiceId: string;
  kind: InvoiceDocumentKind;
  version: number;
  data: Buffer;
}

export interface UploadedInvoiceDocument {
  storageKey: string;
  sha256: string;
}

/** Uploads one immutable version of an invoice artifact. storageKey encodes
 * company/invoice/kind/version so re-generating never collides with or
 * overwrites a prior version (see InvoiceDocument in prisma/schema.prisma). */
export async function uploadInvoiceDocument(
  params: UploadInvoiceDocumentParams,
): Promise<UploadedInvoiceDocument> {
  const client = getStorageClient();
  if (!client) {
    throw new Error(
      "Object storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) — cannot persist invoice documents.",
    );
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "invoice-documents";
  const storageKey = `${params.companyId}/${params.invoiceId}/${params.kind}-v${params.version}`;
  const sha256 = createHash("sha256").update(params.data).digest("hex");

  const { error } = await client.storage.from(bucket).upload(storageKey, params.data, {
    contentType: CONTENT_TYPE_BY_KIND[params.kind],
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload invoice document to storage: ${error.message}`);
  }

  return { storageKey, sha256 };
}
