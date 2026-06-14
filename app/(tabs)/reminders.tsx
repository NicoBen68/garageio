import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Reminder {
  id:               string;
  status:           string;
  next_due_date:    string | null;
  next_due_mileage: number | null;
  vehicles:         { brand: string; model: string; current_mileage: number };
  maintenance_types:{ name: string; category: string };
}

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
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

function formatDueInfo(reminder: Reminder): string {
  const parts: string[] = [];
  const today = new Date();
  if (reminder.next_due_date) {
    const due = new Date(reminder.next_due_date);
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = due.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    if (daysLeft < 0)        parts.push(`📅 En retard de ${Math.abs(daysLeft)}j`);
    else if (daysLeft === 0) parts.push("📅 Aujourd'hui !");
    else if (daysLeft < 30)  parts.push(`📅 Dans ${daysLeft}j (${dateStr})`);
    else                     parts.push(`📅 ${dateStr}`);
  }
  if (reminder.next_due_mileage) {
    const kmLeft = reminder.next_due_mileage - (reminder.vehicles?.current_mileage ?? 0);
    if (kmLeft < 0) parts.push(`🛣️ Dépassé de ${Math.abs(kmLeft).toLocaleString('fr-FR')} km`);
    else            parts.push(`🛣️ Dans ${kmLeft.toLocaleString('fr-FR')} km (à ${reminder.next_due_mileage.toLocaleString('fr-FR')} km)`);
  }
  return parts.join('  ·  ');
}

export default function RemindersScreen() {
  const { user } = useAuthStore();
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*, vehicles!inner(brand, model, current_mileage, user_id), maintenance_types(name, category)')
      .eq('vehicles.user_id', user!.id)
      .in('status', ['active', 'overdue'])
      .order('next_due_date', { ascending: true, nullsFirst: false });
    if (!error && data) setReminders(data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchReminders();
  }, []));

  const onRefresh = () => { setRefreshing(true); fetchReminders(); };

  const handleDone = (reminder: Reminder) => {
    Alert.alert(
      'Marquer comme fait ?',
      `${reminder.maintenance_types?.name} — cette intervention a été effectuée ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: "✅ Oui, c'est fait", onPress: async () => {
          await supabase.from('reminders').update({ status: 'done' }).eq('id', reminder.id);
          setReminders(prev => prev.filter(r => r.id !== reminder.id));
        }},
      ]
    );
  };

  const handleSnooze = (reminder: Reminder) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 30);
    Alert.alert(
      "Reporter d'un mois ?",
      `Le rappel sera reporté au ${snoozeDate.toLocaleDateString('fr-FR')}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Reporter', onPress: async () => {
          await supabase.from('reminders').update({ status: 'snoozed', snoozed_until: snoozeDate.toISOString().split('T')[0] }).eq('id', reminder.id);
          setReminders(prev => prev.filter(r => r.id !== reminder.id));
        }},
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer ce rappel ?',
      'Il ne reviendra pas automatiquement.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          await supabase.from('reminders').delete().eq('id', id);
          setReminders(prev => prev.filter(r => r.id !== id));
        }},
      ]
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#3B82F6" size="large" /></View>;

  const overdueCount = reminders.filter(r => getUrgency(r) === 'overdue').length;
  const soonCount    = reminders.filter(r => getUrgency(r) === 'soon').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rappels</Text>
        {reminders.length > 0 && (
          <Text style={styles.subtitle}>
            {overdueCount > 0 ? `${overdueCount} en retard · ` : ''}
            {soonCount > 0    ? `${soonCount} bientôt · `      : ''}
            {reminders.length} au total
          </Text>
        )}
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>Tout est à jour !</Text>
          <Text style={styles.emptySubtitle}>Les rappels apparaîtront ici automatiquement après tes interventions.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          renderItem={({ item }) => {
            const urgency = getUrgency(item);
            return (
              <TouchableOpacity
                style={[styles.card, (styles as any)[`card_${urgency}`]]}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={1}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.maintenance_types?.category] ?? '🔧'}</Text>
                  <View style={styles.cardCenter}>
                    <Text style={styles.cardName}>{item.maintenance_types?.name}</Text>
                    <Text style={styles.cardVehicle}>{item.vehicles?.brand} {item.vehicles?.model}</Text>
                    <Text style={[styles.cardDue, urgency === 'overdue' && styles.cardDueOverdue]}>{formatDueInfo(item)}</Text>
                  </View>
                  <View style={[styles.urgencyBadge, (styles as any)[`badge_${urgency}`]]}>
                    <Text style={styles.urgencyText}>{urgency === 'overdue' ? '⚠️' : urgency === 'soon' ? '🔔' : '✓'}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtnSnooze} onPress={() => handleSnooze(item)}>
                    <Text style={styles.actionBtnSnoozeText}>Reporter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDone} onPress={() => handleDone(item)}>
                    <Text style={styles.actionBtnDoneText}>✅ Fait !</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#0F172A' },
  centered:            { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header:              { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 4 },
  title:               { fontSize: 28, fontWeight: '700', color: '#F8FAFC' },
  subtitle:            { fontSize: 13, color: '#64748B' },
  emptyState:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji:          { fontSize: 64 },
  emptyTitle:          { fontSize: 20, fontWeight: '700', color: '#F8FAFC', textAlign: 'center' },
  emptySubtitle:       { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  list:                { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  card:                { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  card_overdue:        { borderColor: '#EF4444', backgroundColor: '#1A0F0F' },
  card_soon:           { borderColor: '#F59E0B', backgroundColor: '#1A160A' },
  card_ok:             { borderColor: '#334155' },
  cardTop:             { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardEmoji:           { fontSize: 24, width: 32 },
  cardCenter:          { flex: 1, gap: 3 },
  cardName:            { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  cardVehicle:         { fontSize: 12, color: '#64748B' },
  cardDue:             { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardDueOverdue:      { color: '#F87171' },
  urgencyBadge:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  badge_overdue:       { backgroundColor: '#7F1D1D' },
  badge_soon:          { backgroundColor: '#78350F' },
  badge_ok:            { backgroundColor: '#1E3A2F' },
  urgencyText:         { fontSize: 16 },
  cardActions:         { flexDirection: 'row', gap: 8 },
  actionBtnSnooze:     { flex: 1, backgroundColor: '#1E293B', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  actionBtnSnoozeText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  actionBtnDone:       { flex: 1, backgroundColor: '#1E3A2F', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#166534' },
  actionBtnDoneText:   { color: '#34D399', fontSize: 13, fontWeight: '600' },
});
