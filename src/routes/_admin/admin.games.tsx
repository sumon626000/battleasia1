import { useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gamepad2, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/games")({
  component: AdminGamesPage,
});

type Game = {
  id: number;
  game_name: string;
  package_name: string | null;
  image_url: string | null;
  id_prefix: string | null;
  can_create_match: boolean;
  status: "active" | "inactive";
  coming_soon: boolean;
  sort_order: number;
  live_stream_url: string | null;
  deleted_at: string | null;
};

function AdminGamesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Game> | null>(null);

  const q = useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Game[];
    },
  });

  async function save() {
    if (!editing) return;
    if (!editing.game_name) return toast.error("Name required");
    const payload = {
      game_name: editing.game_name,
      package_name: editing.package_name ?? null,
      image_url: editing.image_url ?? null,
      id_prefix: editing.id_prefix ?? null,
      can_create_match: editing.can_create_match ?? true,
      status: (editing.status ?? "active") as "active" | "inactive",
      coming_soon: editing.coming_soon ?? false,
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("games").update(payload).eq("id", editing.id)
      : await supabase.from("games").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-games"] });
  }

  async function softDelete(id: number) {
    if (!confirm("Delete this game?")) return;
    const { error } = await supabase
      .from("games")
      .update({ deleted_at: new Date().toISOString(), status: "inactive" as const })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-games"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-widest text-gold">Game Management</h1>
        </div>
        <button onClick={() => setEditing({})} className="btn-tactical inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase">
          <Plus className="h-3.5 w-3.5" /> New Game
        </button>
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-card/60 font-hud text-[11px] uppercase tracking-widest text-foreground/70">
            <tr>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Package</th>
              <th className="p-2 text-left">ID Prefix</th>
              <th className="p-2 text-center">Create Match</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Coming Soon</th>
              <th className="p-2 text-right">Sort</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr><td colSpan={9} className="p-6 text-center text-foreground/60">Loading...</td></tr>
            )}
            {q.data?.map((g) => (
              <tr key={g.id} className="border-t border-border/40">
                <td className="p-2">
                  {g.image_url ? (
                    <img loading="lazy" decoding="async" src={g.image_url} alt="" className="h-10 w-10 rounded border border-border/60 object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded border border-border/60 bg-card/60" />
                  )}
                </td>
                <td className="p-2 font-display">{g.game_name}</td>
                <td className="p-2 font-hud text-[11px] text-foreground/70">{g.package_name}</td>
                <td className="p-2 font-hud text-[11px] text-foreground/70">{g.id_prefix}</td>
                <td className="p-2 text-center">
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${g.can_create_match ? "bg-emerald-500/20 text-emerald-400" : "bg-foreground/10 text-foreground/60"}`}>
                    {g.can_create_match ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${g.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"}`}>
                    {g.status}
                  </span>
                </td>
                <td className="p-2 text-center">
                  {g.coming_soon && <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] uppercase text-gold">Soon</span>}
                </td>
                <td className="p-2 text-right font-mono">{g.sort_order}</td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(g)} className="rounded border border-border/60 p-1.5 hover:border-gold hover:text-gold">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => softDelete(g.id)} className="rounded border border-destructive/60 p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!q.isLoading && q.data?.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-foreground/60">No games.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="hud-panel w-full max-w-lg p-5">
            <h2 className="mb-4 font-display text-lg uppercase tracking-widest text-gold">
              {editing.id ? "Edit Game" : "New Game"}
            </h2>
            <div className="grid gap-3">
              <Field label="Name">
                <input value={editing.game_name ?? ""} onChange={(e) => setEditing({ ...editing, game_name: e.target.value })} className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm" />
              </Field>
              <Field label="Package Name">
                <input value={editing.package_name ?? ""} onChange={(e) => setEditing({ ...editing, package_name: e.target.value })} className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm" />
              </Field>
              <Field label="Image">
                <ImageUploader value={editing.image_url} onChange={(u) => setEditing({ ...editing, image_url: u })} folder="games" aspect="1/1" maxSize={512} />
              </Field>
              <Field label="ID Prefix">
                <input value={editing.id_prefix ?? ""} onChange={(e) => setEditing({ ...editing, id_prefix: e.target.value })} className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm" />
              </Field>
              <Field label="Sort Order">
                <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm" />
              </Field>
              <Field label="Status">
                <select value={editing.status ?? "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value as "active" | "inactive" })} className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <div className="flex flex-wrap gap-4">
                <Checkbox label="Can Create Match" checked={editing.can_create_match ?? true} onChange={(v) => setEditing({ ...editing, can_create_match: v })} />
                <Checkbox label="Coming Soon" checked={editing.coming_soon ?? false} onChange={(v) => setEditing({ ...editing, coming_soon: v })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border border-border/60 px-3 py-1.5 font-hud text-xs uppercase">
                Cancel
              </button>
              <button onClick={save} className="btn-tactical px-4 py-1.5 text-xs uppercase">
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
    <label className="block">
      <span className="mb-1 block font-hud text-[10px] uppercase tracking-widest text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 font-hud text-xs uppercase tracking-wider">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
