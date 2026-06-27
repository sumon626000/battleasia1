import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, Plus, Pencil, Trash2, Download, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/apk")({
  component: AdminApkPage,
});

const BUCKET = "apk-files";

function formatSize(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

type Apk = {
  id: number;
  app_name: string;
  version_name: string;
  version_code: number;
  apk_file_url: string;
  file_size_bytes: number;
  changelog: string | null;
  force_update: boolean;
  is_active: boolean;
  download_count: number;
};

function AdminApkPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Apk> | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const q = useQuery({
    queryKey: ["admin-apk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apk_versions")
        .select("*")
        .is("deleted_at", null)
        .order("version_code", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Apk[];
    },
  });

  async function save() {
    if (!editing) return;
    const payload = {
      app_name: editing.app_name ?? "BattleAsia",
      version_name: editing.version_name ?? "",
      version_code: Number(editing.version_code ?? 0),
      apk_file_url: editing.apk_file_url ?? "",
      file_size_bytes: Number(editing.file_size_bytes ?? 0),
      changelog: editing.changelog ?? null,
      force_update: editing.force_update ?? false,
      is_active: editing.is_active ?? false,
    };
    if (!payload.version_name || !payload.apk_file_url) return toast.error("Version + URL required");

    // If activating, deactivate others first
    if (payload.is_active) {
      await supabase.from("apk_versions").update({ is_active: false }).neq("id", editing.id ?? -1);
    }

    const res = editing.id
      ? await supabase.from("apk_versions").update(payload).eq("id", editing.id)
      : await supabase.from("apk_versions").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-apk"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete this version?")) return;
    const { error } = await supabase
      .from("apk_versions")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-apk"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <Smartphone className="mr-2 inline" size={20} /> APK Manager
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Android app versions & forced updates
          </p>
        </div>
        <button onClick={() => setEditing({ app_name: "BattleAsia", is_active: true, force_update: false })} className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold">
          <Plus size={14} /> New Version
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 font-hud text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 text-left">App</th>
              <th className="p-3 text-left">Version</th>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Downloads</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((a) => (
              <tr key={a.id} className="border-t border-border/50">
                <td className="p-3">{a.app_name}</td>
                <td className="p-3 font-semibold">{a.version_name}</td>
                <td className="p-3">{a.version_code}</td>
                <td className="p-3"><Download size={12} className="mr-1 inline" />{a.download_count}</td>
                <td className="p-3">
                  {a.is_active && <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Active</span>}
                  {a.force_update && <span className="ml-1 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">Force</span>}
                </td>
                <td className="p-3 text-right">
                  <a href={a.apk_file_url} target="_blank" rel="noreferrer" className="mr-2 text-blue-400"><Download size={14} className="inline" /></a>
                  <button onClick={() => setEditing(a)} className="mr-2 text-gold"><Pencil size={14} className="inline" /></button>
                  <button onClick={() => remove(a.id)} className="text-red-400"><Trash2 size={14} className="inline" /></button>
                </td>
              </tr>
            ))}
            {!q.data?.length && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No versions uploaded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-3 rounded border border-gold/40 bg-card p-6">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">{editing.id ? "Edit Version" : "New Version"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="App Name"><input className="hud-input" value={editing.app_name ?? ""} onChange={(e) => setEditing({ ...editing, app_name: e.target.value })} /></Field>
              <Field label="Version Name"><input className="hud-input" placeholder="1.0.0" value={editing.version_name ?? ""} onChange={(e) => setEditing({ ...editing, version_name: e.target.value })} /></Field>
              <Field label="Version Code"><input type="number" className="hud-input" value={editing.version_code ?? 0} onChange={(e) => setEditing({ ...editing, version_code: Number(e.target.value) })} /></Field>
              <Field label="Size (bytes)"><input type="number" className="hud-input" value={editing.file_size_bytes ?? 0} onChange={(e) => setEditing({ ...editing, file_size_bytes: Number(e.target.value) })} /></Field>
            </div>
            <Field label="APK File URL"><input className="hud-input" value={editing.apk_file_url ?? ""} onChange={(e) => setEditing({ ...editing, apk_file_url: e.target.value })} /></Field>
            <Field label="Changelog"><textarea rows={4} className="hud-input" value={editing.changelog ?? ""} onChange={(e) => setEditing({ ...editing, changelog: e.target.value })} /></Field>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.force_update ?? false} onChange={(e) => setEditing({ ...editing, force_update: e.target.checked })} /> Force Update</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
