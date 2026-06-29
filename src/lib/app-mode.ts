// Detects whether the web app is running inside the Battle Asia native APK
// (Flutter WebView). The Flutter shell signals this in two ways:
//   1. First load uses `?app=1` (preferred — set in InAppWebViewSettings initialUrl).
//   2. The WebView's userAgent contains the token `BattleAsiaApp`.
// Once detected, we persist the flag in localStorage so subsequent navigations
// (including OAuth redirects that strip the query) keep behaving as the APK.

const KEY = "ba_app_mode";

export function detectAndPersistAppMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("app") === "1";
    const fromUA = /BattleAsiaApp/i.test(navigator.userAgent || "");
    if (fromQuery || fromUA) {
      localStorage.setItem(KEY, "1");
      return true;
    }
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function isAppMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
