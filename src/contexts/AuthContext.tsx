import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, PlatformAdmin } from '../types/db';

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AuthContextType {
  user: User | null;
  admin: PlatformAdmin | null;
  isLoading: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        if (!supabase || !isSupabaseConfigured) {
          throw new Error('Supabase non configuré');
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Erreur getSession:', error);
          return;
        }

        if (session?.user) {
          // Fetch user data
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, avatar, is_active, permissions, created_at, updated_at')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            if (userError.code === 'PGRST116') {
              // No user found, try admin
              const { data: adminData, error: adminError } = await supabase
                .from('platform_admins')
                .select('id, user_id, role, permissions, is_active, last_login, created_at, updated_at')
                .eq('user_id', session.user.id)
                .single();

              if (adminError || !adminData) {
                console.warn('Utilisateur ou admin non trouvé:', adminError?.message);
                return;
              }

              setAdmin({
                id: adminData.id,
                user_id: adminData.user_id,
                role: adminData.role,
                permissions: adminData.permissions || {},
                is_active: adminData.is_active ?? true,
                last_login: adminData.last_login,
                created_at: adminData.created_at,
                updated_at: adminData.updated_at,
              });
            } else {
              throw new Error(`Erreur users.select: code=${userError.code} | msg=${userError.message}`);
            }
          } else if (userData) {
            setUser({
              id: userData.id,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              avatar: userData.avatar,
              is_active: userData.is_active ?? true,
              permissions: userData.permissions || {},
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            });
          }
        }
      } catch (error) {
        console.error('Erreur checkSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listener for auth state changes
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setAdmin(null);
        setIsLoading(false);
      } else {
        checkSession();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase non configuré');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw new Error(`Erreur signInWithPassword: code=${error.code} | msg=${error.message}`);
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, avatar, is_active, permissions, created_at, updated_at')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || 'Utilisateur non trouvé');
        }

        setUser({
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar: userData.avatar,
          is_active: userData.is_active ?? true,
          permissions: userData.permissions || {},
          created_at: userData.created_at,
          updated_at: userData.updated_at,
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      throw new Error(`Échec de la connexion: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string): Promise<PlatformAdmin> => {
    setIsLoading(true);
    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase non configuré');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        if (error.code === 'invalid_credentials') {
          throw new Error('Identifiants invalides. Vérifiez votre email et mot de passe.');
        }
        throw new Error(`Erreur signInWithPassword: code=${error.code} | msg=${error.message}`);
      }

      if (!data.user) {
        throw new Error('Aucun utilisateur retourné par Supabase.');
      }

      const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .select('id, user_id, role, permissions, is_active, last_login, created_at, updated_at')
        .eq('user_id', data.user.id)
        .single();

      if (adminError || !adminData) {
        throw new Error(adminError?.message || 'Compte administrateur non trouvé.');
      }

      const admin: PlatformAdmin = {
        id: adminData.id,
        user_id: adminData.user_id,
        role: adminData.role,
        permissions: adminData.permissions || {},
        is_active: adminData.is_active ?? true,
        last_login: adminData.last_login,
        created_at: adminData.created_at,
        updated_at: adminData.updated_at,
      };

      setAdmin(admin);

      // Update last_login
      await supabase
        .from('platform_admins')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', data.user.id);

      return admin;
    } catch (err: any) {
      console.error('Admin login error:', {
        message: err.message,
        email,
        stack: err.stack,
      });
      throw new Error(`Échec de la connexion admin: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw new Error(`Erreur signOut: code=${error.code} | msg=${error.message}`);
        }
      }
      setUser(null);
      setAdmin(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      throw new Error(`Échec de la déconnexion: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, admin, isLoading, login, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};