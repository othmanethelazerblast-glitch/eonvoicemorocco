"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;

interface ClientInitial {
  id: string;
  name: string;
  ice: string | null;
  addressLine1: string;
  city: string;
  email: string | null;
}

export function ClientForm({
  companyId,
  initial,
  onSaved,
}: {
  companyId: string;
  initial?: ClientInitial;
  onSaved?: () => void;
}) {
  const utils = trpc.useUtils();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: async () => {
      await utils.clients.listByCompany.invalidate({ companyId });
      onSaved?.();
    },
  });
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: async () => {
      await utils.clients.listByCompany.invalidate({ companyId });
      onSaved?.();
    },
  });
  const mutation = initial ? updateClient : createClient;

  const [name, setName] = useState(initial?.name ?? "");
  const [ice, setIce] = useState(initial?.ice ?? "");
  const [line1, setLine1] = useState(initial?.addressLine1 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      identifiers: { ice: ice || undefined },
      address: { line1, city, country: "MA" as const },
      email: email || undefined,
    };
    if (initial) {
      updateClient.mutate({ id: initial.id, ...payload });
    } else {
      createClient.mutate({ companyId, ...payload });
    }
  }

  return (
    <Card className="bg-slate-50/60 dark:bg-slate-800/40">
      <CardHeader title={initial ? "Modifier le client" : "Ajouter un client"} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Nom du client</Label>
          <Input value={name} onChange={(e: InputChange) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>ICE (optionnel)</Label>
          <Input value={ice} onChange={(e: InputChange) => setIce(e.target.value)} />
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
        <div>
          <Label>Email (optionnel)</Label>
          <Input type="email" value={email} onChange={(e: InputChange) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={mutation.isPending} className="self-start">
          {mutation.isPending ? "Enregistrement..." : initial ? "Enregistrer" : "Ajouter"}
        </Button>
        {mutation.isError && <p className="text-sm text-rose-600 dark:text-rose-400">{mutation.error.message}</p>}
      </form>
    </Card>
  );
}
