import { useEffect, useState } from "react";
import { Secret, TOTP } from "otpauth";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "@tanstack/react-router";

const SESSION_KEY = "admin_2fa_verified_at";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h

type Row = {
  user_id: string;
  secret: string;
  enabled: boolean;
  recovery_codes: string[] | null;
};

function isFresh(): boolean {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

function markFresh() {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function TwoFactorGate({
  userId,
  userEmail,
  children,
}: {
  userId: string;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok" | "need_enroll" | "need_verify">(
    "checking",
  );
  const [row, setRow] = useState<Row | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("admin_totp_secrets")
        .select("user_id, secret, enabled, recovery_codes")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      const r = data as Row | null;
      setRow(r);
      if (!r?.enabled) {
        setState("need_enroll");
      } else if (isFresh()) {
        setState("ok");
      } else {
        setState("need_verify");
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  async function verify() {
    if (!row) return;
    setBusy(true);
    const cleaned = code.replace(/\s+/g, "").toUpperCase();
    let ok = false;

    // Try TOTP first
    const totp = new TOTP({
      issuer: "Battle Asia Admin",
      label: userEmail || "admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(row.secret),
    });
    if (totp.validate({ token: cleaned, window: 1 }) !== null) ok = true;

    // Recovery code fallback
    if (!ok && row.recovery_codes && row.recovery_codes.includes(cleaned)) {
      const remaining = row.recovery_codes.filter((c) => c !== cleaned);
      await supabase
        .from("admin_totp_secrets")
        .update({ recovery_codes: remaining })
        .eq("user_id", userId);
      ok = true;
      toast.info("Recovery code used. Consider regenerating soon.");
    }

    if (!ok) {
      setBusy(false);
      toast.error("Invalid code");
      return;
    }

    await supabase
      .from("admin_totp_secrets")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("user_id", userId);

    markFresh();
    setBusy(false);
    setState("ok");
  }

  async function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (state === "ok") return <>{children}</>;

  if (state === "need_enroll") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="hud-panel max-w-md p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-gold" />
          <h1 className="font-display text-xl uppercase tracking-widest text-gold">
            Two-Factor Required
          </h1>
          <p className="mt-2 font-hud text-sm text-foreground/70">
            Admin accounts must enable 2FA before accessing the control panel.
          </p>
          <Link
            to="/admin/two-factor"
            className="btn-gamey mt-5 inline-block px-5 py-2 text-xs"
          >
            Enable 2FA Now
          </Link>
          <button
            onClick={signOut}
            className="mt-3 block w-full rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-destructive hover:text-destructive"
          >
            <LogOut className="mr-1 inline h-3 w-3" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // need_verify
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="hud-panel max-w-md p-6">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-gold" />
        <h1 className="text-center font-display text-xl uppercase tracking-widest text-gold">
          Verify Identity
        </h1>
        <p className="mt-2 text-center font-hud text-sm text-foreground/70">
          Enter the 6-digit code from your authenticator (or a recovery code).
        </p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") verify();
          }}
          placeholder="000000"
          inputMode="text"
          maxLength={20}
          className="mt-5 w-full rounded border border-border/60 bg-background px-3 py-3 text-center font-mono text-lg tracking-widest focus:border-gold focus:outline-none"
        />
        <button
          onClick={verify}
          disabled={busy || code.length < 6}
          className="btn-gamey mt-4 w-full px-4 py-2 text-xs disabled:opacity-50"
        >
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify"}
        </button>
        <button
          onClick={signOut}
          className="mt-3 block w-full rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-destructive hover:text-destructive"
        >
          <LogOut className="mr-1 inline h-3 w-3" /> Sign Out
        </button>
      </div>
    </div>
  );
}
