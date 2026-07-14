"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10 sm:items-center">
          <button
            aria-label="Fermer"
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/70"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
