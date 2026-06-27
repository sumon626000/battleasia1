import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ mode: z.enum(["request", "reset"]).optional() }).optional();

export const Route = createFileRoute("/forgot-password")({
  validateSearch: searchSchema,
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset Password — Battle Asia" },
      { name: "description", content: "Reset your Battle Asia account password." },
    ],
  }),
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/forgot-password" }) as { mode?: "request" | "reset" } | undefined;

  // If URL has a recovery hash, Supabase auth listener will switch session; show reset form.
  const isReset = search?.mode === "reset" || (typeof window !== "undefined" && window.location.hash.includes("type=recovery"));

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    const redirectTo = `${window.location.origin}/forgot-password?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reset link sent. Check your inbox.");
  }

  async function applyReset(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="hud-panel p-6">
        <h1 className="font-display text-2xl font-bold tracking-wide text-gold">
          {isReset ? "SET NEW PASSWORD" : "RESET PASSWORD"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isReset ? "Enter a new password for your account." : "Enter your account email and we'll send a reset link."}
        </p>

        {isReset ? (
          <form onSubmit={applyReset} className="mt-5 space-y-3">
            <input
              type="password" required minLength={8} placeholder="New password"
              value={pwd} onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <input
              type="password" required minLength={8} placeholder="Confirm new password"
              value={pwd2} onChange={(e) => setPwd2(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <button disabled={busy} className="btn-gold w-full py-2.5 text-sm">
              {busy ? "Saving..." : "UPDATE PASSWORD"}
            </button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="mt-5 space-y-3">
            <input
              type="email" required placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <button disabled={busy} className="btn-gold w-full py-2.5 text-sm">
              {busy ? "Sending..." : "SEND RESET LINK"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-sm">
          <Link to="/auth" className="text-gold hover:underline">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
