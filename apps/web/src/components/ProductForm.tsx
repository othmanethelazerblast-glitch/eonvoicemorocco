"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;
const TVA_OPTIONS = [0.2, 0.14, 0.1, 0.07, 0];

interface ProductInitial {
  id: string;
  name: string;
  unit: string;
  defaultUnitPrice: number | string;
  tvaRate: number | string;
}

export function ProductForm({
  companyId,
  initial,
  onSaved,
}: {
  companyId: string;
  initial?: ProductInitial;
  onSaved?: () => void;
}) {
  const utils = trpc.useUtils();
  const createProduct = trpc.products.create.useMutation({
    onSuccess: async () => {
      await utils.products.listByCompany.invalidate({ companyId });
      onSaved?.();
    },
  });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: async () => {
      await utils.products.listByCompany.invalidate({ companyId });
      onSaved?.();
    },
  });
  const mutation = initial ? updateProduct : createProduct;

  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "unite");
  const [defaultUnitPrice, setDefaultUnitPrice] = useState(
    initial ? String(initial.defaultUnitPrice) : "",
  );
  const [tvaRate, setTvaRate] = useState(initial ? Number(initial.tvaRate) : 0.2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      unit,
      defaultUnitPrice: Number(defaultUnitPrice),
      tvaRate,
    };
    if (initial) {
      updateProduct.mutate({ id: initial.id, ...payload });
    } else {
      createProduct.mutate({ companyId, ...payload });
    }
  }

  return (
    <Card className="bg-slate-50/60 dark:bg-slate-800/40">
      <CardHeader title={initial ? "Modifier le produit / service" : "Ajouter un produit / service"} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Nom du produit ou service</Label>
          <Input value={name} onChange={(e: InputChange) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Unite</Label>
            <Input value={unit} onChange={(e: InputChange) => setUnit(e.target.value)} placeholder="unite, heure..." />
          </div>
          <div>
            <Label>Prix unitaire (MAD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={defaultUnitPrice}
              onChange={(e: InputChange) => setDefaultUnitPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>TVA</Label>
            <Select value={tvaRate} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTvaRate(Number(e.target.value))}>
              {TVA_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {Math.round(rate * 100)}%
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={mutation.isPending} className="self-start">
          {mutation.isPending ? "Enregistrement..." : initial ? "Enregistrer" : "Ajouter"}
        </Button>
        {mutation.isError && <p className="text-sm text-rose-600 dark:text-rose-400">{mutation.error.message}</p>}
      </form>
    </Card>
  );
}
