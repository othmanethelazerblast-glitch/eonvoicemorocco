"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;

export function ProspectInviteForm({ onSaved }: { onSaved?: () => void }) {
  const utils = trpc.useUtils();
  const createInvite = trpc.prospectInvite.create.useMutation({
    onSuccess: async () => {
      await utils.prospectInvite.list.invalidate();
      onSaved?.();
    },
  });

  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createInvite.mutate({ email, contactName: contactName || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Nom du contact (optionnel)</Label>
        <Input value={contactName} onChange={(e: InputChange) => setContactName(e.target.value)} />
      </div>
      <div>
        <Label>Email du prospect</Label>
        <Input type="email" value={email} onChange={(e: InputChange) => setEmail(e.target.value)} required autoFocus />
      </div>
      <Button type="submit" disabled={createInvite.isPending} className="self-start">
        {createInvite.isPending ? "Envoi..." : "Envoyer l'invitation"}
      </Button>
      {createInvite.isError && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{createInvite.error.message}</p>
      )}
    </form>
  );
}
