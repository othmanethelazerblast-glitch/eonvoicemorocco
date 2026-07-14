"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProductForm } from "./ProductForm";

export function ProductList({ companyId }: { companyId: string }) {
  const utils = trpc.useUtils();
  const products = trpc.products.listByCompany.useQuery({ companyId });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: async () => {
      await utils.products.listByCompany.invalidate({ companyId });
      setDeletingId(null);
    },
  });

  const list = products.data ?? [];
  const editingProduct = list.find((p) => p.id === editingId);
  const deletingProduct = list.find((p) => p.id === deletingId);

  return (
    <Card>
      <CardHeader
        title="Produits & services"
        icon={<Package className="h-4 w-4 text-slate-400" />}
        action={
          <Button variant="outline-dashed" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un produit
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {showForm && <ProductForm companyId={companyId} onSaved={() => setShowForm(false)} />}

        {products.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {list.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun produit pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((product) => (
            <li key={product.id} className="group flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{product.name}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {product.defaultUnitPrice.toString()} MAD / {product.unit}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="slate">TVA {Math.round(Number(product.tvaRate) * 100)}%</Badge>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    aria-label="Modifier le produit"
                    onClick={() => setEditingId(product.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Supprimer le produit"
                    onClick={() => setDeletingId(product.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editingProduct && (
        <Modal title="Modifier le produit" onClose={() => setEditingId(null)}>
          <ProductForm companyId={companyId} initial={editingProduct} onSaved={() => setEditingId(null)} />
        </Modal>
      )}
      {deletingProduct && (
        <ConfirmDialog
          title="Supprimer le produit"
          message={`Supprimer definitivement "${deletingProduct.name}" ? Cette action est irreversible.`}
          confirmLabel="Supprimer"
          isPending={deleteProduct.isPending}
          error={deleteProduct.error?.message}
          onCancel={() => {
            setDeletingId(null);
            deleteProduct.reset();
          }}
          onConfirm={() => deleteProduct.mutate({ id: deletingProduct.id })}
        />
      )}
    </Card>
  );
}
