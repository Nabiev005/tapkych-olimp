import { useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Permission checks for hiding UI. The backend always re-checks —
 * this only decides what to show.
 */
export function usePermissions() {
  const { user } = useAuth();
  const can = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );
  return { can, role: user?.role ?? null };
}
