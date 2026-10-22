import { createContext } from 'react';
import type { RegisterPayload, UpdateMePayload } from '../services/auth';
import type { Me } from '../services/types';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export interface AuthContextValue {
  status: AuthStatus;
  user: Me | null;
  login: (email: string, password: string) => Promise<Me>;
  register: (payload: RegisterPayload) => Promise<Me>;
  logout: () => Promise<void>;
  updateMe: (payload: UpdateMePayload) => Promise<Me>;
  /** Re-fetches the current user (points, streak, ...) */
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
