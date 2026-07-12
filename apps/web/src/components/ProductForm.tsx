"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;
const TVA_OPTIONS = [0.2, 0.14, 0.1, 0.07, 0];

export function ProductForm({ companyId, onCreated }: { companyId: string; onCreated?: () => void }) {
  const utils = trpc.useUtils();
  const createProduct = trpc.products.create.useMutation({
    onSuccess: async () => {
      await utils.products.listByCompany.invalidate({ companyId });
      onCreated?.();
    },
  });

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unite");
  const [defaultUnitPrice, setDefaultUnitPrice] = useState("");
  const [tvaRate, setTvaRate] = useState(0.2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createProduct.mutate({
      companyId,
      name,
      unit,
      defaultUnitPrice: Number(defaultUnitPrice),
      tvaRate,
    });
  }

  return (
    <Card className="bg-slate-50/60 dark:bg-slate-800/40">
      <CardHeader title="Ajouter un produit / service" />
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
        <Button type="submit" disabled={createProduct.isPending} className="self-start">
          {createProduct.isPending ? "Creation..." : "Ajouter"}
        </Button>
        {createProduct.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{createProduct.error.message}</p>
        )}
      </form>
    </Card>
  );
}
