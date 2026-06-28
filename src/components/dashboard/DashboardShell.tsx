import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

import { DashboardTopbar } from "./DashboardTopbar";
import { DashboardBottomNav } from "./DashboardBottomNav";
import { DashboardMobileDrawer } from "./DashboardMobileDrawer";
import { DashboardHeaderNav } from "./DashboardHeaderNav";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-gold/10 blur-[120px]" />
        <div className="absolute -right-24 top-[50%] h-80 w-80 rounded-full bg-gold/10 blur-[140px]" />
      </div>

      <DashboardTopbar profile={profile} onOpenMobileNav={() => setDrawerOpen(true)} />
      <DashboardHeaderNav />
      <DashboardMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-1">
        <main className="min-w-0 flex-1 pb-16 lg:pb-0">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6">{children}</div>
        </main>
      </div>


      <DashboardBottomNav />
    </div>
  );
}

