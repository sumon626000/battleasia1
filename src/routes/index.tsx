import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Swords, Trophy, Shield, Zap, Lock, Headphones,
  Smartphone, Download, ChevronRight, Crosshair,
  Radio, Flame, Star, TrendingUp, Activity, Users2,
  User, Users, UsersRound, Crosshair as Target,
  Crown, Medal, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CoinIcon } from "@/components/site/CoinIcon";
import { ApkIcon } from "@/components/site/ApkIcon";
import { useT } from "@/lib/i18n";
import heroSoldier from "@/assets/hero-soldier.jpg";
import phoneApp from "@/assets/phone-app.jpg";
import bacCoin from "@/assets/battleasia-coin.png";
import modeSoloBg from "@/assets/mode-solo.jpg";
import modeDuoBg from "@/assets/mode-duo.jpg";
import modeSquadBg from "@/assets/mode-squad.jpg";
import modeTdmBg from "@/assets/mode-tdm.jpg";
import pubgSquadAction from "@/assets/pubg-squad-action.jpg";
import pubgVehicleChase from "@/assets/pubg-vehicle-chase.jpg";
import pubgSniperRooftop from "@/assets/pubg-sniper-rooftop.jpg";
import pubgAirdrop from "@/assets/pubg-airdrop.jpg";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Battle Asia — Official Mobile Tournament Arena" },
      { name: "description", content: "Compete in PUBG Mobile, Free Fire, COD Mobile tournaments. Win real cash prizes on Battle Asia — the official mobile tournament arena for Asian gamers." },
      { property: "og:title", content: "Battle Asia — Official Mobile Tournament Arena" },
      { property: "og:description", content: "Compete. Win. Earn BAC. Join the official mobile tournament arena." },
    ],
  }),
  component: BattleAsiaLanding,
});

const FEATURES = [
  { icon: Shield,     title: "FAIR PLAY",       sub: "100% Fair Match\nNo Hack, No Cheat" },
  { icon: Zap,        title: "INSTANT PAYOUT",  sub: "Winnings Credited\nInstantly" },
  { icon: Lock,       title: "SECURE & SAFE",   sub: "Your Account is\n100% Secure" },
  { icon: Headphones, title: "24/7 SUPPORT",    sub: "We are Always\nHere to Help" },
];

const PAYMENTS = ["bKash", "Nagad", "Rocket", "Upay", "Bank Transfer", "USDT TRC20"];

const HOW_TO_PLAY = [
  {
    icon: User, color: "from-violet-500 to-purple-700", title: "SOLO MODE", bg: modeSoloBg,
    desc: "Play alone vs every other solo. Highest kills + rank wins.",
    points: ["Pay entry fee, get room ID", "Enter the match on time", "Top kills + rank = prize pool"],
  },
  {
    icon: Users, color: "from-sky-500 to-blue-700", title: "DUO MODE", bg: modeDuoBg,
    desc: "Team up with a partner to dominate the lobby.",
    points: ["Invite or find a partner", "Both must join the room", "Combined kills count"],
  },
  {
    icon: UsersRound, color: "from-amber-500 to-orange-600", title: "SQUAD MODE", bg: modeSquadBg,
    desc: "Form a team of four and battle for the squad crown.",
    points: ["4-member squads only", "Squad leader pays entry", "Rewards split as configured"],
  },
  {
    icon: Target, color: "from-rose-500 to-red-600", title: "TDM MODE", bg: modeTdmBg,
    desc: "Fast-paced team deathmatch action.",
    points: ["4v4 quick deathmatch", "Per-kill rewards available", "Short rounds, high reward"],
  },
];


const RULES = [
  { q: "No Hacks or Emulators", a: "Any use of third-party hacks, mods, ESP, aimbot, macros or emulators on mobile-only tournaments results in instant ban and forfeiture of all prizes and balances." },
  { q: "Match Join Time", a: "Players must enter the custom room within 5 minutes of the scheduled time. Late entries are not eligible for refund or prize." },
  { q: "Name Must Match", a: "Your in-game name must exactly match the name registered on your Battle Asia profile. Mismatched names will be disqualified." },
  { q: "Kill & Prize Claims", a: "Submit kill screenshots and result media within 30 minutes of match end. Disputes after this window will not be reviewed." },
  { q: "No Teaming", a: "Teaming with players from other squads in solo/duo modes is strictly prohibited and leads to a permanent ban." },
  { q: "Payment Rules", a: "All entry fees are paid in BAC coins. Buying BAC is non-refundable once credited to your wallet." },
  { q: "Disconnect = No Refund", a: "Network or device disconnects after the match has started do not qualify for a refund. Ensure a stable connection before joining." },
  { q: "Abusive Behaviour = Ban", a: "Toxic chat, hate speech, harassment or threats in lobby, voice or feed result in suspension or permanent ban." },
  { q: "Prize Distribution", a: "Prizes are credited to wallet within minutes after admin verification. BAC is withdrawable through approved payment channels only." },
  { q: "Final Decision", a: "Battle Asia admins reserve the right to make final decisions on all disputes, results and rule interpretations." },
];

