import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../lib/colors';
import GlassBackground from '../../components/ui/GlassBackground';

interface Vehicle {
  id: string; license_plate: string; brand: string; model: string;
  year: number; fuel_type: string; current_mileage: number; color: string;
}
interface Reminder {
  id: string; next_due_date: string | null; next_due_mileage: number | null; status: string;
  vehicles: { brand: string; model: string; current_mileage: number };
  maintenance_types: { name: string; category: string };
}

const FUEL_EMOJI: Record<string, string> = {
  essence: '⛽', diesel: '🛢️', hybride: '🔋', electrique: '⚡', gpl: '💨', autre: '🔧',
};
const MAX_FONT = 1.3;

function getUrgency(r: Reminder): 'overdue' | 'soon' | 'ok' {
  const today = new Date();
  if (r.next_due_date) {
    const days = Math.ceil((new Date(r.next_due_date).getTime() - today.getTime()) / 86400000);
    if (days < 0) return 'overdue'; if (days < 30) return 'soon';
  }
  if (r.next_due_mileage && r.vehicles?.current_mileage) {
    const km = r.next_due_mileage - r.vehicles.current_mileage;
    if (km < 0) return 'overdue'; if (km < 1000) return 'soon';
  }
  return 'ok';
}
function getUrgent(rs: Reminder[]) {
  const u = rs.filter(r => getUrgency(r) !== 'ok');
  if (!u.length) return null;
  return u.sort((a, b) => {
    const ua = getUrgency(a), ub = getUrgency(b);
    if (ua === 'overdue' && ub !== 'overdue') return -1;
    if (ub === 'overdue' && ua !== 'overdue') return 1;
    return 0;
  })[0];
}

// ── Composant card glass avec highlight ──────────────────────────────────────
function GlassCard({ children, style, onPress, accessibilityLabel }: any) {
  const isDark = useColorScheme() === 'dark';
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel} style={[styles.cardWrap, style]}>
      <BlurView
        intensity={isDark ? 35 : 28}
        tint={isDark ? 'dark' : 'extraLight'}
        style={styles.cardBlur}
      >
        {/* Highlight supérieur — simule la réflexion lumineuse du verre */}
        <View style={[styles.glassHighlight, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
        }]} />
        {/* Border lumineuse en haut */}
        <View style={[styles.glassTopBorder, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.90)',
        }]} />
        <View style={[styles.cardInner, {
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)',
        }]}>
          {children}
        </View>
      </BlurView>
    </Wrap>
  );
}

