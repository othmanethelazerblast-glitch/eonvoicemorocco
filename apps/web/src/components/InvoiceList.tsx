"use client";

import { useState } from "react";
import Link from "next/link";
import { CornerUpLeft, Download, FileCode, FileText, Plus, Send, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { downloadBase64File, downloadTextFile } from "@/lib/download-file";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/invoice-status";
import { InvoiceForm } from "./InvoiceForm";

export function InvoiceList({ companyId }: { companyId: string }) {
  const utils = trpc.useUtils();
  const invoices = trpc.invoice.listByCompany.useQuery({ companyId });
  const issueInvoice = trpc.invoice.issue.useMutation({
    onSuccess: () => utils.invoice.listByCompany.invalidate({ companyId }),
  });
  const submitInvoice = trpc.invoice.submit.useMutation({
    onSuccess: () => utils.invoice.listByCompany.invalidate({ companyId }),
  });
  const generatePdf = trpc.invoice.generatePdf.useMutation({
    onSuccess: (result) => downloadBase64File(result.filename, result.base64, "application/pdf"),
  });
  const generateUbl = trpc.invoice.generateUbl.useMutation({
    onSuccess: (result) => downloadTextFile(result.filename, result.xml, "application/xml"),
  });
  const createCreditNote = trpc.invoice.createCreditNote.useMutation({
    onSuccess: () => utils.invoice.listByCompany.invalidate({ companyId }),
  });
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Factures"
        icon={<FileText className="h-4 w-4 text-slate-400" />}
        action={
          <Button variant="outline-dashed" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Nouvelle facture
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {showForm && <InvoiceForm companyId={companyId} onCreated={() => setShowForm(false)} />}

        {invoices.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {invoices.data?.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune facture pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {invoices.data?.map((invoice) => {
            const latestSubmission = invoice.dgiSubmissions[0];
            const canCredit =
              ["issued", "submitted", "cleared"].includes(invoice.status) &&
              invoice.correctedByInvoices.length === 0;
            return (
              <li key={invoice.id} className="flex flex-col gap-2 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNumber ?? "Brouillon"}
                      </Link>{" "}
                      — {invoice.client.name}
                      {invoice.correctsInvoice && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (avoir de {invoice.correctsInvoice.invoiceNumber})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span>
                        {invoice.totalInclTax.toString()} {invoice.currency}
                      </span>
                      <Badge tone={STATUS_TONES[invoice.status] ?? "slate"}>
                        {STATUS_LABELS[invoice.status] ?? invoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => issueInvoice.mutate({ invoiceId: invoice.id })}
                        disabled={issueInvoice.isPending}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Emettre
                      </Button>
                    )}
                    {invoice.status === "issued" && (
                      <Button
                        size="sm"
                        onClick={() => submitInvoice.mutate({ invoiceId: invoice.id })}
                        disabled={submitInvoice.isPending}
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Soumettre a la DGI
                      </Button>
                    )}
                    {invoice.status !== "draft" && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => generatePdf.mutate({ invoiceId: invoice.id })}
                          disabled={generatePdf.isPending}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => generateUbl.mutate({ invoiceId: invoice.id })}
                          disabled={generateUbl.isPending}
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          XML
                        </Button>
                      </>
                    )}
                    {canCredit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => createCreditNote.mutate({ invoiceId: invoice.id })}
                        disabled={createCreditNote.isPending}
                      >
                        <CornerUpLeft className="h-3.5 w-3.5" />
                        Avoir
                      </Button>
                    )}
                  </div>
                </div>
                {invoice.status === "rejected" && latestSubmission?.errorDetail && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Rejetee par la DGI : {latestSubmission.errorDetail}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
