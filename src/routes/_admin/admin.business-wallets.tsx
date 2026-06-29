import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/business-wallets")({
  component: AdminBusinessWalletsPage,
});

type BW = {
  id: number;
  payment_channel_id: number;
  wallet_address: string;
  currency: string;
  instruction: string | null;
  is_active: boolean;
};
type Channel = { id: number; name: string };

function AdminBusinessWalletsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BW> | null>(null);

  const channels = useQuery({
    queryKey: ["admin-channels-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_channels")
        .select("id,name")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Channel[];
    },
  });

  const q = useQuery({
    queryKey: ["admin-bw"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_wallets")
        .select("*, payment_channels(name)")
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save() {
    if (!editing) return;
    const payload = {
      payment_channel_id: editing.payment_channel_id!,
      wallet_address: editing.wallet_address ?? "",
      currency: editing.currency ?? "BDT",
      instruction: editing.instruction ?? null,
      is_active: editing.is_active ?? true,
    };
    if (!payload.payment_channel_id) return toast.error("Channel required");
    if (!payload.wallet_address) return toast.error("Address required");
    const res = editing.id
      ? await supabase.from("business_wallets").update(payload).eq("id", editing.id)
      : await supabase.from("business_wallets").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-bw"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete wallet?")) return;
    const { error } = await supabase
      .from("business_wallets")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bw"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <Wallet className="mr-2 inline" size={20} /> Business Wallets
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Receiving addresses per channel
          </p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, currency: "BDT" })}
          className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold"
        >
          <Plus size={14} /> New Wallet
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 font-hud text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Channel</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-left">Currency</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((w: any) => (
              <tr key={w.id} className="border-t border-border/50">
                <td className="p-3">{w.payment_channels?.name ?? `#${w.payment_channel_id}`}</td>
                <td className="p-3 font-mono text-xs">{w.wallet_address}</td>
                <td className="p-3">{w.currency}</td>
                <td className="p-3">
                  <span className={w.is_active ? "text-green-400" : "text-muted-foreground"}>
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(w)} className="mr-2 text-gold">
                    <Pencil size={14} className="inline" />
                  </button>
                  <button onClick={() => remove(w.id)} className="text-red-400">
                    <Trash2 size={14} className="inline" />
                  </button>
                </td>
              </tr>
            ))}
            {!q.data?.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No wallets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 rounded border border-gold/40 bg-card p-6">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">
              {editing.id ? "Edit Wallet" : "New Wallet"}
            </h2>
            <Field label="Channel">
              <select
                className="hud-input"
                value={editing.payment_channel_id ?? ""}
                onChange={(e) => setEditing({ ...editing, payment_channel_id: Number(e.target.value) })}
              >
                <option value="">Select channel…</option>
                {channels.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Wallet Address / Number">
              <input
                className="hud-input"
                value={editing.wallet_address ?? ""}
                onChange={(e) => setEditing({ ...editing, wallet_address: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency">
                <input
                  className="hud-input"
                  value={editing.currency ?? ""}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })}
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
            </div>
            <Field label="Instruction">
              <textarea
                className="hud-input"
                rows={3}
                value={editing.instruction ?? ""}
                onChange={(e) => setEditing({ ...editing, instruction: e.target.value })}
              />
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
