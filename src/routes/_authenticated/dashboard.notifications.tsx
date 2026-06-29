import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, BellRing, CheckCheck, Archive, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BattleAsia" }] }),
  component: NotificationsPage,
});

type N = {
  id: number; title: string; message: string; type: string | null;
  read_at: string | null; archived_at: string | null; created_at: string;
  link?: string | null;
};

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("user_notifications")
      .select("id,title,message,type,read_at,archived_at,created_at,link")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data as N[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load();  }, [user?.id]);

  const filtered = items.filter((i) => {
    if (tab === "archived") return !!i.archived_at;
    if (tab === "unread") return !i.read_at && !i.archived_at;
    return !i.archived_at;
  });

  const unreadCount = items.filter((i) => !i.read_at && !i.archived_at).length;

  const markAll = async () => { await supabase.rpc("mark_notifications_read"); await load(); };
  const markOne = async (id: number) => { await supabase.rpc("mark_notifications_read", { p_ids: [id] }); await load(); };
  const archive = async (id: number) => { await supabase.rpc("archive_notification", { p_id: id }); await load(); };

  return (
    <div className="space-y-6">
      <div className="hud-panel flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <BellRing className="text-gold" size={22} />
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wider">Comms Channel</h1>
            <p className="font-mono text-xs text-foreground/60">{unreadCount} unread transmission{unreadCount === 1 ? "" : "s"}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll}
            className="inline-flex items-center gap-2 rounded-md border border-gold/60 bg-gold/15 px-3 py-1.5 font-hud text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold/25">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(["all", "unread", "archived"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md border px-3 py-1.5 font-hud text-xs font-bold uppercase tracking-wider transition ${
              tab === t ? "border-gold bg-gold/15 text-gold" : "border-border bg-card/40 text-foreground/70 hover:border-gold/50 hover:text-gold"
            }`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" /></div>
      ) : filtered.length === 0 ? (
        <div className="hud-panel flex flex-col items-center gap-2 p-10 text-center">
          <Bell size={36} className="text-foreground/30" />
          <p className="font-mono text-sm text-foreground/60">No transmissions in this channel.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li key={n.id}
              className={`hud-panel flex items-start gap-3 p-4 ${!n.read_at && !n.archived_at ? "border-gold/60 bg-gold/5" : ""}`}>
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-foreground/30" : "bg-gold animate-pulse"}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-foreground/60">
                  {n.type && <span className="rounded border border-border px-2 py-0.5">{n.type}</span>}
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <h3 className="mt-1 font-display text-base uppercase tracking-wide text-foreground">{n.title}</h3>
                <p className="mt-1 font-mono text-sm text-foreground/80">{n.message}</p>
                {n.link && (
                  <Link to={n.link as any} onClick={() => !n.read_at && markOne(n.id)}
                    className="mt-1 inline-block font-hud text-[11px] uppercase tracking-wider text-gold hover:underline">
                    Open →
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {!n.read_at && !n.archived_at && (
                  <button onClick={() => markOne(n.id)} title="Mark read"
                    className="rounded border border-border p-1.5 text-foreground/60 hover:border-gold/60 hover:text-gold">
                    <CheckCheck size={14} />
                  </button>
                )}
                {!n.archived_at && (
                  <button onClick={() => archive(n.id)} title="Archive"
                    className="rounded border border-border p-1.5 text-foreground/60 hover:border-red-500/60 hover:text-red-400">
                    <Archive size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
