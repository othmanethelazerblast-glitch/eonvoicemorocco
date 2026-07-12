"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiHttpLink } from "@app/api-client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function TrpcProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [createApiHttpLink({ apiUrl: API_URL, getAuthToken: () => getToken() })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <TrpcProvider>{children}</TrpcProvider>
    </ClerkProvider>
  );
}
