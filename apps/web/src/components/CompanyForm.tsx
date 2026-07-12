"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const TVA_COUNTRY_DEFAULT = "MA";
type InputChange = ChangeEvent<HTMLInputElement>;

export function CompanyForm({ onCreated }: { onCreated?: (companyId: string) => void }) {
  const utils = trpc.useUtils();
  const createCompany = trpc.company.create.useMutation({
    onSuccess: async (company) => {
      await utils.company.list.invalidate();
      onCreated?.(company.id);
    },
  });

  const [name, setName] = useState("");
  const [ice, setIce] = useState("");
  const [identifiantFiscal, setIdentifiantFiscal] = useState("");
  const [registreCommerce, setRegistreCommerce] = useState("");
  const [patente, setPatente] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCompany.mutate({
      name,
      identifiers: {
        ice: ice || undefined,
        identifiantFiscal: identifiantFiscal || undefined,
        registreCommerce: registreCommerce || undefined,
        patente: patente || undefined,
      },
      address: { line1, city, country: TVA_COUNTRY_DEFAULT },
      defaultCurrency: "MAD",
    });
  }

  return (
    <Card>
      <CardHeader title="Ajouter une societe" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Raison sociale</Label>
          <Input value={name} onChange={(e: InputChange) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>ICE (15 chiffres)</Label>
            <Input value={ice} onChange={(e: InputChange) => setIce(e.target.value)} />
          </div>
          <div>
            <Label>Identifiant Fiscal</Label>
            <Input value={identifiantFiscal} onChange={(e: InputChange) => setIdentifiantFiscal(e.target.value)} />
          </div>
          <div>
            <Label>Registre de Commerce</Label>
            <Input value={registreCommerce} onChange={(e: InputChange) => setRegistreCommerce(e.target.value)} />
          </div>
          <div>
            <Label>Patente</Label>
            <Input value={patente} onChange={(e: InputChange) => setPatente(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Adresse</Label>
            <Input value={line1} onChange={(e: InputChange) => setLine1(e.target.value)} required />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={city} onChange={(e: InputChange) => setCity(e.target.value)} required />
          </div>
        </div>
        <Button type="submit" disabled={createCompany.isPending} className="self-start">
          {createCompany.isPending ? "Creation..." : "Creer la societe"}
        </Button>
        {createCompany.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{createCompany.error.message}</p>
        )}
      </form>
    </Card>
  );
}
