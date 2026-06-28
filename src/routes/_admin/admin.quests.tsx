import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/quests")({
  component: AdminQuestsPage,
});

type Quest = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  quest_type: string;
  target_value: number;
  reward_bac: number;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

const QUEST_TYPES = [
  { value: "login", label: "Daily Login" },
  { value: "play_match", label: "Play Match" },
  { value: "win_match", label: "Win Match" },
  { value: "kills", label: "Get Kills" },
  { value: "deposit", label: "Deposit" },
  { value: "feed_post", label: "Feed Post" },
  { value: "referral", label: "Referral" },
  { value: "spin", label: "Spin Wheel" },
];

function AdminQuestsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Quest>>({
    code: "",
    title: "",
    quest_type: "play_match",
    target_value: 1,
    reward_bac: 10,
    icon: "🎯",
    is_active: true,
    sort_order: 99,
  });

  const quests = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quests")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Quest[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (q: Partial<Quest>) => {
      const { error } = await supabase.from("daily_quests").upsert(q as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quest saved");
      qc.invalidateQueries({ queryKey: ["admin-quests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_quests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quest deleted");
      qc.invalidateQueries({ queryKey: ["admin-quests"] });
    },
  });

  function createNew() {
    if (!draft.code || !draft.title) {
      toast.error("Code and Title are required");
      return;
    }
    upsert.mutate(draft);
    setDraft({
      code: "",
      title: "",
      quest_type: "play_match",
      target_value: 1,
      reward_bac: 10,
      icon: "🎯",
      is_active: true,
      sort_order: 99,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-gold">Daily Quests</h1>
        <p className="text-sm text-foreground/60">
          Configure tasks players complete daily for BAC rewards.
        </p>
      </div>

      {/* CREATE */}
      <section className="hud-panel p-4">
        <h2 className="mb-3 font-hud text-sm uppercase tracking-widest text-gold">
          Add New Quest
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            placeholder="code (e.g. play_3_matches)"
            value={draft.code ?? ""}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Title"
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <select
            value={draft.quest_type}
            onChange={(e) => setDraft({ ...draft, quest_type: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            {QUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Icon (emoji)"
            value={draft.icon ?? ""}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Target"
            value={draft.target_value ?? 1}
            onChange={(e) =>
              setDraft({ ...draft, target_value: Number(e.target.value) })
            }
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Reward BAC"
            value={draft.reward_bac ?? 0}
            onChange={(e) =>
              setDraft({ ...draft, reward_bac: Number(e.target.value) })
            }
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Description (optional)"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="col-span-2 rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <button onClick={createNew} className="btn-gamey mt-3 px-4 py-2 text-xs">
          <Plus className="mr-1 inline h-3 w-3" /> Add Quest
        </button>
      </section>

      {/* LIST */}
      <section className="hud-panel p-4">
        <h2 className="mb-3 font-hud text-sm uppercase tracking-widest text-gold">
          Existing Quests
        </h2>
        {quests.isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="font-mono uppercase tracking-widest text-foreground/55">
                <tr className="border-b border-border/40">
                  <th className="py-2 text-left">Icon</th>
                  <th className="text-left">Title</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">Reward</th>
                  <th className="text-center">Active</th>
                  <th className="text-right">Order</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(quests.data ?? []).map((q) => (
                  <QuestRow key={q.id} quest={q} onSave={upsert.mutate} onDelete={del.mutate} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function QuestRow({
  quest,
  onSave,
  onDelete,
}: {
  quest: Quest;
  onSave: (q: Quest) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState(quest);
  return (
    <tr className="border-b border-border/20">
      <td className="py-2">
        <input
          value={q.icon ?? ""}
          onChange={(e) => setQ({ ...q, icon: e.target.value })}
          className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center"
        />
      </td>
      <td>
        <input
          value={q.title}
          onChange={(e) => setQ({ ...q, title: e.target.value })}
          className="w-40 rounded border border-border bg-background px-2 py-0.5"
        />
      </td>
      <td>
        <select
          value={q.quest_type}
          onChange={(e) => setQ({ ...q, quest_type: e.target.value })}
          className="rounded border border-border bg-background px-1 py-0.5"
        >
          {QUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </td>
      <td className="text-right">
        <input
          type="number"
          value={q.target_value}
          onChange={(e) => setQ({ ...q, target_value: Number(e.target.value) })}
          className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
        />
      </td>
      <td className="text-right">
        <input
          type="number"
          value={q.reward_bac}
          onChange={(e) => setQ({ ...q, reward_bac: Number(e.target.value) })}
          className="w-20 rounded border border-border bg-background px-1 py-0.5 text-right"
        />
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={q.is_active}
          onChange={(e) => setQ({ ...q, is_active: e.target.checked })}
        />
      </td>
      <td className="text-right">
        <input
          type="number"
          value={q.sort_order}
          onChange={(e) => setQ({ ...q, sort_order: Number(e.target.value) })}
          className="w-14 rounded border border-border bg-background px-1 py-0.5 text-right"
        />
      </td>
      <td className="flex gap-1 py-2">
        <button
          onClick={() => onSave(q)}
          className="rounded border border-emerald-500/40 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10"
        >
          <Save size={12} />
        </button>
        <button
          onClick={() => {
            if (confirm("Delete quest?")) onDelete(q.id);
          }}
          className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}
