import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../lib/notifications';

export default function RootLayout() {
  const { session, setSession, setLoading } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Timeout de sécurité — évite la roue infinie
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Récupère la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    // Écoute les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await registerForPushNotifications(session.user.id);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return <Slot />;
}
