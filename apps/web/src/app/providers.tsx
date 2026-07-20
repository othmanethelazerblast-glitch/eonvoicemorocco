"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiHttpLink } from "@app/api-client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Tailwind's dark mode here follows the OS (`prefers-color-scheme`, no
 * in-app toggle) — Clerk's widgets don't know about that on their own and
 * default to a light theme, which renders unreadable (dark text on our
 * dark header) when the OS is in dark mode. Mirror the same media query so
 * Clerk always matches the rest of the page.
 */
function usePrefersDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(query.matches);
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return isDark;
}

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
  const isDark = usePrefersDark();

  return (
    <ClerkProvider appearance={{ baseTheme: isDark ? dark : undefined }}>
      <TrpcProvider>{children}</TrpcProvider>
    </ClerkProvider>
  );
}
