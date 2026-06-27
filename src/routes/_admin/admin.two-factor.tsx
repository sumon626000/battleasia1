import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Copy, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_admin/admin/two-factor")({
  component: AdminTwoFactorPage,
});

type Row = {
  user_id: string;
  secret: string;
  enabled: boolean;
  recovery_codes: string[];
  last_verified_at: string | null;
};

function makeTotp(secret: string, label: string) {
  return new TOTP({
    issuer: "Battle Asia Admin",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

function genRecoveryCodes(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const buf = new Uint8Array(5);
    crypto.getRandomValues(buf);
    out.push(
      Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
        .match(/.{1,5}/g)!
        .join("-"),
    );
  }
  return out;
}

function AdminTwoFactorPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("admin_totp_secrets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setRow(data as Row | null);
      setLoading(false);
    })();
  }, [user]);

  async function startEnrollment() {
    if (!user) return;
    const secret = new Secret({ size: 20 }).base32;
    setPendingSecret(secret);
    const url = makeTotp(secret, user.email || "admin").toString();
    setQrDataUrl(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
  }

  async function confirmEnrollment() {
    if (!user || !pendingSecret) return;
    const totp = makeTotp(pendingSecret, user.email || "admin");
    const delta = totp.validate({ token: code.replace(/\s+/g, ""), window: 1 });
    if (delta === null) {
      toast.error("Invalid code, please try again.");
      return;
    }
    setBusy(true);
    const codes = genRecoveryCodes();
    const { error } = await supabase
      .from("admin_totp_secrets")
      .upsert({
        user_id: user.id,
        secret: pendingSecret,
        enabled: true,
        recovery_codes: codes,
        last_verified_at: new Date().toISOString(),
      });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRecovery(codes);
    setRow({
      user_id: user.id,
      secret: pendingSecret,
      enabled: true,
      recovery_codes: codes,
      last_verified_at: new Date().toISOString(),
    });
    setPendingSecret(null);
    setQrDataUrl(null);
    setCode("");
    toast.success("Two-factor authentication enabled.");
  }

  async function disable2FA() {
    if (!user) return;
    if (!confirm("Disable two-factor authentication?")) return;
    setBusy(true);
    const { error } = await supabase
      .from("admin_totp_secrets")
      .delete()
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRow(null);
    setRecovery(null);
    toast.success("Two-factor authentication disabled.");
  }

  if (loading) {
    return (
      <div className="grid place-items-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl uppercase tracking-widest text-gold">
          Two-Factor Authentication
        </h1>
        <p className="mt-1 text-xs text-foreground/60">
          Protect the admin panel with a Google Authenticator / Authy TOTP code.
        </p>
      </header>

      <section className="hud-panel p-5">
        <div className="flex items-center gap-3">
          {row?.enabled ? (
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          ) : (
            <ShieldOff className="h-6 w-6 text-foreground/50" />
          )}
          <div>
            <div className="font-display text-sm uppercase tracking-widest">
              Status: {row?.enabled ? "ENABLED" : "DISABLED"}
            </div>
            {row?.last_verified_at && (
              <div className="text-xs text-foreground/50">
                Last verified {new Date(row.last_verified_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {!row?.enabled && !pendingSecret && (
          <button
            onClick={startEnrollment}
            className="btn-gamey mt-5 px-5 py-2 text-xs"
          >
            Enable 2FA
          </button>
        )}

        {row?.enabled && (
          <button
            onClick={disable2FA}
            disabled={busy}
            className="mt-5 rounded border border-destructive/60 px-4 py-2 font-hud text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Disable 2FA
          </button>
        )}
      </section>

      {pendingSecret && qrDataUrl && (
        <section className="hud-panel p-5">
          <h2 className="font-display text-sm uppercase tracking-widest text-gold">
            Scan & Verify
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            Scan this QR with Google Authenticator, then enter the 6-digit code below.
          </p>
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
            <img src={qrDataUrl} alt="TOTP QR" className="rounded border border-border/60" />
            <div className="flex-1 space-y-3">
              <div className="rounded border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-foreground/50">
                  Manual entry key
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-xs">
                  <span className="break-all">{pendingSecret}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pendingSecret);
                      toast.success("Secret copied");
                    }}
                    className="rounded p-1 hover:text-gold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="w-full rounded border border-border/60 bg-background px-3 py-2 text-center font-mono text-lg tracking-widest focus:border-gold focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmEnrollment}
                  disabled={busy || code.length < 6}
                  className="btn-gamey flex-1 px-4 py-2 text-xs disabled:opacity-50"
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify & Enable"}
                </button>
                <button
                  onClick={() => {
                    setPendingSecret(null);
                    setQrDataUrl(null);
                    setCode("");
                  }}
                  className="rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-gold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {recovery && (
        <section className="hud-panel border-emerald-500/40 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-400" />
            <h2 className="font-display text-sm uppercase tracking-widest text-emerald-400">
              Recovery Codes — Save Now
            </h2>
          </div>
          <p className="mt-1 text-xs text-foreground/70">
            Store these codes somewhere safe. Each can be used once if you lose your authenticator.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
            {recovery.map((c) => (
              <div
                key={c}
                className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5 text-center"
              >
                {c}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(recovery.join("\n"));
              toast.success("Recovery codes copied");
            }}
            className="mt-3 rounded border border-border/60 px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            <Copy className="mr-1 inline h-3 w-3" /> Copy All
          </button>
        </section>
      )}
    </div>
  );
}