export default function VehiclesScreen() {
  const c      = useColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const isDark = useColorScheme() === 'dark';

  const [vehicles,   setVehicles]   = useState<Vehicle[]>([]);
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError,  setLoadError]  = useState(false);

  const fetchData = async () => {
    setLoadError(false);
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
      const [vehiclesRes, remindersRes] = await Promise.race([
        Promise.all([
          supabase.from('vehicles').select('*').eq('user_id', user!.id).eq('is_archived', false).order('created_at', { ascending: false }),
          supabase.from('reminders').select('*, vehicles!inner(brand, model, current_mileage, user_id), maintenance_types(name, category)').eq('vehicles.user_id', user!.id).in('status', ['active', 'overdue']),
        ]),
        timeout,
      ]) as any;
      if (!vehiclesRes.error && vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (!remindersRes.error && remindersRes.data) setReminders(remindersRes.data);
    } catch { setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { if (!user) return; setLoading(true); fetchData(); }, [user]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return (
    <GlassBackground>
      <View style={styles.centered}><ActivityIndicator color="#3B82F6" size="large" /></View>
    </GlassBackground>
  );

  const urgentReminder = getUrgent(reminders);
  const overdueCount   = reminders.filter(r => getUrgency(r) === 'overdue').length;
  const soonCount      = reminders.filter(r => getUrgency(r) === 'soon').length;
  const firstName      = user?.user_metadata?.full_name?.split(' ')[0] ?? '';
  const h = new Date().getHours();
  const greeting = h < 12 ? `Bonjour ${firstName} ☀️` : h < 18 ? `Bonjour ${firstName} 👋` : `Bonsoir ${firstName} 🌙`;

  return (
    <GlassBackground>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <View>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.greeting, { color: c.textPrimary }]}>{greeting}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.subtitle, { color: c.textMuted }]}>
                  {vehicles.length === 0 ? 'Aucun véhicule enregistré' : `${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''}`}
                </Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/add-vehicle')} accessibilityLabel="Ajouter un véhicule" accessibilityRole="button">
                <Text style={styles.addBtnText}>＋</Text>
              </TouchableOpacity>
            </View>

            {loadError && (
              <TouchableOpacity style={styles.errorBanner} onPress={onRefresh} accessibilityRole="button">
                <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT}>⚠️ Connexion lente — Appuie pour réessayer</Text>
              </TouchableOpacity>
            )}

            {urgentReminder && (
              <GlassCard
                onPress={() => router.push('/(tabs)/reminders')}
                accessibilityLabel={`Rappel : ${urgentReminder.maintenance_types?.name}`}
                style={{ marginHorizontal: 24, marginBottom: 16 }}
              >
                <View style={styles.alertInner}>
                  <View style={styles.alertLeft}>
                    <Text style={styles.alertEmoji}>{getUrgency(urgentReminder) === 'overdue' ? '⚠️' : '🔔'}</Text>
                    <View>
                      <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.alertTitle, { color: c.textPrimary }]}>
                        {getUrgency(urgentReminder) === 'overdue' ? 'Entretien en retard !' : 'Entretien bientôt dû'}
                      </Text>
                      <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.alertSub, { color: c.textSecondary }]}>
                        {urgentReminder.maintenance_types?.name} — {urgentReminder.vehicles?.brand} {urgentReminder.vehicles?.model}
                      </Text>
                      {overdueCount + soonCount > 1 && (
                        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.alertMore, { color: c.textMuted }]}>
                          +{overdueCount + soonCount - 1} autre{overdueCount + soonCount - 1 > 1 ? 's' : ''} rappel{overdueCount + soonCount - 1 > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.alertArrow, { color: c.textMuted }]}>›</Text>
                </View>
              </GlassCard>
            )}

            {vehicles.length > 0 && (
              <View style={styles.statsRow}>
                {[
                  { emoji: '🔧', label: 'Entretien', route: '/(tabs)/maintenance' as const },
                  { emoji: '🔔', label: reminders.length > 0 ? `${reminders.length} rappel${reminders.length > 1 ? 's' : ''}` : 'Rappels', route: '/(tabs)/reminders' as const },
                  { emoji: '＋', label: 'Ajouter',   route: '/(tabs)/add-vehicle' as const },
                ].map((item) => (
                  <GlassCard key={item.label} onPress={() => router.push(item.route)} accessibilityLabel={item.label} style={{ flex: 1 }}>
                    <View style={styles.statInner}>
                      <Text style={styles.statEmoji}>{item.emoji}</Text>
                      <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>{item.label}</Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {vehicles.length > 0 && (
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.sectionTitle, { color: c.textMuted }]}>Mes véhicules</Text>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.emptyTitle, { color: c.textPrimary }]}>Ajoute ton premier véhicule</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.emptySubtitle, { color: c.textMuted }]}>Saisis ta plaque et on s'occupe du reste.</Text>
            <GlassCard onPress={() => router.push('/(tabs)/add-vehicle')} accessibilityLabel="Ajouter un véhicule" style={{ alignSelf: 'center', marginTop: 8 }}>
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.emptyBtnText, { padding: 14 }]}>Ajouter un véhicule</Text>
            </GlassCard>
          </View>
        )}
        renderItem={({ item }) => (
          <GlassCard
            onPress={() => router.push(`/(tabs)/vehicle/${item.id}`)}
            accessibilityLabel={`${item.brand} ${item.model} ${item.year}, plaque ${item.license_plate}, ${item.current_mileage.toLocaleString('fr-FR')} kilomètres`}
            style={{ marginHorizontal: 24, marginBottom: 12 }}
          >
            <View style={styles.vehicleTop}>
              <View>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleBrand, { color: c.textPrimary }]}>{item.brand}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleModel, { color: c.textSecondary }]}>{item.model} · {item.year}</Text>
              </View>
              <View style={styles.plateBadge}>
                <Text maxFontSizeMultiplier={MAX_FONT} style={styles.plateText}>{item.license_plate}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={styles.vehicleBottom}>
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleMeta, { color: c.textMuted }]}>{FUEL_EMOJI[item.fuel_type] ?? '🔧'} {item.fuel_type}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleMeta, { color: c.textMuted }]}>🛣️ {item.current_mileage.toLocaleString('fr-FR')} km</Text>
              {item.color ? <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.vehicleMeta, { color: c.textMuted }]}>🎨 {item.color}</Text> : null}
            </View>
          </GlassCard>
        )}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  list:          { flex: 1 },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:       { paddingBottom: 120 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  greeting:      { fontSize: 22, fontWeight: '700' },
  subtitle:      { fontSize: 13, marginTop: 2 },
  addBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  addBtnText:    { color: '#fff', fontSize: 22, lineHeight: 26 },
  errorBanner:   { marginHorizontal: 24, marginBottom: 12, borderRadius: 10, padding: 12, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  errorText:     { color: '#F59E0B', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // GlassCard internals
  cardWrap:      { borderRadius: 20, overflow: 'hidden' },
  cardBlur:      { borderRadius: 20, overflow: 'hidden', position: 'relative' },
  glassHighlight:{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 0 },
  glassTopBorder:{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, zIndex: 1 },
  cardInner:     { borderWidth: 1, borderRadius: 20, padding: 14, zIndex: 2 },

  alertInner:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertLeft:     { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  alertEmoji:    { fontSize: 24 },
  alertTitle:    { fontSize: 14, fontWeight: '700' },
  alertSub:      { fontSize: 12, marginTop: 2 },
  alertMore:     { fontSize: 11, marginTop: 2 },
  alertArrow:    { fontSize: 20 },

  statsRow:      { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 20 },
  statInner:     { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  statEmoji:     { fontSize: 20 },
  statLabel:     { fontSize: 11, textAlign: 'center' },

  sectionTitle:  { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 24, marginBottom: 10, opacity: 0.6 },

  emptyState:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12, paddingTop: 80 },
  emptyEmoji:    { fontSize: 64 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtnText:  { color: '#3B82F6', fontSize: 15, fontWeight: '600' },

  vehicleTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleBrand:  { fontSize: 18, fontWeight: '700' },
  vehicleModel:  { fontSize: 13, marginTop: 2 },
  plateBadge:    { backgroundColor: 'rgba(59,130,246,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)' },
  plateText:     { color: '#60A5FA', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  divider:       { height: 1, marginVertical: 10 },
  vehicleBottom: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  vehicleMeta:   { fontSize: 13 },
});
