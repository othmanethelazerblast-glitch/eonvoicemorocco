"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const TVA_COUNTRY_DEFAULT = "MA";
type InputChange = ChangeEvent<HTMLInputElement>;

interface CompanyInitial {
  id: string;
  name: string;
  ice: string | null;
  identifiantFiscal: string | null;
  registreCommerce: string | null;
  patente: string | null;
  addressLine1: string;
  city: string;
}

export function CompanyForm({
  initial,
  onSaved,
  bare = false,
}: {
  initial?: CompanyInitial;
  onSaved?: (companyId: string) => void;
  bare?: boolean;
}) {
  const utils = trpc.useUtils();
  const createCompany = trpc.company.create.useMutation({
    onSuccess: async (company) => {
      await utils.company.list.invalidate();
      onSaved?.(company.id);
    },
  });
  const updateCompany = trpc.company.update.useMutation({
    onSuccess: async (company) => {
      await utils.company.list.invalidate();
      onSaved?.(company.id);
    },
  });
  const mutation = initial ? updateCompany : createCompany;

  const [name, setName] = useState(initial?.name ?? "");
  const [ice, setIce] = useState(initial?.ice ?? "");
  const [identifiantFiscal, setIdentifiantFiscal] = useState(initial?.identifiantFiscal ?? "");
  const [registreCommerce, setRegistreCommerce] = useState(initial?.registreCommerce ?? "");
  const [patente, setPatente] = useState(initial?.patente ?? "");
  const [line1, setLine1] = useState(initial?.addressLine1 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      identifiers: {
        ice: ice || undefined,
        identifiantFiscal: identifiantFiscal || undefined,
        registreCommerce: registreCommerce || undefined,
        patente: patente || undefined,
      },
      address: { line1, city, country: TVA_COUNTRY_DEFAULT },
      defaultCurrency: "MAD" as const,
    };
    if (initial) {
      updateCompany.mutate({ id: initial.id, ...payload });
    } else {
      createCompany.mutate(payload);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Raison sociale</Label>
        <Input value={name} onChange={(e: InputChange) => setName(e.target.value)} required autoFocus={bare} />
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
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Enregistrement..." : initial ? "Enregistrer" : "Creer la societe"}
      </Button>
      {mutation.isError && <p className="text-sm text-rose-600 dark:text-rose-400">{mutation.error.message}</p>}
    </form>
  );

  if (bare) return form;

  return (
    <Card>
      <CardHeader title="Ajouter une societe" />
      {form}
    </Card>
  );
}
