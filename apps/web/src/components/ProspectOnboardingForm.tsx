"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type InputChange = ChangeEvent<HTMLInputElement>;

const CLOSED_STATE_MESSAGES: Record<string, string> = {
  submitted: "Vous avez deja transmis vos informations. Elles sont en cours de verification.",
  approved: "Vos informations ont deja ete validees.",
  rejected: "Cette invitation n'est plus valide. Contactez votre conseiller pour un nouveau lien.",
  expired: "Ce lien a expire. Contactez votre conseiller pour un nouveau lien.",
};

export function ProspectOnboardingForm({ token }: { token: string }) {
  const invite = trpc.prospectInvite.getByToken.useQuery({ token });
  const submit = trpc.prospectInvite.submit.useMutation();

  const [name, setName] = useState("");
  const [ice, setIce] = useState("");
  const [identifiantFiscal, setIdentifiantFiscal] = useState("");
  const [registreCommerce, setRegistreCommerce] = useState("");
  const [patente, setPatente] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate({
      token,
      name,
      identifiers: {
        ice: ice || undefined,
        identifiantFiscal: identifiantFiscal || undefined,
        registreCommerce: registreCommerce || undefined,
        patente: patente || undefined,
      },
      address: { line1, city, country: "MA" },
      defaultCurrency: "MAD",
    });
  }

  if (invite.isLoading) {
    return <p className="text-center text-sm text-slate-500 dark:text-slate-400">Chargement...</p>;
  }

  if (invite.isError) {
    return (
      <Card className="text-center text-sm text-slate-600 dark:text-slate-300">
        Invitation introuvable. Verifiez le lien recu par email.
      </Card>
    );
  }

  const data = invite.data!;

  if (submit.isSuccess) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Merci !</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vos informations ont ete transmises. Votre conseiller les verifiera prochainement.
        </p>
      </Card>
    );
  }

  if (data.state !== "pending") {
    return (
      <Card className="text-center text-sm text-slate-600 dark:text-slate-300">
        {CLOSED_STATE_MESSAGES[data.state]}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Inscription — ${data.organizationName}`}
        icon={<FileText className="h-4 w-4 text-slate-400" />}
      />
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Renseignez les informations de votre societe. Votre conseiller les validera avant activation.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Raison sociale</Label>
          <Input value={name} onChange={(e: InputChange) => setName(e.target.value)} required autoFocus />
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
        <Button type="submit" disabled={submit.isPending} className="self-start">
          {submit.isPending ? "Envoi..." : "Envoyer"}
        </Button>
        {submit.isError && <p className="text-sm text-rose-600 dark:text-rose-400">{submit.error.message}</p>}
      </form>
    </Card>
  );
}
