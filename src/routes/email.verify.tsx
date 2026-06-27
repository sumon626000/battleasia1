import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/email/verify")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Verify Your Email | Battle Asia" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function VerifyPage() {
  const search = useSearch({ from: "/email/verify" });
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email ?? "");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function setDigit(i: number, v: string) {
    const c = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    const code = digits.join("");
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Email verified. Welcome!");
    navigate({ to: "/dashboard" });
  }

  async function handleResend() {
    if (!email) return toast.error("Enter your email first");
    if (cooldown > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/email/verify` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verification code re-sent");
    setCooldown(60);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="hud-panel relative overflow-hidden border border-border/80 bg-card/80 p-6 backdrop-blur">
        <span className="hud-bracket hud-bracket-tl" />
        <span className="hud-bracket hud-bracket-tr" />
        <span className="hud-bracket hud-bracket-bl" />
        <span className="hud-bracket hud-bracket-br" />

        <h1 className="font-display text-3xl font-bold tracking-wide text-foreground">VERIFY EMAIL</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code sent to your email.
        </p>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
              EMAIL
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50"
              required
            />
          </label>

          <div>
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
              VERIFICATION CODE
            </span>
            <div className="mt-2 flex justify-between gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onPaste={onPaste}
                  className="font-display h-12 w-10 rounded-md border border-border bg-background/80 text-center text-xl font-bold text-gold outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "VERIFY"}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={busy || cooldown > 0}
              className="font-semibold text-gold hover:underline disabled:text-foreground/40 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="text-foreground/60 hover:text-gold"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
