"use client";

import { useState } from "react";
import { Mail, Plus, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProspectInviteForm } from "./ProspectInviteForm";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  submitted: "A verifier",
  approved: "Validee",
  rejected: "Refusee",
};

const STATUS_TONES: Record<string, "slate" | "blue" | "green" | "red" | "amber"> = {
  pending: "slate",
  submitted: "amber",
  approved: "green",
  rejected: "red",
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("fr-FR");
}

interface SubmittedData {
  name?: string;
  identifiers?: { ice?: string; identifiantFiscal?: string; registreCommerce?: string; patente?: string };
  address?: { line1?: string; city?: string };
}

/** Prisma's recursive JsonValue type on submittedData blows up TS's
 * instantiation depth when inferred through tRPC's superjson output —
 * re-shaped to a flat, concrete type to keep the compiler happy. */
interface ProspectInviteRow {
  id: string;
  email: string;
  contactName: string | null;
  status: string;
  submittedData: unknown;
  expiresAt: string | Date;
  submittedAt: string | Date | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
}

export function ProspectInviteList() {
  const utils = trpc.useUtils();
  const invites = trpc.prospectInvite.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const approve = trpc.prospectInvite.approve.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.prospectInvite.list.invalidate(), utils.company.list.invalidate()]);
      setReviewingId(null);
    },
  });
  const reject = trpc.prospectInvite.reject.useMutation({
    onSuccess: async () => {
      await utils.prospectInvite.list.invalidate();
      setReviewingId(null);
    },
  });

  const list = (invites.data ?? []) as unknown as ProspectInviteRow[];
  const reviewing = list.find((i) => i.id === reviewingId);
  const reviewingData = reviewing?.submittedData as SubmittedData | undefined;

  return (
    <Card>
      <CardHeader
        title="Prospects"
        icon={<UserPlus className="h-4 w-4 text-slate-400" />}
        action={
          <Button variant="outline-dashed" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Inviter un prospect
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {showForm && (
          <Card className="bg-slate-50/60 dark:bg-slate-800/40">
            <ProspectInviteForm onSaved={() => setShowForm(false)} />
          </Card>
        )}

        {invites.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>}
        {list.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun prospect invite pour le moment. Envoyez un lien d&apos;inscription plutot que de collecter les
            informations manuellement.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {invite.contactName ?? invite.email}
                  </div>
                  {invite.contactName && (
                    <div className="text-slate-500 dark:text-slate-400">{invite.email}</div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={STATUS_TONES[invite.status]}>{STATUS_LABELS[invite.status]}</Badge>
                {invite.status === "submitted" && (
                  <Button size="sm" variant="secondary" onClick={() => setReviewingId(invite.id)}>
                    Verifier
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {reviewing && reviewingData && (
        <Modal title="Verifier les informations" onClose={() => setReviewingId(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Soumis le {formatDate(reviewing.submittedAt!)} par {reviewing.email}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Raison sociale</dt>
              <dd className="text-slate-900 dark:text-slate-100">{reviewingData.name}</dd>
              <dt className="text-slate-500 dark:text-slate-400">ICE</dt>
              <dd className="text-slate-900 dark:text-slate-100">{reviewingData.identifiers?.ice || "—"}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Identifiant Fiscal</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {reviewingData.identifiers?.identifiantFiscal || "—"}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Registre de Commerce</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {reviewingData.identifiers?.registreCommerce || "—"}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Patente</dt>
              <dd className="text-slate-900 dark:text-slate-100">{reviewingData.identifiers?.patente || "—"}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Adresse</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {reviewingData.address?.line1}, {reviewingData.address?.city}
              </dd>
            </dl>
            {(approve.isError || reject.isError) && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {approve.error?.message ?? reject.error?.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={reject.isPending || approve.isPending}
                onClick={() => reject.mutate({ id: reviewing.id })}
              >
                {reject.isPending ? "Refus..." : "Refuser"}
              </Button>
              <Button
                size="sm"
                disabled={reject.isPending || approve.isPending}
                onClick={() => approve.mutate({ id: reviewing.id })}
              >
                {approve.isPending ? "Validation..." : "Valider et creer la societe"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
