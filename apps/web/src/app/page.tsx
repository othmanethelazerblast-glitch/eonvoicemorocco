"use client";

import { useState } from "react";
import { CreateOrganization, SignedIn, SignedOut, useOrganization } from "@clerk/nextjs";
import { Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CompanyList } from "@/components/CompanyList";
import { ClientList } from "@/components/ClientList";
import { ProductList } from "@/components/ProductList";
import { InvoiceList } from "@/components/InvoiceList";

function Dashboard() {
  const organization = trpc.organization.current.useQuery(undefined, {
    retry: false,
  });
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Tableau de bord
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          {organization.isLoading && "Chargement..."}
          {organization.isError && "Erreur de connexion au serveur."}
          {organization.data && (
            <>
              <Building2 className="h-3.5 w-3.5" />
              {organization.data.name}
            </>
          )}
        </p>
      </div>

      <CompanyList activeCompanyId={activeCompanyId} onSelect={setActiveCompanyId} />

      {activeCompanyId && (
        <div className="flex flex-col gap-6">
          <ClientList companyId={activeCompanyId} />
          <ProductList companyId={activeCompanyId} />
          <InvoiceList companyId={activeCompanyId} />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { organization, isLoaded } = useOrganization();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <SignedOut>
        <p className="text-sm text-slate-500 dark:text-slate-400">Connectez-vous pour continuer.</p>
      </SignedOut>
      <SignedIn>
        {isLoaded && !organization && (
          <div className="flex justify-center pt-8">
            <CreateOrganization />
          </div>
        )}
        {isLoaded && organization && <Dashboard />}
      </SignedIn>
    </main>
  );
}
