import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/withdraw-config")({
  component: AdminWithdrawConfigPage,
});

type Cfg = {
  id: number;
  min_bac: number;
  max_bac: number;
  withdraw_percentage: number;
  fee_type: "none" | "fixed" | "percentage";
  fee_value: number;
};

function AdminWithdrawConfigPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-wd-cfg"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdraw_configs")
        .select("*")
        .order("id")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Cfg | null;
    },
  });

  const [form, setForm] = useState<Partial<Cfg>>({});
  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  async function save() {
    const payload = {
      id: 1,
      min_bac: Number(form.min_bac ?? 0),
      max_bac: Number(form.max_bac ?? 0),
      withdraw_percentage: Number(form.withdraw_percentage ?? 70),
      fee_type: (form.fee_type ?? "none") as Cfg["fee_type"],
      fee_value: Number(form.fee_value ?? 0),
    };
    const { error } = await supabase
      .from("withdraw_configs")
      .upsert(payload, { onConflict: "id" });
    if (error) return toast.error(error.message);
    toast.success("Configuration saved");
    qc.invalidateQueries({ queryKey: ["admin-wd-cfg"] });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold">
          <Settings2 className="mr-2 inline" size={20} /> Withdraw Configuration
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-muted-foreground">
          Limits, fees, withdrawable percentage
        </p>
      </div>

      <div className="space-y-4 rounded border border-border/70 bg-card/40 p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min BAC">
            <input
              type="number"
              className="hud-input"
              value={form.min_bac ?? 0}
              onChange={(e) => setForm({ ...form, min_bac: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max BAC">
            <input
              type="number"
              className="hud-input"
              value={form.max_bac ?? 0}
              onChange={(e) => setForm({ ...form, max_bac: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Withdrawable % of balance">
          <input
            type="number"
            min={0}
            max={100}
            className="hud-input"
            value={form.withdraw_percentage ?? 70}
            onChange={(e) => setForm({ ...form, withdraw_percentage: Number(e.target.value) })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fee Type">
            <select
              className="hud-input"
              value={form.fee_type ?? "none"}
              onChange={(e) => setForm({ ...form, fee_type: e.target.value as Cfg["fee_type"] })}
            >
              <option value="none">None</option>
              <option value="fixed">Fixed (BAC)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </Field>
          <Field label="Fee Value">
            <input
              type="number"
              step="0.01"
              className="hud-input"
              value={form.fee_value ?? 0}
              onChange={(e) => setForm({ ...form, fee_value: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button onClick={save} className="rounded border border-gold bg-gold/20 px-6 py-2 font-hud text-sm uppercase tracking-widest text-gold">
            Save
          </button>
        </div>
      </div>
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
