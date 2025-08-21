import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Role = 'director' | 'manager' | 'agent' | 'admin' | 'superadmin';
type AppUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  agencyId: string | null;
  createdAt?: Date;
};

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  signIn: async () => {}, signOut: async () => {}
});

async function fetchUserProfile(authUserId: string, email?: string | null) {
  let { data: userData } = await supabase!
    .from('users')
    .select('*')
    .or(`id.eq.${authUserId},auth_user_id.eq.${authUserId}`)
    .maybeSingle();

  if ((!userData) && email) {
    const { data: byEmail } = await supabase!
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (byEmail) userData = byEmail;
  }
  return userData;
}

async function resolveAgencyIdForUser(userRow: any) {
  const authId = userRow?.auth_user_id ?? userRow?.id;
  const email = userRow?.email ?? null;

  if (authId) {
    const { data: au } = await supabase!
      .from('agency_users')
      .select('agency_id')
      .or(`user_id.eq.${authId},app_user_id.eq.${authId}`)
      .limit(1)
      .maybeSingle();
    if (au?.agency_id) return au.agency_id as string;
  }

  if (email) {
    const { data: ag } = await supabase!
      .from('agencies')
      .select('id')
      .or(`director_email.eq.${email},email.eq.${email},contact_email.eq.${email}`)
      .limit(1)
      .maybeSingle();
    if (ag?.id) return ag.id as string;
  }

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setUser(null); setLoading(false); return; }

      console.log('🔐 Tentative de connexion pour:', session.user.email);

      let profile = await fetchUserProfile(session.user.id, session.user.email);
      if (!profile) {
        const minimal = {
          id: session.user.id,
          auth_user_id: session.user.id,
          email: session.user.email!,
          first_name: session.user.user_metadata?.first_name || 'Directeur',
          last_name: session.user.user_metadata?.last_name || '',
          role: 'director',
          agency_id: null,
        };
        const { data: inserted } = await supabase.from('users').insert(minimal).select().single();
        profile = inserted ?? minimal;
      }

      if (!profile.agency_id) {
        const resolved = await resolveAgencyIdForUser(profile);
        if (resolved) {
          await supabase.from('users').update({ agency_id: resolved }).eq('id', profile.id);
          profile.agency_id = resolved;
        }
      }

      console.log('✅ Connexion réussie avec compte', session.user.email, '→ agencyId:', profile.agency_id);

      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name ?? '',
        lastName: profile.last_name ?? '',
        role: (profile.role as Role) ?? 'director',
        agencyId: profile.agency_id ?? null,
        createdAt: new Date(),
      });
      setLoading(false);
    })();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (_event, sess) => {
      if (!sess?.user) { setUser(null); return; }
      const profile = await fetchUserProfile(sess.user.id, sess.user.email);
      if (!profile) return;
      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name ?? '',
        lastName: profile.last_name ?? '',
        role: (profile.role as Role) ?? 'director',
        agencyId: profile.agency_id ?? null,
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase!.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
