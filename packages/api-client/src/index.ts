import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@app/api/src/trpc/routers/_app";

export type { AppRouter };

/**
 * Both web (Next.js) and mobile (Expo) call this to build their httpBatchLink
 * config, then each wraps it with its own `createTRPCReact<AppRouter>()` —
 * React Query/React Native context can't be shared across the two runtimes,
 * so only the link config and the AppRouter type are shared here.
 */
export function createApiHttpLink(opts: { apiUrl: string; getAuthToken: () => Promise<string | null> }) {
  return httpBatchLink({
    url: `${opts.apiUrl}/trpc`,
    async headers() {
      const token = await opts.getAuthToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  });
}
