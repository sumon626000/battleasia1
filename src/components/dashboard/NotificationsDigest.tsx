import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, ArrowRight, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Notif = {
  id: number;
  title: string | null;
  message: string | null;
  type: string | null;
  read_at: string | null;
  link: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsDigest() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_notifications")
      .select("id,title,message,type,read_at,link,created_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(3);
    const { count } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .is("archived_at", null);
    setItems((data as Notif[]) ?? []);
    setUnread(count ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const ch = supabase
      .channel(`notif-digest-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, load]);

  const markAll = async () => {
    if (!user?.id || unread === 0) return;
    await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    load();
  };

  return (
    <div className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative grid h-8 w-8 place-items-center rounded-md bg-gold/15 text-gold">
            {unread > 0 ? <BellRing size={15} className="animate-pulse" /> : <Bell size={15} />}
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Notifications
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1 rounded border border-border/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground/70 transition-colors hover:border-gold/60 hover:text-gold"
            >
              <CheckCheck size={11} /> Mark all
            </button>
          )}
          <Link
            to="/notifications"
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-gold/80 hover:text-gold"
          >
            All <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-border/30">
        {loading && (
          <li className="px-4 py-3 font-mono text-[11px] text-foreground/50">Loading…</li>
        )}
        {!loading && items.length === 0 && (
          <li className="px-4 py-6 text-center text-[12px] text-foreground/50">
            No notifications yet.
          </li>
        )}
        {items.map((n) => {
          const isUnread = !n.read_at;
          const Wrapper: React.ElementType = n.link ? Link : "div";
          const wrapperProps = n.link ? { to: n.link } : {};
          return (
            <li key={n.id}>
              <Wrapper
                {...(wrapperProps as Record<string, unknown>)}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  isUnread ? "bg-gold/[0.04] hover:bg-gold/[0.07]" : "hover:bg-muted/30"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isUnread ? "bg-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]" : "bg-border"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate font-display text-[13px] font-semibold text-foreground">
                      {n.title ?? "Notification"}
                    </div>
                    <div className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-foreground/45">
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {n.message && (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-foreground/65">
                      {n.message}
                    </div>
                  )}
                </div>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
