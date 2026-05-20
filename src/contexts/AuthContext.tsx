// @refresh skip
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/config';
import { User, PlatformAdmin, UserPermissions, Owner } from '../types/db';
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
  enabled_modules?: string[];
  status?: string;
  subscription_status?: string;
  settings?: any;
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
  owner: Owner | null;
  isLoading: boolean;
  agencyId: string | null;
  agencies: AgencyInfo[];
  switchAgency: (agencyId: string | null) => void;
  refreshAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginOwner: (email: string, password: string) => Promise<Owner>;
  loginAdmin: (email: string, password: string) => Promise<PlatformAdmin>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updatePasswordWithSession: (newPassword: string) => Promise<void>;
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

// 🔹 Clés localStorage
const ACTIVE_AGENCY_KEY = 'gestion360_active_agency';
const CACHE_USER_KEY = 'gestion360_cached_user';
const CACHE_ADMIN_KEY = 'gestion360_cached_admin';
const CACHE_OWNER_KEY = 'gestion360_cached_owner';

// 🔹 Helper pour nettoyer tous les caches de session
const clearAllSessionCache = () => {
  localStorage.removeItem(ACTIVE_AGENCY_KEY);
  localStorage.removeItem(CACHE_USER_KEY);
  localStorage.removeItem(CACHE_ADMIN_KEY);
  localStorage.removeItem(CACHE_OWNER_KEY);
};

