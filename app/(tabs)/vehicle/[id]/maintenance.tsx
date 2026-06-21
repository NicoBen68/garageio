import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useColors } from '../../../../lib/colors';

interface MaintenanceRecord {
  id:                 string;
  performed_at:       string;
  mileage_at_service: number;
  amount:             number;
  notes:              string;
  garage_name:        string;
  maintenance_types:  { name: string; category: string; icon: string };
}

interface Vehicle { id: string; brand: string; model: string; }

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
};

export default function MaintenanceScreen() {
  const c      = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vehicle,    setVehicle]    = useState<Vehicle | null>(null);
  const [records,    setRecords]    = useState<MaintenanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [vehicleRes, recordsRes] = await Promise.all([
      supabase.from('vehicles').select('id, brand, model').eq('id', id).single(),
      supabase.from('maintenance_records').select('*, maintenance_types(name, category, icon)').eq('vehicle_id', id).order('performed_at', { ascending: false }),
    ]);
    if (vehicleRes.data) setVehicle(vehicleRes.data);
    if (recordsRes.data) setRecords(recordsRes.data);
    setLoading(false); setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [id]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDelete = (recordId: string) => {
    Alert.alert('Supprimer cette intervention ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await supabase.from('maintenance_records').delete().eq('id', recordId); setRecords(prev => prev.filter(r => r.id !== recordId)); } },
    ]);
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator color="#3B82F6" size="large" /></View>;

  const totalSpent = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour au véhicule"
        >
          <Text style={styles.backText} maxFontSizeMultiplier={1.3}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push(`/(tabs)/vehicle/${id}/add-maintenance`)}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une intervention"
        >
          <Text style={styles.addBtnText} maxFontSizeMultiplier={1.3}>＋ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>Carnet d'entretien</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>{vehicle?.brand} {vehicle?.model}</Text>
      </View>

      {records.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{records.length}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>interventions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{totalSpent.toLocaleString('fr-FR')}€</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>dépensés</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>
              {records[0]?.performed_at ? new Date(records[0].performed_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>dernier entretien</Text>
          </View>
        </View>
      )}

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji} accessibilityElementsHidden>🔧</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>Aucune intervention</Text>
          <Text style={[styles.emptySubtitle, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>Ajoute ta première intervention pour commencer à suivre l'entretien de ton véhicule.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push(`/(tabs)/vehicle/${id}/add-maintenance`)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une intervention"
          >
            <Text style={styles.emptyBtnText} maxFontSizeMultiplier={1.3}>Ajouter une intervention</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
              onLongPress={() => handleDelete(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.maintenance_types?.name}, ${new Date(item.performed_at).toLocaleDateString('fr-FR')}${item.amount ? `, ${item.amount}€` : ''}`}
              accessibilityHint="Appui long pour supprimer cette intervention"
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji} accessibilityElementsHidden>{CATEGORY_EMOJI[item.maintenance_types?.category] ?? '🔧'}</Text>
              </View>
              <View style={styles.cardCenter}>
                <Text style={[styles.cardName, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{item.maintenance_types?.name}</Text>
                <Text style={[styles.cardMeta, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>
                  {new Date(item.performed_at).toLocaleDateString('fr-FR')}
                  {item.mileage_at_service ? ` · ${item.mileage_at_service.toLocaleString('fr-FR')} km` : ''}
                </Text>
                {item.garage_name ? <Text style={[styles.cardGarage, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>📍 {item.garage_name}</Text> : null}
                {item.notes ? <Text style={[styles.cardNotes, { color: c.textDisabled }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{item.notes}</Text> : null}
              </View>
              <View style={styles.cardRight}>
                {item.amount ? <Text style={styles.cardAmount} maxFontSizeMultiplier={1.3}>{item.amount}€</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  backText:     { color: '#3B82F6', fontSize: 15 },
  addBtn:       { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, minHeight: 44, justifyContent: 'center' },
  addBtnText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  titleBlock:   { paddingHorizontal: 24, paddingBottom: 16, gap: 4 },
  title:        { fontSize: 26, fontWeight: '700' },
  subtitle:     { fontSize: 14 },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue:    { fontSize: 16, fontWeight: '700' },
  statLabel:    { fontSize: 11, marginTop: 2, textAlign: 'center' },
  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji:   { fontSize: 56 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle:{ fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { marginTop: 8, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, minHeight: 44 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list:         { paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
  card:         { flexDirection: 'row', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12, alignItems: 'center', minHeight: 44 },
  cardLeft:     { width: 36, alignItems: 'center' },
  cardEmoji:    { fontSize: 24 },
  cardCenter:   { flex: 1, gap: 3 },
  cardName:     { fontSize: 15, fontWeight: '600' },
  cardMeta:     { fontSize: 12 },
  cardGarage:   { fontSize: 12 },
  cardNotes:    { fontSize: 12, fontStyle: 'italic' },
  cardRight:    { alignItems: 'flex-end' },
  cardAmount:   { fontSize: 15, fontWeight: '700', color: '#34D399' },
});
