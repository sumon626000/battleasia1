import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X, Home, ShieldCheck } from "lucide-react";
import { DASH_NAV } from "./DashboardSidebar";
import { useT } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DashboardMobileDrawer({ open, onClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useT();
  const isAdmin = useIsAdmin();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        aria-label="Close menu"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-0 h-full w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-lg font-bold">
            BATTLE<span className="text-gold">ASIA</span>
          </span>
          <button onClick={onClose} className="rounded-md p-1.5 text-gold" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left font-hud text-sm font-semibold uppercase tracking-wide text-foreground/80 transition hover:border-border hover:bg-secondary/60"
          >
            <Home size={16} />
            Back to Home
          </button>
          {DASH_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  onClose();
                  navigate({ to: item.href });
                }}
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left font-hud text-sm font-semibold uppercase tracking-wide transition ${
                  active
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-transparent text-foreground/80 hover:border-border hover:bg-secondary/60"
                }`}
              >
                <Icon size={16} />
                {t(item.key)}
              </button>
            );
          })}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate({ to: "/admin" });
              }}
              className="mt-2 flex items-center gap-3 rounded-md border border-gold/40 bg-gold/5 px-3 py-2.5 text-left font-hud text-sm font-semibold uppercase tracking-wide text-gold transition hover:border-gold hover:bg-gold/10"
            >
              <ShieldCheck size={16} />
              Go Admin
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
