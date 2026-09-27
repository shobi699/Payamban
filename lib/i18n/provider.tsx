"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { createI18n, type Locale, type I18nInstance, DEFAULT_LOCALE } from "./index";

const I18nContext = createContext<I18nInstance>(createI18n(DEFAULT_LOCALE));

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => createI18n(locale), [locale]);

  useEffect(() => {
    const prevLang = document.documentElement.lang;
    const prevDir = document.documentElement.dir;

    document.documentElement.lang = value.locale;
    document.documentElement.dir = value.direction;

    return () => {
      document.documentElement.lang = prevLang;
      document.documentElement.dir = prevDir;
    };
  }, [value]);

  return (
    <I18nContext.Provider value={value}>
      <div lang={value.locale} dir={value.direction} className="contents">
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
