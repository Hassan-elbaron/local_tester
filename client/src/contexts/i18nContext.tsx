import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/lib/translations";

export type Language = "en" | "ar";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem("ai_marketing_lang");
    return (stored === "ar" || stored === "en") ? stored : "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("ai_marketing_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  // t() does NOT fallback to English when lang is "ar"
  // Missing keys return the key name — forces completeness
  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] ?? key;
  };

  const isRTL = lang === "ar";
  const dir: "ltr" | "rtl" = isRTL ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
