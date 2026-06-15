import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Vehicle {
  id:              string;
  license_plate:   string;
  brand:           string;
  model:           string;
  year:            number;
  fuel_type:       string;
  current_mileage: number;
  color:           string;
}

const FUEL_EMOJI: Record<string, string> = {
  essence:    '⛽',
  diesel:     '🛢️',
  hybride:    '🔋',
  electrique: '⚡',
  gpl:        '💨',
  autre:      '🔧',
};

export default function VehiclesScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const [vehicles,   setVehicles]   = useState<Vehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (!error && data) setVehicles(data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
  useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetchVehicles();
  }, [user])
);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour {user?.user_metadata?.full_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>
            {vehicles.length === 0
              ? 'Aucun véhicule enregistré'
              : `${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/add-vehicle')}
        >
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyTitle}>Ajoute ton premier véhicule</Text>
          <Text style={styles.emptySubtitle}>
            Saisis ta plaque et on s'occupe du reste.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/add-vehicle')}
          >
            <Text style={styles.emptyBtnText}>Ajouter un véhicule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/vehicle/${item.id}`)}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.cardBrand}>{item.brand}</Text>
                  <Text style={styles.cardModel}>{item.model} · {item.year}</Text>
                </View>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{item.license_plate}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardMeta}>{FUEL_EMOJI[item.fuel_type] ?? '🔧'} {item.fuel_type}</Text>
                <Text style={styles.cardMeta}>🛣️ {item.current_mileage.toLocaleString('fr-FR')} km</Text>
                {item.color ? <Text style={styles.cardMeta}>🎨 {item.color}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0F172A' },
  centered:      { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  greeting:      { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  subtitle:      { fontSize: 13, color: '#64748B', marginTop: 2 },
  addBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  addBtnText:    { color: '#fff', fontSize: 22, lineHeight: 26 },
  emptyState:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji:    { fontSize: 64 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: '#F8FAFC', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyBtn:      { marginTop: 8, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  list:          { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  card:          { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 12 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand:     { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  cardModel:     { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  plateBadge:    { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#3B82F6' },
  plateText:     { color: '#3B82F6', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  cardBottom:    { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  cardMeta:      { fontSize: 13, color: '#64748B' },
});
