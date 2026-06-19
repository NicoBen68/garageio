import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../lib/colors';

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

interface Reminder {
  id:                string;
  next_due_date:     string | null;
  next_due_mileage:  number | null;
  status:            string;
  vehicles:          { brand: string; model: string; current_mileage: number };
  maintenance_types: { name: string; category: string };
}

const FUEL_EMOJI: Record<string, string> = {
  essence: '⛽', diesel: '🛢️', hybride: '🔋',
  electrique: '⚡', gpl: '💨', autre: '🔧',
};

function getUrgency(reminder: Reminder): 'overdue' | 'soon' | 'ok' {
  const today = new Date();
  if (reminder.next_due_date) {
    const due = new Date(reminder.next_due_date);
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0)  return 'overdue';
    if (daysLeft < 30) return 'soon';
  }
  if (reminder.next_due_mileage && reminder.vehicles?.current_mileage) {
    const kmLeft = reminder.next_due_mileage - reminder.vehicles.current_mileage;
    if (kmLeft < 0)    return 'overdue';
    if (kmLeft < 1000) return 'soon';
  }
  return 'ok';
}

function getUrgentReminder(reminders: Reminder[]): Reminder | null {
  const urgent = reminders.filter(r => getUrgency(r) !== 'ok');
  if (urgent.length === 0) return null;
  return urgent.sort((a, b) => {
    const ua = getUrgency(a);
    const ub = getUrgency(b);
    if (ua === 'overdue' && ub !== 'overdue') return -1;
    if (ub === 'overdue' && ua !== 'overdue') return 1;
    return 0;
  })[0];
}

export default function VehiclesScreen() {
  const c        = useColors();
  const router   = useRouter();
  const { user } = useAuthStore();
  const [vehicles,   setVehicles]   = useState<Vehicle[]>([]);
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [vehiclesRes, remindersRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('user_id', user!.id).eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('reminders').select('*, vehicles!inner(brand, model, current_mileage, user_id), maintenance_types(name, category)').eq('vehicles.user_id', user!.id).in('status', ['active', 'overdue']),
    ]);
    if (!vehiclesRes.error && vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (!remindersRes.error && remindersRes.data) setReminders(remindersRes.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetchData();
  }, [user]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator color="#3B82F6" size="large" /></View>;
  }

  const urgentReminder = getUrgentReminder(reminders);
  const overdueCount   = reminders.filter(r => getUrgency(r) === 'overdue').length;
  const soonCount      = reminders.filter(r => getUrgency(r) === 'soon').length;
  const firstName      = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return `Bonjour ${firstName} ☀️`;
    if (h < 18) return `Bonjour ${firstName} 👋`;
    return `Bonsoir ${firstName} 🌙`;
  };

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.id}
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      ListHeaderComponent={() => (
        <View>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: c.textPrimary }]}>{getGreeting()}</Text>
              <Text style={[styles.subtitle, { color: c.textMuted }]}>
                {vehicles.length === 0 ? 'Aucun véhicule enregistré' : `${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/add-vehicle')}>
              <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
          </View>

          {/* Widget rappels urgents */}
          {urgentReminder && (
            <TouchableOpacity
              style={[styles.alertCard, getUrgency(urgentReminder) === 'overdue'
                ? { backgroundColor: '#1A0F0F', borderColor: '#EF4444' }
                : { backgroundColor: '#1A160A', borderColor: '#F59E0B' }
              ]}
              onPress={() => router.push('/(tabs)/reminders')}
            >
              <View style={styles.alertLeft}>
                <Text style={styles.alertEmoji}>{getUrgency(urgentReminder) === 'overdue' ? '⚠️' : '🔔'}</Text>
                <View>
                  <Text style={[styles.alertTitle, { color: c.textPrimary }]}>
                    {getUrgency(urgentReminder) === 'overdue' ? 'Entretien en retard !' : 'Entretien bientôt dû'}
                  </Text>
                  <Text style={[styles.alertSub, { color: c.textSecondary }]}>
                    {urgentReminder.maintenance_types?.name} — {urgentReminder.vehicles?.brand} {urgentReminder.vehicles?.model}
                  </Text>
                  {overdueCount + soonCount > 1 && (
                    <Text style={[styles.alertMore, { color: c.textMuted }]}>
                      +{overdueCount + soonCount - 1} autre{overdueCount + soonCount - 1 > 1 ? 's' : ''} rappel{overdueCount + soonCount - 1 > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.alertArrow, { color: c.textMuted }]}>›</Text>
            </TouchableOpacity>
          )}

          {/* Stats rapides */}
          {vehicles.length > 0 && (
            <View style={styles.statsRow}>
              <TouchableOpacity style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => router.push('/(tabs)/maintenance')}>
                <Text style={styles.statEmoji}>🔧</Text>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Entretien</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => router.push('/(tabs)/reminders')}>
                <Text style={styles.statEmoji}>🔔</Text>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>
                  {reminders.length > 0 ? `${reminders.length} rappel${reminders.length > 1 ? 's' : ''}` : 'Rappels'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => router.push('/(tabs)/add-vehicle')}>
                <Text style={styles.statEmoji}>＋</Text>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          )}

          {vehicles.length > 0 && (
            <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Mes véhicules</Text>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Ajoute ton premier véhicule</Text>
          <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>Saisis ta plaque et on s'occupe du reste.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/add-vehicle')}>
            <Text style={styles.emptyBtnText}>Ajouter un véhicule</Text>
          </TouchableOpacity>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => router.push(`/(tabs)/vehicle/${item.id}`)}>
          <View style={styles.cardTop}>
            <View>
              <Text style={[styles.cardBrand, { color: c.textPrimary }]}>{item.brand}</Text>
              <Text style={[styles.cardModel, { color: c.textSecondary }]}>{item.model} · {item.year}</Text>
            </View>
            <View style={[styles.plateBadge, { backgroundColor: c.bg }]}>
              <Text style={styles.plateText}>{item.license_plate}</Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>{FUEL_EMOJI[item.fuel_type] ?? '🔧'} {item.fuel_type}</Text>
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>🛣️ {item.current_mileage.toLocaleString('fr-FR')} km</Text>
            {item.color ? <Text style={[styles.cardMeta, { color: c.textMuted }]}>🎨 {item.color}</Text> : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:      { paddingBottom: 32 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  greeting:     { fontSize: 22, fontWeight: '700' },
  subtitle:     { fontSize: 13, marginTop: 2 },
  addBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  addBtnText:   { color: '#fff', fontSize: 22, lineHeight: 26 },
  alertCard:    { marginHorizontal: 24, marginBottom: 16, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  alertLeft:    { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  alertEmoji:   { fontSize: 24 },
  alertTitle:   { fontSize: 14, fontWeight: '700' },
  alertSub:     { fontSize: 12, marginTop: 2 },
  alertMore:    { fontSize: 11, marginTop: 2 },
  alertArrow:   { fontSize: 20 },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  statCard:     { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  statEmoji:    { fontSize: 20 },
  statLabel:    { fontSize: 11, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 24, marginBottom: 10 },
  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12, paddingTop: 80 },
  emptyEmoji:   { fontSize: 64 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle:{ fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { marginTop: 8, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card:         { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12, marginHorizontal: 24, marginBottom: 12 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand:    { fontSize: 18, fontWeight: '700' },
  cardModel:    { fontSize: 13, marginTop: 2 },
  plateBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#3B82F6' },
  plateText:    { color: '#3B82F6', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  cardBottom:   { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  cardMeta:     { fontSize: 13 },
});
