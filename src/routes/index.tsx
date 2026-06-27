import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu, X, Users, Swords, Trophy, Coins, Shield, Zap, Lock, Headphones,
  Facebook, Twitter, Send, Smartphone, Download,
} from "lucide-react";
import heroSoldier from "@/assets/hero-soldier.jpg";
import logoShield from "@/assets/logo-shield.png";
import matchSolo from "@/assets/match-solo.jpg";
import matchSquad from "@/assets/match-squad.jpg";
import matchDuo from "@/assets/match-duo.jpg";
import phoneApp from "@/assets/phone-app.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Battle Asia — Official Mobile Tournament Arena" },
      { name: "description", content: "Compete in mobile tournaments, win BAC coins, and climb the Battle Asia leaderboard. Official mobile tournament arena for elite gamers." },
      { property: "og:title", content: "Battle Asia — Official Mobile Tournament Arena" },
      { property: "og:description", content: "Compete. Win. Earn BAC. Join the official mobile tournament arena." },
    ],
  }),
  component: BattleAsiaLanding,
});

const NAV = ["HOME", "MATCHES", "LEADERBOARD", "SHOP", "NEWS", "SUPPORT"];

const STATS = [
  { icon: Users, value: "12,548", label: "ONLINE USERS" },
  { icon: Swords, value: "24", label: "LIVE MATCHES" },
  { icon: Trophy, value: "৳2,45,300", label: "TOTAL PRIZE POOL" },
  { icon: Coins, value: "3,25,000", label: "BAC CIRCULATION" },
];

const MATCHES = [
  { img: matchSolo, status: "OPEN", title: "SOLO WARZONE", entry: "50 BAC", prize: "1,500 BAC", players: "45/100", cta: "JOIN NOW", live: false },
  { img: matchSquad, status: "LIVE", title: "SQUAD CLASH", entry: "100 BAC", prize: "5,000 BAC", players: "80/100", cta: "VIEW MATCH", live: true },
  { img: matchDuo, status: "OPEN", title: "DUO RUMBLE", entry: "80 BAC", prize: "2,500 BAC", players: "32/50", cta: "JOIN NOW", live: false },
];

const FEATURES = [
  { icon: Shield, title: "FAIR PLAY", sub: "100% Fair Match\nNo Hack, No Cheat" },
  { icon: Zap, title: "INSTANT PAYOUT", sub: "Winnings Credited\nInstantly" },
  { icon: Lock, title: "SECURE & SAFE", sub: "Your Account is 100%\nSecure" },
  { icon: Headphones, title: "24/7 SUPPORT", sub: "We are Always\nHere to Help" },
];

const PAYMENTS = ["bKash", "Nagad", "Rocket", "Upay", "Bank Transfer", "USDT TRC20"];

