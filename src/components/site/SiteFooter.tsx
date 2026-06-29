import { Facebook, Twitter, Send, Shield, Mail, MessageCircle } from "lucide-react";
import logoShield from "@/assets/logo-shield.webp";
import { useT } from "@/lib/i18n";

const COLS: { titleKey: string; links: { labelKey: string; href: string }[] }[] = [
  {
    titleKey: "footer.arena",
    links: [
      { labelKey: "nav.matches", href: "/matches" },
      { labelKey: "nav.leaderboard", href: "/leaderboard" },
      { labelKey: "nav.tournaments", href: "/tournaments" },
      { labelKey: "nav.results", href: "/results" },
    ],
  },
  {
    titleKey: "footer.account",
    links: [
      { labelKey: "auth.login", href: "/auth" },
      { labelKey: "auth.register", href: "/auth" },
      { labelKey: "nav.wallet", href: "/dashboard/wallet" },
      { labelKey: "nav.premium", href: "/premium" },
    ],
  },
  {
    titleKey: "footer.help",
    links: [
      { labelKey: "nav.news", href: "/news" },
      { labelKey: "nav.about", href: "/about" },
      { labelKey: "nav.support", href: "/dashboard/support" },
      { labelKey: "nav.contact", href: "/p/contact" },
    ],
  },
  {
    titleKey: "footer.legal",
    links: [
      { labelKey: "footer.terms", href: "/p/terms" },
      { labelKey: "footer.privacy", href: "/p/privacy" },
      { labelKey: "footer.refund", href: "/p/refund" },
    ],
  },
];

export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="relative mt-10 border-t border-border/60 bg-card/40">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-3">
              <img loading="lazy" decoding="async" src={logoShield} alt="Battle Asia" width={96} height={96} className="h-20 w-20 object-contain drop-shadow-[0_0_18px_rgba(255,176,32,0.45)] sm:h-24 sm:w-24" />
              <span className="font-display text-2xl font-bold leading-none tracking-wide">
                <span className="block">BATTLE</span>
                <span className="block text-gold">ASIA</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The official mobile tournament arena. Compete in PUBG Mobile matches, win BAC coins, climb the Asia leaderboard.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="chip-tag"><Shield size={10} /> {t("common.secure")}</span>
              <span className="chip-tag">{t("common.fairPlay")}</span>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.titleKey}>
              <div className="font-hud mb-3 text-[10px] tracking-[0.25em] text-gold">{t(col.titleKey)}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.labelKey + l.href}>
                    <a href={l.href} className="text-sm text-muted-foreground transition hover:text-gold">
                      {t(l.labelKey)}
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
            © 2025 BATTLE ASIA · {t("footer.rights")}
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
