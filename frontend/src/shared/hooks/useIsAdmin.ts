import { useAuthStore } from '../store/useAuthStore'

/** Returns true if the current logged-in user has admin privileges. */
export function useIsAdmin(): boolean {
  const user = useAuthStore((s) => s.user)
  return Boolean(user?.is_admin)
}
