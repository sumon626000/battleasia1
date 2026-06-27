import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Battle Asia" },
      { name: "description", content: "Set a new password for your Battle Asia account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="btn-gold mt-4 px-4 py-2 text-sm">Retry</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="hud-panel relative border border-border/80 bg-card/80 p-6 backdrop-blur">
        <span className="hud-bracket hud-bracket-tl" />
        <span className="hud-bracket hud-bracket-tr" />
        <span className="hud-bracket hud-bracket-bl" />
        <span className="hud-bracket hud-bracket-br" />

        <h1 className="font-display text-3xl font-bold tracking-wide">RESET PASSWORD</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">NEW PASSWORD</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/50" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">CONFIRM PASSWORD</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              className="mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/50" />
          </label>
          <button type="submit" disabled={busy} className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}
