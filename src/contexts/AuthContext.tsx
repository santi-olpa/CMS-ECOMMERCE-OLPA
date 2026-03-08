import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { login as authLogin, logout as authLogout, register as authRegister, subscribeToAuth } from '@/services/auth';
import { ensureProfile, getProfile } from '@/services/users';
import type { UserProfile } from '@/features/auth/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        let p = await getProfile(user.uid);
        if (!p) {
          p = await ensureProfile(
            user.uid,
            user.email ?? '',
            user.displayName ?? undefined,
          );
        }
        if (isMounted) setProfile(p);
      } catch {
        if (isMounted) setProfile(null);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authLogin(email, password);
    const p = await ensureProfile(u.uid, u.email ?? '', u.displayName ?? undefined);
    setProfile(p);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const u = await authRegister(email, password, displayName);
    const p = await ensureProfile(u.uid, u.email ?? '', u.displayName ?? undefined);
    setProfile(p);
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
