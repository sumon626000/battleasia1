import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Save } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/smtp")({
  component: AdminSMTPPage,
});

const FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
  { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
  { key: "smtp_user", label: "SMTP Username", placeholder: "noreply@battleasia.com" },
  { key: "smtp_pass", label: "SMTP Password", type: "password" },
  { key: "smtp_from_email", label: "From Email", placeholder: "noreply@battleasia.com" },
  { key: "smtp_from_name", label: "From Name", placeholder: "Battle Asia" },
  { key: "smtp_encryption", label: "Encryption (tls/ssl/none)", placeholder: "tls" },
];

function AdminSMTPPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-smtp"],
    queryFn: async () => {
      const keys = FIELDS.map((f) => f.key);
      const { data, error } = await supabase
        .from("website_settings")
        .select("id, key, value")
        .in("key", keys);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) {
      const m: Record<string, string> = {};
      FIELDS.forEach((f) => (m[f.key] = ""));
      q.data.forEach((r) => (m[r.key] = r.value ?? ""));
      setVals(m);
    }
  }, [q.data]);

  const [busy, setBusy] = useState(false);
  async function saveAll() {
    setBusy(true);
    try {
      for (const f of FIELDS) {
        const existing = q.data?.find((r) => r.key === f.key);
        if (existing) {
          const { error } = await supabase
            .from("website_settings")
            .update({ value: vals[f.key] ?? "" })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("website_settings")
            .insert({
              key: f.key,
              value: vals[f.key] ?? "",
              type: "string",
              label: f.label,
            });
          if (error) throw error;
        }
      }
      toast.success("SMTP settings saved");
      qc.invalidateQueries({ queryKey: ["admin-smtp"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] flex items-center gap-2">
          <Mail className="h-5 w-5 text-gold" /> SMTP / Email Settings
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Outbound mail transport configuration
        </p>
      </div>

      <div className="hud-panel rounded-md border border-border/70 bg-card/40 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                {f.label}
              </label>
              <input
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={vals[f.key] ?? ""}
                onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={saveAll}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            <Save className="h-3 w-3" /> {busy ? "Saving…" : "Save Settings"}
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] text-foreground/40">
          Stored in website_settings. Configure your email worker / edge function to read these values when sending mail.
        </p>
      </div>
    </div>
  );
}
