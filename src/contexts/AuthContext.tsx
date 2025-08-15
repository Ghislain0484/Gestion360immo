import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, dbService } from '../lib/supabase';
import { User } from '../types';
import { PlatformAdmin } from '../types/admin';

// Check if Supabase is properly configured
const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_URL.startsWith('https://') && 
  import.meta.env.VITE_SUPABASE_URL.includes('.supabase.co') &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://votre-projet.supabase.co' && 
  import.meta.env.VITE_SUPABASE_ANON_KEY.startsWith('eyJ') &&
  import.meta.env.VITE_SUPABASE_ANON_KEY.length > 100 &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('...')
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
      // Demo credentials for development
      const demoUsers = [
        {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          email: 'marie.kouassi@agence.com',
          password: 'demo123',
          firstName: 'Marie',
          lastName: 'Kouassi',
          role: 'director',
          agencyId: 'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
          avatar: null,
        },
        {
          id: 'c3d4e5f6-a7b8-9012-3456-789012cdef01',
          email: 'manager1@agence.com',
          password: 'demo123',
          firstName: 'Jean',
          lastName: 'Bamba',
          role: 'manager',
          agencyId: 'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
          avatar: null,
        },
        {
          id: 'd4e5f6a7-b8c9-0123-4567-890123def012',
          email: 'agent1@agence.com',
          password: 'demo123',
          firstName: 'Koffi',
          lastName: 'Martin',
          role: 'agent',
          agencyId: 'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
          avatar: null,
        }
      ];

      // Check for approved agencies in localStorage first
      const approvedAgencies = JSON.parse(localStorage.getItem('approved_agencies') || '[]');
      const approvedUser = approvedAgencies.find((agency: any) => 
        agency.director_email === email.trim() && agency.director_password === password.trim()
      );
      
      if (approvedUser) {
        console.log('✅ Connexion avec compte agence approuvée:', email, 'ID:', approvedUser.agency_id);
        const user: User = {
          id: approvedUser.director_id || `approved_${Date.now()}`,
          email: approvedUser.director_email,
          firstName: approvedUser.director_first_name,
          lastName: approvedUser.director_last_name,
          role: 'director',
          agencyId: approvedUser.agency_id,
          avatar: null,
          createdAt: new Date(),
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Utilisateur connecté avec agence ID:', user.agencyId);
        return;
      }

      // Then check demo users
      const demoUser = demoUsers.find(u => u.email === email && u.password === password);
      
      if (demoUser) {
        console.log('✅ Connexion avec compte démo:', email);
        const user: User = {
          id: demoUser.id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          role: demoUser.role as 'director' | 'manager' | 'agent',
          agencyId: demoUser.agencyId,
          avatar: demoUser.avatar,
          createdAt: new Date(),
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        return;
      }

      // Only try Supabase if configured and credentials don't match demo users
      if (supabase && isSupabaseConfigured) {
        try {
          console.log('🔐 Tentative de connexion Supabase...');
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            console.error('❌ Erreur authentification Supabase:', authError);
            
            // Si erreur "Invalid login credentials", vérifier si c'est un compte en attente
            if (authError.message === 'Invalid login credentials') {
              console.log('🔍 Vérification compte en attente...');
              
              // Vérifier dans les demandes d'inscription
              const { data: pendingRequest } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .eq('director_email', email)
                .eq('status', 'pending')
                .single();
              
              if (pendingRequest) {
                throw new Error('Votre demande d\'inscription est en cours de validation. Vous pourrez vous connecter après approbation par l\'administrateur.');
              }
              
              // Vérifier dans les demandes approuvées récemment
              const { data: approvedRequest } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .eq('director_email', email)
                .eq('status', 'approved')
                .single();
              
              if (approvedRequest) {
                throw new Error('Votre compte a été approuvé mais il y a un problème d\'activation. Contactez le support technique.');
              }
            }
            
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
          console.error('Supabase auth error:', supabaseError);
          // If Supabase auth fails, show specific error message
          if (supabaseError.message === 'Invalid login credentials') {
            // Vérifier si c'est un compte en attente d'approbation
            const pendingRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
            const pendingRequest = pendingRequests.find((req: any) => 
              req.director_email === email && req.status === 'pending'
            );
            
            if (pendingRequest) {
              throw new Error(`Votre demande d'inscription est en cours de validation.
              
🏢 AGENCE : ${pendingRequest.agency_name}
📧 EMAIL : ${pendingRequest.director_email}
⏱️ STATUT : En attente d'approbation

Vous pourrez vous connecter après validation par l'administrateur.`);
            }
            
            throw new Error('Email ou mot de passe incorrect. Vérifiez vos identifiants ou utilisez les comptes démo : marie.kouassi@agence.com / demo123');
          } else if (supabaseError.message.includes('en cours de validation')) {
            throw new Error(supabaseError.message);
          } else if (supabaseError.message.includes('problème d\'activation')) {
            throw new Error(supabaseError.message);
          } else if (supabaseError.message?.includes('Invalid API key')) {
            console.error('🔑 Clé API invalide - Vérifiez la configuration Supabase');
            throw new Error('Configuration invalide. Utilisez les comptes démo : marie.kouassi@agence.com / demo123');
          } else {
            throw new Error(`Erreur d'authentification: ${supabaseError.message}`);
          }
        }
      } else if (!isSupabaseConfigured) {
        // If Supabase is not configured, only demo users are available
        console.warn('⚠️ Supabase non configuré - comptes démo uniquement');
        
        // Vérifier si c'est un compte en attente d'approbation
        const pendingRequests = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
        const pendingRequest = pendingRequests.find((req: any) => 
          req.director_email === email && req.status === 'pending'
        );
        
        if (pendingRequest) {
          throw new Error(`Votre demande d'inscription est en cours de validation.
          
🏢 AGENCE : ${pendingRequest.agency_name}
📧 EMAIL : ${pendingRequest.director_email}
⏱️ STATUT : En attente d'approbation

Vous pourrez vous connecter après validation par l'administrateur.`);
        }
        
        throw new Error('Email ou mot de passe incorrect. Utilisez les comptes démo : marie.kouassi@agence.com / demo123');
      }
      
      // If we reach here, credentials are invalid
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