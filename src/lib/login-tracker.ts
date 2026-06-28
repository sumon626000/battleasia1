import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ba_session_token";

function parseUA(ua: string) {
  const browserMatch =
    /(Edg|OPR|Chrome|Firefox|Safari)\/([\d.]+)/.exec(ua) ?? null;
  const browser = browserMatch
    ? browserMatch[1] === "Edg"
      ? "Edge"
      : browserMatch[1] === "OPR"
      ? "Opera"
      : browserMatch[1]
    : "Unknown";
  const browser_version = browserMatch ? browserMatch[2] : "";

  let os = "Unknown";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  const device = isMobile ? (/iPad/.test(ua) ? "Tablet" : "Mobile") : "Desktop";
  const platform = isMobile ? "mobile" : "desktop";

  return { browser, browser_version, os, device, platform };
}

function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_KEY);
  if (!token) {
    token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

async function fetchGeo(): Promise<{ ip: string; cc: string; cn: string }> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("geo failed");
    const j = await res.json();
    return {
      ip: j.ip ?? "",
      cc: j.country_code ?? "",
      cn: j.country_name ?? "",
    };
  } catch {
    return { ip: "", cc: "", cn: "" };
  }
}

export async function recordLoginEvent() {
  if (typeof window === "undefined") return;
  try {
    const ua = navigator.userAgent;
    const info = parseUA(ua);
    const token = getSessionToken();
    const geo = await fetchGeo();
    await supabase.rpc("record_login_event", {
      _ip: geo.ip || "",
      _country_code: geo.cc || "",
      _country_name: geo.cn || "",
      _browser: info.browser,
      _browser_version: info.browser_version,
      _os: info.os,
      _device: info.device,
      _platform: info.platform,
      _user_agent: ua.slice(0, 500),
      _session_token: token,
    });
  } catch {
    /* non-fatal */
  }
}

export async function heartbeatSession() {
  if (typeof window === "undefined") return;
  const token = sessionStorage.getItem(SESSION_KEY);
  if (!token) return;
  try {
    await supabase.rpc("heartbeat_session", { _session_token: token });
  } catch {
    /* non-fatal */
  }
}

/** Claim this device as the single active session for the signed-in user. */
export async function claimActiveSession() {
  if (typeof window === "undefined") return;
  const token = getSessionToken();
  try {
    await supabase.rpc("claim_active_session", { _token: token });
  } catch {
    /* non-fatal */
  }
}

/** Returns true if this device still owns the active session. */
export async function isActiveSession(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const token = sessionStorage.getItem(SESSION_KEY);
  if (!token) return true;
  try {
    const { data, error } = await supabase.rpc("is_active_session", {
      _token: token,
    });
    if (error) return true; // fail-open on network errors
    return data !== false;
  } catch {
    return true;
  }
}

export function clearLocalSessionToken() {
  if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

