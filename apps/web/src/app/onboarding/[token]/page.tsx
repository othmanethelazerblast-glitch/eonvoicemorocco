"use client";

import { useParams } from "next/navigation";
import { ProspectOnboardingForm } from "@/components/ProspectOnboardingForm";

export default function OnboardingPage() {
  const params = useParams<{ token: string }>();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <ProspectOnboardingForm token={params.token} />
    </main>
  );
}
