import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { PlatformAdmin } from '../types/admin';

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Ne JAMAIS autoriser la démo en production
const allowDemo = import.meta.env.MODE !== 'production';

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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // En production : purge des données démo/locales pour éviter les “fantômes”
    if (import.meta.env.MODE === 'production') {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('demo_') || k === 'user' || k === 'admin' || k.startsWith('agency_users_') || k === 'approved_accounts')
          .forEach(k => localStorage.removeItem(k));
      } catch {}
    }

    const checkSession = async () => {
      try {
        // En dev, on peut accepter un user/admin du localStorage pour la démo
        if (allowDemo) {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsLoading(false);
            return;
          }
          const storedAdmin = localStorage.getItem('admin');
          if (storedAdmin) {
            setAdmin(JSON.parse(storedAdmin));
            setIsLoading(false);
            return;
          }
        }

        if (supabase && isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Charger le profil depuis la table users (ID = auth.uid())
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (userError || !userData) {
              // Arrêt net : pas de profil → pas de fallback silencieux
              throw new Error('Profil utilisateur non trouvé. Contactez votre administrateur.');
            }

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
            return;
          }
        } else {
          // Non configuré : en prod on bloque, en dev on tolère la démo
          if (!allowDemo) {
            throw new Error('Supabase non configuré en production.');
          }
          console.warn('⚠️ Supabase non configuré - mode démo uniquement (dev)');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (error instanceof Error && error.message.includes('Invalid API key')) {
          console.error('🔑 Configuration Supabase invalide en production:', {
            url: import.meta.env.VITE_SUPABASE_URL,
            keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
            keyStart: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10),
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Écoute des changements d’auth
    let unsubscribe: (() => void) | null = null;
    if (supabase && isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          localStorage.removeItem('user');
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
      // 1) PROD/DEV → priorité à Supabase
      if (supabase && isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (authError) throw authError;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (userError || !userData) {
          throw new Error('Profil utilisateur non trouvé. Contactez votre administrateur.');
        }

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
        // (En prod : on n’écrit pas dans localStorage “user”)
        if (allowDemo) localStorage.setItem('user', JSON.stringify(mapped));
        return;
      }

      // 2) DEV uniquement → chemins démo
      if (allowDemo) {
        // Comptes approuvés (local)
        const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
        const approved = approvedAccounts.find((acc: any) =>
          acc.email.trim().toLowerCase() === email.trim().toLowerCase() &&
          acc.password === password.trim()
        );
        if (approved) {
          const mapped: User = {
            id: approved.id,
            email: approved.email,
            firstName: approved.firstName,
            lastName: approved.lastName,
            role: approved.role,
            agencyId: approved.agencyId,
            avatar: approved.avatar,
            createdAt: new Date(approved.createdAt),
          };
          setUser(mapped);
          localStorage.setItem('user', JSON.stringify(mapped));
          return;
        }

        // Utilisateurs d’agence (local)
        const allAgencyUsers = Object.keys(localStorage)
          .filter(key => key.startsWith('agency_users_'))
          .flatMap(key => JSON.parse(localStorage.getItem(key) || '[]'));
        const agencyUser = allAgencyUsers.find((u: any) =>
          u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
          u.password === password.trim()
        );
        if (agencyUser) {
          const mapped: User = {
            id: agencyUser.id,
            email: agencyUser.email,
            firstName: agencyUser.firstName,
            lastName: agencyUser.lastName,
            role: agencyUser.role,
            agencyId: agencyUser.agencyId,
            avatar: agencyUser.avatar,
            createdAt: new Date(agencyUser.createdAt),
          };
          setUser(mapped);
          localStorage.setItem('user', JSON.stringify(mapped));
          return;
        }

        // Démo statique
        const demoUsers = [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            email: 'marie.kouassi@agence.com',
            password: 'demo123',
            firstName: 'Marie',
            lastName: 'Kouassi',
            role: 'director',
            agencyId: 'demo_agency_001',
          }
        ];
        const demoUser = demoUsers.find(u =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password.trim()
        );
        if (demoUser) {
          const mapped: User = {
            id: demoUser.id,
            email: demoUser.email,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            role: demoUser.role as User['role'],
            agencyId: demoUser.agencyId,
            createdAt: new Date(),
          };
          setUser(mapped);
          localStorage.setItem('user', JSON.stringify(mapped));
          return;
        }
      }

      throw new Error('Email ou mot de passe incorrect.');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // PROD/DEV → priorité à Supabase
      if (supabase && isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (authError) throw authError;

        const { data: adminData, error: adminError } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (adminError || !adminData) {
          throw new Error('Profil administrateur introuvable');
        }

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
        return;
      }

      // DEV seulement → démo admin
      if (allowDemo) {
        const demoAdmins = [
          {
            id: 'admin_production_001',
            email: 'gagohi06@gmail.com',
            password: 'Jesus2025$',
            firstName: 'Maurel',
            lastName: 'Agohi',
            role: 'super_admin',
            permissions: {
              agencyManagement: true,
              subscriptionManagement: true,
              platformSettings: true,
              reports: true,
              userSupport: true,
              systemMaintenance: true,
              dataExport: true,
              auditAccess: true,
            },
          },
        ];
        const demoAdmin = demoAdmins.find(a => a.email === email && a.password === password);
        if (demoAdmin) {
          const mapped: PlatformAdmin = {
            id: demoAdmin.id,
            email: demoAdmin.email,
            firstName: demoAdmin.firstName,
            lastName: demoAdmin.lastName,
            role: demoAdmin.role as 'super_admin' | 'admin',
            permissions: demoAdmin.permissions,
            createdAt: new Date(),
          };
          setAdmin(mapped);
          localStorage.setItem('admin', JSON.stringify(mapped));
          return;
        }
      }

      throw new Error('Email ou mot de passe administrateur incorrect');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Erreur de connexion admin');
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
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
  };

  const value = { user, admin, login, loginAdmin, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
