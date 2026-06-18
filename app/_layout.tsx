import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { Slot, useRouter, useSegments, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../lib/notifications';

export default function RootLayout() {
  const { session, setSession, setLoading } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone,    setOnboardingDone]    = useState(true);

  const checkOnboarding = async () => {
    const val = await AsyncStorage.getItem('onboarding_done');
    setOnboardingDone(val === 'true');
    setOnboardingChecked(true);
  };

  useEffect(() => {
    checkOnboarding();

    const timeout = setTimeout(() => setLoading(false), 10000);

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
        // Re-vérifie l'onboarding au retour en foreground
        checkOnboarding();
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setSession(session);
        });
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
      if (!session && !inAuthGroup && !inOnboarding) {
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, onboardingChecked, onboardingDone]);

  return <Slot />;
}
