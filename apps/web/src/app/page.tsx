"use client";

import Link from "next/link";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  FileText,
  GitBranch,
  LayoutDashboard,
  Layers,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: ReceiptText,
    title: "Facturation en un clic",
    description:
      "Creez vos factures en quelques secondes : societe, client, lignes, TVA — tout est calcule automatiquement.",
  },
  {
    icon: UploadCloud,
    title: "Soumission DGI integree",
    description:
      "Emettez et soumettez vos factures a la DGI directement depuis l'application, avec suivi en temps reel du statut de validation.",
  },
  {
    icon: FileCheck2,
    title: "PDF & XML UBL instantanes",
    description:
      "Generez le PDF a envoyer a vos clients et le fichier UBL 2.1 conforme, prets a etre archives ou transmis, en un clic.",
  },
  {
    icon: GitBranch,
    title: "Notes de credit conformes",
    description:
      "Annulez ou corrigez une facture emise dans les regles : note de credit liee, chainage d'audit intact, rien n'est jamais supprime.",
  },
  {
    icon: ShieldCheck,
    title: "Tracabilite garantie",
    description:
      "Chaque facture est chainee par hash cryptographique et son historique est append-only — une preuve d'integrite a tout moment.",
  },
  {
    icon: Layers,
    title: "Multi-societes",
    description:
      "Gerez plusieurs societes depuis un seul compte, avec des acces et une facturation independants pour chacune.",
  },
];

const STEPS = [
  {
    title: "Creez votre societe",
    description: "Renseignez vos identifiants fiscaux (ICE, IF, RC, Patente) une seule fois.",
  },
  {
    title: "Emettez vos factures",
    description: "Ajoutez vos clients et produits, puis generez des factures numerotees et horodatees.",
  },
  {
    title: "Soumettez a la DGI",
    description: "Un clic suffit pour transmettre la facture et suivre sa validation, prete pour la phase 2026.",
  },
];

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="pointer-events-none absolute -top-32 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-16 left-0 -z-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10"
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Pret pour la reforme DGI 2026
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
              La facturation electronique,{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-sky-400">
                sans prise de tete.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Creez, emettez et soumettez vos factures a la DGI en quelques clics. Formats UBL 2.1
              et PDF generes automatiquement, notes de credit conformes, historique inviolable —
              tout ce qu'il faut pour aborder la mandate marocaine sereinement.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <Link href="/dashboard">
                  <Button size="md" className="px-5 py-2.5 text-sm">
                    <LayoutDashboard className="h-4 w-4" />
                    Aller au tableau de bord
                  </Button>
                </Link>
              ) : (
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <Button size="md" className="px-5 py-2.5 text-sm">
                    Commencer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
              )}
              <a href="#fonctionnalites">
                <Button variant="secondary" size="md" className="px-5 py-2.5 text-sm">
                  Voir comment ca marche
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Format UBL 2.1 &amp; PDF
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Aucune carte bancaire requise
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Pret en 2 minutes
              </span>
            </div>
          </div>

          {/* Mock invoice preview card */}
          <Card className="rotate-1 border-slate-200 shadow-xl transition-transform hover:rotate-0 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">INV-000042</div>
                  <div className="text-xs text-slate-400">12 juillet 2026</div>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Validee (DGI)
              </span>
            </div>
            <div className="flex flex-col gap-2.5 py-4 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Prestation de conseil</span>
                <span className="text-slate-700 dark:text-slate-300">8 400,00 MAD</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Licence logicielle</span>
                <span className="text-slate-700 dark:text-slate-300">2 100,00 MAD</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>TVA (20%)</span>
                <span className="text-slate-700 dark:text-slate-300">2 100,00 MAD</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total TTC</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">12 600,00 MAD</span>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:bg-slate-800/60">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">hash · a1f9c3…82b7 chaine a la facture precedente</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Tout ce qu'il faut pour facturer, en toute conformite
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Concu specifiquement pour la reforme de facturation electronique marocaine — sans
            complexite inutile.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Operationnel en trois etapes
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative flex flex-col items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  {index + 1}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Card className="flex flex-col items-center gap-4 border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-center shadow-xl dark:border-slate-800">
          <Zap className="h-6 w-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Prenez de l'avance sur la reforme DGI
          </h2>
          <p className="max-w-md text-sm text-slate-300">
            Creez votre compte et emettez votre premiere facture conforme en moins de deux minutes.
          </p>
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button size="md" className="mt-2 px-5 py-2.5 text-sm">
                <LayoutDashboard className="h-4 w-4" />
                Aller au tableau de bord
              </Button>
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="md" className="mt-2 px-5 py-2.5 text-sm">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
          )}
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 px-6 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Facturation Conforme. Tous droits reserves.</span>
          <span>Concu pour la reforme de facturation electronique du Maroc.</span>
        </div>
      </footer>
    </main>
  );
}
