import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function safePath(p: string | null | undefined): string {
  if (!p) return "/dashboard";
  if (!p.startsWith("/")) return "/dashboard";
  if (p.startsWith("//")) return "/dashboard";
  return p;
}

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Supabase auto-processes the URL hash/query for OAuth + email flows.
        for (let i = 0; i < 30; i++) {
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          if (data.session) {
            const next = safePath(
              new URLSearchParams(window.location.search).get("next") ||
                sessionStorage.getItem("ba_post_login_redirect"),
            );
            sessionStorage.removeItem("ba_post_login_redirect");
            navigate({ to: next, replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        setError("Sign-in could not be completed. Please try again.");
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      {error ? (
        <div className="max-w-md rounded-md border border-destructive/60 bg-destructive/10 p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h1 className="font-display text-lg uppercase tracking-widest text-destructive">
            Sign-in Failed
          </h1>
          <p className="mt-2 font-hud text-sm text-foreground/70">{error}</p>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-4 rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 font-hud text-sm uppercase tracking-widest text-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Completing sign-in…
        </div>
      )}
    </div>
  );
}
