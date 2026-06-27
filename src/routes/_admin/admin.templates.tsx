import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/templates")({
  component: AdminTemplatesPage,
});

type Tpl = {
  id: number;
  slug: string;
  title_template: string | null;
  message_template: string | null;
  email_subject: string | null;
  email_body_html: string | null;
  is_email_enabled: boolean;
  is_inapp_enabled: boolean;
};

function AdminTemplatesPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("slug");
      if (error) throw error;
      return (data ?? []) as Tpl[];
    },
  });

  const [editing, setEditing] = useState<Partial<Tpl> | null>(null);

  async function save() {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_save_notification_template", {
      p_id: (editing.id ?? null) as number,
      p_payload: {
        slug: editing.slug,
        title_template: editing.title_template,
        message_template: editing.message_template,
        email_subject: editing.email_subject,
        email_body_html: editing.email_body_html,
        is_email_enabled: editing.is_email_enabled ?? false,
        is_inapp_enabled: editing.is_inapp_enabled ?? true,
      },
    });
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-templates"] });
  }

  async function remove(id: number) {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.rpc("admin_delete_notification_template", { p_id: id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-templates"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">Notification Templates</h1>
        </div>
        <button
          onClick={() => setEditing({ is_inapp_enabled: true, is_email_enabled: false })}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      <div className="hud-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">In-App</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((t) => (
              <tr key={t.id} className="border-t border-border/30">
                <td className="px-3 py-2 font-mono text-xs text-gold">{t.slug}</td>
                <td className="px-3 py-2">{t.title_template}</td>
                <td className="px-3 py-2">{t.is_inapp_enabled ? "✓" : "—"}</td>
                <td className="px-3 py-2">{t.is_email_enabled ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(t)} className="mr-2 text-xs text-gold hover:underline">Edit</button>
                  <button onClick={() => remove(t.id)} className="text-red-400"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-foreground/50">No templates yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <div className="hud-panel w-full max-w-2xl space-y-3 p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg uppercase tracking-wider text-gold">{editing.id ? "Edit" : "New"} Template</h2>
            <label className="block text-xs uppercase text-foreground/60">Slug
              <input className="hud-input mt-1 w-full" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">In-App Title
              <input className="hud-input mt-1 w-full" value={editing.title_template ?? ""} onChange={(e) => setEditing({ ...editing, title_template: e.target.value })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">In-App Message
              <textarea rows={3} className="hud-input mt-1 w-full" value={editing.message_template ?? ""} onChange={(e) => setEditing({ ...editing, message_template: e.target.value })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">Email Subject
              <input className="hud-input mt-1 w-full" value={editing.email_subject ?? ""} onChange={(e) => setEditing({ ...editing, email_subject: e.target.value })} />
            </label>
            <label className="block text-xs uppercase text-foreground/60">Email Body (HTML)
              <textarea rows={6} className="hud-input mt-1 w-full font-mono text-xs" value={editing.email_body_html ?? ""} onChange={(e) => setEditing({ ...editing, email_body_html: e.target.value })} />
            </label>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_inapp_enabled} onChange={(e) => setEditing({ ...editing, is_inapp_enabled: e.target.checked })} /> In-App</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_email_enabled} onChange={(e) => setEditing({ ...editing, is_email_enabled: e.target.checked })} /> Email</label>
            </div>
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
