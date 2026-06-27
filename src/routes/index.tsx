import { createFileRoute } from "@tanstack/react-router";
import {
  Users, Swords, Trophy, Coins, Shield, Zap, Lock, Headphones,
  Smartphone, Download, ChevronRight, Crosshair,
  Radio, Flame, Star,
} from "lucide-react";
import heroSoldier from "@/assets/hero-soldier.jpg";
import matchSolo from "@/assets/match-solo.jpg";
import matchSquad from "@/assets/match-squad.jpg";
import matchDuo from "@/assets/match-duo.jpg";
import phoneApp from "@/assets/phone-app.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Battle Asia — Official Mobile Tournament Arena" },
      { name: "description", content: "Compete in mobile tournaments, win BAC coins, and climb the Battle Asia leaderboard. The official mobile tournament arena for elite gamers across Asia." },
      { property: "og:title", content: "Battle Asia — Official Mobile Tournament Arena" },
      { property: "og:description", content: "Compete. Win. Earn BAC. Join the official mobile tournament arena." },
    ],
  }),
  component: BattleAsiaLanding,
});



const STATS = [
  { icon: Users,  value: "12,548",     label: "ONLINE USERS" },
  { icon: Swords, value: "24",         label: "LIVE MATCHES" },
  { icon: Trophy, value: "৳2,45,300",  label: "PRIZE POOL" },
  { icon: Coins,  value: "3,25,000",   label: "BAC CIRCULATION" },
];

const MATCHES = [
  { img: matchSolo,  status: "OPEN", title: "SOLO WARZONE", mode: "TPP · SOLO",  entry: "50 BAC",  prize: "1,500 BAC", players: "45/100", cta: "JOIN NOW",    live: false, hot: true  },
  { img: matchSquad, status: "LIVE", title: "SQUAD CLASH",  mode: "TPP · SQUAD", entry: "100 BAC", prize: "5,000 BAC", players: "80/100", cta: "VIEW MATCH",  live: true,  hot: true  },
  { img: matchDuo,   status: "OPEN", title: "DUO RUMBLE",   mode: "FPP · DUO",   entry: "80 BAC",  prize: "2,500 BAC", players: "32/50",  cta: "JOIN NOW",    live: false, hot: false },
];

const FEATURES = [
  { icon: Shield,     title: "FAIR PLAY",       sub: "100% Fair Match\nNo Hack, No Cheat" },
  { icon: Zap,        title: "INSTANT PAYOUT",  sub: "Winnings Credited\nInstantly" },
  { icon: Lock,       title: "SECURE & SAFE",   sub: "Your Account is\n100% Secure" },
  { icon: Headphones, title: "24/7 SUPPORT",    sub: "We are Always\nHere to Help" },
];

const PAYMENTS = ["bKash", "Nagad", "Rocket", "Upay", "Bank Transfer", "USDT TRC20"];

const TICKER = [
  "⚡ SQUAD CLASH LIVE NOW · 80/100",
  "🏆 WEEKLY PRIZE POOL ৳2,45,300",
  "🔥 NEW MAP: ERANGEL UNLOCKED",
  "💰 BUY 1000 BAC · GET 10% BONUS",
  "🎯 TOP PLAYER: SHADOW_47 · 142 WINS",
];

