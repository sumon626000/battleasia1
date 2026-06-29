import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pages")({
  component: AdminPagesPage,
});

type Page = {
  id: number;
  slug: string;
  title: string;
  content_html: string;
};

function AdminPagesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Page> | null>(null);

  const q = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .order("slug");
      if (error) throw error;
      return (data ?? []) as Page[];
    },
  });

  async function save() {
    if (!editing) return;
    const payload = {
      slug: editing.slug ?? "",
      title: editing.title ?? "",
      content_html: editing.content_html ?? "",
    };
    if (!payload.slug || !payload.title) return toast.error("Slug + title required");
    const res = editing.id
      ? await supabase.from("static_pages").update(payload).eq("id", editing.id)
      : await supabase.from("static_pages").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-pages"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete page?")) return;
    const { error } = await supabase.from("static_pages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-pages"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
            <FileText className="mr-2 inline" size={20} /> Static Pages
          </h1>
          <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
            Terms, Privacy, About, Help, etc.
          </p>
        </div>
        <button onClick={() => setEditing({})} className="flex items-center gap-2 rounded border border-gold/50 bg-gold/10 px-3 py-2 font-hud text-xs uppercase tracking-widest text-gold">
          <Plus size={14} /> New Page
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 font-hud text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="p-3 font-mono text-xs text-gold">/p/{p.slug}</td>
                <td className="p-3">{p.title}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(p)} className="mr-2 text-gold"><Pencil size={14} className="inline" /></button>
                  <button onClick={() => remove(p.id)} className="text-red-400"><Trash2 size={14} className="inline" /></button>
                </td>
              </tr>
            ))}
            {!q.data?.length && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No pages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-3 rounded border border-gold/40 bg-card p-6">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">{editing.id ? "Edit Page" : "New Page"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug"><input className="hud-input" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
              <Field label="Title"><input className="hud-input" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            </div>
            <Field label="Content (HTML)"><textarea rows={14} className="hud-input font-mono text-xs" value={editing.content_html ?? ""} onChange={(e) => setEditing({ ...editing, content_html: e.target.value })} /></Field>
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
