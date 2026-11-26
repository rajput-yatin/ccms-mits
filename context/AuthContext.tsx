'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (authUser: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
      return;
    }

    // Fallback: create profile row from auth metadata if missing
    const meta = authUser.user_metadata || {};
    const fallbackRole: UserRole =
      meta.role === 'club_lead' || meta.role === 'super_admin'
        ? meta.role
        : 'student';

    const newProfile = {
      id: authUser.id,
      full_name: meta.full_name || authUser.email?.split('@')[0] || 'MITS User',
      email: authUser.email || '',
      roll_number: fallbackRole === 'super_admin' ? null : meta.roll_number || null,
      branch: fallbackRole === 'super_admin' ? 'Administration' : meta.branch || 'Computer Science',
      year: fallbackRole === 'super_admin' ? 'N/A' : meta.year || '2nd Year',
      role: fallbackRole,
    };

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select('*')
      .maybeSingle();

    if (inserted) {
      setProfile(inserted as Profile);
    } else {
      setProfile({
        ...newProfile,
        managed_club_id: null,
        created_at: new Date().toISOString(),
      });
    }
  };

  const refreshProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);
      await fetchOrCreateProfile(session.user);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchOrCreateProfile(session.user);
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchOrCreateProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);