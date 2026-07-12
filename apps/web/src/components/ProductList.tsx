"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductForm } from "./ProductForm";

export function ProductList({ companyId }: { companyId: string }) {
  const products = trpc.products.listByCompany.useQuery({ companyId });
  const [showForm, setShowForm] = useState(false);

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
        {showForm && <ProductForm companyId={companyId} onCreated={() => setShowForm(false)} />}

        {products.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {products.data?.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun produit pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {products.data?.map((product) => (
            <li key={product.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{product.name}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {product.defaultUnitPrice.toString()} MAD / {product.unit}
                </div>
              </div>
              <Badge tone="slate">TVA {Math.round(Number(product.tvaRate) * 100)}%</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
