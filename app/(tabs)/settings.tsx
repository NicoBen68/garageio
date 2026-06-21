import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Switch,
  Linking, Platform, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../lib/colors';

interface UserProfile {
  full_name:           string;
  email:               string;
  subscription_status: string;
  created_at:          string;
}

type ModalType = 'name' | 'email' | 'password' | null;
const MAX_FONT = 1.3;

export default function SettingsScreen() {
  const c = useColors();
  const { user, signOut } = useAuthStore();
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [vehicles,     setVehicles]     = useState(0);
  const [records,      setRecords]      = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [modalType,    setModalType]    = useState<ModalType>(null);
  const [modalValue,   setModalValue]   = useState('');
  const [modalSaving,  setModalSaving]  = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const [profileRes, vehiclesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', user!.id).single(),
      supabase.from('vehicles').select('id', { count: 'exact' }).eq('user_id', user!.id).eq('is_archived', false),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (vehiclesRes.count !== null) setVehicles(vehiclesRes.count);
    if (vehiclesRes.data) {
      const ids = vehiclesRes.data.map((v: any) => v.id);
      if (ids.length > 0) {
        const { count } = await supabase.from('maintenance_records').select('id', { count: 'exact' }).in('vehicle_id', ids);
        if (count !== null) setRecords(count);
      }
    }
    setLoading(false);
  };

  const openModal = (type: ModalType, defaultValue = '') => { setModalType(type); setModalValue(defaultValue); };
  const closeModal = () => { setModalType(null); setModalValue(''); setModalSaving(false); };

  const handleModalSave = async () => {
    setModalSaving(true);
    if (modalType === 'name') {
      if (!modalValue.trim()) { closeModal(); return; }
      const { error } = await supabase.from('users').update({ full_name: modalValue.trim() }).eq('id', user!.id);
      if (!error) { setProfile(prev => prev ? { ...prev, full_name: modalValue.trim() } : prev); Alert.alert('✅ Nom mis à jour !'); }
    } else if (modalType === 'email') {
      if (!modalValue.trim()) { closeModal(); return; }
      const { error } = await supabase.auth.updateUser({ email: modalValue.trim() });
      if (!error) Alert.alert('✅ Email mis à jour !', "Un email de confirmation t'a été envoyé.");
      else Alert.alert('Erreur', error.message);
    } else if (modalType === 'password') {
      if (!modalValue || modalValue.length < 8) { Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères.'); setModalSaving(false); return; }
      const { error } = await supabase.auth.updateUser({ password: modalValue });
      if (!error) Alert.alert('✅ Mot de passe mis à jour !');
      else Alert.alert('Erreur', error.message);
    }
    closeModal();
  };

  const handleEditName = () => Platform.OS === 'ios'
    ? Alert.prompt('Modifier mon nom', '', async (name) => { if (!name?.trim()) return; const { error } = await supabase.from('users').update({ full_name: name.trim() }).eq('id', user!.id); if (!error) { setProfile(prev => prev ? { ...prev, full_name: name.trim() } : prev); Alert.alert('✅ Nom mis à jour !'); } }, 'plain-text', profile?.full_name ?? '')
    : openModal('name', profile?.full_name ?? '');

  const handleEditEmail = () => Platform.OS === 'ios'
    ? Alert.prompt('Modifier mon email', '', async (email) => { if (!email?.trim()) return; const { error } = await supabase.auth.updateUser({ email: email.trim() }); if (!error) Alert.alert('✅ Email mis à jour !', "Un email de confirmation t'a été envoyé."); else Alert.alert('Erreur', error.message); }, 'plain-text', profile?.email ?? '')
    : openModal('email', profile?.email ?? '');

  const handleChangePassword = () => Platform.OS === 'ios'
    ? Alert.prompt('Nouveau mot de passe', '8 caractères minimum', async (password) => { if (!password || password.length < 8) { Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères.'); return; } const { error } = await supabase.auth.updateUser({ password }); if (!error) Alert.alert('✅ Mot de passe mis à jour !'); else Alert.alert('Erreur', error.message); }, 'secure-text')
    : openModal('password', '');

  const handleSignOut = () => Alert.alert('Se déconnecter ?', 'Tu devras te reconnecter pour accéder à tes données.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnecter', style: 'destructive', onPress: signOut }]);
  const handleDeleteAccount = () => Alert.alert('Supprimer mon compte ?', 'Toutes tes données seront définitivement supprimées.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => Alert.alert('Contacte-nous', 'Envoie un email à support@garageio.app pour supprimer ton compte.') }]);

  const getModalConfig = () => {
    switch (modalType) {
      case 'name':     return { title: 'Modifier mon nom',     placeholder: 'Ton nom',          secure: false };
      case 'email':    return { title: 'Modifier mon email',   placeholder: 'ton@email.com',    secure: false };
      case 'password': return { title: 'Nouveau mot de passe', placeholder: '8 caractères min', secure: true  };
      default:         return { title: '',                      placeholder: '',                  secure: false };
    }
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator color="#3B82F6" size="large" /></View>;

  const isPremium = profile?.subscription_status === 'premium';
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—';
  const modalConfig = getModalConfig();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.inner}>

      {/* Modal Android */}
      <Modal visible={modalType !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.modalTitle, { color: c.textPrimary }]}>{modalConfig.title}</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: c.bg, borderColor: c.inputBorder, color: c.textPrimary }]} value={modalValue} onChangeText={setModalValue} placeholder={modalConfig.placeholder} placeholderTextColor={c.textMuted} secureTextEntry={modalConfig.secure} autoFocus accessibilityLabel={modalConfig.title} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: c.cardBorder }]} onPress={closeModal} accessibilityLabel="Annuler" accessibilityRole="button">
                  <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.modalCancelText, { color: c.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleModalSave} disabled={modalSaving} accessibilityLabel="Enregistrer" accessibilityRole="button">
                  {modalSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text maxFontSizeMultiplier={MAX_FONT} style={styles.modalConfirmText}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Avatar */}
      <View style={styles.avatarBlock}>
        <View style={styles.avatar} accessibilityLabel={`Avatar de ${profile?.full_name}`}><Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text></View>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.name, { color: c.textPrimary }]}>{profile?.full_name}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.email, { color: c.textMuted }]}>{profile?.email}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.memberSince, { color: c.textDisabled }]}>Membre depuis {memberSince}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} accessibilityLabel={`${vehicles} véhicule${vehicles > 1 ? 's' : ''}`}>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, { color: c.textPrimary }]}>{vehicles}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>véhicule{vehicles > 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} accessibilityLabel={`${records} intervention${records > 1 ? 's' : ''}`}>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, { color: c.textPrimary }]}>{records}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>intervention{records > 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} accessibilityLabel={isPremium ? 'Abonnement Premium' : 'Abonnement gratuit'}>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statValue, isPremium ? styles.premiumText : { color: c.textMuted }]}>{isPremium ? '⭐ Pro' : 'Free'}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.statLabel, { color: c.textMuted }]}>abonnement</Text>
        </View>
      </View>

      {/* Premium banner */}
      {!isPremium && (
        <TouchableOpacity style={styles.premiumBanner} onPress={() => Alert.alert('Bientôt disponible', 'Le module Premium arrive prochainement !')} accessibilityLabel="Passer à Premium, bientôt disponible" accessibilityRole="button">
          <View><Text maxFontSizeMultiplier={MAX_FONT} style={styles.premiumBannerTitle}>✨ Passer à Premium</Text><Text maxFontSizeMultiplier={MAX_FONT} style={styles.premiumBannerSub}>Suivi budgétaire · Coût/km · 3€/mois</Text></View>
          <Text style={styles.premiumBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Compte */}
      <View style={styles.section}>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.sectionTitle, { color: c.textMuted }]}>Compte</Text>
        <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditName} accessibilityLabel={`Modifier le nom, actuellement ${profile?.full_name}`} accessibilityRole="button">
            <Text style={styles.menuItemIcon}>👤</Text>
            <View style={styles.menuItemCenter}><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textMuted }]}>Nom</Text><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemValue, { color: c.textPrimary }]}>{profile?.full_name}</Text></View>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleEditEmail} accessibilityLabel={`Modifier l'email, actuellement ${profile?.email}`} accessibilityRole="button">
            <Text style={styles.menuItemIcon}>📧</Text>
            <View style={styles.menuItemCenter}><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textMuted }]}>Email</Text><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemValue, { color: c.textPrimary }]}>{profile?.email}</Text></View>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword} accessibilityLabel="Modifier le mot de passe" accessibilityRole="button">
            <Text style={styles.menuItemIcon}>🔒</Text>
            <View style={styles.menuItemCenter}><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textMuted }]}>Mot de passe</Text><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemValue, { color: c.textPrimary }]}>••••••••</Text></View>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: c.separator }]} />
          <View style={styles.menuItem} accessibilityLabel={`Notifications ${notifEnabled ? 'activées' : 'désactivées'}`}>
            <Text style={styles.menuItemIcon}>🔔</Text>
            <View style={styles.menuItemCenter}><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textMuted }]}>Notifications</Text><Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemValue, { color: c.textPrimary }]}>{notifEnabled ? 'Activées' : 'Désactivées'}</Text></View>
            <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ false: c.cardBorder, true: '#3B82F6' }} thumbColor="#fff" accessibilityLabel="Activer ou désactiver les notifications" />
          </View>
        </View>
      </View>

      {/* App */}
      <View style={styles.section}>
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.sectionTitle, { color: c.textMuted }]}>Application</Text>
        <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://apps.apple.com/app/id6780651856')} accessibilityLabel="Noter l'application sur l'App Store" accessibilityRole="link">
            <Text style={styles.menuItemIcon}>⭐</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textPrimary }]}>Noter l'application</Text>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:support@garageio.app')} accessibilityLabel="Nous contacter par email" accessibilityRole="link">
            <Text style={styles.menuItemIcon}>📩</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textPrimary }]}>Nous contacter</Text>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://raw.githubusercontent.com/NicoBen68/garageio/main/PRIVACY_POLICY.md')} accessibilityLabel="Lire la politique de confidentialité" accessibilityRole="link">
            <Text style={styles.menuItemIcon}>📄</Text>
            <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.menuItemLabel, { color: c.textPrimary }]}>Politique de confidentialité</Text>
            <Text style={[styles.menuItemArrow, { color: c.textDisabled }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={handleSignOut} accessibilityLabel="Se déconnecter" accessibilityRole="button">
        <Text maxFontSizeMultiplier={MAX_FONT} style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} accessibilityLabel="Supprimer mon compte" accessibilityRole="button" accessibilityHint="Action irréversible">
        <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.deleteText, { color: c.textDisabled }]}>Supprimer mon compte</Text>
      </TouchableOpacity>
      <Text maxFontSizeMultiplier={MAX_FONT} style={[styles.version, { color: c.cardBorder }]}>GarageIO v1.0.0</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner:              { padding: 24, paddingTop: 60, paddingBottom: 48, gap: 24 },
  avatarBlock:        { alignItems: 'center', gap: 6 },
  avatar:             { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText:         { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:               { fontSize: 22, fontWeight: '700' },
  email:              { fontSize: 14 },
  memberSince:        { fontSize: 12 },
  statsRow:           { flexDirection: 'row', gap: 10 },
  statCard:           { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue:          { fontSize: 18, fontWeight: '700' },
  statLabel:          { fontSize: 11, marginTop: 2, textAlign: 'center' },
  premiumText:        { color: '#F59E0B' },
  premiumBanner:      { backgroundColor: '#1D4ED8', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  premiumBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  premiumBannerSub:   { fontSize: 12, color: '#BFDBFE', marginTop: 2 },
  premiumBannerArrow: { fontSize: 20, color: '#fff' },
  section:            { gap: 8 },
  sectionTitle:       { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard:           { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuItem:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, minHeight: 44 },
  menuItemIcon:       { fontSize: 18, width: 24 },
  menuItemCenter:     { flex: 1 },
  menuItemLabel:      { fontSize: 13 },
  menuItemValue:      { fontSize: 15, marginTop: 1 },
  menuItemArrow:      { fontSize: 18 },
  menuDivider:        { height: 1, marginLeft: 50 },
  signOutBtn:         { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, minHeight: 44 },
  signOutText:        { color: '#F87171', fontSize: 15, fontWeight: '600' },
  deleteBtn:          { alignItems: 'center', paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  deleteText:         { fontSize: 13 },
  version:            { textAlign: 'center', fontSize: 12 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:           { borderRadius: 16, padding: 24, width: '100%', gap: 16, borderWidth: 1 },
  modalTitle:         { fontSize: 18, fontWeight: '700' },
  modalInput:         { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons:       { flexDirection: 'row', gap: 12 },
  modalCancel:        { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  modalCancelText:    { fontWeight: '600' },
  modalConfirm:       { flex: 1, backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  modalConfirmText:   { color: '#fff', fontWeight: '600' },
});
