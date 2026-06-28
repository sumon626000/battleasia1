export type ThemeId = "amber" | "cyber" | "blood" | string;

export interface ThemeConfig {
  id: string;
  name: string;
  description: string | null;
  preview_color: string;
  price_bac: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export const DEFAULT_THEME: ThemeId = "amber";

export function applyTheme(themeId: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", themeId);
  try {
    localStorage.setItem("ba_active_theme", themeId);
  } catch {}
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return (localStorage.getItem("ba_active_theme") as ThemeId) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
