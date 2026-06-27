import { useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/channels")({
  component: AdminChannelsPage,
});

type Channel = {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function AdminChannelsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);

  const q = useQuery({
    queryKey: ["admin-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_channels")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Channel[];
    },
  });

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name ?? "",
      description: editing.description ?? null,
      icon_url: editing.icon_url ?? null,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    if (!payload.name) return toast.error("Name required");
    const res = editing.id
      ? await supabase.from("payment_channels").update(payload).eq("id", editing.id)
      : await supabase.from("payment_channels").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-channels"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete this channel?")) return;
    const { error } = await supabase
      .from("payment_channels")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-channels"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <Wallet className="mr-2 inline" size={20} /> Payment Channels
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Manage deposit / withdrawal channels
          </p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, sort_order: 0 })}
          className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Channel
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 font-hud text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Sort</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((c) => (
              <tr key={c.id} className="border-t border-border/50">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.description ?? "—"}</td>
                <td className="p-3">{c.sort_order}</td>
                <td className="p-3">
                  <span className={c.is_active ? "text-green-400" : "text-muted-foreground"}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(c)} className="mr-2 text-gold hover:underline">
                    <Pencil size={14} className="inline" />
                  </button>
                  <button onClick={() => remove(c.id)} className="text-red-400 hover:underline">
                    <Trash2 size={14} className="inline" />
                  </button>
                </td>
              </tr>
            ))}
            {!q.data?.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No channels yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-4 rounded border border-gold/40 bg-card p-6">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">
              {editing.id ? "Edit Channel" : "New Channel"}
            </h2>
            <Field label="Name">
              <input
                className="hud-input"
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <input
                className="hud-input"
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <Field label="Icon">
              <ImageUploader
                value={editing.icon_url}
                onChange={(u) => setEditing({ ...editing, icon_url: u })}
                folder="channels"
                aspect="1/1"
                maxSize={512}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort">
                <input
                  type="number"
                  className="hud-input"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
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
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded border border-border px-4 py-2 text-sm">
                Cancel
              </button>
              <button onClick={save} className="rounded border border-gold bg-gold/20 px-4 py-2 text-sm text-gold">
                Save
              </button>
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
