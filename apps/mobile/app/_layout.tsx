import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiHttpLink } from "@app/api-client";
import { Stack } from "expo-router";
import { useState } from "react";
import { tokenCache } from "@/lib/token-cache";
import { trpc } from "@/lib/trpc";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

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

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <TrpcProvider>
        <Stack />
      </TrpcProvider>
    </ClerkProvider>
  );
}
