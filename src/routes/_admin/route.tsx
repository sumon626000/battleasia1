import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { TwoFactorGate } from "@/components/admin/TwoFactorGate";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  component: AdminLayout,
});


function AdminLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);


  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      if (!active) return;
      if (error || !data) {
        setState("denied");
      } else {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        setState("ok");
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);


  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="font-hud text-sm uppercase tracking-widest text-foreground/60">
          Verifying clearance…
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-md border border-destructive/60 bg-destructive/10 p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="font-display text-xl uppercase tracking-widest text-destructive">
            Access Denied
          </h1>
          <p className="mt-2 font-hud text-sm text-foreground/70">
            You do not have administrator clearance to access this area.
          </p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-4 rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <TwoFactorGate userId={userId!} userEmail={userEmail}>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </TwoFactorGate>
  );
}

