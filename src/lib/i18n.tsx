// Lightweight i18n: 5 languages with localStorage persistence.
// Keys are short; pages call useT() to translate.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "bn" | "hi" | "ur" | "ar";

export const LANGS: { code: Lang; label: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", label: "اردو", flag: "🇵🇰", rtl: true },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
];

type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = {
  en: {
    "nav.home": "HOME", "nav.matches": "MATCHES", "nav.leaderboard": "LEADERBOARD",
    "nav.shop": "SHOP", "nav.premium": "PREMIUM", "nav.news": "NEWS", "nav.about": "ABOUT",
    "auth.login": "LOGIN", "auth.register": "REGISTER", "auth.dashboard": "DASHBOARD",
    "auth.signout": "SIGN OUT", "auth.forgot": "Forgot password?",
    "common.loading": "Loading...", "common.save": "Save", "common.cancel": "Cancel",
  },
  bn: {
    "nav.home": "হোম", "nav.matches": "ম্যাচ", "nav.leaderboard": "লিডারবোর্ড",
    "nav.shop": "শপ", "nav.premium": "প্রিমিয়াম", "nav.news": "নিউজ", "nav.about": "পরিচিতি",
    "auth.login": "লগইন", "auth.register": "রেজিস্টার", "auth.dashboard": "ড্যাশবোর্ড",
    "auth.signout": "সাইন আউট", "auth.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
    "common.loading": "লোড হচ্ছে...", "common.save": "সেভ", "common.cancel": "বাতিল",
  },
  hi: {
    "nav.home": "होम", "nav.matches": "मैच", "nav.leaderboard": "लीडरबोर्ड",
    "nav.shop": "शॉप", "nav.premium": "प्रीमियम", "nav.news": "समाचार", "nav.about": "परिचय",
    "auth.login": "लॉगिन", "auth.register": "रजिस्टर", "auth.dashboard": "डैशबोर्ड",
    "auth.signout": "साइन आउट", "auth.forgot": "पासवर्ड भूल गए?",
    "common.loading": "लोड हो रहा है...", "common.save": "सेव", "common.cancel": "रद्द",
  },
  ur: {
    "nav.home": "ہوم", "nav.matches": "میچز", "nav.leaderboard": "لیڈربورڈ",
    "nav.shop": "شاپ", "nav.premium": "پریمیم", "nav.news": "خبریں", "nav.about": "تعارف",
    "auth.login": "لاگ ان", "auth.register": "رجسٹر", "auth.dashboard": "ڈیش بورڈ",
    "auth.signout": "سائن آؤٹ", "auth.forgot": "پاس ورڈ بھول گئے؟",
    "common.loading": "لوڈ ہو رہا ہے...", "common.save": "محفوظ", "common.cancel": "منسوخ",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.matches": "المباريات", "nav.leaderboard": "المتصدرين",
    "nav.shop": "المتجر", "nav.premium": "بريميوم", "nav.news": "الأخبار", "nav.about": "حول",
    "auth.login": "تسجيل الدخول", "auth.register": "تسجيل", "auth.dashboard": "لوحة التحكم",
    "auth.signout": "خروج", "auth.forgot": "نسيت كلمة المرور؟",
    "common.loading": "جار التحميل...", "common.save": "حفظ", "common.cancel": "إلغاء",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("ba_lang") as Lang | null;
    return stored && LANGS.some((l) => l.code === stored) ? stored : "en";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = LANGS.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
    localStorage.setItem("ba_lang", lang);
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: setLangState,
    t: (k) => DICTS[lang][k] ?? DICTS.en[k] ?? k,
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: "en" as Lang, setLang: () => {}, t: (k: string) => DICTS.en[k] ?? k };
  return ctx;
}
