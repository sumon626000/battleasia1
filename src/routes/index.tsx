import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Swords, Trophy, Shield, Zap, Lock, Headphones,
  Smartphone, Download, ChevronRight, Crosshair,
  Radio, Flame, Star, TrendingUp, Activity, Users2,
  User, Users, UsersRound, Crosshair as Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CoinIcon } from "@/components/site/CoinIcon";
import { useT } from "@/lib/i18n";
import heroSoldier from "@/assets/hero-soldier.jpg";
import phoneApp from "@/assets/phone-app.jpg";
import bacCoin from "@/assets/battleasia-coin.png";

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
    icon: User, color: "from-violet-500 to-purple-700", title: "SOLO MODE",
    desc: "Play alone vs every other solo. Highest kills + rank wins.",
    points: ["Pay entry fee, get room ID", "Enter the match on time", "Top kills + rank = prize pool"],
  },
  {
    icon: Users, color: "from-sky-500 to-blue-700", title: "DUO MODE",
    desc: "Team up with a partner to dominate the lobby.",
    points: ["Invite or find a partner", "Both must join the room", "Combined kills count"],
  },
  {
    icon: UsersRound, color: "from-amber-500 to-orange-600", title: "SQUAD MODE",
    desc: "Form a team of four and battle for the squad crown.",
    points: ["4-member squads only", "Squad leader pays entry", "Rewards split as configured"],
  },
  {
    icon: Target, color: "from-rose-500 to-red-600", title: "TDM MODE",
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
function shortName(s: string | null | undefined, fallback = "Player") {
  return (s && s.trim()) || fallback;
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
      const total = (winnings.data ?? []).reduce((s, r: any) => s + Number(r.prize_bac ?? 0), 0);
      return {
        totalWinnings: total,
        processed: processed.count ?? 0,
        ongoing: ongoing.count ?? 0,
      };
    },
  });

  const topProfit = useQuery({
    queryKey: ["home", "top-profit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_participants")
        .select("user_id, prize_bac, profiles:user_id(in_game_username, username, avatar_url)")
        .gt("prize_bac", 0);
      const agg = new Map<string, { name: string; avatar: string | null; total: number }>();
      (data ?? []).forEach((r: any) => {
        const cur = agg.get(r.user_id) ?? {
          name: shortName(r.profiles?.in_game_username ?? r.profiles?.username),
          avatar: r.profiles?.avatar_url ?? null,
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
      const { data } = await supabase
        .from("match_participants")
        .select("user_id, kills, profiles:user_id(in_game_username, username, avatar_url)")
        .gt("kills", 0);
      const agg = new Map<string, { name: string; avatar: string | null; kills: number }>();
      (data ?? []).forEach((r: any) => {
        const cur = agg.get(r.user_id) ?? {
          name: shortName(r.profiles?.in_game_username ?? r.profiles?.username),
          avatar: r.profiles?.avatar_url ?? null,
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
      const { data } = await supabase
        .from("matches")
        .select("id, match_name, map_name, player_mode, schedule_at, rank_1_prize_bac, total_players, banner_image_url")
        .in("status", ["Upcoming", "Active"])
        .order("rank_1_prize_bac", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const ongoingMatches = useQuery({
    queryKey: ["home", "ongoing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, match_name, map_name, player_mode, rank_1_prize_bac")
        .in("status", ["Active", "Ongoing"])
        .order("schedule_at", { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  const STATS: Array<{ icon: any; value: string; label: string; isCoin?: boolean; valueCoin?: boolean }> = [
    { icon: Users2,  value: pulse.data ? `${formatBAC(pulse.data.processed + pulse.data.ongoing)}` : "—", label: t("home.totalMatches") },
    { icon: Swords,  value: pulse.data ? formatBAC(pulse.data.ongoing) : "—", label: t("home.liveMatches") },
    { icon: Trophy,  value: pulse.data ? formatBAC(pulse.data.totalWinnings) : "—", label: t("home.paidOut"), valueCoin: true },
    { icon: null,    value: pulse.data ? formatBAC(pulse.data.processed) : "—", label: t("home.processed"), isCoin: true },
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
              <button className="btn-outline-gold px-8 py-3 text-sm sm:text-base">{t("home.apkDownload")}</button>
            </div>
          </div>

          {/* BAC card */}
          <div className="hud-panel hud-bracket relative flex flex-col items-center gap-3 p-7 text-center lg:self-center">
            <div className="font-hud absolute left-3 top-3 text-[10px] tracking-[0.2em] text-muted-foreground">// CURRENCY_01</div>
            <div className="relative mt-3 h-28 w-28 drop-shadow-[0_0_30px_rgba(212,175,55,0.45)]">
              <img loading="lazy" decoding="async" src={bacCoin} alt="BAC Coin" width={224} height={224} className="h-full w-full object-contain" />
            </div>
            <h3 className="font-display mt-1 text-2xl font-bold text-gold">BAC COIN</h3>
            <p className="text-sm text-muted-foreground">
              The Official Currency of<br />Battle Asia Ecosystem
            </p>
            <div className="my-3 flex w-full items-center gap-3">
              <span className="hud-divider flex-1" />
              <span className="font-mono-tab inline-flex items-center gap-1 text-[10px] tracking-widest text-gold">1 BAC = 1 <CoinIcon size={10} /></span>
              <span className="hud-divider flex-1" />
            </div>
            <button className="btn-gold w-full px-6 py-2.5 text-sm">BUY NOW</button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </section>

      {/* ============ BATTLEASIA PULSE ============ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="hud-panel hud-bracket relative overflow-hidden p-6 sm:p-8">
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
              <div className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">PLATFORM TOTAL WINNINGS</div>
              <div className="font-display font-mono-tab mt-1 inline-flex items-center gap-2 text-3xl font-bold text-gold sm:text-4xl">
                <CoinIcon size={28} />
                {pulse.data ? formatBAC(pulse.data.totalWinnings) : "—"}
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
                BROWSE MATCHES <ChevronRight size={16} />
              </Link>
              <Link to="/apk" className="btn-outline-gold inline-flex items-center gap-2 px-6 py-3 text-sm">
                <Download size={14} /> GET APK
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
      <section className="border-y border-border/60 bg-card/30 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.5fr,1fr]">
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
            {[
              { v: "500K+", k: "Active Players" },
              { v: "2M+", k: "Prize Money", coin: true },
              { v: "15+", k: "Games Supported" },
              { v: "24/7", k: "Tournaments" },
            ].map((c) => (
              <div key={c.k} className="hud-panel grid place-items-center p-5 text-center">
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
          {HOW_TO_PLAY.map(({ icon: Icon, color, title, desc, points }) => (
            <div key={title} className="hud-panel hud-bracket flex flex-col p-6">
              <div className={`relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br ${color} text-white shadow-lg`}>
                <Icon size={26} />
              </div>
              <h3 className="font-display mt-4 text-center text-lg font-bold tracking-wider">{title}</h3>
              <p className="mt-2 text-center text-xs text-muted-foreground">{desc}</p>
              <ul className="mt-4 space-y-2 text-xs text-foreground/85">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
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
              <button className="btn-gold inline-flex items-center justify-center gap-2 py-2.5 text-sm">
                <Download size={16} /> DOWNLOAD APK
              </button>
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
          <h2 className="font-display text-xl font-bold tracking-wider">PAYMENT METHODS</h2>
          <span className="hud-divider flex-1" />
          <span className="font-hud text-[10px] tracking-[0.2em] text-muted-foreground">SECURE · INSTANT</span>
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
        <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-30" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-10 sm:px-6 md:flex-row">
          <div>
            <div className="font-hud text-[10px] tracking-[0.3em] text-gold">// READY TO DROP</div>
            <h3 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
              YOUR FIRST MATCH IS <span className="text-gold">ONE TAP AWAY</span>
            </h3>
          </div>
          <div className="flex gap-3">
            <Link to="/auth" className="btn-gold px-7 py-3 text-sm">JOIN FREE</Link>
            <button className="btn-outline-gold px-7 py-3 text-sm">EXPLORE</button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============== SUB-COMPONENTS ============== */

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
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.rank} className="flex items-center gap-3 rounded-sm border border-border/60 bg-background/40 p-2.5">
              <span className={`font-display grid h-7 w-7 shrink-0 place-items-center rounded-sm text-sm font-bold ${
                r.rank === 1 ? "bg-gold text-background" :
                r.rank === 2 ? "bg-foreground/80 text-background" :
                r.rank === 3 ? "bg-amber-700 text-background" :
                "bg-secondary text-foreground"
              }`}>{r.rank}</span>
              {r.avatar ? (
                <img loading="lazy" decoding="async" src={r.avatar} alt={r.name} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-bold text-foreground/80">
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.name}</div>
                <div className="font-hud text-[10px] tracking-[0.15em] text-muted-foreground">{r.sub}</div>
              </div>
              <div className="font-mono-tab inline-flex items-center gap-1 text-right text-sm font-bold text-gold">
                {r.rightCoin && <CoinIcon size={12} />}{r.right}
              </div>
            </li>
          ))}
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
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-sm border border-border/60 bg-background/40 p-3 transition hover:border-gold/50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-gold/10 text-gold ring-1 ring-gold/30">
                <Swords size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="font-hud text-[10px] tracking-[0.18em] text-muted-foreground">
                  {m.mode} · {m.map}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono-tab inline-flex items-center gap-1 text-sm font-bold text-gold">
                  <CoinIcon size={12} />{m.value}
                </div>
                <div className="font-hud text-[9px] tracking-[0.18em] text-muted-foreground">{m.valueLabel}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
