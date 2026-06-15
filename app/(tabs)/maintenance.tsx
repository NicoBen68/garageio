import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface MaintenanceRecord {
  id:                 string;
  performed_at:       string;
  mileage_at_service: number | null;
  amount:             number | null;
  garage_name:        string | null;
  notes:              string | null;
  vehicles:           { brand: string; model: string; license_plate: string };
  maintenance_types:  { name: string; category: string };
}

interface Section {
  title: string;
  data:  MaintenanceRecord[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
};

function groupByMonth(records: MaintenanceRecord[]): Section[] {
  const groups: Record<string, MaintenanceRecord[]> = {};
  for (const r of records) {
    const date  = new Date(r.performed_at);
    const key   = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function MaintenanceGlobalScreen() {
  const { user } = useAuthStore();
  const [records,    setRecords]    = useState<MaintenanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  const fetchRecords = async () => {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('user_id', user!.id)
      .eq('is_archived', false);

    if (!vehicles || vehicles.length === 0) {
      setRecords([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const vehicleIds = vehicles.map((v: any) => v.id);

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*, vehicles(brand, model, license_plate), maintenance_types(name, category)')
      .in('vehicle_id', vehicleIds)
      .order('performed_at', { ascending: false });

    if (!error && data) {
      setRecords(data);
      setTotalSpent(data.reduce((sum, r) => sum + (r.amount ?? 0), 0));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchRecords();
  }, []));

  const onRefresh = () => { setRefreshing(true); fetchRecords(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#3B82F6" size="large" /></View>;
  }

  const sections = groupByMonth(records);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Entretien</Text>
        <Text style={styles.subtitle}>Tous véhicules confondus</Text>
      </View>

      {/* Stats globales */}
      {records.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{records.length}</Text>
            <Text style={styles.statLabel}>interventions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSpent.toLocaleString('fr-FR')}€</Text>
            <Text style={styles.statLabel}>total dépensé</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {records[0]?.performed_at
                ? new Date(records[0].performed_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>dernier entretien</Text>
          </View>
        </View>
      )}

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔧</Text>
          <Text style={styles.emptyTitle}>Aucune intervention</Text>
          <Text style={styles.emptySubtitle}>
            Tes interventions apparaîtront ici une fois ajoutées depuis le détail d'un véhicule.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              <Text style={styles.sectionHeaderAmount}>
                {section.data.reduce((sum, r) => sum + (r.amount ?? 0), 0).toLocaleString('fr-FR')}€
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>
                  {CATEGORY_EMOJI[item.maintenance_types?.category] ?? '🔧'}
                </Text>
              </View>
              <View style={styles.cardCenter}>
                <Text style={styles.cardName}>{item.maintenance_types?.name}</Text>
                <View style={styles.vehicleBadge}>
                  <Text style={styles.vehicleBadgeText}>
                    {item.vehicles?.brand} {item.vehicles?.model} · {item.vehicles?.license_plate}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>
                  {new Date(item.performed_at).toLocaleDateString('fr-FR')}
                  {item.mileage_at_service ? ` · ${item.mileage_at_service.toLocaleString('fr-FR')} km` : ''}
                </Text>
                {item.garage_name ? <Text style={styles.cardGarage}>📍 {item.garage_name}</Text> : null}
                {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.cardRight}>
                {item.amount ? <Text style={styles.cardAmount}>{item.amount}€</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#0F172A' },
  centered:            { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header:              { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8, gap: 4 },
  title:               { fontSize: 28, fontWeight: '700', color: '#F8FAFC' },
  subtitle:            { fontSize: 13, color: '#64748B' },
  statsRow:            { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginVertical: 12 },
  statCard:            { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statValue:           { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  statLabel:           { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },
  emptyState:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji:          { fontSize: 56 },
  emptyTitle:          { fontSize: 20, fontWeight: '700', color: '#F8FAFC', textAlign: 'center' },
  emptySubtitle:       { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  list:                { paddingHorizontal: 24, paddingBottom: 32 },
  sectionHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  sectionHeaderText:   { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderAmount: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  card:                { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12, alignItems: 'center', marginBottom: 8 },
  cardLeft:            { width: 36, alignItems: 'center' },
  cardEmoji:           { fontSize: 22 },
  cardCenter:          { flex: 1, gap: 3 },
  cardName:            { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  vehicleBadge:        { alignSelf: 'flex-start', backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#334155', marginTop: 2 },
  vehicleBadgeText:    { fontSize: 11, color: '#64748B' },
  cardMeta:            { fontSize: 12, color: '#64748B' },
  cardGarage:          { fontSize: 12, color: '#94A3B8' },
  cardNotes:           { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  cardRight:           { alignItems: 'flex-end' },
  cardAmount:          { fontSize: 15, fontWeight: '700', color: '#34D399' },
});
