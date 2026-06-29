import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Send, Trash2, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { RichText } from "@/components/feed/RichText";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

type ProfileSuggestion = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export function CommentsThread({ postId, onCountChange }: { postId: string; onCountChange?: (n: number) => void }) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [highlight, setHighlight] = useState(0);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("social_comments")
      .select("id,post_id,user_id,body,created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data ?? []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    let map: Record<string, Comment["author"]> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids);
      map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const merged = list.map((c) => ({ ...c, author: map[c.user_id] ?? null }));
    setItems(merged);
    onCountChange?.(merged.length);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_comments", filter: `post_id=eq.${postId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Detect @mention being typed at the caret and fetch suggestions
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? body.length;
    const upto = body.slice(0, caret);
    const m = /(?:^|\s)@([A-Za-z0-9._]{0,30})$/.exec(upto);
    if (!m) {
      setMentionQuery(null);
      setSuggestions([]);
      return;
    }
    setMentionQuery(m[1] ?? "");
  }, [body]);

  useEffect(() => {
    if (mentionQuery === null) return;
    const q = mentionQuery.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      const query = supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .not("username", "is", null)
        .limit(6);
      const { data } = q
        ? await query.ilike("username", `${q}%`)
        : await query.order("username", { ascending: true });
      if (cancelled) return;
      setSuggestions((data ?? []) as ProfileSuggestion[]);
      setHighlight(0);
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mentionQuery]);

  function applySuggestion(s: ProfileSuggestion) {
    const el = inputRef.current;
    if (!el || !s.username) return;
    const caret = el.selectionStart ?? body.length;
    const before = body.slice(0, caret);
    const after = body.slice(caret);
    const replaced = before.replace(/@([A-Za-z0-9._]{0,30})$/, `@${s.username} `);
    const next = replaced + after;
    setBody(next);
    setMentionQuery(null);
    setSuggestions([]);
    requestAnimationFrame(() => {
      el.focus();
      const pos = replaced.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const showSuggestions = mentionQuery !== null && suggestions.length > 0;

  async function submit() {
    if (!user || !body.trim()) return;
    setBusy(true);
    const text = body.trim().slice(0, 1000);
    setBody("");
    setMentionQuery(null);
    setSuggestions([]);
    const { error } = await supabase.from("social_comments").insert({ post_id: postId, user_id: user.id, body: text });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      setBody(text);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("social_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  const placeholderHint = useMemo(
    () => "Add a comment... use @ to mention, # for tags",
    [],
  );

  return (
    <div className="border-t border-border/60 bg-background/30 px-4 py-3">
      {loading ? (
        <div className="py-3 text-center font-hud text-[10px] text-foreground/40">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-2 text-center font-hud text-[11px] text-foreground/50">No comments yet</div>
      ) : (
        <ul className="mb-3 space-y-2.5 max-h-72 overflow-y-auto">
          {items.map((c) => {
            const handle = c.author?.username || c.author?.full_name || "player";
            const mine = user?.id === c.user_id;
            return (
              <li key={c.id} className="flex gap-2 text-sm">
                <Link
                  to="/u/$username"
                  params={{ username: handle }}
                  className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/40 bg-background/60 font-hud text-[10px] font-bold text-gold"
                >
                  {c.author?.avatar_url ? (
                    <img src={c.author.avatar_url} alt={handle} className="h-full w-full object-cover" />
                  ) : (
                    handle.slice(0, 2).toUpperCase()
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-1.5">
                    <Link
                      to="/u/$username"
                      params={{ username: handle }}
                      className="block font-hud text-[11px] font-bold text-gold hover:underline"
                    >
                      @{handle}
                    </Link>
                    <RichText
                      text={c.body}
                      className="whitespace-pre-wrap break-words text-sm text-foreground/90"
                    />
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 px-1 font-hud text-[10px] text-foreground/40">
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                    {mine && (
                      <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 hover:text-red-400">
                        <Trash2 size={10} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isAuthenticated ? (
        <div className="relative">
          {showSuggestions && (
            <div className="absolute bottom-full left-0 right-12 z-30 mb-1 overflow-hidden rounded-lg border border-gold/40 bg-card/95 shadow-lg backdrop-blur">
              <ul className="max-h-56 overflow-y-auto">
                {suggestions.map((s, idx) => {
                  const handle = s.username ?? "";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySuggestion(s);
                        }}
                        onMouseEnter={() => setHighlight(idx)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                          idx === highlight ? "bg-gold/10 text-foreground" : "text-foreground/80 hover:bg-gold/5"
                        }`}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/40 bg-background/60 font-hud text-[10px] font-bold text-gold">
                          {s.avatar_url ? (
                            <img src={s.avatar_url} alt={handle} className="h-full w-full object-cover" />
                          ) : (
                            handle.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-hud text-[12px] font-bold text-gold">@{handle}</span>
                          {s.full_name && (
                            <span className="block truncate text-[11px] text-foreground/60">{s.full_name}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (showSuggestions) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => (h + 1) % suggestions.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    applySuggestion(suggestions[highlight]);
                    return;
                  }
                  if (e.key === "Escape") {
                    setMentionQuery(null);
                    setSuggestions([]);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={placeholderHint}
              maxLength={1000}
              className="flex-1 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-gold/60 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={busy || !body.trim()}
              className="btn-gold grid h-9 w-9 place-items-center disabled:opacity-50"
              aria-label="Send"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      ) : (
        <Link to="/auth" className="block text-center font-hud text-[11px] text-foreground/60 hover:text-gold">
          Sign in to comment
        </Link>
      )}
    </div>
  );
}

export function LikeBurst({ active, children }: { active: boolean; children?: React.ReactNode }) {
  return (
    <span className="relative inline-grid place-items-center">
      {children ?? (
        <Heart
          size={18}
          fill={active ? "currentColor" : "none"}
          className={`transition-transform duration-200 ${active ? "scale-110" : "scale-100"}`}
        />
      )}
      {active && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-6 w-6 animate-ping rounded-full bg-rose-500/30" />
        </span>
      )}
    </span>
  );
}
