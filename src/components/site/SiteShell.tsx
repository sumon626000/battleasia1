import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteTicker } from "./SiteTicker";
import { SiteFooter } from "./SiteFooter";
import { AnnouncementBar } from "./AnnouncementBar";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-gold/15 blur-[120px]" />
        <div className="absolute -right-24 top-[40%] h-80 w-80 rounded-full bg-gold/10 blur-[140px]" />
      </div>

      <AnnouncementBar />
      <SiteHeader />
      <SiteTicker />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

