"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CompanyForm } from "./CompanyForm";

export function CompanyList({
  activeCompanyId,
  onSelect,
}: {
  activeCompanyId: string | null;
  onSelect: (companyId: string) => void;
}) {
  const companies = trpc.company.list.useQuery();
  const [showForm, setShowForm] = useState(false);

  if (companies.isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement des societes...</p>;
  }

  const list = companies.data ?? [];

  if (list.length === 0) {
    return <CompanyForm onCreated={onSelect} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {list.map((company) => (
          <button
            key={company.id}
            onClick={() => onSelect(company.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCompanyId === company.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 opacity-60" />
            {company.name}
          </button>
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
            onCreated={(companyId) => {
              setShowForm(false);
              onSelect(companyId);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