function BattleAsiaLanding() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-2">
            <img src={logoShield} alt="Battle Asia" width={40} height={40} className="h-10 w-10" />
            <span className="font-display text-xl font-bold leading-none">
              <span className="block">BATTLE</span>
              <span className="block text-gold">ASIA</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a key={n} href="#" className="text-sm font-semibold tracking-wider text-foreground/80 transition hover:text-gold">
                {n}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <button className="btn-outline-gold rounded-md px-5 py-2 text-sm">LOGIN</button>
            <button className="btn-gold rounded-md px-5 py-2 text-sm">REGISTER</button>
          </div>
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-gold lg:hidden" aria-label="Toggle menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-card lg:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <a key={n} href="#" className="rounded px-2 py-2 text-sm font-semibold tracking-wider hover:bg-secondary hover:text-gold">{n}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn-outline-gold rounded-md py-2 text-sm">LOGIN</button>
                <button className="btn-gold rounded-md py-2 text-sm">REGISTER</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <img
          src={heroSoldier}
          alt="Battle Asia tournament hero"
          width={1280}
          height={768}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-3 lg:py-28">
          <div className="lg:col-span-2">
            <h1 className="font-display text-5xl font-bold leading-none sm:text-6xl md:text-7xl lg:text-8xl">
              BATTLE <span className="text-gold">ASIA</span>
            </h1>
            <p className="mt-3 text-sm font-semibold tracking-[0.25em] text-foreground/90 sm:text-base">
              OFFICIAL MOBILE TOURNAMENT ARENA
            </p>
            <p className="mt-6 text-lg font-bold tracking-wider text-gold sm:text-xl">
              COMPETE • WIN • EARN BAC
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-gold rounded-md px-8 py-3 text-sm sm:text-base">JOIN NOW</button>
              <button className="btn-outline-gold rounded-md px-8 py-3 text-sm sm:text-base">BUY BAC</button>
            </div>
          </div>

          {/* BAC Coin card */}
          <div className="card-dark relative flex flex-col items-center gap-3 p-6 text-center lg:self-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_30px_-5px_var(--gold)]">
              <span className="text-2xl font-black text-background">₿</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-gold">BAC COIN</h3>
            <p className="text-sm text-muted-foreground">
              The Official Currency of<br />Battle Asia Ecosystem
            </p>
            <button className="btn-gold mt-2 rounded-md px-6 py-2 text-sm">BUY NOW</button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="card-dark flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-gold">
                <Icon size={22} />
              </div>
              <div>
                <div className="font-display text-xl font-bold sm:text-2xl">{value}</div>
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground sm:text-xs">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED MATCHES */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">FEATURED MATCHES</h2>
          <a href="#" className="text-sm font-semibold text-gold hover:underline">View All</a>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MATCHES.map((m) => (
            <article key={m.title} className="card-dark overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_var(--gold)]">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={m.img} alt={m.title} width={768} height={512} loading="lazy" className="h-full w-full object-cover" />
                <span className={`absolute left-3 top-3 ${m.live ? "badge-live" : "badge-open"}`}>{m.status}</span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-xl font-bold">{m.title}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">Entry Fee</div>
                    <div className="mt-1 text-sm font-bold text-gold">{m.entry}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">Prize Pool</div>
                    <div className="mt-1 text-sm font-bold text-gold">{m.prize}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">Players</div>
                    <div className="mt-1 text-sm font-bold text-gold">{m.players}</div>
                  </div>
                </div>
                <button className={`mt-4 w-full rounded-md py-2.5 text-sm ${m.live ? "btn-outline-gold" : "btn-gold"}`}>
                  {m.cta}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* WHY + APP */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="card-dark p-6 lg:col-span-2">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">WHY CHOOSE BATTLE ASIA?</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-gold">
                  <Icon size={26} />
                </div>
                <div className="mt-3 font-display text-sm font-bold tracking-wider">{title}</div>
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-dark relative overflow-hidden p-6">
          <div className="relative z-10">
            <h3 className="font-display text-xl font-bold">DOWNLOAD OUR APP</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get the Battle Asia App<br />for Better Experience</p>
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-gold inline-flex items-center justify-center gap-2 rounded-md py-2.5 text-sm">
                <Download size={16} /> DOWNLOAD APK
              </button>
              <button className="btn-outline-gold inline-flex items-center justify-center gap-2 rounded-md py-2.5 text-sm">
                <Smartphone size={16} /> INSTALL PWA
              </button>
            </div>
          </div>
          <img src={phoneApp} alt="App preview" width={640} height={512} loading="lazy"
            className="pointer-events-none absolute -bottom-4 -right-6 h-44 w-44 rounded-xl object-cover opacity-50 sm:h-52 sm:w-52 sm:opacity-70" />
        </div>
      </section>

      {/* PAYMENTS */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-xl font-bold tracking-wider">PAYMENT METHODS</h2>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PAYMENTS.map((p) => (
            <div key={p} className="card-dark grid h-16 place-items-center text-center text-xs font-bold tracking-wider text-foreground/90 sm:text-sm">
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row">
          <p className="text-xs text-muted-foreground">© 2025 Battle Asia. All Rights Reserved.</p>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-gold">Terms & Conditions</a>
            <a href="#" className="hover:text-gold">Privacy Policy</a>
            <a href="#" className="hover:text-gold">Rules</a>
            <a href="#" className="hover:text-gold">About Us</a>
          </nav>
          <div className="flex items-center gap-3 text-gold">
            <a href="#" aria-label="Telegram" className="grid h-8 w-8 place-items-center rounded-full bg-secondary hover:bg-gold hover:text-background"><Send size={14} /></a>
            <a href="#" aria-label="Facebook" className="grid h-8 w-8 place-items-center rounded-full bg-secondary hover:bg-gold hover:text-background"><Facebook size={14} /></a>
            <a href="#" aria-label="Twitter" className="grid h-8 w-8 place-items-center rounded-full bg-secondary hover:bg-gold hover:text-background"><Twitter size={14} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
