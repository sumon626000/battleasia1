import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

function describeError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const anyErr = err as any;
  // Supabase PostgrestError shape
  if (anyErr.message && anyErr.code) {
    return `[${anyErr.code}] ${anyErr.message}${anyErr.hint ? ` — ${anyErr.hint}` : ""}`;
  }
  if (anyErr.message) return String(anyErr.message);
  try { return JSON.stringify(anyErr); } catch { return "Unknown error"; }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Suppress toast for TanStack Router notFound() — the route's notFoundComponent handles UI.
        if (error && typeof error === "object" && (error as any).isNotFound) return;
        const msg = describeError(error);
        console.error("[query error]", query.queryKey, error);
        toast.error("Could not load data", {
          description: `${(query.queryKey?.[0] as string) ?? "query"}: ${msg}`,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        const msg = describeError(error);
        console.error("[mutation error]", error);
        toast.error("Action failed", { description: msg });
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
