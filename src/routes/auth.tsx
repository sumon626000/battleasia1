import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Register | Battle Asia" },
      { name: "description", content: "Join Battle Asia esports arena. Log in or create your free account to compete in tournaments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl text-gold">Auth error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="btn-gold mt-4 px-4 py-2 text-sm">
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back, soldier");
    navigate({ to: "/" });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!username.trim()) return toast.error("Username is required");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: username.trim(), display_name: username.trim() },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to verify");
    setTab("login");
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) return toast.error(result.error.message ?? "Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  async function handleForgot() {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="hud-panel relative overflow-hidden border border-border/80 bg-card/80 p-6 backdrop-blur">
        <span className="hud-bracket hud-bracket-tl" />
        <span className="hud-bracket hud-bracket-tr" />
        <span className="hud-bracket hud-bracket-bl" />
        <span className="hud-bracket hud-bracket-br" />

        <h1 className="font-display text-3xl font-bold tracking-wide text-foreground">
          {tab === "login" ? "ENTER THE ARENA" : "JOIN THE BATTLE"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "login" ? "Sign in to your Battle Asia account" : "Create your free Battle Asia account"}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-background/60 p-1">
          <button
            onClick={() => setTab("login")}
            className={`font-hud rounded px-3 py-2 text-sm font-semibold transition ${tab === "login" ? "bg-gold text-black" : "text-foreground/70 hover:text-gold"}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setTab("register")}
            className={`font-hud rounded px-3 py-2 text-sm font-semibold transition ${tab === "register" ? "bg-gold text-black" : "text-foreground/70 hover:text-gold"}`}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="mt-5 space-y-3">
          {tab === "register" && (
            <Field label="USERNAME" value={username} onChange={setUsername} placeholder="ProGamer123" />
          )}
          <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="PASSWORD" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

          {tab === "login" && (
            <button type="button" onClick={handleForgot} className="text-xs font-semibold text-gold hover:underline">
              Forgot password?
            </button>
          )}

          <button type="submit" disabled={busy} className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : tab === "login" ? "LOGIN" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={handleGoogle} disabled={busy} className="btn-outline-gold w-full justify-center py-3 text-sm disabled:opacity-60">
          CONTINUE WITH GOOGLE
        </button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <Link to="/" className="text-gold hover:underline">Terms</Link> and{" "}
          <Link to="/" className="text-gold hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50"
      />
    </label>
  );
}
