import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Trophy, Users, Globe2, Zap, Lock } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Battle Asia" },
      { name: "description", content: "Battle Asia is the official mobile tournament arena for Asian gamers — PUBG Mobile, Free Fire, COD Mobile, and more." },
      { property: "og:title", content: "About Battle Asia" },
      { property: "og:description", content: "The official mobile tournament arena for Asian gamers." },
    ],
  }),
  component: AboutPage,
});

const STATS = [
  { label: "Active Players", value: "50K+", icon: Users },
  { label: "Tournaments Hosted", value: "10K+", icon: Trophy },
  { label: "Countries", value: "12", icon: Globe2 },
  { label: "Prize Pool Paid", value: "৳5Cr+", icon: Zap },
];

const PILLARS = [
  {
    icon: Shield,
    title: "Fair Play",
    body: "Anti-cheat verification, room result validation, and 24/7 dispute handling on every match.",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    body: "Prize money lands in your wallet within minutes of results being declared.",
  },
  {
    icon: Lock,
    title: "Secure Wallet",
    body: "BAC coin economy with bKash, Nagad, and bank withdrawal channels.",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="hud-panel rounded-md border border-gold/30 bg-card/40 p-6 md:p-8">
        <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-gold md:text-4xl">
          About Battle Asia
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/80 md:text-base">
          Battle Asia is the official competitive arena built for South & Southeast Asian mobile
          esports. From neighborhood squads to pro teams, we power daily tournaments across PUBG
          Mobile, Free Fire, and Call of Duty Mobile — with real cash prizes, transparent scoring,
          and a community that lives for the W.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="hud-panel rounded-md border border-border/60 bg-card/40 p-4 text-center">
              <Icon className="mx-auto h-5 w-5 text-gold" />
              <div className="mt-2 font-display text-2xl font-bold text-foreground">{s.value}</div>
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="hud-panel rounded-md border border-border/60 bg-card/40 p-5">
              <Icon className="h-6 w-6 text-gold" />
              <h3 className="mt-3 font-display text-lg uppercase tracking-wide">{p.title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{p.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 hud-panel rounded-md border border-gold/40 bg-card/60 p-6 text-center">
        <h2 className="font-display text-2xl uppercase tracking-[0.2em] text-gold">
          Join the Arena
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          Create your operative profile and enter your first match in minutes.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="btn-gold px-6 py-2.5 text-sm">Register Free</Link>
          <Link to="/matches" className="btn-outline-gold px-6 py-2.5 text-sm">Browse Matches</Link>
        </div>
      </div>
    </div>
  );
}
