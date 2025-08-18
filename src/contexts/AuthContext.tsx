import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { PlatformAdmin } from '../types/admin';

// Runtime flags
const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);
const isProd = import.meta.env.MODE === 'production';
const allowDemo = !isProd; // never used in prod; kept for dev-only fallbacks

interface AuthContextType {
  user: User | null;
  admin: PlatformAdmin | null;
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, purge any demo/local stray state
    if (isProd) {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('demo_') || k === 'user' || k === 'admin' || k.startsWith('agency_users_') || k === 'approved_accounts')
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
    }

    const checkSession = async () => {
      try {
        // Dev-only: pick local demo session if any
        if (allowDemo) {
          const storedAdmin = localStorage.getItem('admin');
          if (storedAdmin) {
            setAdmin(JSON.parse(storedAdmin));
            setIsLoading(false);
            return;
          }
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsLoading(false);
            return;
          }
        }

        if (!supabase || !isSupabaseConfigured) {
          if (!allowDemo) throw new Error('Supabase non configuré en production.');
          console.warn('⚠️ Supabase non configuré - mode démo (dev uniquement)');
          setIsLoading(false);
          return;
        }

        // 1) Read current auth session
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;
        if (!authUser) {
          setUser(null);
          setAdmin(null);
          setIsLoading(false);
          return;
        }

        // 2) Try platform admin FIRST (does not depend on "users" table)
        const { data: adminData, error: adminErr } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (adminErr) console.warn('platform_admins fetch error:', adminErr);
        if (adminData) {
          const mapped: PlatformAdmin = {
            id: adminData.id,
            email: adminData.email,
            firstName: adminData.first_name,
            lastName: adminData.last_name,
            role: adminData.role,
            permissions: adminData.permissions,
            createdAt: new Date(adminData.created_at),
          };
          setAdmin(mapped);
          setIsLoading(false);
          return;
        }

        // 3) Else, try application profile in "users" (may not exist for platform admins)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        if (userError) console.warn('users fetch error:', userError);

        if (userData) {
          const mappedUser: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role,
            agencyId: userData.agency_id,
            avatar: userData.avatar,
            createdAt: new Date(userData.created_at),
          };
          setUser(mappedUser);
          setIsLoading(false);
          return;
        }

        // 4) Graceful fallback: keep minimal auth session (no hard throw)
        const minimal: User = {
          id: authUser.id,
          email: authUser.email ?? '',
          firstName: '',
          lastName: '',
          role: 'staff', // sensible default; adjust to your ACL needs
          agencyId: undefined,
          createdAt: new Date(),
        };
        setUser(minimal);
      } catch (e) {
        console.error('Error checking session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth state changes
    let unsubscribe: (() => void) | null = null;
    if (supabase && isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setUser(null);
          setAdmin(null);
          try {
            localStorage.removeItem('user');
            localStorage.removeItem('admin');
          } catch {}
        } else {
          // Re-run session logic to map admin/user
          checkSession();
        }
      });
      unsubscribe = () => data.subscription?.unsubscribe();
    }

    return () => {
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Session invalide');

      // Try app user first
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (userData) {
        const mapped: User = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          agencyId: userData.agency_id,
          avatar: userData.avatar,
          createdAt: new Date(userData.created_at),
        };
        setUser(mapped);
        if (allowDemo) localStorage.setItem('user', JSON.stringify(mapped));
        return;
      }

      // Then try platform admin (in case a director logs into admin area)
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (adminData) {
        const mappedAdmin: PlatformAdmin = {
          id: adminData.id,
          email: adminData.email,
          firstName: adminData.first_name,
          lastName: adminData.last_name,
          role: adminData.role,
          permissions: adminData.permissions,
          createdAt: new Date(adminData.created_at),
        };
        setAdmin(mappedAdmin);
        if (allowDemo) localStorage.setItem('admin', JSON.stringify(mappedAdmin));
        return;
      }

      // Minimal fallback
      const minimal: User = {
        id: authUser.id,
        email: authUser.email ?? '',
        firstName: '',
        lastName: '',
        role: 'staff',
        agencyId: undefined,
        createdAt: new Date(),
      };
      setUser(minimal);
      if (allowDemo) localStorage.setItem('user', JSON.stringify(minimal));
    } catch (e) {
      console.error('Login error:', e);
      throw e instanceof Error ? e : new Error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!supabase || !isSupabaseConfigured) throw new Error('Supabase non configuré');

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Session invalide');

      const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!adminData) throw new Error('Profil administrateur introuvable');

      const mapped: PlatformAdmin = {
        id: adminData.id,
        email: adminData.email,
        firstName: adminData.first_name,
        lastName: adminData.last_name,
        role: adminData.role,
        permissions: adminData.permissions,
        createdAt: new Date(adminData.created_at),
      };
      setAdmin(mapped);
      if (allowDemo) localStorage.setItem('admin', JSON.stringify(mapped));
    } catch (e) {
      console.error('Login admin error:', e);
      throw e instanceof Error ? e : new Error('Erreur de connexion admin');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (supabase && isSupabaseConfigured) {
      supabase.auth.signOut();
    }
    setUser(null);
    setAdmin(null);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
    } catch {}
  };

  const value: AuthContextType = { user, admin, login, loginAdmin, logout, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