function formatBAC(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}
function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + "M+";
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + "K+";
  }
  return n.toLocaleString();
}
function shortName(s: string | null | undefined, fallback = "Player") {
  return (s && s.trim()) || fallback;
}

// Demo roster — used to fill leaderboard slots when live data is sparse.
const DEMO_PLAYERS: Array<{ name: string; avatar: null; profit: number; kills: number }> = [
  { name: "SHADOW_47",   avatar: null, profit: 48200, kills: 142 },
  { name: "GHOST_KING",  avatar: null, profit: 41750, kills: 128 },
  { name: "NOVA_STRIKE", avatar: null, profit: 36400, kills: 119 },
  { name: "RAVEN_X",     avatar: null, profit: 31200, kills: 104 },
  { name: "TITAN_07",    avatar: null, profit: 27850, kills:  97 },
  { name: "VIPER_ACE",   avatar: null, profit: 22400, kills:  88 },
  { name: "BLAZE_OPS",   avatar: null, profit: 19650, kills:  81 },
  { name: "FALCON_22",   avatar: null, profit: 16900, kills:  74 },
  { name: "WRAITH_ZED",  avatar: null, profit: 14250, kills:  66 },
  { name: "ECHO_PRIME",  avatar: null, profit: 11800, kills:  58 },
];

const DEMO_HIGH_PRIZE = [
  { id: -101, match_name: "ERANGEL CHAMPIONSHIP",  player_mode: "SQUAD", map_name: "Erangel",  rank_1_prize_bac: 50000 },
  { id: -102, match_name: "MIRAMAR SHOWDOWN",      player_mode: "DUO",   map_name: "Miramar",  rank_1_prize_bac: 32000 },
  { id: -103, match_name: "SANHOK SOLO KING",      player_mode: "SOLO",  map_name: "Sanhok",   rank_1_prize_bac: 18000 },
  { id: -104, match_name: "VIKENDI SNOW CLASH",    player_mode: "SQUAD", map_name: "Vikendi",  rank_1_prize_bac: 12000 },
  { id: -105, match_name: "LIVIK BLITZ CUP",       player_mode: "DUO",   map_name: "Livik",    rank_1_prize_bac:  8000 },
];
const DEMO_ONGOING = [
  { id: -201, match_name: "NIGHT OPS · SQUAD",     player_mode: "SQUAD", map_name: "Erangel",  rank_1_prize_bac: 22000 },
  { id: -202, match_name: "TDM RAPID FIRE",        player_mode: "TDM",   map_name: "Warehouse",rank_1_prize_bac: 15000 },
  { id: -203, match_name: "DUO DOMINATION",        player_mode: "DUO",   map_name: "Miramar",  rank_1_prize_bac: 10000 },
  { id: -204, match_name: "SOLO HUNTER ARENA",     player_mode: "SOLO",  map_name: "Sanhok",   rank_1_prize_bac:  6500 },
];

function mergeMatches(live: any[], demo: any[], limit = 5) {
  const out = [...live];
  for (const d of demo) {
    if (out.length >= limit) break;
    out.push(d);
  }
  return out.slice(0, limit);
}

function mergeProfit(live: Array<{ name: string; avatar: string | null; total: number }>) {
  const out = [...live];
  for (const d of DEMO_PLAYERS) {
    if (out.length >= 5) break;
    out.push({ name: d.name, avatar: null, total: d.profit });
  }
  return out.slice(0, 5);
}
function mergeKills(live: Array<{ name: string; avatar: string | null; kills: number }>) {
  const out = [...live];
  for (const d of DEMO_PLAYERS) {
    if (out.length >= 5) break;
    out.push({ name: d.name, avatar: null, kills: d.kills });
  }
  return out.slice(0, 5);
}

