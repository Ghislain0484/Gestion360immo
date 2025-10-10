// @refresh skip
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/config';
import { User, PlatformAdmin, UserPermissions } from '../types/db';
import { AgencyUserRole } from '../types/enums';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface AuthUser extends User {
  agency_id?: string | undefined;
  role: AgencyUserRole | null;
  temp_password?: string;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: AuthUser | null;
  admin: PlatformAdmin | null;
  isLoading: boolean;
  agencyId: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<PlatformAdmin>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// 🔹 Utility to omit properties for comparison
const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

// 🔹 Fonction utilitaire pour charger un utilisateur + agence
const fetchUserWithAgency = async (userId: string): Promise<AuthUser | null> => {
  console.log('🔍 AuthContext: fetchUserWithAgency pour userId:', userId);
  try {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, first_name, last_name, phone, avatar, is_active, permissions, created_at, updated_at, agency_users:agency_users!left(agency_id, role)'
      )
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('❌ AuthContext: Erreur fetchUserWithAgency:', error);
      return null;
    }

    const agencyUser = Array.isArray(data.agency_users) ? data.agency_users[0] : data.agency_users;

    const userData: AuthUser = {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      avatar: data.avatar,
      is_active: data.is_active ?? true,
      permissions: data.permissions || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      agency_id: agencyUser?.agency_id ?? undefined,
      role: agencyUser?.role ?? null,
    };
    console.log('✅ AuthContext: Utilisateur chargé:', userData);
    return userData;
  } catch (err) {
    console.error('❌ AuthContext: Erreur fetchUserWithAgency:', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingSessionRef = useRef(false);

  const checkSession = useCallback(
    debounce(async () => {
      if (isCheckingSessionRef.current) {
        console.log('🚫 AuthContext: Ignorer checkSession, déjà en cours');
        return;
      }

      console.log('🔄 AuthContext: checkSession');
      isCheckingSessionRef.current = true;
      try {
        if (!supabase || !isSupabaseConfigured) {
          console.error('❌ AuthContext: Supabase non configuré');
          setUser(null);
          setAdmin(null);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          console.error('❌ AuthContext: Pas de session utilisateur', error);
          setUser(null);
          setAdmin(null);
          return;
        }

        // Vérifier d'abord si c'est un admin
        const { data: adminData, error: adminError } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('user_id', data.session.user.id)
          .single();

        if (!adminError && adminData) {
          const newAdmin: PlatformAdmin = {
            ...adminData,
            permissions: adminData.permissions || {},
            is_active: adminData.is_active ?? true,
          };
          setAdmin((prev) => {
            const prevData = prev ? omit(prev, ['updated_at']) : null;
            const newData = omit(newAdmin, ['updated_at']);
            if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
              console.log('🔄 AuthContext: Mise à jour admin:', newAdmin);
              return newAdmin;
            }
            console.log('🔄 AuthContext: Admin inchangé');
            return prev;
          });
          setUser(null);
          return;
        }

        // Si ce n'est pas un admin, essayer en tant qu'utilisateur normal
        const u = await fetchUserWithAgency(data.session.user.id);
        if (u) {
          setUser((prev) => {
            const prevData = prev ? omit(prev, ['updated_at']) : null;
            const newData = u ? omit(u, ['updated_at']) : null;
            if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
              console.log('🔄 AuthContext: Mise à jour utilisateur:', u);
              return u;
            }
            console.log('🔄 AuthContext: Utilisateur inchangé');
            return prev;
          });
          setAdmin(null);
          return;
        }

        // Si ni user ni admin, réinitialiser
        setUser(null);
        setAdmin(null);
      } catch (err) {
        console.error('❌ AuthContext: Erreur checkSession:', err);
        setUser(null);
        setAdmin(null);
      } finally {
        isCheckingSessionRef.current = false;
        setIsLoading(false);
        console.log('✅ AuthContext: Chargement terminé, isLoading:', false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    console.log('🔄 AuthContext: Initialisation useEffect');
    let isMounted = true;

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((evt, session) => {
      console.log('🔄 AuthContext: Événement auth state change', { evt, userId: session?.user?.id });
      if (!isMounted) return;
      if (evt === 'SIGNED_IN' || evt === 'INITIAL_SESSION') {
        checkSession();
      } else if (evt === 'SIGNED_OUT') {
        setUser(null);
        setAdmin(null);
        setIsLoading(false);
      }
    });

    return () => {
      console.log('🛑 AuthContext: Cleanup');
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [checkSession]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('🔄 AuthContext: login', { email });
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) {
        if (error.message.includes('invalid credentials')) {
          throw new Error('Email ou mot de passe incorrect');
        }
        throw error;
      }
      if (!data.user) throw new Error('Utilisateur non trouvé');
      const u = await fetchUserWithAgency(data.user.id);
      if (!u) throw new Error('Utilisateur non associé à une agence');
      setUser(u);
      setAdmin(null);
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur login:', err);
      toast.error(err.message || 'Erreur lors de la connexion');
      throw err;
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: login terminé, isLoading:', false);
    }
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string): Promise<PlatformAdmin> => {
    console.log('🔄 AuthContext: loginAdmin', { email });
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) {
        if (error.message.includes('invalid credentials')) {
          throw new Error('Email ou mot de passe incorrect');
        }
        throw error;
      }
      if (!data.user) throw new Error('Utilisateur non trouvé');

      const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (adminError || !adminData) {
        console.error('❌ AuthContext: Erreur loginAdmin, compte admin non trouvé:', adminError);
        throw new Error('Compte admin non trouvé');
      }

      const admin: PlatformAdmin = {
        ...adminData,
        permissions: adminData.permissions || {},
        is_active: adminData.is_active ?? true,
      };

      setAdmin(admin);
      setUser(null);
      await supabase
        .from('platform_admins')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', data.user.id);

      return admin;
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur loginAdmin:', err);
      toast.error(err.message || 'Erreur lors de la connexion admin');
      throw err;
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: loginAdmin terminé, isLoading:', false);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('🔄 AuthContext: logout');
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: logout terminé, isLoading:', false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      admin,
      isLoading,
      agencyId: user?.agency_id ?? null,
      login,
      loginAdmin,
      logout,
    }),
    [user, admin, isLoading, login, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
