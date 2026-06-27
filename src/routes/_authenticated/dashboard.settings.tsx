import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { passwordChangeSchema } from "@/lib/auth-validation";
import { KeyRound, Bell, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: DashboardSettingsPage,
});

function DashboardSettingsPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordChangeSchema.safeParse({
      new_password: pw,
      confirm_password: pw2,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid password");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      setPw("");
      setPw2("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em]">Account Settings</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Manage credentials, notifications and account closure
        </p>
      </div>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-5">
        <h2 className="font-display text-base uppercase tracking-widest flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-gold" /> Change Password
        </h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              New Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              Confirm Password
            </label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded border border-gold/60 bg-gold/10 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Update Password"}
            </button>
          </div>
        </form>
        <p className="mt-2 font-mono text-[10px] text-foreground/50">
          Must be 8+ chars with uppercase, number, and special character.
        </p>
      </section>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-5">
        <h2 className="font-display text-base uppercase tracking-widest flex items-center gap-2">
          <Bell className="h-4 w-4 text-gold" /> Notifications
        </h2>
        <p className="mt-2 font-hud text-xs text-foreground/60">
          View and manage your alerts from the Notifications inbox.
        </p>
        <Link
          to="/dashboard/notifications"
          className="mt-3 inline-flex rounded border border-border/70 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-gold hover:text-gold"
        >
          Open Inbox
        </Link>
      </section>

      <section className="hud-panel rounded-md border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-display text-base uppercase tracking-widest flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" /> Delete Account
        </h2>
        <p className="mt-2 font-hud text-xs text-foreground/60">
          Submit an account closure request from your profile page. An admin will review it.
        </p>
        <Link
          to="/dashboard/profile"
          className="mt-3 inline-flex rounded border border-destructive/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10"
        >
          Go to Profile
        </Link>
      </section>
    </div>
  );
}