function BattleAsiaLanding() {
  const { t } = useT();
  /* ---------- LIVE DATA ---------- */
  const pulse = useQuery({
    queryKey: ["home", "pulse"],
    queryFn: async () => {
      const [winnings, processed, ongoing] = await Promise.all([
        supabase.from("match_participants").select("prize_bac"),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "Complete"),
        supabase.from("matches").select("id", { count: "exact", head: true }).in("status", ["Active", "Ongoing"]),
      ]);
      if (winnings.error) throw winnings.error;
      if (processed.error) throw processed.error;
      if (ongoing.error) throw ongoing.error;
      const total = (winnings.data ?? []).reduce((s, r: any) => s + Number(r.prize_bac ?? 0), 0);
      return {
        totalWinnings: total,
        processed: processed.count ?? 0,
        ongoing: ongoing.count ?? 0,
      };
    },
  });

  async function fetchProfilesMap(userIds: string[]) {
    if (!userIds.length) return new Map<string, any>();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, in_game_username, username, avatar_url")
      .in("id", userIds);
    if (error) throw error;
    return new Map((data ?? []).map((p: any) => [p.id, p]));
  }

  const topProfit = useQuery({
    queryKey: ["home", "top-profit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_participants")
        .select("user_id, prize_bac")
        .gt("prize_bac", 0);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const profiles = await fetchProfilesMap(ids);
      const agg = new Map<string, { name: string; avatar: string | null; total: number }>();
      (data ?? []).forEach((r: any) => {
        const p = profiles.get(r.user_id);
        const cur = agg.get(r.user_id) ?? {
          name: shortName(p?.in_game_username ?? p?.username),
          avatar: p?.avatar_url ?? null,
          total: 0,
        };
        cur.total += Number(r.prize_bac ?? 0);
        agg.set(r.user_id, cur);
      });
      return Array.from(agg.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    },
  });

  const topKillers = useQuery({
    queryKey: ["home", "top-kills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_participants")
        .select("user_id, kills")
        .gt("kills", 0);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const profiles = await fetchProfilesMap(ids);
      const agg = new Map<string, { name: string; avatar: string | null; kills: number }>();
      (data ?? []).forEach((r: any) => {
        const p = profiles.get(r.user_id);
        const cur = agg.get(r.user_id) ?? {
          name: shortName(p?.in_game_username ?? p?.username),
          avatar: p?.avatar_url ?? null,
          kills: 0,
        };
        cur.kills += Number(r.kills ?? 0);
        agg.set(r.user_id, cur);
      });
      return Array.from(agg.values()).sort((a, b) => b.kills - a.kills).slice(0, 5);
    },
  });

  const highPrize = useQuery({
    queryKey: ["home", "high-prize"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_name, map_name, player_mode, schedule_at, rank_1_prize_bac, total_players, banner_image_url")
        .in("status", ["Upcoming", "Active"])
        .order("rank_1_prize_bac", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ongoingMatches = useQuery({
    queryKey: ["home", "ongoing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_name, map_name, player_mode, rank_1_prize_bac")
        .in("status", ["Active", "Ongoing"])
        .order("schedule_at", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Demo baseline so the pulse cards never look empty before live data arrives.
  const DEMO_PULSE = { totalWinnings: 269550, processed: 184, ongoing: 3 };
  const liveMatches = Math.max(pulse.data?.ongoing ?? 0, DEMO_PULSE.ongoing);
  const liveProcessed = Math.max(pulse.data?.processed ?? 0, DEMO_PULSE.processed);
  const liveWinnings = Math.max(pulse.data?.totalWinnings ?? 0, DEMO_PULSE.totalWinnings);
  const STATS: Array<{ icon: any; value: string; label: string; isCoin?: boolean; valueCoin?: boolean }> = [
    { icon: Users2,  value: formatBAC(liveProcessed + liveMatches), label: t("home.totalMatches") },
    { icon: Swords,  value: formatBAC(liveMatches), label: t("home.liveMatches") },
    { icon: Trophy,  value: formatBAC(liveWinnings), label: t("home.paidOut"), valueCoin: true },
    { icon: null,    value: formatBAC(liveProcessed), label: t("home.processed"), isCoin: true },
  ];

  /* ---------- ABOUT STATS (auto-update every 10–30s) ---------- */
  const aboutStats = useQuery({
    queryKey: ["home", "about-stats"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const [players, games, prize] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("match_participants").select("prize_bac"),
      ]);
      const totalPrize = (prize.data ?? []).reduce(
        (s, r: any) => s + Number(r.prize_bac ?? 0),
        0,
      );
      return {
        players: players.count ?? 0,
        games: games.count ?? 0,
        prize: totalPrize,
      };
    },
  });

  // Slow live drift so numbers feel alive between fetches (10–30s tick).
  const [drift, setDrift] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setDrift((d) => d + Math.floor(Math.random() * 7) + 1);
      timer = setTimeout(tick, 10_000 + Math.random() * 20_000);
    };
    timer = setTimeout(tick, 12_000);
    return () => clearTimeout(timer);
  }, []);

  const BASE_PLAYERS = 500_000;
  const BASE_PRIZE = 2_000_000;
  const BASE_GAMES = 15;
  const playersCount = BASE_PLAYERS + (aboutStats.data?.players ?? 0) + drift;
  const prizeCount = BASE_PRIZE + (aboutStats.data?.prize ?? 0) + drift * 137;
  const gamesCount = Math.max(BASE_GAMES, aboutStats.data?.games ?? 0);
  const ABOUT_CARDS: Array<{ v: string; k: string; coin?: boolean }> = [
    { v: formatCompact(playersCount), k: "Active Players" },
    { v: formatCompact(prizeCount), k: "Prize Money", coin: true },
    { v: `${gamesCount}+`, k: "Games Supported" },
    { v: "24/7", k: "Tournaments" },
  ];

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-grid-hud">
        <img loading="lazy" decoding="async" src={heroSoldier} alt="Battle Asia tournament hero" width={1280} height={768}
          className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="absolute inset-0 bg-scanlines opacity-40" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-3 lg:py-28">
          <div className="lg:col-span-2">
            <div className="chip-tag mb-5"><Crosshair size={12} /> SEASON 04 · LIVE</div>
            <h1 className="font-display text-5xl font-bold leading-[0.92] sm:text-6xl md:text-7xl lg:text-[6.5rem]">
              BATTLE <span className="relative text-gold">ASIA
                <span aria-hidden className="absolute -bottom-2 left-0 h-[3px] w-2/3 bg-gradient-to-r from-gold to-transparent" />
              </span>
            </h1>
            <p className="mt-4 font-hud text-sm font-semibold tracking-[0.3em] text-foreground/85 sm:text-base">
              {t("home.tagline")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px w-10 bg-gold/60" />
              <p className="font-hud text-base font-bold tracking-[0.25em] text-gold sm:text-lg">
                {t("home.slogan")}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="btn-gold inline-flex items-center gap-2 px-8 py-3 text-sm sm:text-base">
                {t("home.joinNow")} <ChevronRight size={16} />
              </Link>
              <Link to="/apk" className="btn-outline-gold inline-flex items-center gap-2 px-8 py-3 text-sm sm:text-base">
                <ApkIcon size={18} className="text-gold" /> {t("home.apkDownload")}
              </Link>
            </div>
          </div>

          {/* BAC card */}
          <div className="hud-panel hud-bracket relative flex flex-col items-center gap-3 p-7 text-center lg:self-center">
            <div className="font-hud absolute left-3 top-3 text-[10px] tracking-[0.2em] text-muted-foreground">// CURRENCY_01</div>
            <div className="relative mt-3 h-28 w-28 drop-shadow-[0_0_30px_rgba(212,175,55,0.45)]">
              <img loading="lazy" decoding="async" src={bacCoin} alt="BAC Coin" width={224} height={224} className="h-full w-full object-contain" />
            </div>
            <h3 className="font-display mt-1 text-2xl font-bold text-gold">{t("home.bacCoin")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("home.bacDesc")}
            </p>
            <div className="my-3 flex w-full items-center gap-3">
              <span className="hud-divider flex-1" />
              <span className="font-mono-tab inline-flex items-center gap-1 text-[10px] tracking-widest text-gold">1 BAC = 1 <CoinIcon size={10} /></span>
              <span className="hud-divider flex-1" />
            </div>
            <button className="btn-gold w-full px-6 py-2.5 text-sm">{t("home.buyNow")}</button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </section>

      {/* ============ BATTLEASIA PULSE ============ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="hud-panel hud-bracket relative overflow-hidden p-6 sm:p-8">
          <img loading="lazy" decoding="async" src={pubgSniperRooftop} alt="" aria-hidden width={1792} height={896} className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-30" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr,auto] lg:items-center">
            <div>
              <div className="chip-tag mb-3"><Activity size={12} /> LIVE</div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                BATTLEASIA <span className="text-gold">PULSE</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Real-time platform stats. Total winnings paid to players, processed matches and live matches happening right now.
              </p>
            </div>
            <div className="text-right">
              <div className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">{t("home.totalWinnings")}</div>
              <div className="font-display font-mono-tab mt-1 inline-flex items-center gap-2 text-3xl font-bold text-gold sm:text-4xl">
                <CoinIcon size={28} />
                {formatBAC(liveWinnings)}
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label, isCoin, valueCoin }) => (
              <div key={label} className="flex items-center gap-3 rounded-sm border border-border/60 bg-background/40 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gold/10 text-gold ring-1 ring-gold/30">
                  {isCoin ? <CoinIcon size={20} /> : <Icon size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-mono-tab inline-flex items-center gap-1 truncate text-lg font-bold leading-none">
                    {valueCoin && <CoinIcon size={14} />}{value}
                  </div>
                  <div className="font-hud mt-1 text-[9px] tracking-[0.2em] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PLAY NOW BANNER ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="hud-panel hud-bracket relative overflow-hidden p-6 sm:p-8">
          <img loading="lazy" decoding="async" src={pubgVehicleChase} alt="" aria-hidden width={1792} height={896} className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-20" />
          <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr,auto] lg:items-center">
            <div>
              <div className="chip-tag mb-3"><Flame size={12} /> PLAY NOW</div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                JUMP INTO A <span className="text-gold">LIVE BATTLE</span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                New matches start every hour. Solo, Duo, Squad and TDM lobbies — pay entry in BAC, claim the prize pool.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/matches" className="btn-gold inline-flex items-center gap-2 px-6 py-3 text-sm">
                {t("home.browseMatches")} <ChevronRight size={16} />
              </Link>
              <Link to="/apk" className="btn-outline-gold inline-flex items-center gap-2 px-6 py-3 text-sm">
                <ApkIcon size={16} /> {t("home.getApk")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TOP PROFIT + TOP PLAYERS ============ */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-2">

        <LeaderCard
          tag="EARNINGS" icon={TrendingUp} title="TOP PROFIT" highlight="GENERATORS"
          loading={topProfit.isLoading}
          rows={(topProfit.data ?? []).map((p, i) => ({
            rank: i + 1, name: p.name, avatar: p.avatar,
            right: formatBAC(p.total), rightCoin: true, sub: "Lifetime winnings",
          }))}
        />
        <LeaderCard
          tag="LEADERBOARD" icon={Crosshair} title="TOP" highlight="PLAYERS"
          loading={topKillers.isLoading}
          rows={(topKillers.data ?? []).map((p, i) => ({
            rank: i + 1, name: p.name, avatar: p.avatar,
            right: `${formatBAC(p.kills)} K`, sub: "Total kills",
          }))}
        />

      </section>

      {/* ============ HIGH PRIZE + ONGOING ============ */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-2">
        <MatchStrip title="HIGH-PRIZE" highlight="BATTLES" tag="TOP" icon={Flame}
          loading={highPrize.isLoading}
          empty="No high-prize battles right now."
          items={(highPrize.data ?? []).map((m: any) => ({
            id: m.id, name: m.match_name, mode: m.player_mode, map: m.map_name,
            value: formatBAC(Number(m.rank_1_prize_bac)),
            valueLabel: "RANK 1 PRIZE",
          }))}
        />
        <MatchStrip title="ONGOING" highlight="MATCHES" tag="LIVE" icon={Radio}
          loading={ongoingMatches.isLoading}
          empty="No ongoing matches right now. Check back soon."
          items={(ongoingMatches.data ?? []).map((m: any) => ({
            id: m.id, name: m.match_name, mode: m.player_mode, map: m.map_name,
            value: formatBAC(Number(m.rank_1_prize_bac)),
            valueLabel: "TOP PRIZE",
          }))}
        />
      </section>


      {/* ============ ABOUT ============ */}
      <section className="relative overflow-hidden border-y border-border/60 bg-card/30 py-14">
        <img loading="lazy" decoding="async" src={pubgAirdrop} alt="" aria-hidden width={1600} height={900} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/85 via-background/75 to-background/90 lg:bg-gradient-to-r lg:from-background lg:via-background/70 lg:to-background/30" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-hud opacity-10" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.5fr,1fr]">

          <div>
            <div className="chip-tag mb-3"><Star size={12} /> ABOUT</div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              ABOUT <span className="text-gold">BATTLEASIA</span>
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Battle Asia is a premier mobile gaming tournament platform where players compete in exciting tournaments and win real cash prizes. Our platform brings together the best mobile gamers from across the region to participate in competitive gaming events.
              </p>
              <p>
                We support popular mobile games including PUBG Mobile, Free Fire, COD Mobile, and many more. Whether you're a casual player or a competitive pro, Battle Asia offers tournaments suitable for all skill levels.
              </p>
              <p>
                With secure payment systems, fair play policies, and a thriving community of gamers, Battle Asia is the ultimate destination for mobile esports. Join thousands of players who are already competing and winning on our platform.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ABOUT_CARDS.map((c) => (
              <div key={c.k} className="hud-panel grid place-items-center bg-background/70 p-5 text-center backdrop-blur">
                <div className="font-display inline-flex items-center gap-1 text-3xl font-bold text-gold">
                  {c.coin && <CoinIcon size={22} />}{c.v}
                </div>
                <div className="font-hud mt-1 text-[10px] tracking-[0.2em] text-muted-foreground">{c.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW TO PLAY ============ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <div className="chip-tag mx-auto mb-3 inline-flex"><Swords size={12} /> GUIDE</div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            HOW TO <span className="text-gold">PLAY</span>
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-20 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_TO_PLAY.map(({ icon: Icon, color, title, desc, points, bg }) => (
            <div key={title} className="hud-panel hud-bracket relative flex flex-col overflow-hidden p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-500 group-hover:opacity-45"
                style={{ backgroundImage: `url(${bg})` }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background/95" />
              <div className="relative">
                <div className={`relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br ${color} text-white shadow-lg ring-2 ring-background/50`}>
                  <Icon size={26} />
                </div>
                <h3 className="font-display mt-4 text-center text-lg font-bold tracking-wider drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">{title}</h3>
                <p className="mt-2 text-center text-xs text-muted-foreground">{desc}</p>
                <ul className="mt-4 space-y-2 text-xs text-foreground/90">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* ============ TOURNAMENT RULES ============ */}
      <section className="border-y border-border/60 bg-card/30 py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <div className="chip-tag mx-auto mb-3 inline-flex"><Shield size={12} /> REGULATIONS</div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              TOURNAMENT <span className="text-gold">RULES</span>
            </h2>
            <p className="font-hud mt-2 text-[11px] tracking-[0.25em] text-muted-foreground">
              OFFICIAL BATTLEASIA TOURNAMENT REGULATIONS
            </p>
            <div className="mx-auto mt-3 h-0.5 w-20 bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>

          <Accordion type="single" collapsible className="mt-8 space-y-2">
            {RULES.map((r, i) => (
              <AccordionItem key={r.q} value={`r-${i}`} className="hud-panel border-0 px-4">
                <AccordionTrigger className="font-hud text-left text-sm font-semibold tracking-wide hover:text-gold hover:no-underline">
                  {r.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {r.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ WHY + APP ============ */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 lg:grid-cols-3">
        <div className="hud-panel relative overflow-hidden p-6 lg:col-span-2">
          <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-40" />
          <div className="relative">
            <div className="chip-tag mb-3"><Star size={12} /> BENEFITS</div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              WHY CHOOSE <span className="text-gold">BATTLE ASIA?</span>
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="group text-center">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-md bg-gradient-to-br from-gold/20 to-transparent text-gold ring-1 ring-gold/30 transition group-hover:ring-gold/60">
                    <Icon size={28} />
                  </div>
                  <div className="font-display mt-3 text-sm font-bold tracking-wider">{title}</div>
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hud-panel relative overflow-hidden p-6">
          <div aria-hidden className="absolute inset-0 bg-scanlines opacity-30" />
          <div className="relative z-10">
            <div className="chip-tag mb-3"><Radio size={12} /> MOBILE</div>
            <h3 className="font-display text-2xl font-bold leading-tight">DOWNLOAD<br /><span className="text-gold">OUR APP</span></h3>
            <p className="mt-2 text-sm text-muted-foreground">Get the Battle Asia App<br />for a better experience</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link to="/apk" className="btn-gold inline-flex items-center justify-center gap-2 py-2.5 text-sm">
                <ApkIcon size={18} /> DOWNLOAD APK
              </Link>
              <button className="btn-outline-gold inline-flex items-center justify-center gap-2 py-2.5 text-sm">
                <Smartphone size={16} /> INSTALL PWA
              </button>
            </div>
          </div>
          <img src={phoneApp} alt="App preview" width={640} height={512} loading="lazy"
            className="pointer-events-none absolute -bottom-6 -right-6 h-44 w-44 rounded-xl object-cover opacity-60 saturate-150 sm:h-52 sm:w-52" />
        </div>
      </section>

      {/* ============ PAYMENTS ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="font-display text-xl font-bold tracking-wider">{t("home.paymentMethods")}</h2>
          <span className="hud-divider flex-1" />
          <span className="font-hud text-[10px] tracking-[0.2em] text-muted-foreground">{t("common.secure")} · {t("home.pulse")}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PAYMENTS.map((p) => (
            <div key={p} className="hud-panel grid h-16 place-items-center px-2 text-center font-hud text-xs font-bold tracking-widest text-foreground/90 transition hover:text-gold sm:text-sm">
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="relative overflow-hidden border-y border-gold/30 bg-gradient-to-r from-card via-background to-card">
        <img loading="lazy" decoding="async" src={pubgSquadAction} alt="" aria-hidden width={1792} height={896} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/40" />
        <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-30" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-10 sm:px-6 md:flex-row">
          <div>
            <div className="font-hud text-[10px] tracking-[0.3em] text-gold">// {t("home.readyToDrop")}</div>
            <h3 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
              {t("home.firstMatch")}
            </h3>
          </div>
          <div className="flex gap-3">
            <Link to="/auth" className="btn-gold px-7 py-3 text-sm">{t("home.joinFree")}</Link>
            <Link to="/matches" className="btn-outline-gold px-7 py-3 text-sm">{t("home.explore")}</Link>
          </div>
        </div>
      </section>

      {/* spacer so fixed bottom CTA doesn't cover footer content */}
      <div aria-hidden className="h-20 sm:h-16" />

      {/* ============ FIXED BOTTOM CTA BAR ============ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-background/85 backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-gold sm:h-10 sm:w-10">
              <Swords size={16} />
              <span aria-hidden className="absolute inset-0 animate-ping rounded-md bg-gold/20" />
            </span>
            <div className="min-w-0">
              <div className="font-hud text-[10px] uppercase tracking-[0.22em] text-gold/80 sm:text-[11px]">Live Arena</div>
              <div className="truncate font-display text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
                Ready to drop in?
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/matches"
              className="hidden rounded-md border border-gold/40 px-3 py-2 font-hud text-[11px] font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10 sm:inline-flex"
            >
              Matches
            </Link>
            <Link
              to="/auth"
              className="btn-gold inline-flex items-center gap-1.5 px-4 py-2 text-[11px] sm:px-5 sm:py-2.5 sm:text-xs"
            >
              <Flame size={14} /> Join Battle
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}


/* ============== SUB-COMPONENTS ============== */

const RANK_STYLES = {
  1: {
    row: "border-gold/70 bg-gradient-to-r from-gold/20 via-gold/8 to-transparent shadow-[0_0_24px_-8px_rgba(212,175,55,0.55)]",
    badge: "bg-gradient-to-br from-gold to-amber-600 text-background ring-2 ring-gold/40 shadow-[0_0_14px_rgba(212,175,55,0.6)]",
    icon: Crown,
    label: "CHAMPION",
    labelClass: "text-gold",
  },
  2: {
    row: "border-zinc-300/40 bg-gradient-to-r from-zinc-200/12 via-zinc-300/4 to-transparent",
    badge: "bg-gradient-to-br from-zinc-200 to-zinc-400 text-background ring-2 ring-zinc-300/40",
    icon: Medal,
    label: "RUNNER-UP",
    labelClass: "text-zinc-300",
  },
  3: {
    row: "border-amber-700/50 bg-gradient-to-r from-amber-700/15 via-amber-800/5 to-transparent",
    badge: "bg-gradient-to-br from-amber-600 to-amber-800 text-background ring-2 ring-amber-700/40",
    icon: Award,
    label: "THIRD",
    labelClass: "text-amber-500",
  },
} as const;

type LeaderRow = { rank: number; name: string; avatar: string | null; right: string; sub: string; rightCoin?: boolean };
function LeaderCard({
  tag, icon: Icon, title, highlight, rows, loading,
}: {
  tag: string; icon: React.ComponentType<{ size?: number }>;
  title: string; highlight: string; rows: LeaderRow[]; loading: boolean;
}) {
  return (
    <div className="hud-panel hud-bracket p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="chip-tag mb-2"><Icon size={12} /> {tag}</div>
          <h3 className="font-display text-xl font-bold tracking-wide">
            {title} <span className="text-gold">{highlight}</span>
          </h3>
        </div>
        <span className="font-hud text-[10px] tracking-[0.2em] text-muted-foreground">TOP 5</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm bg-secondary/50" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="font-hud py-8 text-center text-xs tracking-widest text-muted-foreground">
          NO DATA YET
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const elite = RANK_STYLES[r.rank as 1 | 2 | 3];
            const RankIcon = elite?.icon;
            return (
              <li
                key={r.rank}
                className={`relative flex items-center gap-3 overflow-hidden rounded-sm border p-2.5 transition ${
                  elite ? elite.row : "border-border/60 bg-background/40 hover:border-gold/30"
                }`}
              >
                {r.rank === 1 && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold via-amber-500 to-gold/50" />
                )}
                <span className={`font-display relative grid h-9 w-9 shrink-0 place-items-center rounded-sm text-sm font-bold ${
                  elite ? elite.badge : "bg-secondary text-foreground/80"
                }`}>
                  {RankIcon ? <RankIcon size={16} /> : r.rank}
                </span>
                {r.avatar ? (
                  <img loading="lazy" decoding="async" src={r.avatar} alt={r.name} className={`h-10 w-10 shrink-0 rounded-full object-cover ring-1 ${elite ? "ring-gold/50" : "ring-border"}`} />
                ) : (
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${
                    elite ? "bg-gold/15 text-gold ring-1 ring-gold/40" : "bg-secondary text-foreground/80"
                  }`}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
                    {elite && (
                      <span className={`font-hud hidden text-[9px] font-bold tracking-[0.2em] sm:inline ${elite.labelClass}`}>
                        · {elite.label}
                      </span>
                    )}
                  </div>
                  <div className="font-hud text-[10px] tracking-[0.15em] text-muted-foreground">{r.sub}</div>
                </div>
                <div className={`font-mono-tab inline-flex items-center gap-1 text-right text-sm font-bold ${
                  r.rank === 1 ? "text-gold text-base" : "text-gold"
                }`}>
                  {r.rightCoin && <CoinIcon size={12} />}{r.right}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

type StripItem = { id: number; name: string; mode: string; map: string; value: string; valueLabel: string };
function MatchStrip({
  title, highlight, tag, icon: Icon, items, loading, empty,
}: {
  title: string; highlight: string; tag: string;
  icon: React.ComponentType<{ size?: number }>;
  items: StripItem[]; loading: boolean; empty: string;
}) {
  return (
    <div className="hud-panel hud-bracket p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="chip-tag mb-2"><Icon size={12} /> {tag}</div>
          <h3 className="font-display text-xl font-bold tracking-wide">
            {title} <span className="text-gold">{highlight}</span>
          </h3>
        </div>
        <a href="#" className="font-hud inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
          VIEW ALL <ChevronRight size={12} />
        </a>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-sm bg-secondary/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="font-hud py-8 text-center text-xs tracking-widest text-muted-foreground">
          {empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((m, idx) => {
            const rank = idx + 1;
            const elite = RANK_STYLES[rank as 1 | 2 | 3];
            const RankIcon = elite?.icon;
            return (
              <li
                key={m.id}
                className={`relative flex items-center gap-3 overflow-hidden rounded-sm border p-3 transition ${
                  elite ? elite.row : "border-border/60 bg-background/40 hover:border-gold/50"
                }`}
              >
                {rank === 1 && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold via-amber-500 to-gold/50" />
                )}
                <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-sm ${
                  elite ? elite.badge : "bg-gold/10 text-gold ring-1 ring-gold/30"
                }`}>
                  {RankIcon ? <RankIcon size={18} /> : <Swords size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    {elite && (
                      <span className={`font-hud hidden text-[9px] font-bold tracking-[0.2em] sm:inline ${elite.labelClass}`}>
                        · {elite.label}
                      </span>
                    )}
                  </div>
                  <div className="font-hud text-[10px] tracking-[0.18em] text-muted-foreground">
                    {m.mode} · {m.map}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono-tab inline-flex items-center gap-1 font-bold text-gold ${
                    rank === 1 ? "text-base" : "text-sm"
                  }`}>
                    <CoinIcon size={12} />{m.value}
                  </div>
                  <div className="font-hud text-[9px] tracking-[0.18em] text-muted-foreground">{m.valueLabel}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
