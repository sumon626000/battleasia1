import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/settings")({
  component: AdminSettingsPage,
});

type Setting = {
  id: number;
  key: string;
  value: string | null;
  type: "string" | "number" | "boolean" | "json";
  label: string | null;
};

function AdminSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .order("key");
      if (error) throw error;
      return (data ?? []) as Setting[];
    },
  });

  const [local, setLocal] = useState<Record<number, string>>({});
  useEffect(() => {
    if (q.data) {
      const m: Record<number, string> = {};
      q.data.forEach((s) => (m[s.id] = s.value ?? ""));
      setLocal(m);
    }
  }, [q.data]);

  async function saveOne(s: Setting) {
    const { error } = await supabase
      .from("website_settings")
      .update({ value: local[s.id] ?? null })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`${s.key} saved`);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }

  async function addNew() {
    const key = prompt("Setting key (e.g. site_name)");
    if (!key) return;
    const { error } = await supabase
      .from("website_settings")
      .insert({ key, value: "", type: "string", label: key });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete this setting?")) return;
    const { error } = await supabase.from("website_settings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <Settings className="mr-2 inline" size={20} /> Website Settings
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Global key/value configuration
          </p>
        </div>
        <button onClick={addNew} className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold">
          <Plus size={14} /> Add Setting
        </button>
      </div>

      <div className="space-y-3">
        {q.data?.map((s) => (
          <div key={s.id} className="rounded border border-border/70 bg-card/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-mono text-sm text-gold">{s.key}</div>
                {s.label && <div className="text-xs text-muted-foreground">{s.label}</div>}
              </div>
              <span className="font-hud text-xs uppercase tracking-widest text-muted-foreground">{s.type}</span>
            </div>
            <div className="flex gap-2">
              {s.type === "json" ? (
                <textarea
                  rows={3}
                  className="hud-input font-mono text-xs"
                  value={local[s.id] ?? ""}
                  onChange={(e) => setLocal({ ...local, [s.id]: e.target.value })}
                />
              ) : (
                <input
                  className="hud-input"
                  value={local[s.id] ?? ""}
                  onChange={(e) => setLocal({ ...local, [s.id]: e.target.value })}
                />
              )}
              <button onClick={() => saveOne(s)} className="rounded border border-gold bg-gold/20 px-4 py-2 text-sm text-gold">
                Save
              </button>
              <button onClick={() => remove(s.id)} className="rounded border border-red-500/40 px-3 text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!q.data?.length && (
          <div className="rounded border border-border/70 p-8 text-center text-muted-foreground">
            No settings configured.
          </div>
        )}
      </div>
    </div>
  );
}
