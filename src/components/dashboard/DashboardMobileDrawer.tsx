import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashNavBody } from "./DashboardSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DashboardMobileDrawer({ open, onClose }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const username = profile?.in_game_username || profile?.username || "PLAYER";
  const initials = username.slice(0, 2).toUpperCase();

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        aria-label="Close menu"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-lg font-bold">
            BATTLE<span className="text-gold">ASIA</span>
          </span>
          <button onClick={onClose} className="rounded-md p-1.5 text-gold" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {user && (
          <Link
            to="/dashboard/profile"
            onClick={onClose}
            className="flex items-center gap-3 border-b border-border/60 bg-background/40 px-4 py-3 transition hover:bg-secondary/50"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-md bg-gold/20 font-mono text-sm font-bold text-gold">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold uppercase tracking-wide">{username}</div>
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">View profile</div>
            </div>
          </Link>
        )}
        <DashNavBody onNavigate={onClose} />
      </div>
    </div>
  );
}
