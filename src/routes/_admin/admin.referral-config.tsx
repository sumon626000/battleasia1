import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/referral-config")({
  component: AdminReferralConfigPage,
});

type Cfg = {
  id: number;
  is_enabled: boolean;
  signup_bonus_bac: number;
  paid_match_commission: number;
  deposit_commission: number;
  min_paid_match_fee: number;
};

function AdminReferralConfigPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-referral-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_configs")
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
    const { error } = await supabase.rpc("admin_save_referral_config", {
      p_payload: {
        is_enabled: form.is_enabled ?? true,
        signup_bonus_bac: Number(form.signup_bonus_bac ?? 0),
        paid_match_commission: Number(form.paid_match_commission ?? 0),
        deposit_commission: Number(form.deposit_commission ?? 0),
        min_paid_match_fee: Number(form.min_paid_match_fee ?? 0),
      },
    });
    if (error) return toast.error(error.message);
    toast.success("Referral config saved");
    qc.invalidateQueries({ queryKey: ["admin-referral-config"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="h-6 w-6 text-gold" />
        <h1 className="font-display text-2xl uppercase tracking-wider text-gold">Referral Config</h1>
      </div>

      <div className="hud-panel max-w-2xl space-y-4 p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} />
          Referral system enabled
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase text-foreground/60">Signup Bonus (BAC)
            <input type="number" className="hud-input mt-1 w-full" value={form.signup_bonus_bac ?? 0} onChange={(e) => setForm({ ...form, signup_bonus_bac: Number(e.target.value) })} />
          </label>
          <label className="text-xs uppercase text-foreground/60">Min Paid Match Fee (BAC)
            <input type="number" className="hud-input mt-1 w-full" value={form.min_paid_match_fee ?? 0} onChange={(e) => setForm({ ...form, min_paid_match_fee: Number(e.target.value) })} />
          </label>
          <label className="text-xs uppercase text-foreground/60">Paid Match Commission (%)
            <input type="number" className="hud-input mt-1 w-full" value={form.paid_match_commission ?? 0} onChange={(e) => setForm({ ...form, paid_match_commission: Number(e.target.value) })} />
          </label>
          <label className="text-xs uppercase text-foreground/60">Deposit Commission (%)
            <input type="number" className="hud-input mt-1 w-full" value={form.deposit_commission ?? 0} onChange={(e) => setForm({ ...form, deposit_commission: Number(e.target.value) })} />
          </label>
        </div>

        <button onClick={save} className="rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
