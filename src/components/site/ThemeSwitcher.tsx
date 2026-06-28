import { useState } from "react";
import { Palette, X, Check, Lock, Sparkles } from "lucide-react";
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

  const activeTheme = ((profile as any)?.active_theme as string) || "amber";
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

  // Apply (already-owned) theme
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

  // Purchase locked theme
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
        className={`relative grid place-items-center rounded-md border border-border/70 transition hover:border-gold/60 hover:text-gold ${
          compact ? "h-9 w-9" : "h-9 px-2.5 gap-1.5 flex"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-background/85 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div className="hud-panel relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden border-gold/40 bg-card/95 p-3 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-gold" />
                  <h2 className="font-display text-base sm:text-xl font-bold uppercase tracking-widest text-gold">
                    Choose Theme
                  </h2>
                </div>
                <p className="mt-0.5 hidden sm:block font-hud text-[11px] uppercase tracking-wide text-foreground/60">
                  Unlock new battle aesthetics with BAC coins
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-md border border-border/70 p-1.5 hover:border-gold/60 hover:text-gold"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {isAuthenticated && (
              <div className="mt-2 flex items-center gap-1.5 font-hud text-[11px]">
                <span className="text-foreground/60 uppercase tracking-wider">Balance:</span>
                <CoinIcon size={12} />
                <span className="font-mono font-bold text-gold">{balance.toLocaleString()}</span>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 overflow-y-auto sm:mt-5 sm:grid-cols-3 sm:gap-3">
              {themes.map((t) => {
                const owned = isOwned(t);
                const active = t.id === activeTheme;
                const canAfford = balance >= t.price_bac;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleClick(t)}
                    disabled={applyMut.isPending || buyMut.isPending}
                    className={`group relative overflow-hidden rounded-lg border-2 p-2 text-left transition active:scale-[0.98] hover:scale-[1.02] disabled:opacity-60 sm:p-4 ${
                      active ? "border-gold" : "border-border/60 hover:border-gold/60"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${t.preview_color}22, transparent 70%)`,
                      boxShadow: active ? `0 0 24px ${t.preview_color}66` : undefined,
                    }}
                  >
                    {/* Preview swatch */}
                    <div
                      className="mb-2 h-12 rounded-md border border-white/10 sm:mb-3 sm:h-20"
                      style={{
                        background: `linear-gradient(135deg, ${t.preview_color}, ${t.preview_color}88, #111)`,
                        boxShadow: `inset 0 0 30px ${t.preview_color}44`,
                      }}
                    />
                    <div className="font-display text-xs sm:text-base font-bold uppercase tracking-wider truncate" style={{ color: t.preview_color }}>
                      {t.name}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 line-clamp-2 hidden sm:block font-hud text-[11px] text-foreground/60">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-2 sm:mt-3">
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded border border-gold/50 bg-gold/10 px-1.5 py-0.5 font-hud text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gold">
                          <Check size={10} /> Active
                        </span>
                      ) : owned ? (
                        <span className="inline-flex items-center gap-1 rounded border border-success/50 bg-success/10 px-1.5 py-0.5 font-hud text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-success">
                          Apply
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-hud text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                            canAfford
                              ? "border-gold/50 bg-gold/10 text-gold"
                              : "border-destructive/50 bg-destructive/10 text-destructive"
                          }`}
                        >
                          <Lock size={9} />
                          <CoinIcon size={9} />
                          {t.price_bac.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>


            {isAuthenticated && balance < 500 && (
              <div className="mt-4 text-center">
                <Link
                  to="/dashboard/vault"
                  onClick={() => setOpen(false)}
                  className="font-hud text-[11px] uppercase tracking-widest text-gold hover:underline"
                >
                  Need more BAC? Top up in the Vault →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
