import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user:       User | null;
  session:    Session | null;
  isPremium:  boolean;
  isLoading:  boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut:    () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  session:   null,
  isPremium: false,
  isLoading: true,

  setSession: (session) => set({
    session,
    user:      session?.user ?? null,
    isPremium: session?.user?.user_metadata?.subscription_status === 'premium',
    isLoading: false,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isPremium: false });
  },
}));
