import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/spin-wheel")({
  component: AdminSpinWheelPage,
});

type Segment = {
  id: string;
  label: string;
  reward_type: string;
  reward_amount: number;
  weight: number;
  color: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

type Settings = {
  id: number;
  free_spins_per_day: number;
  spin_cost_bac: number;
  extra_spin_cost_bac: number;
  max_spins_per_day: number;
  is_enabled: boolean;
};

function AdminSpinWheelPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Segment>>({
    label: "",
    reward_type: "bac",
    reward_amount: 10,
    weight: 10,
    color: "#FFD700",
    icon: "🎁",
    is_active: true,
    sort_order: 99,
  });

  const settings = useQuery({
    queryKey: ["spin-settings-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("spin_settings").select("*").eq("id", 1).maybeSingle();
      return data as Settings | null;
    },
  });
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const effSettings = localSettings ?? settings.data;

  const segs = useQuery({
    queryKey: ["spin-segs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spin_wheel_config")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Segment[];
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase.from("spin_settings").update(s).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["spin-settings-admin"] });
      qc.invalidateQueries({ queryKey: ["spin-wheel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertSeg = useMutation({
    mutationFn: async (s: Partial<Segment>) => {
      const { error } = await supabase.from("spin_wheel_config").upsert(s as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segment saved");
      qc.invalidateQueries({ queryKey: ["spin-segs-admin"] });
      qc.invalidateQueries({ queryKey: ["spin-wheel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delSeg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("spin_wheel_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["spin-segs-admin"] });
    },
  });

  const totalWeight = (segs.data ?? [])
    .filter((s) => s.is_active)
    .reduce((a, s) => a + s.weight, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-gold">Spin Wheel</h1>
        <p className="text-sm text-foreground/60">
          Configure spin segments, probabilities and limits.
        </p>
      </div>

      {/* SETTINGS */}
      {effSettings && (
        <section className="hud-panel p-4">
          <h2 className="mb-3 font-hud text-sm uppercase tracking-widest text-gold">
            Spin Settings
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="block text-xs">
              <span className="text-foreground/60">Enabled</span>
              <input
                type="checkbox"
                checked={effSettings.is_enabled}
                onChange={(e) =>
                  setLocalSettings({ ...effSettings, is_enabled: e.target.checked })
                }
                className="ml-2"
              />
            </label>
            <label className="block text-xs">
              <span className="text-foreground/60">Free spins/day</span>
              <input
                type="number"
                value={effSettings.free_spins_per_day}
                onChange={(e) =>
                  setLocalSettings({
                    ...effSettings,
                    free_spins_per_day: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
              />
            </label>
            <label className="block text-xs">
              <span className="text-foreground/60">Extra spin cost (BAC)</span>
              <input
                type="number"
                value={effSettings.extra_spin_cost_bac}
                onChange={(e) =>
                  setLocalSettings({
                    ...effSettings,
                    extra_spin_cost_bac: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
              />
            </label>
            <label className="block text-xs">
              <span className="text-foreground/60">Max spins/day</span>
              <input
                type="number"
                value={effSettings.max_spins_per_day}
                onChange={(e) =>
                  setLocalSettings({
                    ...effSettings,
                    max_spins_per_day: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
              />
            </label>
            <button
              onClick={() => effSettings && saveSettings.mutate(effSettings)}
              className="btn-gamey self-end px-4 py-2 text-xs"
            >
              <Save className="mr-1 inline h-3 w-3" /> Save Settings
            </button>
          </div>
        </section>
      )}

      {/* ADD SEGMENT */}
      <section className="hud-panel p-4">
        <h2 className="mb-3 font-hud text-sm uppercase tracking-widest text-gold">
          Add Segment
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <input
            placeholder="Label"
            value={draft.label ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Icon"
            value={draft.icon ?? ""}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <select
            value={draft.reward_type}
            onChange={(e) => setDraft({ ...draft, reward_type: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="bac">BAC Coin</option>
            <option value="nothing">Nothing</option>
            <option value="bonus">Bonus</option>
          </select>
          <input
            type="number"
            placeholder="Amount"
            value={draft.reward_amount ?? 0}
            onChange={(e) =>
              setDraft({ ...draft, reward_amount: Number(e.target.value) })
            }
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Weight (probability)"
            value={draft.weight ?? 10}
            onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="color"
            value={draft.color ?? "#FFD700"}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            className="h-9 w-full rounded border border-border bg-background"
          />
        </div>
        <button
          onClick={() => {
            if (!draft.label) return toast.error("Label required");
            upsertSeg.mutate(draft);
            setDraft({
              label: "",
              reward_type: "bac",
              reward_amount: 10,
              weight: 10,
              color: "#FFD700",
              icon: "🎁",
              is_active: true,
              sort_order: 99,
            });
          }}
          className="btn-gamey mt-3 px-4 py-2 text-xs"
        >
          <Plus className="mr-1 inline h-3 w-3" /> Add Segment
        </button>
      </section>

      {/* SEGMENTS LIST */}
      <section className="hud-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-hud text-sm uppercase tracking-widest text-gold">Segments</h2>
          <span className="font-mono text-[11px] text-foreground/60">
            Total weight: {totalWeight}
          </span>
        </div>
        {segs.isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="font-mono uppercase tracking-widest text-foreground/55">
                <tr className="border-b border-border/40">
                  <th className="py-2 text-left">Color</th>
                  <th className="text-left">Icon</th>
                  <th className="text-left">Label</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right">Chance</th>
                  <th className="text-center">Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(segs.data ?? []).map((s) => (
                  <SegRow
                    key={s.id}
                    seg={s}
                    totalWeight={totalWeight}
                    onSave={upsertSeg.mutate}
                    onDelete={delSeg.mutate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SegRow({
  seg,
  totalWeight,
  onSave,
  onDelete,
}: {
  seg: Segment;
  totalWeight: number;
  onSave: (s: Segment) => void;
  onDelete: (id: string) => void;
}) {
  const [s, setS] = useState(seg);
  const chance =
    totalWeight > 0 ? ((s.weight / totalWeight) * 100).toFixed(1) : "0.0";
  return (
    <tr className="border-b border-border/20">
      <td className="py-2">
        <input
          type="color"
          value={s.color}
          onChange={(e) => setS({ ...s, color: e.target.value })}
          className="h-7 w-10 rounded border border-border bg-background"
        />
      </td>
      <td>
        <input
          value={s.icon ?? ""}
          onChange={(e) => setS({ ...s, icon: e.target.value })}
          className="w-10 rounded border border-border bg-background px-1 py-0.5 text-center"
        />
      </td>
      <td>
        <input
          value={s.label}
          onChange={(e) => setS({ ...s, label: e.target.value })}
          className="w-36 rounded border border-border bg-background px-2 py-0.5"
        />
      </td>
      <td>
        <select
          value={s.reward_type}
          onChange={(e) => setS({ ...s, reward_type: e.target.value })}
          className="rounded border border-border bg-background px-1 py-0.5"
        >
          <option value="bac">BAC</option>
          <option value="nothing">Nothing</option>
          <option value="bonus">Bonus</option>
        </select>
      </td>
      <td className="text-right">
        <input
          type="number"
          value={s.reward_amount}
          onChange={(e) => setS({ ...s, reward_amount: Number(e.target.value) })}
          className="w-20 rounded border border-border bg-background px-1 py-0.5 text-right"
        />
      </td>
      <td className="text-right">
        <input
          type="number"
          value={s.weight}
          onChange={(e) => setS({ ...s, weight: Number(e.target.value) })}
          className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
        />
      </td>
      <td className="text-right font-mono text-gold">{chance}%</td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={s.is_active}
          onChange={(e) => setS({ ...s, is_active: e.target.checked })}
        />
      </td>
      <td className="flex gap-1 py-2">
        <button
          onClick={() => onSave(s)}
          className="rounded border border-emerald-500/40 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10"
        >
          <Save size={12} />
        </button>
        <button
          onClick={() => {
            if (confirm("Delete segment?")) onDelete(s.id);
          }}
          className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}
