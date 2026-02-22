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

export interface AgencyInfo {
  agency_id: string;
  role: AgencyUserRole;
  name: string;
  city: string;
  logo_url?: string | null;
}

export interface AuthUser extends User {
  agency_id?: string | undefined;
  role: AgencyUserRole | null;
  temp_password?: string;
  permissions: UserPermissions;
  agencies: AgencyInfo[];
}

interface AuthContextType {
  user: AuthUser | null;
  admin: PlatformAdmin | null;
  isLoading: boolean;
  agencyId: string | null;
  agencies: AgencyInfo[];
  switchAgency: (agencyId: string | null) => void;
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

// 🔹 Clé localStorage pour l'agence active
const ACTIVE_AGENCY_KEY = 'gestion360_active_agency';

// 🔹 Fonction utilitaire pour charger un utilisateur + TOUTES ses agences
const fetchUserWithAgency = async (userId: string): Promise<AuthUser | null> => {
  console.log('🔍 AuthContext: fetchUserWithAgency pour userId:', userId);
  try {
    // 1. Charger l'utilisateur de public.users
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

    // 2. Récupérer TOUTES les entrées agency_users
    const rawAgencyUsers = Array.isArray(data.agency_users)
      ? data.agency_users
      : data.agency_users
        ? [data.agency_users]
        : [];

    const agencyIds = rawAgencyUsers.map((au: any) => au.agency_id).filter(Boolean);

    // 3. Charger les infos des agences (nom, ville) pour le sélecteur
    let agenciesInfo: AgencyInfo[] = [];
    if (agencyIds.length > 0) {
      const { data: agenciesData, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, city, logo_url')
        .in('id', agencyIds);

      if (!agenciesError && agenciesData) {
        agenciesInfo = rawAgencyUsers
          .map((au: any) => {
            const agencyDetails = agenciesData.find((a: any) => a.id === au.agency_id);
            if (!agencyDetails) return null;
            return {
              agency_id: au.agency_id,
              role: au.role as AgencyUserRole,
              name: agencyDetails.name,
              city: agencyDetails.city,
              logo_url: agencyDetails.logo_url,
            };
          })
          .filter(Boolean) as AgencyInfo[];
      }
    }

    // 4. FALLBACK : Si agency_users est vide, chercher via agencies.director_id
    //    (au cas où agency_users n'a pas encore été alimenté en base)
    if (agenciesInfo.length === 0) {
      console.warn('⚠️ AuthContext: agency_users vide, tentative via agencies.director_id...');
      const { data: directorAgencies, error: directorError } = await supabase
        .from('agencies')
        .select('id, name, city, logo_url')
        .eq('director_id', userId)
        .eq('status', 'approved');

      if (!directorError && directorAgencies && directorAgencies.length > 0) {
        agenciesInfo = directorAgencies.map((a: any) => ({
          agency_id: a.id,
          role: 'director' as AgencyUserRole,
          name: a.name,
          city: a.city,
          logo_url: a.logo_url,
        }));
        console.log('✅ AuthContext: Agences trouvées via director_id:', agenciesInfo.length);

        // Auto-corriger agency_users en base pour les prochaines connexions
        for (const ag of agenciesInfo) {
          await supabase
            .from('agency_users')
            .upsert({ user_id: userId, agency_id: ag.agency_id, role: 'director' }, { onConflict: 'user_id,agency_id' });
        }
        console.log('✅ AuthContext: agency_users auto-corrigé en base');
      } else {
        console.error('❌ AuthContext: Aucune agence trouvée ni via agency_users ni via director_id');
      }
    }

    // 5. Gestion de l'agence par défaut
    // On ne définit agency_id/role ici que s'il y a EXACTEMENT une agence.
    // Sinon, ils resteront null jusqu'à ce que checkSession ou login les définisse via localStorage.
    const defaultAgency = agenciesInfo.length === 1 ? agenciesInfo[0] : null;

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
      agency_id: defaultAgency?.agency_id,
      role: defaultAgency?.role ?? null,
      agencies: agenciesInfo,
    };
    console.log('✅ AuthContext: fetchUserWithAgency terminé. Agences:', agenciesInfo.length);
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
  const [activeAgencyId, setActiveAgencyId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_AGENCY_KEY)
  );
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
          // 1. Déterminer l'agence active (localStorage ou auto-sélection si unique)
          const savedAgencyId = localStorage.getItem(ACTIVE_AGENCY_KEY);
          const agencyIds = u.agencies.map((a) => a.agency_id);

          let activeId: string | null = null;
          if (savedAgencyId && agencyIds.includes(savedAgencyId)) {
            activeId = savedAgencyId;
          } else if (agencyIds.length === 1) {
            activeId = agencyIds[0];
            localStorage.setItem(ACTIVE_AGENCY_KEY, activeId);
          }

          // 2. Peupler l'objet utilisateur avec le rôle/id de l'agence active
          if (activeId) {
            const activeEntry = u.agencies.find((a) => a.agency_id === activeId);
            if (activeEntry) {
              u.agency_id = activeId;
              u.role = activeEntry.role;
              console.log('✅ AuthContext: checkSession - Agence active:', activeEntry.name, 'Rôle:', u.role);
            }
            setActiveAgencyId(activeId);
          } else {
            console.log('⚠️ AuthContext: checkSession - Pas d\'agence active (multi-agences sans choix)');
            setActiveAgencyId(null);
          }

          // 3. Mettre à jour l'état
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

  const switchAgency = useCallback((newAgencyId: string | null) => {
    if (!user) return;

    if (newAgencyId === null) {
      localStorage.removeItem(ACTIVE_AGENCY_KEY);
      setActiveAgencyId(null);
      // On garde le user mais sans agence_id active
      setUser((prev) => prev ? { ...prev, agency_id: undefined, role: null } : prev);
      console.log('🔄 AuthContext: Agence réinitialisée (retour au choix)');
      return;
    }

    const agencyEntry = user.agencies.find((a) => a.agency_id === newAgencyId);
    if (!agencyEntry) {
      console.warn('⚠️ AuthContext: Agence non trouvée:', newAgencyId);
      return;
    }
    localStorage.setItem(ACTIVE_AGENCY_KEY, newAgencyId);
    setActiveAgencyId(newAgencyId);
    // Mettre à jour le user avec la nouvelle agence active (agency_id et role)
    setUser((prev) =>
      prev
        ? { ...prev, agency_id: newAgencyId, role: agencyEntry.role }
        : prev
    );
    toast.success(`Agence changée : ${agencyEntry.name}`);
    console.log('🔄 AuthContext: Agence active changée vers:', newAgencyId);
  }, [user]);

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
      // Définir l'agence active
      const savedAgency = localStorage.getItem(ACTIVE_AGENCY_KEY);
      const agencyIds = u.agencies.map((a) => a.agency_id);

      let activeId: string | null = null;
      if (savedAgency && agencyIds.includes(savedAgency)) {
        activeId = savedAgency;
      } else if (agencyIds.length === 1) {
        activeId = agencyIds[0];
      }

      if (activeId) {
        localStorage.setItem(ACTIVE_AGENCY_KEY, activeId);
        setActiveAgencyId(activeId);
        const activeEntry = u.agencies.find((a) => a.agency_id === activeId);
        if (activeEntry) {
          u.agency_id = activeId;
          u.role = activeEntry.role;
        }
      }
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
      setActiveAgencyId(null);
      // NE PAS effacer localStorage pour mémoriser la préférence
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: logout terminé, isLoading:', false);
    }
  }, []);

  // L'agencyId du contexte est l'agence active mémorisée ou celle par défaut
  // Si null et que l'utilisateur a plusieurs agences → l'App affichera le sélecteur
  const resolvedAgencyId = useMemo(() => {
    if (!user) return null;
    // 1. Priorité à l'agence mémorisée dans cette session/localStorage
    if (activeAgencyId && user.agencies.some((a) => a.agency_id === activeAgencyId)) {
      return activeAgencyId;
    }
    // 2. Fallback sur l'agence par défaut (définie seulement si l'utilisateur en a une seule)
    return user.agency_id ?? null;
  }, [user, activeAgencyId]);

  const value = useMemo(
    () => ({
      user: user ? { ...user, agency_id: resolvedAgencyId ?? undefined } : null,
      admin,
      isLoading,
      agencyId: resolvedAgencyId,
      agencies: user?.agencies ?? [],
      switchAgency,
      login,
      loginAdmin,
      logout,
    }),
    [user, admin, isLoading, resolvedAgencyId, switchAgency, login, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
