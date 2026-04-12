'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Lang } from '@/lib/i18n';
import { isRTL } from '@/lib/i18n';

type Theme = 'light' | 'dark' | 'system';

interface AppCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  effectiveTheme: 'light' | 'dark';
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [lang, setLangState] = useState<Lang>('en');
  const [effective, setEffective] = useState<'light' | 'dark'>('light');

  // hydrate
  useEffect(() => {
    const t = (localStorage.getItem('openebm_theme') as Theme) || 'system';
    const l = (localStorage.getItem('openebm_lang') as Lang) || 'en';
    setThemeState(t);
    setLangState(l);
  }, []);

  // apply theme
  useEffect(() => {
    const apply = () => {
      let eff: 'light' | 'dark' = 'light';
      if (theme === 'dark') eff = 'dark';
      else if (theme === 'light') eff = 'light';
      else eff = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', eff);
      document.documentElement.setAttribute('data-bs-theme', eff);
      setEffective(eff);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // apply lang/dir
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
  }, [lang]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('openebm_theme', t);
  };
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('openebm_lang', l);
  };

  return (
    <Ctx.Provider value={{ theme, setTheme, lang, setLang, effectiveTheme: effective }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be inside AppProvider');
  return v;
}
