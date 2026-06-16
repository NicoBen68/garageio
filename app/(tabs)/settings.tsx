import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Switch, Linking,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';


interface UserProfile {
  full_name:           string;
  email:               string;
  subscription_status: string;
  created_at:          string;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [vehicles,      setVehicles]      = useState(0);
  const [records,       setRecords]       = useState(0);
  const [notifEnabled,  setNotifEnabled]  = useState(true);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const [profileRes, vehiclesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', user!.id).single(),
      supabase.from('vehicles').select('id', { count: 'exact' }).eq('user_id', user!.id).eq('is_archived', false),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (vehiclesRes.count !== null) setVehicles(vehiclesRes.count);
    if (vehiclesRes.data) {
      const vehicleIds = vehiclesRes.data.map((v: any) => v.id);
      if (vehicleIds.length > 0) {
        const { count } = await supabase
          .from('maintenance_records')
          .select('id', { count: 'exact' })
          .in('vehicle_id', vehicleIds);
        if (count !== null) setRecords(count);
      }
    }
    setLoading(false);
  };

  const handleEditName = () => {
    Alert.prompt(
      'Modifier mon nom',
      'Saisis ton nouveau nom',
      async (name) => {
        if (!name?.trim()) return;
        const { error } = await supabase
          .from('users')
          .update({ full_name: name.trim() })
          .eq('id', user!.id);
        if (!error) {
          setProfile(prev => prev ? { ...prev, full_name: name.trim() } : prev);
          Alert.alert('✅ Nom mis à jour !');
        }
      },
      'plain-text',
      profile?.full_name ?? ''
    );
  };

  const handleEditEmail = () => {
    Alert.prompt(
      'Modifier mon email',
      'Saisis ton nouvel email',
      async (email) => {
        if (!email?.trim()) return;
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (!error) {
          Alert.alert('✅ Email mis à jour !', 'Un email de confirmation t\'a été envoyé.');
        } else {
          Alert.alert('Erreur', error.message);
        }
      },
      'plain-text',
      profile?.email ?? ''
    );
  };

  const handleChangePassword = () => {
    Alert.prompt(
      'Nouveau mot de passe',
      'Saisis ton nouveau mot de passe (8 caractères minimum)',
      async (password) => {
        if (!password || password.length < 8) {
          Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (!error) {
          Alert.alert('✅ Mot de passe mis à jour !');
        } else {
          Alert.alert('Erreur', error.message);
        }
      },
      'secure-text'
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Se déconnecter ?',
      'Tu devras te reconnecter pour accéder à tes données.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte ?',
      'Toutes tes données seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => Alert.alert('Contacte-nous', 'Envoie un email à support@garageio.app pour supprimer ton compte.'),
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#3B82F6" size="large" /></View>;
  }

  const isPremium = profile?.subscription_status === 'premium';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>

      {/* Avatar */}
      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <Text style={styles.memberSince}>Membre depuis {memberSince}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{vehicles}</Text>
          <Text style={styles.statLabel}>véhicule{vehicles > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{records}</Text>
          <Text style={styles.statLabel}>intervention{records > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, isPremium ? styles.premiumText : styles.freeText]}>
            {isPremium ? '⭐ Pro' : 'Free'}
          </Text>
          <Text style={styles.statLabel}>abonnement</Text>
        </View>
      </View>

      {/* Premium banner */}
      {!isPremium && (
        <TouchableOpacity style={styles.premiumBanner} onPress={() => Alert.alert('Bientôt disponible', 'Le module Premium arrive prochainement ! Suivi budgétaire et coût/km pour mieux gérer vos dépenses auto.')}>

          <View>
            <Text style={styles.premiumBannerTitle}>✨ Passer à Premium</Text>
            <Text style={styles.premiumBannerSub}>Suivi budgétaire · Coût/km · 3€/mois</Text>
          </View>
          <Text style={styles.premiumBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditName}>
            <Text style={styles.menuItemIcon}>👤</Text>
            <View style={styles.menuItemCenter}>
              <Text style={styles.menuItemLabel}>Nom</Text>
              <Text style={styles.menuItemValue}>{profile?.full_name}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleEditEmail}>
            <Text style={styles.menuItemIcon}>📧</Text>
            <View style={styles.menuItemCenter}>
              <Text style={styles.menuItemLabel}>Email</Text>
              <Text style={styles.menuItemValue}>{profile?.email}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
            <Text style={styles.menuItemIcon}>🔒</Text>
            <View style={styles.menuItemCenter}>
              <Text style={styles.menuItemLabel}>Mot de passe</Text>
              <Text style={styles.menuItemValue}>••••••••</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>🔔</Text>
            <View style={styles.menuItemCenter}>
              <Text style={styles.menuItemLabel}>Notifications</Text>
              <Text style={styles.menuItemValue}>{notifEnabled ? 'Activées' : 'Désactivées'}</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://apps.apple.com/app/id6780651856')}>
            <Text style={styles.menuItemIcon}>⭐</Text>
            <Text style={styles.menuItemLabel}>Noter l'application</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:support@garageio.app')}>
            <Text style={styles.menuItemIcon}>📩</Text>
            <Text style={styles.menuItemLabel}>Nous contacter</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://raw.githubusercontent.com/NicoBen68/garageio/main/PRIVACY_POLICY.md')}>
            <Text style={styles.menuItemIcon}>📄</Text>
            <Text style={styles.menuItemLabel}>Politique de confidentialité</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Supprimer mon compte</Text>
      </TouchableOpacity>

      <Text style={styles.version}>GarageIO v1.0.0</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0F172A' },
  centered:           { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  inner:              { padding: 24, paddingTop: 60, paddingBottom: 48, gap: 24 },
  avatarBlock:        { alignItems: 'center', gap: 6 },
  avatar:             { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText:         { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:               { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  email:              { fontSize: 14, color: '#64748B' },
  memberSince:        { fontSize: 12, color: '#475569' },
  statsRow:           { flexDirection: 'row', gap: 10 },
  statCard:           { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statValue:          { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  statLabel:          { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },
  premiumText:        { color: '#F59E0B' },
  freeText:           { color: '#64748B' },
  premiumBanner:      { backgroundColor: '#1D4ED8', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  premiumBannerSub:   { fontSize: 12, color: '#BFDBFE', marginTop: 2 },
  premiumBannerArrow: { fontSize: 20, color: '#fff' },
  section:            { gap: 8 },
  sectionTitle:       { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard:           { backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  menuItem:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuItemIcon:       { fontSize: 18, width: 24 },
  menuItemCenter:     { flex: 1 },
  menuItemLabel:      { fontSize: 13, color: '#64748B' },
  menuItemValue:      { fontSize: 15, color: '#CBD5E1', marginTop: 1 },
  menuItemArrow:      { fontSize: 18, color: '#475569' },
  menuDivider:        { height: 1, backgroundColor: '#334155', marginLeft: 50 },
  signOutBtn:         { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  signOutText:        { color: '#F87171', fontSize: 15, fontWeight: '600' },
  deleteBtn:          { alignItems: 'center', paddingVertical: 8 },
  deleteText:         { color: '#475569', fontSize: 13 },
  version:            { textAlign: 'center', fontSize: 12, color: '#334155' },
});
