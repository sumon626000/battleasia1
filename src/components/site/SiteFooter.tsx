import { Facebook, Twitter, Send, Shield, Mail, MessageCircle } from "lucide-react";
import logoShield from "@/assets/logo-shield.png";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "ARENA",
    links: [
      { label: "Matches", href: "/matches" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Results", href: "/results" },
    ],
  },
  {
    title: "ACCOUNT",
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "Wallet", href: "/wallet" },
      { label: "Premium", href: "/premium" },
    ],
  },
  {
    title: "HELP",
    links: [
      { label: "Support", href: "/dashboard/support" },
      { label: "About", href: "/p/about" },
      { label: "Contact", href: "/p/contact" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Terms", href: "/p/terms" },
      { label: "Privacy", href: "/p/privacy" },
      { label: "Refund", href: "/p/refund" },
    ],
  },

];

export function SiteFooter() {
  return (
    <footer className="relative mt-10 border-t border-border/60 bg-card/40">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-gold/30 to-transparent ring-1 ring-gold/40">
                <img loading="lazy" decoding="async" src={logoShield} alt="Battle Asia" width={32} height={32} className="h-7 w-7" />
              </div>
              <span className="font-display text-xl font-bold leading-none tracking-wide">
                <span className="block">BATTLE</span>
                <span className="block text-gold">ASIA</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The official mobile tournament arena. Compete in PUBG Mobile matches, win BAC coins, climb the Asia leaderboard.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="chip-tag"><Shield size={10} /> SECURE</span>
              <span className="chip-tag">FAIR PLAY</span>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <div className="font-hud mb-3 text-[10px] tracking-[0.25em] text-gold">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition hover:text-gold">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hud-divider my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-hud text-xs tracking-wider text-muted-foreground">
            © 2025 BATTLE ASIA · ALL RIGHTS RESERVED
          </p>
          <div className="flex items-center gap-3 text-gold">
            <a href="#" aria-label="Telegram" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 transition hover:bg-gold hover:text-background"><Send size={14} /></a>
            <a href="#" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 transition hover:bg-gold hover:text-background"><Facebook size={14} /></a>
            <a href="#" aria-label="Twitter" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 transition hover:bg-gold hover:text-background"><Twitter size={14} /></a>
            <a href="#" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 transition hover:bg-gold hover:text-background"><MessageCircle size={14} /></a>
            <a href="mailto:support@battleasia.net" aria-label="Email" className="grid h-9 w-9 place-items-center rounded-md bg-secondary ring-1 ring-gold/30 transition hover:bg-gold hover:text-background"><Mail size={14} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
