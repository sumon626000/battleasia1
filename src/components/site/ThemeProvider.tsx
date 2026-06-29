import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { applyTheme, DEFAULT_THEME } from "@/lib/themes";

/**
 * Theme rules:
 * - First-time / logged-out visitors always see the default "Official Light" theme.
 * - Once a user logs in, their saved profile.active_theme is applied.
 * - On logout we reset back to the default so the next visitor sees Official.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile } = useProfile(user?.id);

  // Always paint default on first mount (fresh visitor experience).
  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  // Apply user's saved theme once profile loads; reset to default when signed out.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      applyTheme(DEFAULT_THEME);
      return;
    }
    const active = (profile as any)?.active_theme;
    if (active && typeof active === "string") {
      applyTheme(active);
    }
  }, [user, loading, profile]);

  return <>{children}</>;
}