// 🔹 Fonction utilitaire pour charger un utilisateur + TOUTES ses agences
const fetchUserWithAgency = async (userId: string): Promise<AuthUser | null> => {
  console.log('🔍 AuthContext: fetchUserWithAgency pour userId:', userId);
  try {
    // 1. Charger l'utilisateur de public.users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select(
        'id, email, first_name, last_name, phone, avatar, is_active, permissions, created_at, updated_at, agency_users:agency_users!left(agency_id, role)'
      )
      .eq('id', userId)
      .limit(1);

    const data = usersData?.[0];
    if (usersError || !data) {
      console.error('❌ AuthContext: Erreur fetchUserWithAgency:', usersError);
      return null;
    }

    // 2. Récupérer TOUTES les entrées agency_users
    const rawAgencyUsers = Array.isArray(data.agency_users)
      ? data.agency_users
      : data.agency_users
        ? [data.agency_users]
        : [];

    const agencyIds = rawAgencyUsers.map((au: any) => au.agency_id).filter(Boolean);

    // 3. Charger les infos des agences (nom, ville, modules) pour le sélecteur
    let agenciesInfo: AgencyInfo[] = [];
    if (agencyIds.length > 0) {
      const { data: agenciesData, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, city, logo_url, enabled_modules, status, subscription_status, settings')
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
              enabled_modules: agencyDetails.enabled_modules || [],
              status: agencyDetails.status,
              subscription_status: agencyDetails.subscription_status,
              settings: agencyDetails.settings,
            };
          })
          .filter(Boolean) as AgencyInfo[];
      }
    }

    // 4. FALLBACK : Si agency_users est vide, chercher via agencies.director_id
    //    (au cas où agency_users n'a pas encore été alimenté en base)
    if (agenciesInfo.length === 0) {
      // Détection email de démo pour bypasser le bloqueur d'agence
      const lowerEmail = data.email?.toLowerCase();
      if (lowerEmail && (
        lowerEmail === 'demo@gestion360immo.com' || 
        lowerEmail === 'demo.agence@gestion360immo.com' || 
        lowerEmail === 'demo.proprio@gestion360immo.com'
      )) {
        const savedModules = localStorage.getItem('demo_agency_modules');
        const enabled_modules = savedModules ? JSON.parse(savedModules) : ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux'];
        const demoStatus = localStorage.getItem('demo_agency_status') || 'active';
        const demoPlan = localStorage.getItem('demo_agency_plan') || 'premium';
        
        agenciesInfo = [{
          agency_id: '00000000-0000-0000-0000-000000000000',
          role: 'director',
          name: 'Agence de Démonstration Expert',
          city: 'Conakry',
          enabled_modules,
          status: demoStatus,
          plan_type: demoPlan
        } as any];
        console.log("🚀 AuthContext: Injection d'une agence fictive pour le compte démo", { enabled_modules });
      } else {
        console.warn('⚠️ AuthContext: agency_users vide, tentative via agencies.director_id...');
        const { data: directorAgencies, error: directorError } = await supabase
          .from('agencies')
          .select('id, name, city, logo_url, enabled_modules, status, subscription_status, settings')
          .eq('director_id', userId)
          .eq('status', 'approved');

        if (!directorError && directorAgencies && directorAgencies.length > 0) {
          agenciesInfo = directorAgencies.map((a: any) => ({
            agency_id: a.id,
            role: 'director' as AgencyUserRole,
            name: a.name,
            city: a.city,
            logo_url: a.logo_url,
            enabled_modules: a.enabled_modules || [],
            status: a.status,
            subscription_status: a.subscription_status,
            settings: a.settings,
          }));
          console.log('✅ AuthContext: Agences trouvées via director_id:', agenciesInfo.length);

          for (const ag of agenciesInfo) {
            await supabase
              .from('agency_users')
              .upsert({ user_id: userId, agency_id: ag.agency_id, role: 'director' }, { onConflict: 'user_id,agency_id' });
          }
        } else {
          console.error('❌ AuthContext: Aucune agence trouvée ni via agency_users ni via director_id');
        }
      }
    }

    // ALWAYS apply Demo Agency overrides if present in the list
    agenciesInfo = agenciesInfo.map(ag => {
      if (ag.agency_id === '00000000-0000-0000-0000-000000000000') {
        const savedModules = localStorage.getItem('demo_agency_modules');
        const savedStatus = localStorage.getItem('demo_agency_status');
        const savedPlan = localStorage.getItem('demo_agency_plan');
        
        return {
          ...ag,
          enabled_modules: savedModules ? JSON.parse(savedModules) : ag.enabled_modules || ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux'],
          status: savedStatus || ag.status || 'active',
          plan_type: savedPlan || (ag as any).plan_type || 'premium'
        } as any;
      }
      return ag;
    });

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
  const [owner, setOwner] = useState<Owner | null>(null);
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

        // 🔌 Priorité absolue au cache local si le réseau est coupé
        if (!window.navigator.onLine) {
          console.warn('🔌 [offline] Mode hors-ligne détecté, chargement des sessions depuis le cache local...');
          const cachedUser = localStorage.getItem(CACHE_USER_KEY);
          const cachedAdmin = localStorage.getItem(CACHE_ADMIN_KEY);
          const cachedOwner = localStorage.getItem(CACHE_OWNER_KEY);

          if (cachedUser) {
            console.log('🔌 [offline] Session utilisateur restaurée du cache');
            setUser(JSON.parse(cachedUser));
            setAdmin(null);
            setOwner(null);
            setIsLoading(false);
            isCheckingSessionRef.current = false;
            return;
          } else if (cachedAdmin) {
            console.log('🔌 [offline] Session admin restaurée du cache');
            setAdmin(JSON.parse(cachedAdmin));
            setUser(null);
            setOwner(null);
            setIsLoading(false);
            isCheckingSessionRef.current = false;
            return;
          } else if (cachedOwner) {
            console.log('🔌 [offline] Session propriétaire restaurée du cache');
            setOwner(JSON.parse(cachedOwner));
            setUser(null);
            setAdmin(null);
            setIsLoading(false);
            isCheckingSessionRef.current = false;
            return;
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.user) {
          console.error('❌ AuthContext: Pas de session utilisateur', sessionError);
          setUser(null);
          setAdmin(null);
          return;
        }

        const currentUserId = sessionData.session.user.id;

        // Récupérer les infos admin (sécurisé)
        // IMPORTANT: On vérifie d'abord si cet utilisateur est un membre d'agence.
        // Si oui, on ne le traite JAMAIS comme admin même s'il y a une entrée platform_admins.
        let isAgencyMember = false;
        try {
          const { data: agencyCheck } = await supabase
            .from('agency_users')
            .select('user_id')
            .eq('user_id', currentUserId)
            .limit(1);
          isAgencyMember = !!(agencyCheck && agencyCheck.length > 0);
        } catch (_) { /* ignore */ }

        let adminData = null;
        if (!isAgencyMember) {
          try {
            const { data: adminArray, error: adminError } = await supabase
              .from('platform_admins')
              .select('*')
              .eq('user_id', currentUserId)
              .limit(1);
            if (!adminError && adminArray) {
              adminData = adminArray[0];
            }
          } catch (err) {
            console.warn('⚠️ [Network] Échec récupération admin, tentative de fallback cache:', err);
          }
        } else {
          console.log('✅ AuthContext: Utilisateur est membre d\'agence - skip vérification admin');
        }

        if (adminData && !isAgencyMember) {
          const newAdmin: PlatformAdmin = {
            ...adminData,
            permissions: adminData.permissions || {},
            is_active: adminData.is_active ?? true,
          };
          localStorage.removeItem(CACHE_USER_KEY);
          localStorage.removeItem(CACHE_OWNER_KEY);
          localStorage.setItem(CACHE_ADMIN_KEY, JSON.stringify(newAdmin));
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

        // Récupérer les infos propriétaire (sécurisé)
        let ownerData = null;
        try {
          const { data: ownerArray, error: ownerError } = await supabase
            .from('owners')
            .select('*')
            .eq('user_id', currentUserId)
            .limit(1);
          if (!ownerError && ownerArray) {
            ownerData = ownerArray[0];
          }
        } catch (err) {
          console.warn('⚠️ [Network] Échec récupération propriétaire, tentative de fallback cache:', err);
        }

        if (ownerData) {
          console.log('✅ AuthContext: checkSession - Owner trouvé:', ownerData.first_name);
          localStorage.setItem('gestion360_cached_owner', JSON.stringify(ownerData));
          setOwner((prev) => {
            const prevData = prev ? omit(prev, ['updated_at']) : null;
            const newData = omit(ownerData as Owner, ['updated_at']);
            if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
              return ownerData as Owner;
            }
            return prev;
          });
          setUser(null);
          setAdmin(null);
          return;
        }

        // Récupérer les infos utilisateur agence (sécurisé)
        let u = null;
        try {
          u = await fetchUserWithAgency(currentUserId);
        } catch (err) {
          console.warn('⚠️ [Network] Échec récupération utilisateur agence, tentative de fallback cache:', err);
        }

        // 🔌 Fallback vers le cache si le réseau a échoué
        if (!u) {
          const cachedUser = localStorage.getItem(CACHE_USER_KEY);
          if (cachedUser) {
            u = JSON.parse(cachedUser);
            console.log('🔌 [offline] Chargement de l\'utilisateur agence depuis le cache local');
          }
        }

        if (u) {
          localStorage.removeItem(CACHE_ADMIN_KEY);
          localStorage.removeItem(CACHE_OWNER_KEY);
          localStorage.setItem(CACHE_USER_KEY, JSON.stringify(u));
          
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
          setOwner(null);
          return;
        }

        // Si ni user ni admin ni owner, réinitialiser
        setUser(null);
        setAdmin(null);
        setOwner(null);
      } catch (err) {
        console.error('❌ AuthContext: Erreur critique checkSession:', err);
        // Fallback ultime vers le cache avant de déconnecter
        const cachedUser = localStorage.getItem(CACHE_USER_KEY);
        const cachedAdmin = localStorage.getItem(CACHE_ADMIN_KEY);
        const cachedOwner = localStorage.getItem(CACHE_OWNER_KEY);
        
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        } else if (cachedAdmin) {
          setAdmin(JSON.parse(cachedAdmin));
        } else if (cachedOwner) {
          setOwner(JSON.parse(cachedOwner));
        } else {
          setUser(null);
          setAdmin(null);
          setOwner(null);
        }
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
        setOwner(null);
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

  const refreshAuth = useCallback(async () => {
    console.log('🔄 AuthContext: refreshAuth');
    await checkSession();
  }, [checkSession]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('🔄 AuthContext: login', { email });
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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

      // Nettoyer les caches des autres rôles pour éviter la contamination
      localStorage.removeItem(CACHE_ADMIN_KEY);
      localStorage.removeItem(CACHE_OWNER_KEY);

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
      setOwner(null);
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur login:', err);
      toast.error(err.message || 'Erreur lors de la connexion');
      throw err;
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: login terminé, isLoading:', false);
    }
  }, []);

  const loginOwner = useCallback(async (email: string, password: string): Promise<Owner> => {
    console.log('🔄 AuthContext: loginOwner', { email });
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (error) {
        if (error.message.includes('invalid credentials')) {
          throw new Error('Email ou mot de passe incorrect');
        }
        throw error;
      }
      if (!data.user) throw new Error('Utilisateur non trouvé');

      // 1. Try to find owner by user_id (optimal path)
      let { data: ownerArray } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', data.user.id)
        .limit(1);

      // 2. Fallback: search by email (in case user_id was never linked)
      if (!ownerArray || ownerArray.length === 0) {
        console.warn('⚠️ AuthContext: loginOwner - user_id lookup failed, trying email fallback...');
        const { data: emailFallback } = await supabase
          .from('owners')
          .select('*')
          .ilike('email', email.trim().toLowerCase())
          .limit(1);

        if (emailFallback && emailFallback.length > 0) {
          ownerArray = emailFallback;
          // Auto-link user_id so future logins work via user_id
          await supabase
            .from('owners')
            .update({ user_id: data.user.id })
            .eq('id', emailFallback[0].id);
          console.log('✅ AuthContext: loginOwner - user_id auto-linked for owner:', emailFallback[0].id);
        }
      }

      const ownerData = ownerArray?.[0];

      if (!ownerData) {
        console.error('❌ AuthContext: Erreur loginOwner, compte propriétaire non trouvé:', email);
        throw new Error('Compte propriétaire non trouvé. Vérifiez que votre email est bien enregistré par votre agence.');
      }

      const o = ownerData as Owner;
      // Nettoyer les caches des autres rôles
      localStorage.removeItem(CACHE_ADMIN_KEY);
      localStorage.removeItem(CACHE_USER_KEY);
      localStorage.setItem(CACHE_OWNER_KEY, JSON.stringify(o));
      setOwner(o);
      setUser(null);
      setAdmin(null);
      return o;
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur loginOwner:', err);
      toast.error(err.message || 'Erreur lors de la connexion propriétaire');
      throw err;
    } finally {
      setIsLoading(false);
      console.log('✅ AuthContext: loginOwner terminé, isLoading:', false);
    }
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string): Promise<PlatformAdmin> => {
    console.log('🔄 AuthContext: loginAdmin', { email });
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (error) {
        if (error.message.includes('invalid credentials')) {
          throw new Error('Email ou mot de passe incorrect');
        }
        throw error;
      }
      if (!data.user) throw new Error('Utilisateur non trouvé');

      const { data: adminArray, error: adminError } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', data.user.id)
        .limit(1);

      const adminData = adminArray?.[0];

      if (adminError || !adminData) {
        console.error('❌ AuthContext: Erreur loginAdmin, compte admin non trouvé:', adminError);
        throw new Error('Compte admin non trouvé');
      }

      const admin: PlatformAdmin = {
        ...adminData,
        permissions: adminData.permissions || {},
        is_active: adminData.is_active ?? true,
      };

      // Nettoyer les caches des autres rôles
      localStorage.removeItem(CACHE_USER_KEY);
      localStorage.removeItem(CACHE_OWNER_KEY);
      localStorage.removeItem(ACTIVE_AGENCY_KEY);
      localStorage.setItem(CACHE_ADMIN_KEY, JSON.stringify(admin));

      setAdmin(admin);
      setUser(null);
      setOwner(null);
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

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    console.log('🔄 AuthContext: updatePassword');
    setIsLoading(true);
    try {
      // 1. Vérifier le mot de passe actuel en tentant une ré-authentification silencieuse
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (!email) throw new Error('Utilisateur non identifié');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // 2. Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Mot de passe mis à jour avec succès');
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur updatePassword:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour du mot de passe');
      throw err;
    }
  }, []);

  const updatePasswordWithSession = useCallback(async (newPassword: string) => {
    console.log('🔄 AuthContext: updatePasswordWithSession');
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Mot de passe mis à jour avec succès');
    } catch (err: any) {
      console.error('❌ AuthContext: Erreur updatePasswordWithSession:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour du mot de passe');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAdmin(null);
      setOwner(null);
      setActiveAgencyId(null);
      // Nettoyer TOUS les caches pour éviter toute fuite de session entre utilisateurs
      clearAllSessionCache();
      console.log('✅ AuthContext: Déconnexion complète - tous les caches nettoyés');
    } finally {
      setIsLoading(false);
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
      owner,
      isLoading,
      agencyId: resolvedAgencyId,
      agencies: user?.agencies ?? [],
      switchAgency,
      refreshAuth, // Added as per instruction
      login,
      loginOwner,
      loginAdmin,
      updatePassword,
      updatePasswordWithSession,
      logout,
    }),
    [user, admin, owner, isLoading, resolvedAgencyId, switchAgency, refreshAuth, login, loginOwner, loginAdmin, updatePassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
