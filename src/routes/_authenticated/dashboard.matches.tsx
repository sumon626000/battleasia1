import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Crown, Users, Map, Trophy, Clock, Filter, Sword, ArrowLeft, Gamepad2, Lock, PlayCircle, Loader2, KeyRound, Copy, Check, Calendar, Ticket, ChevronDown, Radio } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { PlayHeroCarousel } from "@/components/dashboard/PlayHeroCarousel";

function useLiveMatchUpdates() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("live-matches-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        qc.invalidateQueries({ queryKey: ["matches"] });
        qc.invalidateQueries({ queryKey: ["match-tab-counts"] });
        qc.invalidateQueries({ queryKey: ["match-counts"] });
        qc.invalidateQueries({ queryKey: ["public-matches"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        qc.invalidateQueries({ queryKey: ["play-games"] });
        qc.invalidateQueries({ queryKey: ["admin-games"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["match-counts"] });
        qc.invalidateQueries({ queryKey: ["my-match-ids"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

export const Route = createFileRoute("/_authenticated/dashboard/matches")({
  validateSearch: (s: Record<string, unknown>) => ({ game: s.game ? Number(s.game) : undefined }),
  head: () => ({ meta: [{ title: "Play — Battle Asia" }] }),
  component: MatchesPage,
});

type HubTab = "tournaments" | "live" | "upcoming" | "mine";

type Tab = "Ongoing" | "Upcoming" | "Results";
type ModeFilter = "all" | "Solo" | "Duo" | "Squad";
type TypeFilter = "all" | "Free" | "Paid";

function MatchesPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { game: selectedGameId } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Ongoing");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [resultDate, setResultDate] = useState<string>(""); // YYYY-MM-DD
  const balance = Number(profile?.bac_coin_balance ?? 0);
  useLiveMatchUpdates();

  const games = useQuery({
    queryKey: ["play-games"],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select("id, game_name, image_url, status, coming_soon, live_stream_url")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id");
      return data ?? [];
    },
  });

  const selectedGame = games.data?.find((g: any) => g.id === selectedGameId);

  const matches = useQuery({
    queryKey: ["matches", selectedGameId, tab, mode, type, resultDate],
    enabled: !!selectedGameId,
    queryFn: async () => {
      let q = supabase
        .from("matches").select("*").is("deleted_at", null)
        .eq("game_id", selectedGameId!);
      if (tab === "Ongoing") q = q.eq("status", "Ongoing").order("schedule_at", { ascending: true });
      else if (tab === "Upcoming") q = q.in("status", ["Upcoming", "Active"]).order("schedule_at", { ascending: true });
      else {
        q = q.eq("status", "Complete").order("schedule_at", { ascending: false });
        if (resultDate) {
          const start = new Date(resultDate + "T00:00:00").toISOString();
          const end = new Date(resultDate + "T23:59:59.999").toISOString();
          q = q.gte("schedule_at", start).lte("schedule_at", end);
        }
      }
      if (mode !== "all") q = q.eq("player_mode", mode);
      if (type !== "all") q = q.eq("match_type", type);
      const { data } = await q;
      return data ?? [];
    },
  });

  const tabCounts = useQuery({
    queryKey: ["match-tab-counts", selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches").select("status").is("deleted_at", null).eq("game_id", selectedGameId!);
      const c = { Ongoing: 0, Upcoming: 0, Results: 0 };
      (data ?? []).forEach((r: any) => {
        if (r.status === "Ongoing") c.Ongoing++;
        else if (r.status === "Upcoming" || r.status === "Active") c.Upcoming++;
        else if (r.status === "Complete") c.Results++;
      });
      return c;
    },
  });

  const joined = useQuery({
    queryKey: ["my-match-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("match_participants").select("match_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r: any) => r.match_id as number));
    },
  });

  const counts = useQuery({
    queryKey: ["match-counts", (matches.data ?? []).map((m: any) => m.id).join(",")],
    enabled: !!matches.data?.length,
    queryFn: async () => {
      const ids = (matches.data ?? []).map((m: any) => m.id);
      const { data } = await supabase.from("match_participants").select("match_id").in("match_id", ids);
      const map: Record<number, number> = {};
      (data ?? []).forEach((r: any) => { map[r.match_id] = (map[r.match_id] ?? 0) + 1; });
      return map;
    },
  });

  // === PLAY HUB — unified all-games view ===
  if (!selectedGameId) {
    return (
      <PlayHub
        games={games.data ?? []}
        gamesLoading={games.isLoading}
        userId={user?.id}
        balance={balance}
        isPremium={!!profile?.is_premium}
        onPickGame={(id) => navigate({ to: "/dashboard/matches", search: { game: id } })}
      />
    );
  }



  // Step 2: Matches for selected game
  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/dashboard/matches", search: {} })}
        className="flex items-center gap-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60 hover:text-gold"
      >
        <ArrowLeft size={12} /> Change Game
      </button>

      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">// {selectedGame?.game_name ?? "ARENA"}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
              <span className="text-gold">{selectedGame?.game_name ?? "GAME"}</span> TOURNAMENTS
            </h1>
          </div>
          {selectedGame?.image_url ? (
            <img src={selectedGame.image_url} alt={selectedGame.game_name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <Sword className="text-gold" size={36} />
          )}
        </div>
      </section>

      {selectedGame?.live_stream_url && (
        <a
          href={selectedGame.live_stream_url}
          target="_blank"
          rel="noreferrer"
          className="hud-panel flex items-center justify-between gap-3 border-red-500/60 bg-red-600/10 p-3 transition hover:bg-red-600/20"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-2 py-0.5 font-hud text-[10px] font-bold uppercase tracking-widest text-white animate-pulse">
              <PlayCircle size={11} /> LIVE
            </span>
            <span className="font-hud text-xs uppercase tracking-widest text-red-400">
              {selectedGame.game_name} live stream now
            </span>
          </div>
          <span className="font-hud text-[10px] uppercase tracking-widest text-red-400">WATCH →</span>
        </a>
      )}

      {/* Primary tabs */}
      <div className="hud-panel flex items-center gap-1 overflow-x-auto p-1.5">
        {(["Ongoing","Upcoming","Results"] as Tab[]).map((t) => {
          const count = tabCounts.data?.[t] ?? 0;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-[110px] rounded-sm px-3 py-2 font-hud text-[11px] font-bold uppercase tracking-widest transition ${
                active ? "bg-gold text-background shadow-lg shadow-gold/20" : "text-foreground/70 hover:bg-gold/10 hover:text-gold"
              }`}
            >
              {t === "Ongoing" ? "ONGOING" : t === "Upcoming" ? "UPCOMING" : "RESULTS"} ({count})
            </button>
          );
        })}
      </div>

      {/* Date filter — only for Results tab */}
      {tab === "Results" && (
        <div className="hud-panel flex flex-wrap items-center gap-3 p-3">
          <div className="flex items-center gap-2 font-hud text-[10px] uppercase tracking-widest text-foreground/70">
            <Calendar size={12} className="text-gold" /> FILTER BY DATE
          </div>
          <input
            type="date"
            value={resultDate}
            onChange={(e) => setResultDate(e.target.value)}
            className="rounded-sm border border-border/60 bg-background/60 px-2 py-1.5 font-mono text-xs text-foreground focus:border-gold focus:outline-none"
          />
          {resultDate && (
            <button
              onClick={() => setResultDate("")}
              className="rounded-sm border border-border/60 px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-widest text-foreground/70 hover:border-gold/60 hover:text-gold"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="hud-panel grid gap-2 p-3 sm:grid-cols-2">
        <FilterGroup label="MODE" value={mode} onChange={(v) => setMode(v as ModeFilter)}
          options={[["all","All"],["Solo","Solo"],["Duo","Duo"],["Squad","Squad"]]} />
        <FilterGroup label="TYPE" value={type} onChange={(v) => setType(v as TypeFilter)}
          options={[["all","All"],["Free","Free"],["Paid","Paid"]]} />
      </div>

      <section className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {(matches.data ?? []).map((m: any) => (
          <MatchCard key={m.id} m={m} joined={joined.data?.has(m.id) ?? false} filled={counts.data?.[m.id] ?? 0} balance={balance} isPremium={!!profile?.is_premium} />
        ))}
        {matches.isLoading && <div className="col-span-full py-8 text-center text-foreground/40">Loading matches...</div>}
        {!matches.isLoading && !matches.data?.length && (
          <div className="col-span-full py-8 text-center font-hud text-xs tracking-widest text-foreground/40">
            NO MATCHES FOUND
          </div>
        )}
      </section>

    </div>
  );
}

function FilterGroup({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 font-hud text-[10px] uppercase tracking-wider text-foreground/60">
        <Filter size={10} /> {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded-sm px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-wider transition ${
              value === v ? "bg-gold text-background" : "border border-border/60 text-foreground/70 hover:border-gold/60"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ m, joined, filled, balance, isPremium }: { m: any; joined: boolean; filled: number; balance: number; isPremium: boolean }) {
  const qc = useQueryClient();
  const [joining, setJoining] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [copied, setCopied] = useState<"id" | "pw" | null>(null);
  const total = m.total_players ?? 0;
  const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  const when = m.schedule_at ? new Date(m.schedule_at) : null;
  const isLive = m.status === "Ongoing";
  const isFull = total > 0 && filled >= total;
  const fee = Number(m.entry_fee_bac ?? 0);
  const banner = m.banner_image_url || m.map_image_url || null;

  function handleCredsClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!joined) {
      toast.info("Join this match first to reveal Room ID & Password", { description: "Tap the JOIN button below" });
      return;
    }
    if (!m.room_id && !m.room_password) {
      toast.info("Room ID & Password will be shared before match starts");
      return;
    }
  }

  async function copyText(e: React.MouseEvent, text: string, which: "id" | "pw") {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleJoin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (joined) return;
    if (isFull) { toast.error("Match is full"); return; }
    if (m.premium_only && !isPremium) { toast.error("Premium membership required"); return; }
    if (m.match_type === "Paid" && fee > balance) {
      toast.error("Insufficient BAC balance", { description: `Need ${fee} BAC, you have ${balance} BAC` });
      return;
    }
    setJoining(true);
    const { error } = await supabase.rpc("join_match", { p_match_id: m.id });
    setJoining(false);
    if (error) { toast.error(error.message || "Failed to join"); return; }
    toast.success(`Joined ${m.match_name}! Good luck soldier.`);
    qc.invalidateQueries({ queryKey: ["my-match-ids"] });
    qc.invalidateQueries({ queryKey: ["match-counts"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <Link
      to="/dashboard/matches/$matchId"
      params={{ matchId: String(m.id) }}
      className="hud-panel block overflow-hidden transition hover:border-gold/60"
    >
      {banner && (
        <div className="relative aspect-[16/9] overflow-hidden bg-background/60">
          <img src={banner} alt={m.match_name} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          {isLive && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-red-600 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase tracking-widest text-white animate-pulse">
              <PlayCircle size={10} /> LIVE
            </span>
          )}
        </div>
      )}
      <div className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-sm px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase tracking-wider ${
          isLive ? "bg-red-500/20 text-red-400" : "bg-gold/15 text-gold"
        }`}>{isLive ? "LIVE" : m.status}</span>
        {m.premium_only && (
          <span className="flex items-center gap-1 rounded-sm bg-gold/20 px-1.5 py-0.5 font-hud text-[9px] font-bold text-gold">
            <Crown size={9} /> PREMIUM
          </span>
        )}
        <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase">
          {m.match_type}
        </span>
      </div>
      <h3 className="mt-2 truncate font-display text-base font-bold uppercase tracking-wide">{m.match_name}</h3>

      <div className="mt-2 space-y-1.5 rounded-sm border border-gold/40 bg-gold/5 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/60">Room ID</div>
            <div className="truncate font-mono text-xs text-gold">
              {joined ? (m.room_id || "— TBA —") : "•••••••"}
            </div>
          </div>
          {joined && m.room_id ? (
            <button
              type="button"
              onClick={(e) => copyText(e, String(m.room_id), "id")}
              className="flex items-center gap-1 rounded-sm border border-gold/60 px-2 py-1 font-hud text-[9px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-background"
            >
              {copied === "id" ? <><Check size={10}/> COPIED</> : <><Copy size={10}/> COPY</>}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCredsClick}
              className="flex items-center gap-1 rounded-sm border border-gold/60 px-2 py-1 font-hud text-[9px] font-bold uppercase tracking-widest text-gold/80 hover:bg-gold hover:text-background"
            >
              <Lock size={10}/> JOIN
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/60">Password</div>
            <div className="truncate font-mono text-xs text-gold">
              {joined ? (m.room_password || "— TBA —") : "•••••••"}
            </div>
          </div>
          {joined && m.room_password ? (
            <button
              type="button"
              onClick={(e) => copyText(e, String(m.room_password), "pw")}
              className="flex items-center gap-1 rounded-sm border border-gold/60 px-2 py-1 font-hud text-[9px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-background"
            >
              {copied === "pw" ? <><Check size={10}/> COPIED</> : <><Copy size={10}/> COPY</>}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCredsClick}
              className="flex items-center gap-1 rounded-sm border border-gold/60 px-2 py-1 font-hud text-[9px] font-bold uppercase tracking-widest text-gold/80 hover:bg-gold hover:text-background"
            >
              <Lock size={10}/> JOIN
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <Meta icon={Map} label={m.map_name ?? "—"} />
        <Meta icon={Users} label={`${m.player_mode} · ${m.game_mode}`} />
        {when && <Meta icon={Clock} label={when.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} />}
        <Meta icon={Trophy} label={`${m.per_kill_amount_bac}/kill`} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
        <div className="flex items-center gap-1.5">
          <CoinIcon size={14} />
          <span className="font-mono text-sm font-bold text-gold">
            {m.match_type === "Free" ? "FREE" : `${m.entry_fee_bac} BAC`}
          </span>
        </div>
        <div className="font-mono text-[10px] text-foreground/60">{filled}/{total || "∞"}</div>
      </div>

      {total > 0 && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-gold"}`} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        {joined ? (
          <span className="block rounded-sm border border-green-500/40 bg-green-500/10 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-green-400">
            ✓ JOINED
          </span>
        ) : isFull ? (
          <span className="block rounded-sm border border-red-500/40 bg-red-500/10 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-red-400">
            FULL
          </span>
        ) : (
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="flex items-center justify-center gap-1.5 rounded-sm border border-gold/60 bg-gold/15 py-2 font-hud text-[10px] font-bold uppercase tracking-widest text-gold transition hover:bg-gold hover:text-background disabled:opacity-50"
          >
            {joining ? <><Loader2 size={12} className="animate-spin" /> JOINING</> : (m.match_type === "Free" ? "JOIN FREE" : `JOIN · ${fee} BAC`)}
          </button>
        )}
        <span className="rounded-sm border border-border/60 px-3 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-foreground/70">
          VIEW
        </span>
      </div>
      </div>
    </Link>
  );
}

function Meta({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1 text-foreground/70">
      <Icon size={11} className="text-gold/70" /> <span className="truncate">{label}</span>
    </div>
  );
}

// ========================== PLAY HUB ==========================

type GameRow = { id: number; game_name: string; image_url: string | null; status: string | null; coming_soon: boolean | null; live_stream_url: string | null };

function PlayHub({
  games, gamesLoading, userId, balance, isPremium, onPickGame,
}: {
  games: GameRow[];
  gamesLoading: boolean;
  userId: string | undefined;
  balance: number;
  isPremium: boolean;
  onPickGame: (id: number) => void;
}) {
  const [tab, setTab] = useState<HubTab>("tournaments");
  const [gameFilter, setGameFilter] = useState<number | "all">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "Solo" | "Duo" | "Squad">("all");
  const [gameOpen, setGameOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (gameRef.current && !gameRef.current.contains(e.target as Node)) setGameOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // My joined match ids — also drives "MY MATCHES" tab and "My Tickets" badge
  const joined = useQuery({
    queryKey: ["my-match-ids", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("match_participants").select("match_id").eq("user_id", userId!);
      return new Set((data ?? []).map((r: any) => r.match_id as number));
    },
  });

  // Pull a generous window of matches across all games once, slice client-side per tab.
  const allMatches = useQuery({
    queryKey: ["hub-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .is("deleted_at", null)
        .in("status", ["Ongoing", "Upcoming", "Active"])
        .order("schedule_at", { ascending: true })
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  const counts = useQuery({
    queryKey: ["hub-match-counts", (allMatches.data ?? []).map((m: any) => m.id).join(",")],
    enabled: !!allMatches.data?.length,
    queryFn: async () => {
      const ids = (allMatches.data ?? []).map((m: any) => m.id);
      const { data } = await supabase.from("match_participants").select("match_id").in("match_id", ids);
      const map: Record<number, number> = {};
      (data ?? []).forEach((r: any) => { map[r.match_id] = (map[r.match_id] ?? 0) + 1; });
      return map;
    },
  });

  const myTickets = joined.data?.size ?? 0;

  const filtered = (allMatches.data ?? []).filter((m: any) => {
    if (tab === "live" && m.status !== "Ongoing") return false;
    if (tab === "upcoming" && !(m.status === "Upcoming" || m.status === "Active")) return false;
    if (tab === "mine" && !(joined.data?.has(m.id))) return false;
    if (gameFilter !== "all" && m.game_id !== gameFilter) return false;
    if (modeFilter !== "all" && m.player_mode !== modeFilter) return false;
    return true;
  });

  const liveCount = (allMatches.data ?? []).filter((m: any) => m.status === "Ongoing").length;
  const upcomingCount = (allMatches.data ?? []).filter((m: any) => m.status === "Upcoming" || m.status === "Active").length;

  const tabs: { id: HubTab; label: string; badge?: number; dot?: boolean }[] = [
    { id: "tournaments", label: "TOURNAMENTS" },
    { id: "live", label: "LIVE NOW", badge: liveCount, dot: liveCount > 0 },
    { id: "upcoming", label: "UPCOMING", badge: upcomingCount },
    { id: "mine", label: "MY MATCHES", badge: myTickets },
  ];

  const currentGame = gameFilter === "all" ? null : games.find((g) => g.id === gameFilter);
  const activeGames = games.filter((g) => !g.coming_soon && g.status === "active");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-wider">PLAY</h1>
          <p className="mt-0.5 font-hud text-[11px] uppercase tracking-widest text-foreground/60">
            Compete. Conquer. Be the Champion.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className="relative flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 font-hud text-xs font-bold uppercase tracking-widest text-red-300 transition hover:bg-red-500/20"
        >
          <Ticket size={14} className="text-red-400" />
          <span className="hidden sm:inline">My Tickets</span>
          <span className="sm:hidden">Tickets</span>
          {myTickets > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold text-white shadow-lg shadow-red-600/50">
              {myTickets}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative whitespace-nowrap px-3 py-2.5 font-hud text-[11px] font-bold uppercase tracking-widest transition ${
                  active ? "text-red-400" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.label}
                  {t.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                  {typeof t.badge === "number" && t.badge > 0 && !t.dot && (
                    <span className="rounded-sm bg-foreground/10 px-1 font-mono text-[9px] text-foreground/70">{t.badge}</span>
                  )}
                </span>
                {active && <span className="absolute inset-x-1 -bottom-px h-0.5 bg-red-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero carousel */}
      <PlayHeroCarousel />

      {/* All Games + Filter row */}
      <div className="flex items-center justify-between gap-3">
        {/* All Games dropdown */}
        <div className="relative" ref={gameRef}>
          <button
            type="button"
            onClick={() => { setGameOpen((o) => !o); setFilterOpen(false); }}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 font-hud text-[11px] font-bold uppercase tracking-widest text-foreground/85 transition hover:border-gold/50"
          >
            <Gamepad2 size={14} className="text-gold" />
            <span className="max-w-[140px] truncate">{currentGame ? currentGame.game_name : "All Games"}</span>
            <ChevronDown size={12} className={`text-foreground/60 transition ${gameOpen ? "rotate-180" : ""}`} />
          </button>
          {gameOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-md border border-gold/40 bg-card/95 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => { setGameFilter("all"); setGameOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left font-hud text-[11px] font-bold uppercase tracking-widest transition hover:bg-gold/10 ${
                  gameFilter === "all" ? "bg-gold/15 text-gold" : "text-foreground/80"
                }`}
              >
                <span>All Games</span>
                {gameFilter === "all" && <Check size={12} className="text-gold" />}
              </button>
              <div className="max-h-72 overflow-y-auto">
                {activeGames.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { setGameFilter(g.id); setGameOpen(false); }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-gold/10 ${
                      gameFilter === g.id ? "bg-gold/15 text-gold" : "text-foreground/85"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-background/60" />
                      )}
                      <span className="truncate font-hud text-[11px] font-bold uppercase tracking-widest">{g.game_name}</span>
                    </span>
                    {gameFilter === g.id && <Check size={12} className="text-gold" />}
                  </button>
                ))}
                {!activeGames.length && (
                  <div className="px-3 py-3 text-center font-hud text-[10px] uppercase tracking-widest text-foreground/40">
                    No games
                  </div>
                )}
              </div>
              <div className="border-t border-border/40 px-3 py-2">
                <button
                  type="button"
                  onClick={() => { if (currentGame) onPickGame(currentGame.id); else if (activeGames[0]) onPickGame(activeGames[0].id); setGameOpen(false); }}
                  className="w-full rounded-sm border border-gold/50 px-2 py-1.5 font-hud text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-background"
                >
                  Open Game Arena →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter dropdown (Mode) */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => { setFilterOpen((o) => !o); setGameOpen(false); }}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 font-hud text-[11px] font-bold uppercase tracking-widest text-foreground/85 transition hover:border-gold/50"
          >
            <Filter size={13} className="text-gold" />
            <span>{modeFilter === "all" ? "Filter" : modeFilter}</span>
            <ChevronDown size={12} className={`text-foreground/60 transition ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-md border border-gold/40 bg-card/95 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-border/40 px-3 py-1.5 font-hud text-[9px] uppercase tracking-widest text-foreground/50">Player Mode</div>
              {(["all", "Solo", "Duo", "Squad"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModeFilter(m); setFilterOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left font-hud text-[11px] font-bold uppercase tracking-widest transition hover:bg-gold/10 ${
                    modeFilter === m ? "bg-gold/15 text-gold" : "text-foreground/80"
                  }`}
                >
                  <span>{m === "all" ? "All" : m}</span>
                  {modeFilter === m && <Check size={12} className="text-gold" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Match list */}
      <section className="space-y-3">
        {allMatches.isLoading && (
          <div className="hud-panel py-10 text-center font-hud text-xs tracking-widest text-foreground/40">LOADING MATCHES…</div>
        )}
        {!allMatches.isLoading && filtered.length === 0 && (
          <div className="hud-panel flex flex-col items-center gap-2 py-10 text-center">
            <Radio size={28} className="text-foreground/30" />
            <div className="font-hud text-xs uppercase tracking-widest text-foreground/50">
              {tab === "mine" ? "You haven't joined any matches yet" : "No matches found"}
            </div>
          </div>
        )}
        {filtered.map((m: any) => (
          <HubMatchRow
            key={m.id}
            m={m}
            game={games.find((g) => g.id === m.game_id) ?? null}
            joined={joined.data?.has(m.id) ?? false}
            filled={counts.data?.[m.id] ?? 0}
            balance={balance}
            isPremium={isPremium}
          />
        ))}
      </section>

      {/* Browse by game — quick chips */}
      {!gamesLoading && activeGames.length > 0 && (
        <section className="hud-panel p-3">
          <div className="mb-2 flex items-center gap-2 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <Gamepad2 size={12} className="text-gold" /> BROWSE BY GAME
          </div>
          <div className="flex flex-wrap gap-2">
            {activeGames.map((g) => (
              <button
                key={g.id}
                onClick={() => onPickGame(g.id)}
                className="flex items-center gap-2 rounded-sm border border-border/60 bg-background/40 px-2.5 py-1.5 font-hud text-[10px] font-bold uppercase tracking-widest text-foreground/80 transition hover:border-gold/60 hover:text-gold"
              >
                {g.image_url && <img src={g.image_url} alt="" className="h-4 w-4 rounded-sm object-cover" />}
                {g.game_name}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HubMatchRow({
  m, game, joined, filled, balance, isPremium,
}: {
  m: any; game: GameRow | null; joined: boolean; filled: number; balance: number; isPremium: boolean;
}) {
  const qc = useQueryClient();
  const [joining, setJoining] = useState(false);
  const isLive = m.status === "Ongoing";
  const total = m.total_players ?? 0;
  const isFull = total > 0 && filled >= total;
  const fee = Number(m.entry_fee_bac ?? 0);
  // Kill-based prize pool = per-kill × total kills (loserCount).
  const winnerTeam = m.player_mode === "Solo" ? 1 : m.player_mode === "Duo" ? 2 : 4;
  const loserCount = Math.max(0, total - winnerTeam);
  const prizePool = Number(m.per_kill_amount_bac ?? 0) * loserCount;
  const when = m.schedule_at ? new Date(m.schedule_at) : null;
  const [countdown, setCountdown] = useState<string>("");


  // Live countdown for upcoming, or time elapsed for live
  useEffect(() => {
    if (isLive) { setCountdown("LIVE"); return; }
    if (!when) { setCountdown("TBA"); return; }
    const tick = () => {
      const diff = when.getTime() - Date.now();
      if (diff <= 0) { setCountdown("STARTING NOW"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      const hms = `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
      setCountdown(d > 0 ? `${d}d ${hms}` : hms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [when, isLive]);

  async function handleJoin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (joined || isFull) return;
    if (m.premium_only && !isPremium) { toast.error("Premium membership required"); return; }
    if (m.match_type === "Paid" && fee > balance) {
      toast.error("Insufficient BAC balance", { description: `Need ${fee} BAC, you have ${balance} BAC` });
      return;
    }
    setJoining(true);
    const { error } = await supabase.rpc("join_match", { p_match_id: m.id });
    setJoining(false);
    if (error) { toast.error(error.message || "Failed to join"); return; }
    toast.success(`Joined ${m.match_name}!`);
    qc.invalidateQueries({ queryKey: ["my-match-ids"] });
    qc.invalidateQueries({ queryKey: ["hub-match-counts"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  // Status badge + button color theme
  const theme = isLive
    ? { badge: "LIVE", badgeCls: "bg-red-500 text-white", btnCls: "bg-red-500 hover:bg-red-600 text-white border-red-500", label: "JOIN NOW", accent: "text-red-400" }
    : { badge: "UPCOMING", badgeCls: "bg-blue-500/90 text-white", btnCls: "border border-blue-400/70 text-blue-300 hover:bg-blue-500/15", label: "JOIN NOW", accent: "text-blue-300" };

  return (
    <Link
      to="/dashboard/matches/$matchId"
      params={{ matchId: String(m.id) }}
      className="hud-panel block overflow-hidden p-3 transition hover:border-gold/50"
    >
      <div className="flex items-start gap-3">
        {/* Thumb */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-background/60 sm:h-24 sm:w-24">
          {game?.image_url ? (
            <img src={game.image_url} alt={game.game_name} className="h-full w-full object-cover" loading="lazy" />
          ) : m.banner_image_url ? (
            <img src={m.banner_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full place-items-center text-foreground/30"><Gamepad2 size={28} /></div>
          )}
          <span className={`absolute left-1 top-1 rounded-sm px-1.5 py-0.5 font-hud text-[8px] font-bold uppercase tracking-widest shadow-md ${theme.badgeCls}`}>
            {theme.badge}
          </span>
        </div>

        {/* Middle */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-bold tracking-wide sm:text-base">{m.match_name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            {game?.game_name && <span>{game.game_name}</span>}
            {game?.game_name && <span className="text-foreground/30">•</span>}
            <span>{m.player_mode}</span>
            <span className="text-foreground/30">•</span>
            <span>{m.game_mode}</span>
            {m.premium_only && (
              <>
                <span className="text-foreground/30">•</span>
                <span className="inline-flex items-center gap-1 text-gold"><Crown size={9} /> PREMIUM</span>
              </>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <div>
              <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/50">Prize Pool</div>
              <div className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                <CoinIcon size={11} />
                {prizePool.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/50">Entry Fee</div>
              <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                {m.match_type === "Free" ? <span className="text-emerald-400">FREE</span> : <><CoinIcon size={11} />{fee}</>}
              </div>
            </div>
          </div>
        </div>

        {/* Right action */}
        <div className="flex w-[110px] shrink-0 flex-col items-end gap-1.5 sm:w-[130px]">
          <div className={`flex items-center gap-1 font-hud text-[10px] font-bold uppercase tracking-widest ${theme.accent}`}>
            {isLive ? <Radio size={11} className="animate-pulse" /> : <Clock size={11} />}
            {isLive ? "LIVE" : "Starts in"}
          </div>
          {!isLive && (
            <div className={`font-mono text-sm font-bold ${countdown === "STARTING NOW" ? "text-red-400 animate-pulse" : "text-foreground"}`}>{countdown}</div>
          )}
          {joined ? (
            <span className="w-full rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1.5 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              ✓ JOINED
            </span>
          ) : isFull ? (
            <span className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-2 py-1.5 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-foreground/50">
              FULL
            </span>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className={`w-full rounded-md px-2 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest transition disabled:opacity-50 ${theme.btnCls}`}
            >
              {joining ? <Loader2 size={12} className="mx-auto animate-spin" /> : (m.match_type === "Free" || fee === 0 ? "JOIN FREE" : theme.label)}
            </button>
          )}
          <div className="font-mono text-[10px] text-foreground/50">
            {filled}/{total || "∞"} Teams
          </div>
          {isLive && when && (
            <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/40">
              Started {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Room credentials — labels always visible; masked until joined */}
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gold/20 pt-2">
        <RoomCredChip
          label="ROOM ID"
          value={joined ? (m.room_id || "— TBA —") : "•••••••"}
          locked={!joined}
          onLockedClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.info("Join this match to reveal Room ID"); }}
        />
        <RoomCredChip
          label="PASSWORD"
          value={joined ? (m.room_password || "— TBA —") : "•••••••"}
          locked={!joined}
          onLockedClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.info("Join this match to reveal Password"); }}
        />
      </div>
    </Link>

  );
}

function RoomCredChip({ label, value, locked, onLockedClick }: { label: string; value: string; locked?: boolean; onLockedClick?: (e: React.MouseEvent) => void }) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (locked) { onLockedClick?.(e); return; }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center justify-between gap-2 rounded-md border border-gold/30 bg-gold/5 px-2 py-1.5 text-left transition hover:border-gold/60 hover:bg-gold/10"
    >
      <div className="min-w-0 flex-1">
        <div className="font-hud text-[8px] uppercase tracking-widest text-foreground/50">{label}</div>
        <div className={`truncate font-mono text-xs font-bold ${locked ? "text-foreground/40" : "text-gold"}`}>{value}</div>
      </div>
      {locked ? <Lock size={12} className="text-foreground/50" /> : copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-foreground/60 group-hover:text-gold" />}
    </button>
  );
}
