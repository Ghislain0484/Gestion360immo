// @refresh skip
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, PlatformAdmin, AgencyUserRole } from '../types/db';

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface AuthUser extends User {
  agency_id: string | null;
  role: AgencyUserRole | null;
  temp_password?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  admin: PlatformAdmin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<PlatformAdmin>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// 🔹 Fonction utilitaire pour charger un utilisateur + agence
const fetchUserWithAgency = async (userId: string): Promise<AuthUser | null> => {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, first_name, last_name, avatar, is_active, permissions, created_at, updated_at, agency_users(agency_id, role)"
    )
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const agencyUser = Array.isArray(data.agency_users)
    ? data.agency_users[0]
    : data.agency_users;

  return {
    id: data.id,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    avatar: data.avatar,
    is_active: data.is_active ?? true,
    permissions: data.permissions || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    agency_id: agencyUser?.agency_id ?? null,
    role: agencyUser?.role ?? null,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        if (!supabase || !isSupabaseConfigured) return;

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) return;

        // Essayer en tant qu'utilisateur normal
        const u = await fetchUserWithAgency(data.session.user.id);
        if (u) {
          setUser(u);
          return;
        }

        // Sinon fallback admin
        const { data: adminData } = await supabase
          .from("platform_admins")
          .select(
            "id, user_id, role, permissions, is_active, last_login, created_at, updated_at"
          )
          .eq("user_id", data.session.user.id)
          .single();

        if (adminData) {
          setAdmin({
            ...adminData,
            permissions: adminData.permissions || {},
            is_active: adminData.is_active ?? true,
          });
        }
      } catch (err) {
        console.error("Erreur checkSession:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session?.user) {
        setUser(null);
        setAdmin(null);
      } else {
        checkSession();
      }
    });

    return () => sub?.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error || !data.user) throw error;

      const u = await fetchUserWithAgency(data.user.id);
      if (!u) throw new Error("Utilisateur non trouvé");
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (
    email: string,
    password: string
  ): Promise<PlatformAdmin> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error || !data.user) throw error;

      const { data: adminData, error: adminError } = await supabase
        .from("platform_admins")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (adminError || !adminData) throw new Error("Compte admin non trouvé");

      const admin: PlatformAdmin = {
        ...adminData,
        permissions: adminData.permissions || {},
        is_active: adminData.is_active ?? true,
      };

      setAdmin(admin);

      // update last_login
      await supabase
        .from("platform_admins")
        .update({ last_login: new Date().toISOString() })
        .eq("user_id", data.user.id);

      return admin;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, admin, isLoading, login, loginAdmin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