function BattleAsiaLanding() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-gold/15 blur-[120px]" />
        <div className="absolute -right-24 top-[40%] h-80 w-80 rounded-full bg-gold/10 blur-[140px]" />
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#" className="group flex items-center gap-2.5">
            <div className="relative grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-gold/30 to-transparent ring-1 ring-gold/40">
              <img src={logoShield} alt="Battle Asia" width={32} height={32} className="h-7 w-7" />
            </div>
            <span className="font-display text-xl font-bold leading-none tracking-wide">
              <span className="block">BATTLE</span>
              <span className="block text-gold">ASIA</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a key={n} href="#" className="font-hud text-sm font-semibold text-foreground/75 transition hover:text-gold">
                {n}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <button className="btn-outline-gold px-5 py-2 text-sm">LOGIN</button>
            <button className="btn-gold px-5 py-2 text-sm">REGISTER</button>
          </div>
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-gold lg:hidden" aria-label="Toggle menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-card lg:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <a key={n} href="#" className="font-hud rounded px-2 py-2 text-sm font-semibold hover:bg-secondary hover:text-gold">{n}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn-outline-gold py-2 text-sm">LOGIN</button>
                <button className="btn-gold py-2 text-sm">REGISTER</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* LIVE TICKER */}
      <div className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2 sm:px-6">
          <span className="badge-live shrink-0">LIVE</span>
          <div className="relative flex-1 overflow-hidden mask-fade">
            <div className="ticker font-mono-tab text-xs text-foreground/85">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  <span className="text-gold">▸</span> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-grid-hud">
        <img
          src={heroSoldier}
          alt="Battle Asia tournament hero"
          width={1280}
          height={768}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="absolute inset-0 bg-scanlines opacity-40" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-3 lg:py-28">
          <div className="lg:col-span-2">
            <div className="chip-tag mb-5">
              <Crosshair size={12} /> SEASON 04 · LIVE
            </div>
            <h1 className="font-display text-5xl font-bold leading-[0.92] sm:text-6xl md:text-7xl lg:text-[6.5rem]">
              BATTLE <span className="relative text-gold">
                ASIA
                <span aria-hidden className="absolute -bottom-2 left-0 h-[3px] w-2/3 bg-gradient-to-r from-gold to-transparent" />
              </span>
            </h1>
            <p className="mt-4 font-hud text-sm font-semibold tracking-[0.3em] text-foreground/85 sm:text-base">
              OFFICIAL MOBILE TOURNAMENT ARENA
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px w-10 bg-gold/60" />
              <p className="font-hud text-base font-bold tracking-[0.25em] text-gold sm:text-lg">
                COMPETE · WIN · EARN BAC
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-gold inline-flex items-center gap-2 px-8 py-3 text-sm sm:text-base">
                JOIN NOW <ChevronRight size={16} />
              </button>
              <button className="btn-outline-gold px-8 py-3 text-sm sm:text-base">BUY BAC</button>
            </div>

            {/* Mini KPI row */}
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                { k: "PLAYERS", v: "120K+" },
                { k: "MATCHES", v: "8.4K" },
                { k: "PAID OUT", v: "৳18M+" },
              ].map(({ k, v }) => (
                <div key={k} className="border-l-2 border-gold/60 pl-3">
                  <div className="font-display text-2xl font-bold leading-none">{v}</div>
                  <div className="font-hud mt-1 text-[10px] tracking-[0.2em] text-muted-foreground">{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* BAC Coin card */}
          <div className="hud-panel hud-bracket relative flex flex-col items-center gap-3 p-7 text-center lg:self-center">
            <div className="font-hud absolute left-3 top-3 text-[10px] tracking-[0.2em] text-muted-foreground">// CURRENCY_01</div>
            <div className="relative mt-3 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_40px_-5px_var(--gold)]">
              <span className="text-3xl font-black text-background">₿</span>
              <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-gold/40" />
            </div>
            <h3 className="font-display mt-1 text-2xl font-bold text-gold">BAC COIN</h3>
            <p className="text-sm text-muted-foreground">
              The Official Currency of<br />Battle Asia Ecosystem
            </p>
            <div className="my-3 flex w-full items-center gap-3">
              <span className="hud-divider flex-1" />
              <span className="font-mono-tab text-[10px] tracking-widest text-gold">1 BAC = ৳1</span>
              <span className="hud-divider flex-1" />
            </div>
            <button className="btn-gold w-full px-6 py-2.5 text-sm">BUY NOW</button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </section>

      {/* STATS — scoreboard strip */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-2 divide-y divide-border/60 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label }, i) => (
              <div key={label} className={`flex items-center gap-4 p-4 ${i % 2 ? "" : ""}`}>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-gold/10 text-gold ring-1 ring-gold/30">
                  <Icon size={22} />
                </div>
                <div>
                  <div className="font-display font-mono-tab text-2xl font-bold leading-none">{value}</div>
                  <div className="font-hud mt-1.5 text-[10px] tracking-[0.2em] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED MATCHES */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="chip-tag mb-3"><Flame size={12} /> ARENA</div>
            <h2 className="font-display text-3xl font-bold leading-none sm:text-4xl">
              FEATURED <span className="text-gold">MATCHES</span>
            </h2>
          </div>
          <a href="#" className="font-hud inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline">
            VIEW ALL <ChevronRight size={14} />
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MATCHES.map((m) => (
            <article key={m.title} className="hud-panel hud-bracket group overflow-hidden transition duration-300 hover:-translate-y-1">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={m.img} alt={m.title} width={768} height={512} loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className={m.live ? "badge-live" : "badge-open"}>{m.status}</span>
                  {m.hot && (
                    <span className="chip-tag !text-[10px] !px-2"><Flame size={10} /> HOT</span>
                  )}
                </div>
                <div className="font-hud absolute right-3 top-3 rounded-sm bg-background/70 px-2 py-1 text-[10px] tracking-widest text-foreground/85 backdrop-blur">
                  {m.mode}
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display text-xl font-bold tracking-wide">{m.title}</h3>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-sm border border-border/60 bg-background/40 p-3 text-center">
                  {[
                    { l: "ENTRY",  v: m.entry },
                    { l: "PRIZE",  v: m.prize, hi: true },
                    { l: "PLAYERS", v: m.players },
                  ].map(({ l, v, hi }) => (
                    <div key={l}>
                      <div className="font-hud text-[9px] tracking-[0.18em] text-muted-foreground">{l}</div>
                      <div className={`mt-1 font-mono-tab text-sm font-bold ${hi ? "text-gold" : "text-foreground"}`}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* slot fill bar */}
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-yellow-400"
                      style={{ width: `${(parseInt(m.players) / parseInt(m.players.split("/")[1])) * 100}%` }}
                    />
                  </div>
                </div>

                <button className={`mt-5 inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm ${m.live ? "btn-outline-gold" : "btn-gold"}`}>
                  {m.cta} <ChevronRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* WHY + APP */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-3">
        <div className="hud-panel relative overflow-hidden p-6 lg:col-span-2">
          <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-40" />
          <div className="relative">
            <div className="chip-tag mb-3"><Star size={12} /> BENEFITS</div>
            <h2 className="font-display text-3xl font-bold leading-none sm:text-4xl">
              WHY CHOOSE <span className="text-gold">BATTLE ASIA?</span>
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="group text-center">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-md bg-gradient-to-br from-gold/20 to-transparent text-gold ring-1 ring-gold/30 transition group-hover:ring-gold/60">
                    <Icon size={28} />
                    <span aria-hidden className="absolute -inset-0.5 rounded-md bg-gold/15 opacity-0 blur-md transition group-hover:opacity-100" />
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

      {/* PAYMENTS */}
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

      {/* CTA BAND */}
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
            <button className="btn-gold px-7 py-3 text-sm">JOIN FREE</button>
            <button className="btn-outline-gold px-7 py-3 text-sm">EXPLORE</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row">
          <p className="font-hud text-xs tracking-wider text-muted-foreground">© 2025 BATTLE ASIA · ALL RIGHTS RESERVED</p>
          <nav className="font-hud flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-gold">TERMS</a>
            <a href="#" className="hover:text-gold">PRIVACY</a>
            <a href="#" className="hover:text-gold">RULES</a>
            <a href="#" className="hover:text-gold">ABOUT</a>
          </nav>
          <div className="flex items-center gap-3 text-gold">
            <a href="#" aria-label="Telegram" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 hover:bg-gold hover:text-background"><Send size={14} /></a>
            <a href="#" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 hover:bg-gold hover:text-background"><Facebook size={14} /></a>
            <a href="#" aria-label="Twitter"  className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 hover:bg-gold hover:text-background"><Twitter  size={14} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
