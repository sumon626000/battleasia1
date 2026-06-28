import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/chatbot")({
  component: AdminChatbotPage,
});

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5",
];

function AdminChatbotPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["admin-chatbot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const kbQ = useQuery({
    queryKey: ["admin-chatbot-kb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_knowledge")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (settingsQ.data) setForm(settingsQ.data);
  }, [settingsQ.data]);

  async function saveSettings() {
    if (!form) return;
    const { error } = await supabase
      .from("chatbot_settings")
      .update({
        enabled: form.enabled,
        model: form.model,
        system_prompt: form.system_prompt,
        welcome_message: form.welcome_message,
        bubble_title: form.bubble_title,
        rate_limit_per_hour: form.rate_limit_per_hour,
      })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Chatbot settings saved");
    qc.invalidateQueries({ queryKey: ["admin-chatbot-settings"] });
    qc.invalidateQueries({ queryKey: ["chatbot_settings_public"] });
  }

  async function addKb() {
    const { error } = await supabase
      .from("chatbot_knowledge")
      .insert({ question: "New question", answer: "Answer here", sort_order: kbQ.data?.length ?? 0 });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-chatbot-kb"] });
  }

  async function updateKb(id: string, patch: any) {
    const { error } = await supabase.from("chatbot_knowledge").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-chatbot-kb"] });
  }

  async function deleteKb(id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("chatbot_knowledge").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-chatbot-kb"] });
  }

  if (!form) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
          <Bot className="mr-2 inline" size={20} /> AI Chatbot
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
          Configure the public support assistant
        </p>
      </div>

      <div className="rounded border border-border/70 bg-card/40 p-4 space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span className="font-hud text-xs uppercase tracking-widest text-foreground/80">
            Enable chatbot site-wide
          </span>
        </label>

        <div>
          <label className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-muted-foreground">
            AI Model
          </label>
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="hud-input w-full"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-muted-foreground">
            Bubble title
          </label>
          <input
            className="hud-input w-full"
            value={form.bubble_title ?? ""}
            onChange={(e) => setForm({ ...form, bubble_title: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-muted-foreground">
            Welcome message
          </label>
          <textarea
            rows={2}
            className="hud-input w-full"
            value={form.welcome_message ?? ""}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-muted-foreground">
            System prompt (bot personality / instructions)
          </label>
          <textarea
            rows={8}
            className="hud-input w-full font-mono text-xs"
            value={form.system_prompt ?? ""}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          />
        </div>

        <button
          onClick={saveSettings}
          className="flex items-center gap-2 rounded border border-gold bg-gold/20 px-4 py-2 text-sm text-gold"
        >
          <Save size={14} /> Save settings
        </button>
      </div>

      <div className="rounded border border-border/70 bg-card/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">
            Knowledge base / FAQ
          </h2>
          <button
            onClick={addKb}
            className="flex items-center gap-1.5 rounded border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs text-gold"
          >
            <Plus size={12} /> Add entry
          </button>
        </div>
        <div className="space-y-3">
          {kbQ.data?.map((k) => (
            <KbRow key={k.id} item={k} onUpdate={updateKb} onDelete={deleteKb} />
          ))}
          {kbQ.data?.length === 0 && (
            <div className="rounded border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No knowledge entries yet. Add Q&A pairs the bot can use.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KbRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: any;
  onUpdate: (id: string, patch: any) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState(item.question);
  const [a, setA] = useState(item.answer);
  const [enabled, setEnabled] = useState(item.enabled);
  return (
    <div className="rounded border border-border/60 p-3 space-y-2">
      <input
        className="hud-input w-full text-sm font-semibold"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Question"
      />
      <textarea
        rows={3}
        className="hud-input w-full text-sm"
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="Answer"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(item.id, { question: q, answer: a, enabled })}
            className="rounded border border-gold/40 px-3 py-1 text-xs text-gold"
          >
            Save
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="rounded border border-destructive/40 px-2 py-1 text-destructive"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
