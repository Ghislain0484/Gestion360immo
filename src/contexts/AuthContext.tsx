// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type AppUser = {
  id: string;
  email: string | null;
  role: 'admin' | 'director' | 'user' | 'viewer';
  agencyId: string | null;
  isActive: boolean;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;   // alias 1
  signIn: (email: string, password: string) => Promise<void>;  // alias 2 (pour compat)
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Charge la session + profil app
  const loadSessionAndProfile = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('auth.getSession error:', error);
      setUser(null);
      setLoading(false);
      return;
    }

    const authUser = session?.user ?? null;
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Récupère le profil app (ne bloque pas la connexion si manquant)
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, auth_user_id, email, role, is_active, agency_id')
      .or(`id.eq.${authUser.id},auth_user_id.eq.${authUser.id}`)
      .maybeSingle();

    if (profileErr) {
      console.warn('users.select error:', profileErr);
    }

    setUser({
      id: authUser.id,
      email: authUser.email ?? null,
      role: (profile?.role as AppUser['role']) ?? 'user',
      agencyId: profile?.agency_id ?? null,
      isActive: profile?.is_active ?? true,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadSessionAndProfile();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Recharge le profil à chaque changement
      loadSessionAndProfile();
    });
    return () => { sub?.subscription?.unsubscribe(); };
  }, []);

  const doLogin = async (email: string, password: string) => {
    // Ne TRIM pas ici (tu as corrigé dans LoginForm)
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Ici uniquement on retourne l’erreur réelle d’Auth
      throw new Error(error.message || 'Email ou mot de passe incorrect');
    }
    await loadSessionAndProfile();
    // Si tu veux FORCER admin uniquement côté admin-app :
    // if (user?.role !== 'admin') throw new Error("Votre compte n'a pas les droits admin.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login: doLogin,
    signIn: doLogin,  // alias pour compatibilité avec ton LoginForm
    logout,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
