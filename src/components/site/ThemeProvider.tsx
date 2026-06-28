import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { applyTheme, getStoredTheme } from "@/lib/themes";

/**
 * Mounts once at the root. Applies the user's chosen theme to <html data-theme="..."> .
 * - Loads from localStorage immediately for instant paint
 * - Syncs from profiles.active_theme once user is loaded
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Immediate paint from localStorage
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  // Sync from profile when available
  useEffect(() => {
    const active = (profile as any)?.active_theme;
    if (active && typeof active === "string") {
      applyTheme(active);
    }
  }, [profile]);

  return <>{children}</>;
}
