"use client";

import { useState, type ChangeEvent } from "react";
import { Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

const TVA_OPTIONS = [0.2, 0.14, 0.1, 0.07, 0];

interface LineDraft {
  description: string;
  quantity: string;
  unitPrice: string;
  tvaRate: number;
}

function emptyLine(): LineDraft {
  return { description: "", quantity: "1", unitPrice: "0", tvaRate: 0.2 };
}

export function InvoiceForm({ companyId, onCreated }: { companyId: string; onCreated?: () => void }) {
  const utils = trpc.useUtils();
  const clients = trpc.clients.listByCompany.useQuery({ companyId });
  const createInvoice = trpc.invoice.createDraft.useMutation({
    onSuccess: async () => {
      await utils.invoice.listByCompany.invalidate({ companyId });
      onCreated?.();
    },
  });

  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createInvoice.mutate({
      companyId,
      clientId,
      lines: lines.map((line) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        tvaRate: line.tvaRate,
      })),
    });
  }

  const total = lines.reduce((sum, l) => {
    const excl = Number(l.quantity || 0) * Number(l.unitPrice || 0);
    return sum + excl + excl * l.tvaRate;
  }, 0);

  if (clients.data && clients.data.length === 0) {
    return (
      <Card className="bg-slate-50/60 dark:bg-slate-800/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ajoutez un client avant de creer une facture.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-50/60 dark:bg-slate-800/40">
      <CardHeader title="Nouvelle facture (brouillon)" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Client</Label>
          <Select value={clientId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)} required>
            <option value="">Selectionner un client</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Lignes</Label>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[1fr_72px_96px_88px_auto] items-center gap-2">
              <Input
                placeholder="Description"
                value={line.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateLine(index, { description: e.target.value })}
                required
              />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Qte"
                value={line.quantity}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateLine(index, { quantity: e.target.value })}
                required
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="PU"
                value={line.unitPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateLine(index, { unitPrice: e.target.value })}
                required
              />
              <Select
                value={line.tvaRate}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateLine(index, { tvaRate: Number(e.target.value) })}
              >
                {TVA_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {Math.round(rate * 100)}%
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                disabled={lines.length === 1}
                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="self-start"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une ligne
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
          <span className="text-sm text-slate-500 dark:text-slate-400">Total TTC estime</span>
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {total.toFixed(2)} MAD
          </span>
        </div>

        <Button type="submit" disabled={createInvoice.isPending || !clientId} className="self-start">
          {createInvoice.isPending ? "Creation..." : "Creer le brouillon"}
        </Button>
        {createInvoice.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{createInvoice.error.message}</p>
        )}
      </form>
    </Card>
  );
}
