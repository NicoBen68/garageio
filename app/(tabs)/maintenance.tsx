import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../lib/colors';

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

interface Section { title: string; data: MaintenanceRecord[]; }

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
};

const MAX_FONT = 1.3;

function groupByMonth(records: MaintenanceRecord[]): Section[] {
  const groups: Record<string, MaintenanceRecord[]> = {};
  for (const r of records) {
    const key = new Date(r.performed_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function MaintenanceGlobalScreen() {
  const c        = useColors();
  const { user } = useAuthStore();
  const [records,    setRecords]    = useState<MaintenanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  const fetchRecords = async () => {
    const { data: vehicles } = await supabase.from('vehicles').select('id').eq('user_id', user!.id).eq('is_archived', false);
    if (!vehicles || vehicles.length === 0) { setRecords([]); setLoading(false); setRefreshing(false); return; }
    const { data, error } = await supabase.from('maintenance_records')
      .select('*, vehicles(brand, model, license_plate), maintenance_types(name, category)')
      .in('vehicle_id', vehicles.map((v: any) => v.id))
      .order('performed_at', { ascending: false });
    if (!error && data) { setRecords(data); setTotalSpent(data.reduce((sum, r) => sum + (r.amount ?? 0), 0)); }
    setLoading(false); setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchRecords(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchRecords(); };

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator color="#3B82F6" size="large" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.title, { color: c.textPrimary }]}>Entretien</Text>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.subtitle, { color: c.textMuted }]}>Tous véhicules confondus</Text>
      </View>

      {records.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} accessibilityLabel={`${records.length} interventions`}>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, { color: c.textPrimary }]}>{records.length}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>interventions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} accessibilityLabel={`${totalSpent.toLocaleString('fr-FR')} euros dépensés`}>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, { color: c.textPrimary }]}>{totalSpent.toLocaleString('fr-FR')}€</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>total dépensé</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, { color: c.textPrimary }]}>
              {records[0]?.performed_at ? new Date(records[0].performed_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>dernier entretien</Text>
          </View>
        </View>
      )}

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔧</Text>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.emptyTitle, { color: c.textPrimary }]}>Aucune intervention</Text>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.emptySubtitle, { color: c.textMuted }]}>Tes interventions apparaîtront ici une fois ajoutées depuis le détail d'un véhicule.</Text>
        </View>
      ) : (
        <SectionList
          sections={groupByMonth(records)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.sectionHeaderText, { color: c.textMuted }]}>{section.title}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT} style={styles.sectionHeaderAmount}>{section.data.reduce((sum, r) => sum + (r.amount ?? 0), 0).toLocaleString('fr-FR')}€</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
              accessibilityLabel={`${item.maintenance_types?.name}, ${item.vehicles?.brand} ${item.vehicles?.model}, le ${new Date(item.performed_at).toLocaleDateString('fr-FR')}${item.amount ? `, ${item.amount} euros` : ''}`}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.maintenance_types?.category] ?? '🔧'}</Text>
              </View>
              <View style={styles.cardCenter}>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.cardName, { color: c.textPrimary }]}>{item.maintenance_types?.name}</Text>
                <View style={[styles.vehicleBadge, { backgroundColor: c.bg, borderColor: c.cardBorder }]}>
                  <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleBadgeText, { color: c.textMuted }]}>{item.vehicles?.brand} {item.vehicles?.model} · {item.vehicles?.license_plate}</Text>
                </View>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.cardMeta, { color: c.textMuted }]}>
                  {new Date(item.performed_at).toLocaleDateString('fr-FR')}
                  {item.mileage_at_service ? ` · ${item.mileage_at_service.toLocaleString('fr-FR')} km` : ''}
                </Text>
                {item.garage_name ? <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.cardGarage, { color: c.textSecondary }]}>📍 {item.garage_name}</Text> : null}
                {item.notes ? <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.cardNotes, { color: c.textDisabled }]} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.cardRight}>
                {item.amount ? <Text maxFontSizeMultiplier={MAX_FONT} style={styles.cardAmount}>{item.amount}€</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  centered:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:              { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8, gap: 4 },
  title:               { fontSize: 28, fontWeight: '700' },
  subtitle:            { fontSize: 13 },
  statsRow:            { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginVertical: 12 },
  statCard:            { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue:           { fontSize: 15, fontWeight: '700' },
  statLabel:           { fontSize: 11, marginTop: 2, textAlign: 'center' },
  emptyState:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji:          { fontSize: 56 },
  emptyTitle:          { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle:       { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  list:                { paddingHorizontal: 24, paddingBottom: 32 },
  sectionHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  sectionHeaderText:   { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderAmount: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  card:                { flexDirection: 'row', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12, alignItems: 'center', marginBottom: 8 },
  cardLeft:            { width: 36, alignItems: 'center' },
  cardEmoji:           { fontSize: 22 },
  cardCenter:          { flex: 1, gap: 3 },
  cardName:            { fontSize: 15, fontWeight: '600' },
  vehicleBadge:        { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, marginTop: 2 },
  vehicleBadgeText:    { fontSize: 11 },
  cardMeta:            { fontSize: 12 },
  cardGarage:          { fontSize: 12 },
  cardNotes:           { fontSize: 12, fontStyle: 'italic' },
  cardRight:           { alignItems: 'flex-end' },
  cardAmount:          { fontSize: 15, fontWeight: '700', color: '#34D399' },
});
