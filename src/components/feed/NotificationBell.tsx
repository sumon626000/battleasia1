import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function NotificationBell({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let mounted = true;
    const load = async () => {
      const { count: c } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
        .is("archived_at", null);
      if (mounted) setCount(c ?? 0);
    };
    load();
    const ch = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <Link
      to="/dashboard/notifications"
      className={`relative rounded border border-border/70 p-2 text-foreground/70 transition hover:border-gold/60 hover:text-gold ${className}`}
      aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}
    >
      <Bell size={14} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 font-hud text-[9px] font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
