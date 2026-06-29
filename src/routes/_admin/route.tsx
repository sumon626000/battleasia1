import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  component: AdminLayout,
});

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "12345678";
// Same credentials used for backend Supabase sign-in (permanent admin account)
const BACKEND_ADMIN_EMAIL = "admin@gmail.com";
const BACKEND_ADMIN_PASSWORD = "12345678";
const ADMIN_KEY = "ba_standalone_admin_v1";
const ADMIN_TTL_MS = 1000 * 60 * 60 * 8; // 8h
const BYPASS_EMAILS = new Set(["nixhyip@gmail.com"]);

function isAdminFresh(): boolean {
  try {
    const v = sessionStorage.getItem(ADMIN_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < ADMIN_TTL_MS;
  } catch {
    return false;
  }
}

function AdminLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "login" | "no-supabase" | "ok">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [supaEmail, setSupaEmail] = useState<string | null>(null);

  async function verifySupabaseAdmin(): Promise<boolean> {
    const { data: sess } = await supabase.auth.getSession();
    setSupaEmail(sess.session?.user?.email ?? null);
    if (!sess.session) return false;
    const { data, error } = await supabase.rpc("is_admin");
    if (error) return false;
    return !!data;
  }

  useEffect(() => {
    (async () => {
      // Bypass standalone gate for trusted Supabase admin emails
      const { data: sess } = await supabase.auth.getSession();
      const email = sess.session?.user?.email?.toLowerCase() ?? null;
      setSupaEmail(email);
      if (email && BYPASS_EMAILS.has(email)) {
        const { data: isAdm } = await supabase.rpc("is_admin");
        if (isAdm) {
          try {
            sessionStorage.setItem(ADMIN_KEY, String(Date.now()));
          } catch {
            /* noop */
          }
          setState("ok");
          return;
        }
      }
      if (!isAdminFresh()) {
        setState("login");
        return;
      }
      const ok = await verifySupabaseAdmin();
      setState(ok ? "ok" : "no-supabase");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (
      email.trim().toLowerCase() !== ADMIN_EMAIL ||
      password !== ADMIN_PASSWORD
    ) {
      toast.error("Invalid admin credentials");
      setBusy(false);
      return;
    }
    try {
      sessionStorage.setItem(ADMIN_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    try {
      sessionStorage.setItem(ADMIN_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    let ok = await verifySupabaseAdmin();
    if (!ok) {
      // Auto sign-in the backend admin account so RLS-bound RPCs work
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: BACKEND_ADMIN_EMAIL,
        password: BACKEND_ADMIN_PASSWORD,
      });
      if (!signErr) {
        ok = await verifySupabaseAdmin();
      }
    }
    if (ok) {
      toast.success("Admin access granted");
      setState("ok");
    } else {
      setState("no-supabase");
    }
    setBusy(false);
  }

  function signOut() {
    try {
      sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      /* noop */
    }
    navigate({ to: "/", replace: true });
  }

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (state === "login") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <form
          onSubmit={submit}
          className="hud-panel w-full max-w-sm p-6"
          autoComplete="off"
        >
          <Shield className="mx-auto mb-3 h-10 w-10 text-gold" />
          <h1 className="text-center font-display text-xl uppercase tracking-widest text-gold">
            Admin Sign In
          </h1>
          <p className="mt-2 text-center font-hud text-xs text-foreground/60">
            Standalone admin gate. Not linked to user accounts.
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <label className="font-hud text-[11px] uppercase tracking-widest text-foreground/70">
                Email
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                className="mt-1 w-full rounded border border-border/60 bg-background px-3 py-2 font-mono text-sm focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="font-hud text-[11px] uppercase tracking-widest text-foreground/70">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded border border-border/60 bg-background px-3 py-2 font-mono text-sm focus:border-gold focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="btn-gamey mt-5 w-full px-4 py-2 text-xs disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Enter Command Center"
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="mt-3 block w-full rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
          >
            Back to Home
          </button>
        </form>
      </div>
    );
  }



  if (state === "no-supabase") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="hud-panel w-full max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="font-display text-lg uppercase tracking-widest text-red-300">
            Backend Admin Session Required
          </h1>
          <p className="mt-3 text-sm text-foreground/70">
            The standalone gate is unlocked, but database actions require an
            account with the <span className="text-gold">admin</span> role on
            the backend. Sign in with your admin user account first, then come
            back here.
          </p>
          {supaEmail && (
            <p className="mt-2 font-mono text-xs text-foreground/55">
              Currently signed in as: {supaEmail} (not admin)
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <Link
              to="/auth"
              className="btn-gamey w-full px-4 py-2 text-xs"
            >
              Sign in as admin
            </Link>
            <button
              onClick={async () => {
                setState("checking");
                const ok = await verifySupabaseAdmin();
                setState(ok ? "ok" : "no-supabase");
              }}
              className="w-full rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
            >
              Re-check session
            </button>
            <button
              onClick={signOut}
              className="w-full rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-red-400 hover:text-red-300"
            >
              Exit admin
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <AdminShell onAdminSignOut={signOut}>
      <Outlet />
    </AdminShell>
  );
}
