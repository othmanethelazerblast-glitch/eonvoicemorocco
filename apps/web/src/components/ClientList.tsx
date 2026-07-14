"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClientForm } from "./ClientForm";

export function ClientList({ companyId }: { companyId: string }) {
  const utils = trpc.useUtils();
  const clients = trpc.clients.listByCompany.useQuery({ companyId });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: async () => {
      await utils.clients.listByCompany.invalidate({ companyId });
      setDeletingId(null);
    },
  });

  const list = clients.data ?? [];
  const editingClient = list.find((c) => c.id === editingId);
  const deletingClient = list.find((c) => c.id === deletingId);

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
        {showForm && <ClientForm companyId={companyId} onSaved={() => setShowForm(false)} />}

        {clients.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {list.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun client pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((client) => (
            <li key={client.id} className="group flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{client.name}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {client.addressLine1}, {client.city}
                  {client.ice ? ` — ICE ${client.ice}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  aria-label="Modifier le client"
                  onClick={() => setEditingId(client.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Supprimer le client"
                  onClick={() => setDeletingId(client.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editingClient && (
        <Modal title="Modifier le client" onClose={() => setEditingId(null)}>
          <ClientForm companyId={companyId} initial={editingClient} onSaved={() => setEditingId(null)} />
        </Modal>
      )}
      {deletingClient && (
        <ConfirmDialog
          title="Supprimer le client"
          message={`Supprimer definitivement "${deletingClient.name}" ? Cette action est irreversible.`}
          confirmLabel="Supprimer"
          isPending={deleteClient.isPending}
          error={deleteClient.error?.message}
          onCancel={() => {
            setDeletingId(null);
            deleteClient.reset();
          }}
          onConfirm={() => deleteClient.mutate({ id: deletingClient.id })}
        />
      )}
    </Card>
  );
}
