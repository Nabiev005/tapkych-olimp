import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n, { isLanguage } from '../i18n';
import { onSessionChange, refreshSession, setAccessToken, type Session } from '../services/api';
import { authApi, type RegisterPayload, type UpdateMePayload } from '../services/auth';
import { AuthContext, type AuthStatus } from './authContext';
import type { Me } from '../services/types';
import { STORAGE_KEYS, writeStorage } from '../utils/storage';

/** The signed-in user's saved language wins over the guest preference */
function applyUserLanguage(user: Me): void {
  if (isLanguage(user.language) && i18n.resolvedLanguage !== user.language) {
    writeStorage(STORAGE_KEYS.language, user.language);
    void i18n.changeLanguage(user.language);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Me | null>(null);

  const applySession = useCallback((session: Session | null) => {
    setAccessToken(session?.accessToken ?? null);
    setUser(session?.user ?? null);
    setStatus(session ? 'authenticated' : 'guest');
  }, []);

  // Restore the session from the refresh cookie on page load
  useEffect(() => {
    onSessionChange(applySession);
    let cancelled = false;
    void refreshSession().then((session) => {
      if (cancelled) return;
      applySession(session);
      if (session) applyUserLanguage(session.user);
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      applySession(session);
      applyUserLanguage(session.user);
      return session.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const session = await authApi.register(payload);
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const updateMe = useCallback(async (payload: UpdateMePayload) => {
    const updated = await authApi.updateMe(payload);
    setUser(updated);
    return updated;
  }, []);

  const reloadUser = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, updateMe, reloadUser }),
    [status, user, login, register, logout, updateMe, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
