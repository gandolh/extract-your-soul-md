// EN/RO prompt-language preference, persisted in localStorage so it survives
// study switches and reloads. Default is 'ro' — the questionnaire was designed
// Romanian-primary (see corpus/wiki/sources-raw/02-questionnaire-design.md); a
// Romanian user shouldn't have to re-toggle on every study. A full React context
// is overkill for one boolean — a localStorage-backed hook is enough.

import { useCallback, useState } from 'react';

export type Lang = 'en' | 'ro';
const KEY = 'soul.lang';

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'ro') return v;
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through to default */
  }
  return 'ro';
}

export function useLangPref(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(read);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* best-effort persistence */
    }
  }, []);
  return [lang, setLang];
}
