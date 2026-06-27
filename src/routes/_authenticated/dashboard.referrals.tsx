import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Users, Share2, Copy, Check, Gift, TrendingUp, Loader2, Link2 } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/referrals")({
  component: ReferralsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="hud-panel p-6">
        <p className="text-destructive font-mono text-sm">Failed: {error.message}</p>
        <button className="mt-3 btn-outline-gold px-4 py-2 text-xs" onClick={() => { reset(); router.invalidate(); }}>RETRY</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="hud-panel p-6 font-mono">Not found.</div>,
});

function ReferralsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const refCode = profile?.referral_code ?? "";
  const refLink = useMemo(() => {
    if (!refCode || typeof window === "undefined") return "";
    return `${window.location.origin}/auth?ref=${refCode}`;
  }, [refCode]);

  const { data: config } = useQuery({
    queryKey: ["referral-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_configs").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: invited, isLoading: invitedLoading } = useQuery({
    queryKey: ["referred-users", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, in_game_username, country_code, created_at, email_verified_at")
        .eq("referred_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: txns, isLoading: txnsLoading } = useQuery({
    queryKey: ["referral-txns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_transactions")
        .select("id, bonus_bac, commission_rate, source_type, status, created_at, referred_user_id")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = invited?.length ?? 0;
    const verified = invited?.filter((i: any) => i.email_verified_at).length ?? 0;
    const earned = (txns ?? [])
      .filter((t: any) => t.status === "credited")
      .reduce((sum: number, t: any) => sum + Number(t.bonus_bac || 0), 0);
    const pending = (txns ?? [])
      .filter((t: any) => t.status === "pending")
      .reduce((sum: number, t: any) => sum + Number(t.bonus_bac || 0), 0);
    return { total, verified, earned, pending };
  }, [invited, txns]);

  const copy = async (text: string, kind: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success(kind === "code" ? "Referral code copied" : "Referral link copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const share = async () => {
    if (!refLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join Battle Asia", text: "Join me on Battle Asia and earn BAC!", url: refLink });
      } else {
        await copy(refLink, "link");
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <header className="hud-panel p-5">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl tracking-wider">REFERRAL OPS</h1>
            <p className="font-mono text-xs text-muted-foreground uppercase">Recruit operatives // earn commissions</p>
          </div>
        </div>
      </header>

      {config?.is_enabled === false && (
        <div className="hud-panel p-4 border-amber-500/40">
          <p className="font-mono text-xs text-amber-400 uppercase">Referral program temporarily disabled by admin.</p>
        </div>
      )}

      {/* Reward rules */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RuleCard icon={<Gift className="w-4 h-4" />} label="Signup Bonus" value={`+${config?.signup_bonus_bac ?? 0} BAC`} hint="per verified recruit" />
        <RuleCard icon={<CoinIcon className="w-4 h-4" />} label="Deposit Commission" value={`${config?.deposit_commission ?? 0}%`} hint="of every recruit's deposit" />
        <RuleCard icon={<TrendingUp className="w-4 h-4" />} label="Match Commission" value={`${config?.paid_match_commission ?? 0}%`} hint={`min entry ${config?.min_paid_match_fee ?? 0} BAC`} />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Users className="w-4 h-4" />} label="Recruits" value={stats.total} />
        <StatTile icon={<Check className="w-4 h-4" />} label="Verified" value={stats.verified} />
        <StatTile icon={<CoinIcon className="w-4 h-4" />} label="Earned BAC" value={stats.earned.toFixed(0)} accent="text-emerald-400" />
        <StatTile icon={<Loader2 className="w-4 h-4" />} label="Pending BAC" value={stats.pending.toFixed(0)} accent="text-amber-400" />
      </section>

      {/* Code + link */}
      <section className="hud-panel p-5 space-y-4">
        <h2 className="font-display tracking-wider text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" /> YOUR REFERRAL CHANNEL
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Referral Code"
            value={refCode || "—"}
            onCopy={() => refCode && copy(refCode, "code")}
            copied={copied === "code"}
          />
          <Field
            label="Referral Link"
            value={refLink || "—"}
            onCopy={() => refLink && copy(refLink, "link")}
            copied={copied === "link"}
            small
          />
        </div>
        <button onClick={share} disabled={!refLink} className="btn-gold px-5 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50">
          <Share2 className="w-4 h-4" /> SHARE LINK
        </button>
      </section>

      {/* Invited list */}
      <section className="hud-panel p-5">
        <h2 className="font-display tracking-wider text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> RECRUITED OPERATIVES
        </h2>
        {invitedLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto my-6" />
        ) : !invited?.length ? (
          <p className="font-mono text-xs text-muted-foreground text-center py-6 uppercase">No recruits yet. Share your code to start earning.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invited.map((u: any) => (
              <li key={u.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm truncate">{u.in_game_username || u.username}</p>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">
                    {u.country_code || "—"} · joined {format(new Date(u.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 border uppercase ${u.email_verified_at ? "border-emerald-500 text-emerald-400" : "border-amber-500 text-amber-400"}`}>
                  {u.email_verified_at ? "Verified" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Commission history */}
      <section className="hud-panel p-5">
        <h2 className="font-display tracking-wider text-sm mb-3 flex items-center gap-2">
          <CoinIcon className="w-4 h-4" /> COMMISSION LOG
        </h2>
        {txnsLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto my-6" />
        ) : !txns?.length ? (
          <p className="font-mono text-xs text-muted-foreground text-center py-6 uppercase">No commissions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {txns.map((t: any) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase">{t.source_type}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {format(new Date(t.created_at), "dd MMM yyyy, HH:mm")} · rate {t.commission_rate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm text-emerald-400 flex items-center gap-1 justify-end">
                    <CoinIcon className="w-3.5 h-3.5" />+{Number(t.bonus_bac).toFixed(2)}
                  </p>
                  <span className={`font-mono text-[10px] uppercase ${t.status === "credited" ? "text-emerald-400" : t.status === "pending" ? "text-amber-400" : "text-muted-foreground"}`}>
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RuleCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="hud-panel p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}<span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-xl text-primary mt-1">{value}</div>
      <p className="font-mono text-[10px] text-muted-foreground mt-0.5 uppercase">{hint}</p>
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: string }) {
  return (
    <div className="hud-panel p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}<span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-display text-2xl mt-1 ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onCopy, copied, small }: { label: string; value: string; onCopy: () => void; copied: boolean; small?: boolean }) {
  return (
    <div className="border border-border bg-muted/10 p-3">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className={`flex-1 font-mono ${small ? "text-xs" : "text-base"} truncate text-primary`}>{value}</code>
        <button onClick={onCopy} className="btn-outline-gold px-3 py-1.5 text-xs inline-flex items-center gap-1">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "OK" : "COPY"}
        </button>
      </div>
    </div>
  );
}
