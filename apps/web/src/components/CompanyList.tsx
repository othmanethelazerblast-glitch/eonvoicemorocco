"use client";

import { useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CompanyForm } from "./CompanyForm";

export function CompanyList({
  activeCompanyId,
  onSelect,
}: {
  activeCompanyId: string | null;
  onSelect: (companyId: string) => void;
}) {
  const utils = trpc.useUtils();
  const companies = trpc.company.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteCompany = trpc.company.delete.useMutation({
    onSuccess: async () => {
      await utils.company.list.invalidate();
      setDeletingId(null);
    },
  });

  if (companies.isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement des societes...</p>;
  }

  const list = companies.data ?? [];
  const editingCompany = list.find((c) => c.id === editingId);
  const deletingCompany = list.find((c) => c.id === deletingId);

  if (list.length === 0) {
    return <CompanyForm onSaved={onSelect} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {list.map((company) => (
          <div
            key={company.id}
            className={`group inline-flex items-center gap-1 rounded-full pl-4 pr-1.5 py-1.5 text-sm font-medium transition-colors ${
              activeCompanyId === company.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <button onClick={() => onSelect(company.id)} className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 opacity-60" />
              {company.name}
            </button>
            <button
              aria-label="Modifier la societe"
              onClick={() => setEditingId(company.id)}
              className="rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              aria-label="Supprimer la societe"
              onClick={() => setDeletingId(company.id)}
              className="rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button variant="outline-dashed" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter une societe
        </Button>
      </div>
      {showForm && (
        <Modal title="Ajouter une societe" onClose={() => setShowForm(false)}>
          <CompanyForm
            bare
            onSaved={(companyId) => {
              setShowForm(false);
              onSelect(companyId);
            }}
          />
        </Modal>
      )}
      {editingCompany && (
        <Modal title="Modifier la societe" onClose={() => setEditingId(null)}>
          <CompanyForm bare initial={editingCompany} onSaved={() => setEditingId(null)} />
        </Modal>
      )}
      {deletingCompany && (
        <ConfirmDialog
          title="Supprimer la societe"
          message={`Supprimer definitivement "${deletingCompany.name}" ? Cette action est irreversible.`}
          confirmLabel="Supprimer"
          isPending={deleteCompany.isPending}
          error={deleteCompany.error?.message}
          onCancel={() => {
            setDeletingId(null);
            deleteCompany.reset();
          }}
          onConfirm={() => deleteCompany.mutate({ id: deletingCompany.id })}
        />
      )}
    </div>
  );
}
