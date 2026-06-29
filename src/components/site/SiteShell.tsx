import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteTicker } from "./SiteTicker";
import { SiteFooter } from "./SiteFooter";
import pageBgPubg from "@/assets/page-bg-pubg.jpg";
import { AnnouncementBar } from "./AnnouncementBar";
import { FeedBottomNav } from "@/components/feed/FeedBottomNav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuth();

  const isSocialOrLeaderboard =
    pathname === "/feed" ||
    pathname.startsWith("/feed/") ||
    pathname === "/leaderboard" ||
    pathname.startsWith("/leaderboard/");

  // Logged-in users get the full dashboard chrome (topbar with balance,
  // dashboard bottom nav HOME/PLAY/FEED/LEADERBOARD/PROFILE) on Social
  // and Leaderboard pages — same look as inside the dashboard.
  if (isAuthenticated && isSocialOrLeaderboard) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-foreground">
      {/* Global PUBG background — spans header → footer */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.38]"
          style={{ backgroundImage: `url(${pageBgPubg})`, backgroundAttachment: "fixed" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/55 to-background/85" />
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -right-24 top-[40%] h-80 w-80 rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <AnnouncementBar />
      <div className="sticky top-0 z-50">
        <SiteHeader />
        <SiteTicker />
      </div>
      <main className={`flex-1 ${isSocialOrLeaderboard ? "pb-24" : ""}`}>{children}</main>

      {isSocialOrLeaderboard ? <FeedBottomNav /> : <SiteFooter />}
    </div>
  );
}

