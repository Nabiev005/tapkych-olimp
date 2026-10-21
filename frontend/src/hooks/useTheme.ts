import { useCallback, useEffect, useState } from 'react';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

function readPreference(): ThemePreference {
  const stored = readStorage(STORAGE_KEYS.theme);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Theme preference: "system" follows prefers-color-scheme; otherwise sets <html data-theme>. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') delete root.dataset.theme;
    else root.dataset.theme = preference;
    writeStorage(STORAGE_KEYS.theme, preference === 'system' ? null : preference);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!);
  }, []);

  return { preference, setPreference, cycle };
}
