import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import logoShield from "@/assets/logo-shield.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV: { label: string; href: string }[] = [
  { label: "HOME", href: "/" },
  { label: "MATCHES", href: "/matches" },
  { label: "LEADERBOARD", href: "/leaderboard" },
  { label: "SHOP", href: "/shop" },
  { label: "PREMIUM", href: "/premium" },
  { label: "NEWS", href: "/news" },
  { label: "ABOUT", href: "/about" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const userBadge = user?.email?.split("@")[0]?.toUpperCase() ?? "PLAYER";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-gold/30 to-transparent ring-1 ring-gold/40">
            <img src={logoShield} alt="Battle Asia" width={32} height={32} className="h-7 w-7" />
          </div>
          <span className="font-display text-xl font-bold leading-none tracking-wide">
            <span className="block">BATTLE</span>
            <span className="block text-gold">ASIA</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="font-hud text-sm font-semibold text-foreground/75 transition hover:text-gold">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-1.5 transition hover:border-gold/60 hover:text-gold">
                <UserIcon size={14} className="text-gold" />
                <span className="font-hud text-xs font-semibold tracking-wide">{userBadge}</span>
              </Link>
              <Link to="/dashboard" className="btn-gold px-4 py-2 text-sm">DASHBOARD</Link>
              <button onClick={signOut} className="btn-outline-gold px-3 py-2 text-sm" aria-label="Sign out">
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn-outline-gold px-5 py-2 text-sm">LOGIN</Link>
              <Link to="/auth" className="btn-gold px-5 py-2 text-sm">REGISTER</Link>
            </>
          )}
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
            {isAuthenticated ? (
              <div className="mt-2 grid grid-cols-1 gap-2">
                <Link to="/dashboard" className="btn-gold py-2 text-center text-sm">DASHBOARD</Link>
                <button onClick={signOut} className="btn-outline-gold py-2 text-center text-sm">LOGOUT</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/auth" className="btn-outline-gold py-2 text-center text-sm">LOGIN</Link>
                <Link to="/auth" className="btn-gold py-2 text-center text-sm">REGISTER</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
