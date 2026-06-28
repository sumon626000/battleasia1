import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";
import type { ThemeConfig } from "@/lib/themes";

export const Route = createFileRoute("/_admin/admin/themes")({
  component: ThemesAdmin,
});

function ThemesAdmin() {
  const qc = useQueryClient();

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["admin_theme_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("theme_config").select("*").order("sort_order");
      if (error) throw error;
      return data as ThemeConfig[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin_theme_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_theme_purchases")
        .select("theme_id, price_paid_bac");
      if (error) throw error;
      const map: Record<string, { count: number; total: number }> = {};
      (data ?? []).forEach((r: any) => {
        const t = r.theme_id as string;
        if (!map[t]) map[t] = { count: 0, total: 0 };
        map[t].count += 1;
        map[t].total += Number(r.price_paid_bac ?? 0);
      });
      return map;
    },
  });

  const [edits, setEdits] = useState<Record<string, Partial<ThemeConfig>>>({});

  function patch(id: string, p: Partial<ThemeConfig>) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...p } }));
  }

  const saveMut = useMutation({
    mutationFn: async (t: ThemeConfig) => {
      const merged = { ...t, ...edits[t.id] };
      const { error } = await supabase.rpc("admin_save_theme", {
        p_payload: {
          id: merged.id,
          name: merged.name,
          description: merged.description,
          preview_color: merged.preview_color,
          price_bac: Number(merged.price_bac),
          is_active: merged.is_active,
          sort_order: Number(merged.sort_order),
        },
      });
      if (error) throw error;
    },
    onSuccess: (_d, t) => {
      toast.success(`${t.name} saved`);
      setEdits((e) => {
        const c = { ...e };
        delete c[t.id];
        return c;
      });
      qc.invalidateQueries({ queryKey: ["admin_theme_config"] });
      qc.invalidateQueries({ queryKey: ["theme_config"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-gold/40 bg-gold/10 text-gold">
          <Palette size={18} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-gold">
            Themes
          </h1>
          <p className="font-hud text-xs uppercase tracking-wider text-foreground/60">
            Manage UI themes, prices, and availability
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-foreground/60">Loading themes…</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {themes.map((t) => {
            const m = { ...t, ...edits[t.id] };
            const s = stats?.[t.id];
            const dirty = !!edits[t.id];
            return (
              <div
                key={t.id}
                className="hud-panel space-y-3 p-4"
                style={{ borderColor: `${m.preview_color}66` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 shrink-0 rounded-md border border-white/10"
                      style={{
                        background: `linear-gradient(135deg, ${m.preview_color}, #111)`,
                        boxShadow: `0 0 12px ${m.preview_color}88`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-bold uppercase tracking-wider">
                        {m.name}
                      </div>
                      <div className="font-mono text-[10px] text-foreground/50">id: {t.id}</div>
                    </div>
                  </div>
                  {t.is_default && (
                    <span className="rounded border border-gold/40 bg-gold/10 px-2 py-0.5 font-hud text-[10px] font-bold uppercase text-gold">
                      Default
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                      Name
                    </span>
                    <input
                      className="hud-input"
                      value={m.name ?? ""}
                      onChange={(e) => patch(t.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                      Color (hex)
                    </span>
                    <input
                      className="hud-input"
                      value={m.preview_color ?? ""}
                      onChange={(e) => patch(t.id, { preview_color: e.target.value })}
                    />
                  </label>
                  <label className="col-span-2 space-y-1">
                    <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                      Description
                    </span>
                    <input
                      className="hud-input"
                      value={m.description ?? ""}
                      onChange={(e) => patch(t.id, { description: e.target.value })}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="flex items-center gap-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                      Price <CoinIcon size={10} />
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="hud-input"
                      value={m.price_bac ?? 0}
                      disabled={t.is_default}
                      onChange={(e) => patch(t.id, { price_bac: Number(e.target.value) as any })}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                      Sort order
                    </span>
                    <input
                      type="number"
                      className="hud-input"
                      value={m.sort_order ?? 0}
                      onChange={(e) => patch(t.id, { sort_order: Number(e.target.value) as any })}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!m.is_active}
                    onChange={(e) => patch(t.id, { is_active: e.target.checked })}
                  />
                  <span className="font-hud text-xs uppercase tracking-wider">
                    Active (visible to users)
                  </span>
                </label>

                <div className="flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="font-hud text-[11px] text-foreground/70">
                    <span className="text-foreground/50 uppercase tracking-wider">Purchases:</span>{" "}
                    <span className="font-mono text-gold">{s?.count ?? 0}</span>
                    <span className="mx-2 text-foreground/30">·</span>
                    <span className="text-foreground/50 uppercase tracking-wider">Earned:</span>{" "}
                    <CoinIcon size={11} />
                    <span className="font-mono text-gold">{(s?.total ?? 0).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => saveMut.mutate(t)}
                    disabled={!dirty || saveMut.isPending}
                    className="btn-gold inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <Save size={12} /> Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
