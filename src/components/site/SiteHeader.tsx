import { Link } from "@tanstack/react-router";
import { User as UserIcon } from "lucide-react";
import logoShield from "@/assets/logo-shield.webp";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ViewModeToggle } from "@/components/site/ViewModeToggle";
import { useT } from "@/lib/i18n";

export function SiteHeader() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useT();
  const userBadge = user?.email?.split("@")[0]?.toUpperCase() ?? t("common.player");

  return (
    <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img loading="eager" decoding="async" src={logoShield} alt="Battle Asia" width={112} height={112} className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(255,176,32,0.5)] transition group-hover:drop-shadow-[0_0_28px_rgba(255,176,32,0.7)] sm:h-28 sm:w-28" />
          <span className="font-display text-xl font-bold leading-none tracking-wide">
            <span className="block">BATTLE</span>
            <span className="block text-gold">ASIA</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ViewModeToggle compact />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 bg-background/60 text-gold transition hover:border-gold hover:shadow-[0_0_18px_rgba(255,176,32,0.45)]"
              aria-label={userBadge}
              title={userBadge}
            >
              <UserIcon size={16} />
            </Link>
          ) : (
            <Link to="/auth" className="btn-gold px-5 py-2 text-sm">{t("auth.login")}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
