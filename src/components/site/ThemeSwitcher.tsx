import { useState } from "react";
import { Palette, X, Check, Lock, Sparkles, Crown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { applyTheme } from "@/lib/themes";
import { CoinIcon } from "@/components/site/CoinIcon";
import type { ThemeConfig } from "@/lib/themes";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { profile } = useProfile(user?.id);
  const qc = useQueryClient();

  const activeTheme = ((profile as any)?.active_theme as string) || "official";
  const balance = Number(profile?.bac_coin_balance ?? 0);

  const { data: themes = [] } = useQuery({
    queryKey: ["theme_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_config")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ThemeConfig[];
    },
  });

  const { data: owned = [] } = useQuery({
    queryKey: ["theme_purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_theme_purchases")
        .select("theme_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((r: any) => r.theme_id as string);
    },
  });

  const isOwned = (t: ThemeConfig) =>
    t.price_bac === 0 || t.is_default || owned.includes(t.id);

  const applyMut = useMutation({
    mutationFn: async (themeId: string) => {
      if (!user) throw new Error("Sign in to change theme");
      const { error } = await supabase
        .from("profiles")
        .update({ active_theme: themeId } as any)
        .eq("id", user.id);
      if (error) throw error;
      return themeId;
    },
    onSuccess: (themeId) => {
      applyTheme(themeId);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Theme applied");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to apply theme"),
  });

  const buyMut = useMutation({
    mutationFn: async (themeId: string) => {
      const { data, error } = await supabase.rpc("purchase_theme", { p_theme_id: themeId });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res: any) => {
      applyTheme(res.theme_id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["theme_purchases"] });
      toast.success(`Unlocked ${res.theme_name}! 🎨`);
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Purchase failed"),
  });

  function handleClick(t: ThemeConfig) {
    if (t.id === activeTheme) return;
    if (isOwned(t)) {
      applyMut.mutate(t.id);
    } else {
      if (!isAuthenticated) {
        toast.error("Sign in to unlock themes");
        return;
      }
      if (balance < t.price_bac) {
        toast.error(`Need ${t.price_bac} BAC to unlock (you have ${balance})`);
        return;
      }
      if (!confirm(`Unlock "${t.name}" for ${t.price_bac} BAC?`)) return;
      buyMut.mutate(t.id);
    }
  }

  const currentTheme = themes.find((t) => t.id === activeTheme);
  const ringColor = currentTheme?.preview_color ?? "#d4af37";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change theme"
        className={`group relative grid place-items-center rounded-md border border-border/70 transition-all hover:border-gold/60 hover:text-gold ${
          compact ? "h-9 w-9" : "flex h-9 gap-1.5 px-2.5"
        }`}
        style={{ boxShadow: `0 0 0 1px ${ringColor}55, 0 0 14px ${ringColor}55` }}
      >
        <Palette size={16} style={{ color: ringColor }} className="animate-pulse" />
        {!compact && (
          <span className="hidden font-hud text-[11px] font-bold uppercase tracking-wider sm:inline">
            Theme
          </span>
        )}
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background"
          style={{ background: ringColor }}
        />
      </button>

      {open && (
        <>
          <button
            aria-label="Close"
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-x-0 top-0 z-[201] mx-auto flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-card animate-in fade-in zoom-in-95 duration-200 sm:inset-x-4 sm:top-1/2 sm:h-auto sm:max-h-[92dvh] sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-gold/40 sm:shadow-2xl"
            style={{
              backgroundImage:
                "radial-gradient(1200px 400px at 50% -100px, color-mix(in oklab, var(--gold) 18%, transparent), transparent 60%)",
            }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between gap-3 border-b border-gold/20 px-4 py-3.5 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold"
                  style={{ boxShadow: `0 0 20px ${ringColor}55` }}
                >
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold uppercase tracking-[0.18em] text-gold sm:text-2xl">
                    Theme Vault
                  </h2>
                  <p className="hidden font-hud text-[11px] uppercase tracking-widest text-foreground/60 sm:block">
                    Pick a visual identity for your battle interface
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-md border border-border/70 p-2 text-foreground/70 transition hover:border-gold/60 hover:text-gold"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Balance strip */}
            {isAuthenticated && (
              <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-background/40 px-4 py-2.5 sm:px-7">
                <div className="flex items-center gap-2 font-hud text-[11px] uppercase tracking-widest text-foreground/70">
                  <span>Wallet</span>
                  <span className="text-foreground/30">·</span>
                  <CoinIcon size={13} />
                  <span className="font-mono text-sm font-bold text-gold">
                    {balance.toLocaleString()}
                  </span>
                </div>
                <Link
                  to="/dashboard/vault"
                  onClick={() => setOpen(false)}
                  className="font-hud text-[10px] uppercase tracking-widest text-gold/80 hover:text-gold hover:underline"
                >
                  Top up →
                </Link>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-7 sm:py-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {themes.map((t) => {
                  const owned = isOwned(t);
                  const active = t.id === activeTheme;
                  const canAfford = balance >= t.price_bac;
                  const c = t.preview_color;
                  const busy = applyMut.isPending || buyMut.isPending;

                  return (
                    <button
                      key={t.id}
                      onClick={() => handleClick(t)}
                      disabled={busy}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-300 active:scale-[0.98] disabled:opacity-60 ${
                        active
                          ? "border-2 ring-2 ring-offset-2 ring-offset-card"
                          : "border-border/60 hover:-translate-y-0.5 hover:border-gold/50"
                      }`}
                      style={{
                        borderColor: active ? c : undefined,
                        boxShadow: active
                          ? `0 0 0 1px ${c}, 0 12px 40px -8px ${c}88, inset 0 0 60px ${c}22`
                          : undefined,
                      }}
                    >
                      {/* Preview surface — a mini mock of a card in that theme */}
                      <div
                        className="relative h-28 overflow-hidden sm:h-32"
                        style={{
                          background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 60%, #0a0a0a))`,
                        }}
                      >
                        {/* subtle grid overlay */}
                        <div
                          className="absolute inset-0 opacity-30 mix-blend-overlay"
                          style={{
                            backgroundImage: `linear-gradient(${c}33 1px, transparent 1px), linear-gradient(90deg, ${c}33 1px, transparent 1px)`,
                            backgroundSize: "18px 18px",
                          }}
                        />
                        {/* mock chips */}
                        <div className="absolute left-3 top-3 flex gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-white/70" />
                          <span className="h-2 w-2 rounded-full bg-white/40" />
                          <span className="h-2 w-2 rounded-full bg-white/20" />
                        </div>
                        {/* mock button */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="h-1.5 w-16 rounded-full bg-white/80" />
                            <span className="h-1 w-10 rounded-full bg-white/40" />
                          </div>
                          <span
                            className="rounded-md px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-black shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 70%, white))`,
                              boxShadow: `0 4px 12px ${c}88`,
                            }}
                          >
                            Play
                          </span>
                        </div>
                        {/* glare */}
                        <div
                          className="absolute -right-10 top-0 h-full w-24 -skew-x-12 opacity-20 transition-opacity duration-500 group-hover:opacity-40"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
                          }}
                        />
                        {active && (
                          <div className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white/80 bg-black/60 text-white shadow-lg">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                        {t.is_default && (
                          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/40 bg-black/50 px-1.5 py-0.5 font-hud text-[8px] font-bold uppercase tracking-widest text-white backdrop-blur">
                            <Crown size={9} /> Default
                          </div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-2 bg-card/80 p-3 backdrop-blur sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div
                              className="truncate font-display text-sm font-bold uppercase tracking-widest sm:text-base"
                              style={{ color: active ? c : undefined }}
                            >
                              {t.name}
                            </div>
                            {t.description && (
                              <p className="mt-0.5 line-clamp-1 font-hud text-[11px] text-foreground/60">
                                {t.description}
                              </p>
                            )}
                          </div>
                          <span
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
                            style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          {active ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-widest"
                              style={{ borderColor: `${c}88`, background: `${c}1a`, color: c }}
                            >
                              <Check size={11} /> Active
                            </span>
                          ) : owned ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-success/50 bg-success/10 px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-widest text-success">
                              Tap to Apply
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-widest ${
                                canAfford
                                  ? "border-gold/50 bg-gold/10 text-gold"
                                  : "border-destructive/50 bg-destructive/10 text-destructive"
                              }`}
                            >
                              <Lock size={10} />
                              <CoinIcon size={10} />
                              {t.price_bac.toLocaleString()}
                            </span>
                          )}
                          {!active && (
                            <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/40 group-hover:text-gold">
                              →
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {themes.length === 0 && (
                <div className="grid place-items-center py-16 font-hud text-sm uppercase tracking-widest text-foreground/50">
                  No themes available
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 bg-background/40 px-4 py-3 text-center sm:px-7">
              <p className="font-hud text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                Unlocked themes stay yours forever · Switch any time
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
