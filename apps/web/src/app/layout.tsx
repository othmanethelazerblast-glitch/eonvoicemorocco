import type { Metadata } from "next";
import { Inter } from "next/font/google";
import {
  OrganizationSwitcher,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Facturation Conforme",
  description: "Invoicing built for Morocco's e-invoicing mandate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileText className="h-5 w-5" strokeWidth={2.25} />
                <span className="text-sm font-semibold tracking-tight">Facturation Conforme</span>
              </div>
              <div className="flex items-center gap-3">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Se connecter
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm">S&apos;inscrire</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <OrganizationSwitcher hidePersonal createOrganizationMode="modal" />
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
