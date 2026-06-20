import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { registerForPushNotifications } from '../lib/notifications';

export default function RootLayout() {
  const { session, setSession, setLoading } = useAuthStore();
  const { onboardingDone, onboardingChecked, setOnboardingDone, setOnboardingChecked } = useOnboardingStore();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === 'true');
      setOnboardingChecked(true);
    });

    const timeout = setTimeout(() => setLoading(false), 15000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await registerForPushNotifications(session.user.id);
        }
      }
    );

    const appStateSubscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        // Tente de récupérer la session existante
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
        } else {
          // Session expirée → tente un refresh token
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session) setSession(refreshed.session);
          else setLoading(false);
        }
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!onboardingChecked) return;

    const inAuthGroup  = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (onboardingDone) {
      if (inOnboarding) {
        router.replace('/(auth)/login');
        return;
      }
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, onboardingChecked, onboardingDone]);

  return <Slot />;
}
