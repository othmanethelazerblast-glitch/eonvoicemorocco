"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowLeft,
  CornerUpLeft,
  Download,
  FileCode,
  Send,
  UploadCloud,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { downloadBase64File, downloadTextFile } from "@/lib/download-file";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/invoice-status";

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptee",
  rejected: "Rejetee",
  error: "Erreur",
};

const DOCUMENT_KIND_LABELS: Record<string, string> = {
  pdf: "PDF",
  ubl_xml: "UBL XML",
  cii_xml: "CII XML",
  dgi_receipt: "Recu DGI",
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("fr-FR");
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const utils = trpc.useUtils();
  const invoice = trpc.invoice.getById.useQuery({ invoiceId }, { retry: false });

  const invalidate = () => utils.invoice.getById.invalidate({ invoiceId });
  const issueInvoice = trpc.invoice.issue.useMutation({ onSuccess: invalidate });
  const submitInvoice = trpc.invoice.submit.useMutation({ onSuccess: invalidate });
  const createCreditNote = trpc.invoice.createCreditNote.useMutation({ onSuccess: invalidate });
  const generatePdf = trpc.invoice.generatePdf.useMutation({
    onSuccess: (result) => {
      downloadBase64File(result.filename, result.base64, "application/pdf");
      invalidate();
    },
  });
  const generateUbl = trpc.invoice.generateUbl.useMutation({
    onSuccess: (result) => {
      downloadTextFile(result.filename, result.xml, "application/xml");
      invalidate();
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <SignedOut>
        <p className="text-sm text-slate-500 dark:text-slate-400">Connectez-vous pour continuer.</p>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au tableau de bord
        </Link>

        {invoice.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {invoice.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Facture introuvable ou acces refuse.
          </p>
        )}

        {invoice.data && (
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {invoice.data.invoiceNumber ?? "Brouillon"}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {invoice.data.company.name} → {invoice.data.client.name}
                  </p>
                  {invoice.data.correctsInvoice && (
                    <p className="mt-1 text-xs text-slate-400">
                      Note de credit pour la facture {invoice.data.correctsInvoice.invoiceNumber}
                    </p>
                  )}
                  {invoice.data.correctedByInvoices.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      Avoiree par la note de credit {invoice.data.correctedByInvoices[0]?.invoiceNumber}
                    </p>
                  )}
                </div>
                <Badge tone={STATUS_TONES[invoice.data.status] ?? "slate"}>
                  {STATUS_LABELS[invoice.data.status] ?? invoice.data.status}
                </Badge>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {invoice.data.status === "draft" && (
                  <Button size="sm" onClick={() => issueInvoice.mutate({ invoiceId })} disabled={issueInvoice.isPending}>
                    <Send className="h-3.5 w-3.5" />
                    Emettre
                  </Button>
                )}
                {invoice.data.status === "issued" && (
                  <Button size="sm" onClick={() => submitInvoice.mutate({ invoiceId })} disabled={submitInvoice.isPending}>
                    <UploadCloud className="h-3.5 w-3.5" />
                    Soumettre a la DGI
                  </Button>
                )}
                {invoice.data.status !== "draft" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => generatePdf.mutate({ invoiceId })}
                      disabled={generatePdf.isPending}
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => generateUbl.mutate({ invoiceId })}
                      disabled={generateUbl.isPending}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      XML
                    </Button>
                  </>
                )}
                {["issued", "submitted", "cleared"].includes(invoice.data.status) &&
                  invoice.data.correctedByInvoices.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => createCreditNote.mutate({ invoiceId })}
                      disabled={createCreditNote.isPending}
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Avoir
                    </Button>
                  )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Lignes" />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                      <th className="py-2 pr-2 font-medium">Description</th>
                      <th className="py-2 px-2 text-right font-medium">Qte</th>
                      <th className="py-2 px-2 text-right font-medium">Prix unit.</th>
                      <th className="py-2 px-2 text-right font-medium">TVA</th>
                      <th className="py-2 pl-2 text-right font-medium">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.data.lines.map((line) => (
                      <tr key={line.id} className="border-b border-slate-50 dark:border-slate-900">
                        <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{line.description}</td>
                        <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                          {line.quantity.toString()}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                          {line.unitPrice.toString()} {invoice.data?.currency}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                          {(Number(line.tvaRate) * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pl-2 text-right text-slate-700 dark:text-slate-300">
                          {line.lineTotalExclTax.toString()} {invoice.data?.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 ml-auto flex w-48 flex-col gap-1 text-sm">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Total HT</span>
                  <span>
                    {invoice.data.totalExclTax.toString()} {invoice.data.currency}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Total TVA</span>
                  <span>
                    {invoice.data.totalTax.toString()} {invoice.data.currency}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
                  <span>Total TTC</span>
                  <span>
                    {invoice.data.totalInclTax.toString()} {invoice.data.currency}
                  </span>
                </div>
              </div>
            </Card>

            {invoice.data.dgiSubmissions.length > 0 && (
              <Card>
                <CardHeader title="Soumissions DGI" />
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.data.dgiSubmissions.map((submission) => (
                    <li key={submission.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">
                          {SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status}
                        </span>
                        {submission.errorDetail && (
                          <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">{submission.errorDetail}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(submission.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {invoice.data.documents.length > 0 && (
              <Card>
                <CardHeader title="Documents generes" />
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.data.documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">
                        {DOCUMENT_KIND_LABELS[document.kind] ?? document.kind} — v{document.version}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(document.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <CardHeader title="Historique" />
              <ul className="flex flex-col gap-2">
                {invoice.data.statusHistory.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">
                      {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus} → ` : ""}
                      {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
                      {entry.note && <span className="ml-2 text-xs text-slate-400">({entry.note})</span>}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </SignedIn>
    </main>
  );
}
