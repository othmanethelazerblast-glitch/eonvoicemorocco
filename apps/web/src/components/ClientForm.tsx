"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;

export function ClientForm({ companyId, onCreated }: { companyId: string; onCreated?: () => void }) {
  const utils = trpc.useUtils();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: async () => {
      await utils.clients.listByCompany.invalidate({ companyId });
      onCreated?.();
    },
  });

  const [name, setName] = useState("");
  const [ice, setIce] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createClient.mutate({
      companyId,
      name,
      identifiers: { ice: ice || undefined },
      address: { line1, city, country: "MA" },
      email: email || undefined,
    });
  }

  return (
    <Card className="bg-slate-50/60 dark:bg-slate-800/40">
      <CardHeader title="Ajouter un client" />
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
        <Button type="submit" disabled={createClient.isPending} className="self-start">
          {createClient.isPending ? "Creation..." : "Ajouter"}
        </Button>
        {createClient.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{createClient.error.message}</p>
        )}
      </form>
    </Card>
  );
}
