import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

const DISMISS_KEY = "ba_announce_dismissed_at";

export function AnnouncementBar() {
  const [msg, setMsg] = useState<string | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("website_settings")
        .select("key, value")
        .in("key", ["announcement_message", "announcement_link", "announcement_active"]);
      if (!active || !data) return;
      const map = new Map(data.map((r) => [r.key, r.value]));
      const on = (map.get("announcement_active") ?? "").toLowerCase();
      const text = map.get("announcement_message") ?? "";
      if (on !== "true" && on !== "1") return;
      if (!text || !text.trim()) return;
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const stamp = `${text}|${map.get("announcement_link") ?? ""}`;
      if (dismissed === stamp) return;
      setMsg(text);
      setHref(map.get("announcement_link") ?? null);
      setHidden(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (hidden || !msg) return null;

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, `${msg}|${href ?? ""}`);
    } catch {
      /* ignore */
    }
  };

  const body = (
    <span className="inline-flex items-center gap-2">
      <Megaphone className="h-3.5 w-3.5 text-gold" />
      <span className="font-hud text-[11px] uppercase tracking-widest">{msg}</span>
    </span>
  );

  return (
    <div className="relative z-40 border-b border-gold/40 bg-gradient-to-r from-gold/15 via-gold/5 to-gold/15">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5">
        {href ? (
          <Link to={href} className="truncate text-foreground hover:text-gold">
            {body}
          </Link>
        ) : (
          <span className="truncate text-foreground">{body}</span>
        )}
        <button
          onClick={close}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded p-1 text-foreground/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
