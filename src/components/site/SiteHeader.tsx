import { useState } from "react";
import { Menu, X } from "lucide-react";
import logoShield from "@/assets/logo-shield.png";

const NAV: { label: string; href: string }[] = [
  { label: "HOME", href: "/" },
  { label: "MATCHES", href: "/matches" },
  { label: "LEADERBOARD", href: "/leaderboard" },
  { label: "SHOP", href: "/shop" },
  { label: "NEWS", href: "/news" },
  { label: "SUPPORT", href: "/support" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/" className="group flex items-center gap-2.5">
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
            <a key={n.label} href={n.href} className="font-hud text-sm font-semibold text-foreground/75 transition hover:text-gold">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <a href="/login" className="btn-outline-gold px-5 py-2 text-sm">LOGIN</a>
          <a href="/register" className="btn-gold px-5 py-2 text-sm">REGISTER</a>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-gold lg:hidden" aria-label="Toggle menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-card lg:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="font-hud rounded px-2 py-2 text-sm font-semibold hover:bg-secondary hover:text-gold">
                {n.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href="/login" className="btn-outline-gold py-2 text-center text-sm">LOGIN</a>
              <a href="/register" className="btn-gold py-2 text-center text-sm">REGISTER</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
