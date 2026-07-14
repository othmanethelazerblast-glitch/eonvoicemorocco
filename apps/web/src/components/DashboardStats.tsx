"use client";

import { BadgeCheck, Clock, FileStack, Wallet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/Card";

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const STAT_ICON_CLASSES =
  "flex h-9 w-9 items-center justify-center rounded-lg";

export function DashboardStats({ companyId }: { companyId: string }) {
  const invoices = trpc.invoice.listByCompany.useQuery({ companyId });
  const data = invoices.data ?? [];

  const total = data.length;
  const pendingDgi = data.filter((invoice) => ["issued", "submitted"].includes(invoice.status)).length;
  const cleared = data.filter((invoice) => invoice.status === "cleared").length;
  const revenue = data
    .filter((invoice) => !["draft", "void"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.totalInclTax), 0);
  const currency = data[0]?.currency ?? "MAD";

  const stats = [
    {
      label: "Factures",
      value: invoices.isLoading ? "—" : String(total),
      icon: FileStack,
      iconClasses: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    },
    {
      label: "En attente DGI",
      value: invoices.isLoading ? "—" : String(pendingDgi),
      icon: Clock,
      iconClasses: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      label: "Validees",
      value: invoices.isLoading ? "—" : String(cleared),
      icon: BadgeCheck,
      iconClasses: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
      label: "Chiffre d'affaires",
      value: invoices.isLoading ? "—" : `${formatAmount(revenue)} ${currency}`,
      icon: Wallet,
      iconClasses: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex items-center gap-3 p-4">
          <div className={`${STAT_ICON_CLASSES} ${stat.iconClasses}`}>
            <stat.icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {stat.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
