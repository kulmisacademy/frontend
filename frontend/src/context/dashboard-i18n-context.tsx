"use client";

import * as React from "react";
import {
  DASHBOARD_DICTIONARIES,
  type DashboardLang,
} from "@/lib/i18n/dashboard-dictionaries";

const STORAGE_KEY = "laas24-dashboard-lang";

type DashboardI18nContextValue = {
  lang: DashboardLang;
  setLang: (l: DashboardLang) => void;
  t: (key: string) => string;
};

const DashboardI18nContext = React.createContext<DashboardI18nContextValue | null>(
  null
);

export function DashboardI18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLangState] = React.useState<DashboardLang>("en");

  React.useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "so" || s === "en") setLangState(s);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = React.useCallback((l: DashboardLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "so" ? "so" : "en";
    }
  }, []);

  const t = React.useCallback(
    (key: string) => {
      const dict = DASHBOARD_DICTIONARIES[lang];
      const fallback = DASHBOARD_DICTIONARIES.en;
      return dict[key] ?? fallback[key] ?? key;
    },
    [lang]
  );

  const value = React.useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <DashboardI18nContext.Provider value={value}>
      {children}
    </DashboardI18nContext.Provider>
  );
}

export function useDashboardI18n(): DashboardI18nContextValue {
  const ctx = React.useContext(DashboardI18nContext);
  if (!ctx) {
    throw new Error("useDashboardI18n must be used within DashboardI18nProvider");
  }
  return ctx;
}
