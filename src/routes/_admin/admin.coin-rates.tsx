import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/coin-rates")({
  component: AdminCoinRatesPage,
});

type Rate = {
  id: number;
  region: string;
  currency: string;
  rate_per_coin: number;
  is_active: boolean;
};

function AdminCoinRatesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Rate> | null>(null);

  const q = useQuery({
    queryKey: ["admin-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_rates")
        .select("*")
        .order("currency");
      if (error) throw error;
      return (data ?? []) as Rate[];
    },
  });

  async function save() {
    if (!editing) return;
    const payload = {
      region: editing.region ?? "",
      currency: (editing.currency ?? "").toUpperCase(),
      rate_per_coin: Number(editing.rate_per_coin ?? 0),
      is_active: editing.is_active ?? true,
    };
    if (!payload.currency) return toast.error("Currency required");
    if (payload.rate_per_coin <= 0) return toast.error("Rate must be > 0");
    const res = editing.id
      ? await supabase.from("coin_rates").update(payload).eq("id", editing.id)
      : await supabase.from("coin_rates").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-rates"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <Coins className="mr-2 inline" size={20} /> Coin Rates
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Fiat ↔ BAC conversion rates
          </p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, region: "BD", currency: "BDT", rate_per_coin: 1 })}
          className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold"
        >
          <Plus size={14} /> New Rate
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 font-hud text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Region</th>
              <th className="p-3 text-left">Currency</th>
              <th className="p-3 text-left">Rate / BAC</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-3">{r.region}</td>
                <td className="p-3 font-semibold">{r.currency}</td>
                <td className="p-3">{r.rate_per_coin}</td>
                <td className="p-3">
                  <span className={r.is_active ? "text-green-400" : "text-muted-foreground"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(r)} className="text-gold">
                    <Pencil size={14} className="inline" />
                  </button>
                </td>
              </tr>
            ))}
            {!q.data?.length && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No rates configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-4 rounded border border-gold/40 bg-card p-6">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">
              {editing.id ? "Edit Rate" : "New Rate"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Region (e.g. BD, IN)">
                <input
                  className="hud-input"
                  value={editing.region ?? ""}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Currency (e.g. BDT)">
                <input
                  className="hud-input"
                  value={editing.currency ?? ""}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <Field label="Fiat per 1 BAC">
              <input
                type="number"
                step="0.0001"
                className="hud-input"
                value={editing.rate_per_coin ?? 0}
                onChange={(e) => setEditing({ ...editing, rate_per_coin: Number(e.target.value) })}
              />
            </Field>
            <Field label="Active">
              <select
                className="hud-input"
                value={editing.is_active ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border border-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={save} className="rounded border border-gold bg-gold/20 px-4 py-2 text-sm text-gold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-hud text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
