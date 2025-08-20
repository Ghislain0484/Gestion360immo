import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, dbService } from '../lib/supabase';
import { User } from '../types';
import { PlatformAdmin } from '../types/admin';

// Check if Supabase is properly configured
const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check for demo user in localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setIsLoading(false);
          return;
        }

        // Check for demo admin in localStorage
        const storedAdmin = localStorage.getItem('admin');
        if (storedAdmin) {
          setAdmin(JSON.parse(storedAdmin));
          setIsLoading(false);
          return;
        }

        // Only check Supabase if configured
        if (supabase && isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Get user profile from database using Supabase auth user ID
            console.log('📋 Récupération profil utilisateur...');
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (userError || !userData) {
              const user: User = {
                id: userData.id,
                email: userData.email,
                firstName: userData.first_name,
                lastName: userData.last_name,
                role: userData.role,
                agencyId: userData.agency_id,
                avatar: userData.avatar,
                createdAt: new Date(userData.created_at),
              };
              throw new Error('Profil utilisateur non trouvé. Contactez votre administrateur.');
            } else if (supabaseError.message?.includes('Profil utilisateur non trouvé')) {
              throw new Error('Compte non activé. Contactez votre administrateur pour activer votre compte.');
            }
            
            console.log('✅ Profil utilisateur récupéré:', userData.email);
          }
        } else if (!isSupabaseConfigured) {
          console.warn('⚠️ Supabase non configuré - mode démo uniquement');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // En cas d'erreur de session, vérifier les variables d'environnement
        if (error instanceof Error && error.message.includes('Invalid API key')) {
          console.error('🔑 Configuration Supabase invalide en production:', {
            url: import.meta.env.VITE_SUPABASE_URL,
            keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
            keyStart: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10)
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    let authListener: any = null;
    if (supabase && isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          localStorage.removeItem('user');
        }
      });
      authListener = data;
    }

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔐 Tentative de connexion pour:', email);
      
      // Vérifier d'abord les comptes approuvés
      const approvedAccounts = JSON.parse(localStorage.getItem('approved_accounts') || '[]');
      const approvedAccount = approvedAccounts.find((acc: any) => 
        acc.email.trim().toLowerCase() === email.trim().toLowerCase() && 
        acc.password === password.trim()
      );
      
      if (approvedAccount) {
        console.log('✅ Compte approuvé trouvé:', approvedAccount.email);
        
        const user: User = {
          id: approvedAccount.id,
          email: approvedAccount.email,
          firstName: approvedAccount.firstName,
          lastName: approvedAccount.lastName,
          role: approvedAccount.role,
          agencyId: approvedAccount.agencyId,
          avatar: approvedAccount.avatar,
          createdAt: new Date(approvedAccount.createdAt),
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Connexion réussie avec compte approuvé');
        return;
      }
      
      // Vérifier les utilisateurs créés dans les agences
      const allAgencyUsers = Object.keys(localStorage)
        .filter(key => key.startsWith('agency_users_'))
        .flatMap(key => JSON.parse(localStorage.getItem(key) || '[]'));
      
      const agencyUser = allAgencyUsers.find((u: any) => 
        u.email.trim().toLowerCase() === email.trim().toLowerCase() && 
        u.password === password.trim()
      );
      
      if (agencyUser) {
        console.log('✅ Utilisateur d\'agence trouvé:', agencyUser.email);
        
        const user: User = {
          id: agencyUser.id,
          email: agencyUser.email,
          firstName: agencyUser.firstName,
          lastName: agencyUser.lastName,
          role: agencyUser.role,
          agencyId: agencyUser.agencyId,
          avatar: agencyUser.avatar,
          createdAt: new Date(agencyUser.createdAt),
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Connexion réussie avec utilisateur d\'agence');
        return;
      }
      
      // Vérifier les comptes démo
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
        console.log('✅ Compte démo trouvé:', demoUser.email);
        
        const user: User = {
          id: demoUser.id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          role: demoUser.role as User['role'],
          agencyId: demoUser.agencyId,
          createdAt: new Date(),
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Connexion démo réussie');
        return;
      }
      
      // Essayer Supabase en dernier recours
      if (supabase && isSupabaseConfigured) {
        try {
          console.log('🔐 Tentative de connexion Supabase pour:', email);
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });

          if (authError) {
            console.error('❌ Erreur auth Supabase:', authError);
            throw authError;
          }

          // Get user profile from database using authenticated user ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (userError) {
            console.error('❌ Erreur récupération profil utilisateur:', userError);
            throw userError;
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role,
            agencyId: userData.agency_id,
            avatar: userData.avatar,
            createdAt: new Date(userData.created_at),
          };
          
          setUser(user);
          console.log('✅ Connexion Supabase réussie');
          return;
        } catch (supabaseError: any) {
          console.error('❌ Erreur Supabase auth:', supabaseError);
        }
      }
      
      // Si aucune méthode ne fonctionne
      console.log('❌ Aucune méthode d\'authentification n\'a fonctionné');
      throw new Error('Email ou mot de passe incorrect. Utilisez les comptes démo : marie.kouassi@agence.com / demo123');
      
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
      // Demo admin credentials
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

      // Check demo admin credentials
      const demoAdmin = demoAdmins.find(a => a.email === email && a.password === password);
      
      if (demoAdmin) {
        const admin: PlatformAdmin = {
          id: demoAdmin.id,
          email: demoAdmin.email,
          firstName: demoAdmin.firstName,
          lastName: demoAdmin.lastName,
          role: demoAdmin.role as 'super_admin' | 'admin',
          permissions: demoAdmin.permissions,
          createdAt: new Date(),
        };
        
        setAdmin(admin);
        localStorage.setItem('admin', JSON.stringify(admin));
        
        return;
      }

      // If not demo admin, try Supabase authentication
      if (supabase && isSupabaseConfigured) {
        try {
          console.log('🔐 Tentative de connexion admin Supabase...');
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;

          // Get admin profile from database
          const { data: adminData, error: adminError } = await supabase
            .from('platform_admins')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (adminError) throw adminError;

          const admin: PlatformAdmin = {
            id: adminData.id,
            email: adminData.email,
            firstName: adminData.first_name,
            lastName: adminData.last_name,
            role: adminData.role,
            permissions: adminData.permissions,
            createdAt: new Date(adminData.created_at),
          };
          
          setAdmin(admin);
          localStorage.setItem('admin', JSON.stringify(admin));
          console.log('✅ Connexion admin Supabase réussie');
          return;
        } catch (supabaseError) {
          console.error('❌ Erreur connexion admin Supabase:', supabaseError);
          throw new Error('Identifiants administrateur incorrects');
        }
      } else {
        console.warn('⚠️ Supabase non configuré pour admin');
        throw new Error('Identifiants administrateur incorrects');
      }
      
    } catch (error) {
      throw new Error('Email ou mot de passe administrateur incorrect');
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

  const value = {
    user,
    admin,
    login,
    loginAdmin,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};