import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/premium")({
  component: AdminPremiumPage,
});

type Plan = {
  id: number;
  duration_days: number;
  price_bac: number;
  benefits_text: string | null;
  is_active: boolean;
};

function AdminPremiumPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-premium-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premium_settings")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const [editing, setEditing] = useState<Partial<Plan> | null>(null);

  async function save() {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_save_premium_plan", {
      p_id: editing.id ?? null,
      p_duration_days: Number(editing.duration_days ?? 30),
      p_price_bac: Number(editing.price_bac ?? 0),
      p_benefits_text: editing.benefits_text ?? "",
      p_is_active: editing.is_active ?? true,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-premium-plans"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.rpc("admin_delete_premium_plan", { p_id: id });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-premium-plans"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">Premium Plans</h1>
        </div>
        <button
          onClick={() => setEditing({ duration_days: 30, price_bac: 1000, is_active: true })}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Plan
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((p) => (
          <div key={p.id} className="hud-panel space-y-2 p-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg text-gold">{p.duration_days} DAYS</div>
              <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${p.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {p.is_active ? "Active" : "Off"}
              </span>
            </div>
            <div className="font-hud text-sm text-foreground/80">{p.price_bac} BAC</div>
            <p className="text-xs text-foreground/60 whitespace-pre-line">{p.benefits_text}</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(p)} className="flex-1 rounded border border-border/60 px-2 py-1 font-hud text-[11px] uppercase tracking-widest hover:border-gold hover:text-gold">Edit</button>
              <button onClick={() => remove(p.id)} className="rounded border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <div className="hud-panel w-full max-w-md space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg uppercase tracking-wider text-gold">{editing.id ? "Edit" : "New"} Plan</h2>
            <label className="block text-xs uppercase text-foreground/60">Duration (days)
              <input type="number" className="hud-input mt-1 w-full" value={editing.duration_days ?? ""} onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">Price (BAC)
              <input type="number" className="hud-input mt-1 w-full" value={editing.price_bac ?? ""} onChange={(e) => setEditing({ ...editing, price_bac: Number(e.target.value) })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">Benefits
              <textarea rows={5} className="hud-input mt-1 w-full" value={editing.benefits_text ?? ""} onChange={(e) => setEditing({ ...editing, benefits_text: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded border border-border/60 px-3 py-2 font-hud text-xs uppercase">Cancel</button>
              <button onClick={save} className="flex-1 rounded border border-gold/60 bg-gold/10 px-3 py-2 font-hud text-xs uppercase text-gold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
