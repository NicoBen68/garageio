// app/(tabs)/index.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function VehiclesScreen() {
  const { user } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bonjour {user?.user_metadata?.full_name?.split(' ')[0] ?? ''} 👋</Text>
      <Text style={styles.sub}>Tes véhicules arrivent bientôt ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 8 },
  text:      { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  sub:       { fontSize: 14, color: '#64748B' },
});
