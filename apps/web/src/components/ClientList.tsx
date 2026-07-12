"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClientForm } from "./ClientForm";

export function ClientList({ companyId }: { companyId: string }) {
  const clients = trpc.clients.listByCompany.useQuery({ companyId });
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Clients"
        icon={<Users className="h-4 w-4 text-slate-400" />}
        action={
          <Button variant="outline-dashed" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un client
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {showForm && <ClientForm companyId={companyId} onCreated={() => setShowForm(false)} />}

        {clients.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {clients.data?.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun client pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {clients.data?.map((client) => (
            <li key={client.id} className="py-2.5 text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">{client.name}</div>
              <div className="text-slate-500 dark:text-slate-400">
                {client.addressLine1}, {client.city}
                {client.ice ? ` — ICE ${client.ice}` : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
