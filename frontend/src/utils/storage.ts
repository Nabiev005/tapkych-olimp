// localStorage can throw (private mode, blocked storage) — always go through these helpers.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore: preference simply won't persist
  }
}

export const STORAGE_KEYS = {
  language: 'olimp.lang',
  theme: 'olimp.theme',
} as const;
