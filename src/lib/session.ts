import type { Profile } from '@/data/netflix';

export const SESSION_STORAGE_KEY = 'localflix.session';
export const ACTIVE_PROFILE_STORAGE_KEY = 'localflix.activeProfileId';

export type LocalSession = {
  user: { id: string; email: string };
  profiles: Profile[];
};

export function getStoredSession(): LocalSession | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as LocalSession;
    return parsed?.user?.id && Array.isArray(parsed.profiles) ? parsed : null;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveStoredSession(session: LocalSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
}

export function saveStoredActiveProfileId(profileId: string): void {
  window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
}
