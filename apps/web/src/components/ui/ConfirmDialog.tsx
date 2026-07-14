"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  isPending = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Suppression..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
