import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Users, Crown, User } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/notifications")({
  component: AdminNotificationsPage,
});

type Sent = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function AdminNotificationsPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<"user" | "all" | "premium">("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("system");
  const [sending, setSending] = useState(false);

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Sent[];
    },
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (target === "user" && !userId) {
      toast.error("Provide a user ID");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      p_target: target,
      p_user_id: target === "user" ? userId : null,
      p_title: title,
      p_body: body || null,
      p_link: link || null,
      p_type: type,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Sent to ${data ?? 0} recipient(s)`);
      setTitle("");
      setBody("");
      setLink("");
      setUserId("");
      qc.invalidateQueries({ queryKey: ["admin-recent-notifications"] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">
          Broadcast Center
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Send notifications to individuals or groups
        </p>
      </div>

      <form
        onSubmit={handleSend}
        className="space-y-4 rounded border border-border/60 bg-card/40 p-5"
      >
        <div>
          <span className="mb-2 block font-hud text-[11px] uppercase tracking-widest text-foreground/60">
            Audience
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "all" as const, label: "All Users", Icon: Users },
              { v: "premium" as const, label: "Premium", Icon: Crown },
              { v: "user" as const, label: "Single User", Icon: User },
            ].map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTarget(v)}
                className={`flex items-center justify-center gap-2 rounded border px-3 py-2 font-hud text-xs uppercase tracking-widest ${
                  target === v
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-border/60 text-foreground/70 hover:border-gold/40"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {target === "user" && (
          <Field label="User ID (UUID)">
            <input
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm"
            />
          </Field>
        )}

        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
          />
        </Field>

        <Field label="Body">
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            >
              <option value="system">System</option>
              <option value="match">Match</option>
              <option value="wallet">Wallet</option>
              <option value="promo">Promotion</option>
              <option value="alert">Alert</option>
            </select>
          </Field>
          <Field label="Link (optional)">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard/matches"
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            <Send size={14} /> {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 font-display text-lg uppercase tracking-[0.2em] text-foreground">
          Recent Activity
        </h2>
        <div className="overflow-x-auto rounded border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-secondary/40 font-hud text-[11px] uppercase tracking-widest text-foreground/60">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Read</th>
                <th className="p-3 text-left">Sent</th>
              </tr>
            </thead>
            <tbody>
              {recent?.map((n) => (
                <tr key={n.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-semibold">{n.title}</td>
                  <td className="p-3 font-hud text-[11px] uppercase tracking-widest text-foreground/60">
                    {n.type ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-xs text-foreground/60">
                    {n.user_id.slice(0, 8)}…
                  </td>
                  <td className="p-3">{n.is_read ? "Yes" : "No"}</td>
                  <td className="p-3 font-mono text-xs">
                    {new Date(n.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {recent?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
                    No notifications sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-foreground/60">
        {label}
      </span>
      {children}
    </label>
  );
}
