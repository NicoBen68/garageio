import { useAuthStore } from '../../../../store/authStore';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useColors } from '../../../../lib/colors';
import { extractInvoiceData, pickInvoiceFromGallery, takeInvoicePhoto, pickInvoiceDocument } from '../../../../lib/ocr';
import DatePickerField from '../../../../components/ui/DatePickerField';

interface MaintenanceType {
  id:        string;
  name:      string;
  category:  string;
  is_system: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
};

export default function AddMaintenanceScreen() {
  const c      = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [types,          setTypes]          = useState<MaintenanceType[]>([]);
  const [selectedType,   setSelectedType]   = useState<MaintenanceType | null>(null);
  const [performedAt,    setPerformedAt]    = useState(new Date().toISOString().split('T')[0]);
  const [mileage,        setMileage]        = useState('');
  const [amount,         setAmount]         = useState('');
  const [garageName,     setGarageName]     = useState('');
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);
  const [loadingTypes,   setLoadingTypes]   = useState(true);
  const [step,           setStep]           = useState<'type' | 'details'>('type');
  const [scanning,       setScanning]       = useState(false);
  const [currentMileage, setCurrentMileage] = useState('');

  // Modals Android
  const [customTypeModal,     setCustomTypeModal]     = useState(false);
  const [customTypeValue,     setCustomTypeValue]     = useState('');
  const [customReminderModal, setCustomReminderModal] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [reminderAutoLabel,   setReminderAutoLabel]   = useState('');
  const [reminderTypeId,      setReminderTypeId]      = useState('');
  const [reminderMileage,     setReminderMileage]     = useState<number | null>(null);

  useEffect(() => { fetchTypes(); }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedType(null);
      setPerformedAt(new Date().toISOString().split('T')[0]);
      setAmount(''); setGarageName(''); setNotes('');
      setStep('type');
      fetchCurrentMileage();
    }, [])
  );

  const fetchTypes = async () => {
    const { data } = await supabase.from('maintenance_types').select('id, name, category, is_system').order('category').order('name');
    if (data) setTypes(data);
    setLoadingTypes(false);
  };

  const fetchCurrentMileage = async () => {
    const { data } = await supabase.from('vehicles').select('current_mileage').eq('id', id).single();
    if (data?.current_mileage) { setMileage(String(data.current_mileage)); setCurrentMileage(String(data.current_mileage)); }
  };

  const resetFields = () => {
    setPerformedAt(new Date().toISOString().split('T')[0]);
    setMileage(currentMileage); setAmount(''); setGarageName(''); setNotes('');
  };

  const selectType = (type: MaintenanceType) => { setSelectedType(type); resetFields(); setStep('details'); };

  const handleScanInvoice = () => {
    Alert.alert('📸 Scanner une facture', 'Comment veux-tu importer ta facture ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: '📷 Prendre une photo',  onPress: () => scanInvoice('camera')   },
      { text: '🖼️ Depuis la galerie',  onPress: () => scanInvoice('gallery')  },
      { text: '📄 Fichier / PDF',       onPress: () => scanInvoice('document') },
    ]);
  };

  const scanInvoice = async (source: 'camera' | 'gallery' | 'document') => {
    setScanning(true);
    const base64 = source === 'camera' ? await takeInvoicePhoto() : source === 'gallery' ? await pickInvoiceFromGallery() : await pickInvoiceDocument();
    if (!base64) { setScanning(false); return; }
    const invoiceData = await extractInvoiceData(base64);
    setScanning(false);
    if (!invoiceData) { Alert.alert('Erreur', 'Impossible de lire la facture. Remplis les champs manuellement.'); return; }
    if (invoiceData.date)       setPerformedAt(invoiceData.date);
    if (invoiceData.amount)     setAmount(String(invoiceData.amount));
    if (invoiceData.garageName) setGarageName(invoiceData.garageName);
    if (invoiceData.notes)      setNotes(invoiceData.notes);
    Alert.alert('✅ Facture scannée !', 'Les champs ont été remplis automatiquement. Vérifie et corrige si besoin.');
  };

  const saveReminder = async (typeId: string, customDate: string | null, mileageAtService: number | null, useAuto: boolean) => {
    await supabase.from('reminders').delete().eq('vehicle_id', id).eq('maintenance_type_id', typeId).in('status', ['active', 'snoozed']);
    if (useAuto) {
      const { data: type } = await supabase.from('maintenance_types').select('default_interval_months, default_interval_km').eq('id', typeId).single();
      if (!type) return;
      let nextDueDate = null; let nextDueMileage = null;
      if (type.default_interval_months) { const date = new Date(performedAt); date.setMonth(date.getMonth() + type.default_interval_months); nextDueDate = date.toISOString().split('T')[0]; }
      if (type.default_interval_km && mileageAtService) nextDueMileage = mileageAtService + type.default_interval_km;
      if (!nextDueDate && !nextDueMileage) return;
      await supabase.from('reminders').insert({ vehicle_id: id, maintenance_type_id: typeId, next_due_date: nextDueDate, next_due_mileage: nextDueMileage, status: 'active' });
    } else if (customDate) {
      await supabase.from('reminders').insert({ vehicle_id: id, maintenance_type_id: typeId, next_due_date: customDate, next_due_mileage: null, status: 'active' });
    }
  };

  const showReminderChoice = async (typeId: string, mileageAtService: number | null) => {
    const { data: typeData } = await supabase.from('maintenance_types').select('default_interval_months, default_interval_km').eq('id', typeId).single();
    let autoLabel = '';
    if (typeData?.default_interval_months) autoLabel += `dans ${typeData.default_interval_months} mois`;
    if (typeData?.default_interval_km && mileageAtService) autoLabel += `${autoLabel ? ' / ' : ''}+${typeData.default_interval_km.toLocaleString('fr-FR')} km`;

    setReminderAutoLabel(autoLabel);
    setReminderTypeId(typeId);
    setReminderMileage(mileageAtService);

    if (Platform.OS === 'ios') {
      const options: any[] = [{ text: 'Sans rappel', onPress: () => {} }];
      if (autoLabel) options.push({ text: `✅ Auto (${autoLabel})`, onPress: () => saveReminder(typeId, null, mileageAtService, true) });
      options.push({
        text: '📅 Date personnalisée',
        onPress: () => Alert.prompt('Rappel personnalisé', 'Date (JJ/MM/AAAA)', async (val) => {
          if (!val) return;
          const parts = val.split('/');
          if (parts.length === 3) { const d = `${parts[2]}-${parts[1]}-${parts[0]}`; await saveReminder(typeId, d, mileageAtService, false); }
        }, 'plain-text'),
      });
      Alert.alert('🔔 Rappel prochain entretien', autoLabel ? `Recommandé : ${autoLabel}` : 'Aucun intervalle par défaut pour ce type.', options);
    } else {
      setCustomReminderValue('');
      setCustomReminderModal(true);
    }
  };

  const handleReminderAuto = async () => {
    setCustomReminderModal(false);
    await saveReminder(reminderTypeId, null, reminderMileage, true);
    router.back();
  };

  const handleReminderCustomConfirm = async () => {
    setCustomReminderModal(false);
    if (customReminderValue.trim()) {
      const parts = customReminderValue.trim().split('/');
      if (parts.length === 3) { const d = `${parts[2]}-${parts[1]}-${parts[0]}`; await saveReminder(reminderTypeId, d, reminderMileage, false); }
    }
    router.back();
  };

  const handleSave = async () => {
    if (!selectedType) return;
    setSaving(true);
    const mileageVal = mileage ? parseInt(mileage) : null;
    const { error } = await supabase.from('maintenance_records').insert({
      vehicle_id: id, maintenance_type_id: selectedType.id,
      performed_at: performedAt, mileage_at_service: mileageVal,
      amount: amount ? parseFloat(amount) : null, garage_name: garageName || null, notes: notes || null,
    });
    if (mileageVal) await supabase.from('vehicles').update({ current_mileage: mileageVal }).eq('id', id);
    setSaving(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    await showReminderChoice(selectedType.id, mileageVal);
  };

  const handleDeleteType = (type: MaintenanceType) => {
    if (type.is_system) return;
    Alert.alert('Supprimer ce type ?', `"${type.name}" sera supprimé définitivement.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await supabase.from('maintenance_types').delete().eq('id', type.id); setTypes(prev => prev.filter(t => t.id !== type.id)); } },
    ]);
  };

  // ── STEP 1 : choisir le type ────────────────────────────────────────────────
  if (step === 'type') {
    const grouped = types.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {} as Record<string, MaintenanceType[]>);

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        {/* Modal type Android */}
        <Modal visible={customTypeModal} transparent animationType="fade" onRequestClose={() => setCustomTypeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>Intervention personnalisée</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: c.bg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={customTypeValue} onChangeText={setCustomTypeValue}
                placeholder="Nom de l'intervention" placeholderTextColor={c.textMuted}
                maxFontSizeMultiplier={1.3}
                accessibilityLabel="Nom de l'intervention personnalisée"
              />
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: c.cardBorder }]}
                onPress={() => setCustomTypeModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Annuler"
              >
                <Text style={[styles.modalConfirmText, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#3B82F6' }]}
                accessibilityRole="button"
                accessibilityLabel="Confirmer l'intervention personnalisée"
                onPress={async () => {
                  if (!customTypeValue.trim()) return;
                  const { data } = await supabase.from('maintenance_types').insert({ name: customTypeValue.trim(), category: 'autre', is_system: false, user_id: user!.id }).select().single();
                  setCustomTypeModal(false);
                  if (data) { setSelectedType(data); resetFields(); setStep('details'); }
                }}
              >
                <Text style={styles.modalConfirmText} maxFontSizeMultiplier={1.3}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour au carnet d'entretien"
          >
            <Text style={styles.backText} maxFontSizeMultiplier={1.3}>← Retour</Text>
          </TouchableOpacity>
          <Text style={[styles.stepIndicator, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>Étape 1/2</Text>
        </View>
        <Text style={[styles.title, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>Type d'intervention</Text>

        {loadingTypes ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.typeList} keyboardShouldPersistTaps="handled">
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={[styles.categoryLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>
                  {CATEGORY_EMOJI[category] ?? '🔧'} {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                {items.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeCard, { backgroundColor: c.card, borderColor: c.cardBorder }, selectedType?.id === type.id && styles.typeCardActive]}
                    onPress={() => selectType(type)}
                    onLongPress={() => handleDeleteType(type)}
                    accessibilityRole="button"
                    accessibilityLabel={`${type.name}${!type.is_system ? ', personnalisé' : ''}`}
                    accessibilityHint={!type.is_system ? 'Appui long pour supprimer ce type' : undefined}
                    accessibilityState={{ selected: selectedType?.id === type.id }}
                  >
                    <Text style={[styles.typeName, { color: c.textSecondary }, selectedType?.id === type.id && styles.typeNameActive]} maxFontSizeMultiplier={1.3}>
                      {type.name}{!type.is_system ? ' ✏️' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={styles.categoryGroup}>
              <Text style={[styles.categoryLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>✏️ Personnalisé</Text>
              <TouchableOpacity
                style={[styles.typeCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Saisir une intervention libre"
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Alert.prompt('Intervention personnalisée', 'Nomme ton intervention', async (name) => {
                      if (!name?.trim()) return;
                      const { data } = await supabase.from('maintenance_types').insert({ name: name.trim(), category: 'autre', is_system: false, user_id: user!.id }).select().single();
                      if (data) { setSelectedType(data); resetFields(); setStep('details'); }
                    }, 'plain-text');
                  } else { setCustomTypeValue(''); setCustomTypeModal(true); }
                }}
              >
                <Text style={[styles.typeName, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>＋ Saisir une intervention libre...</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  // ── STEP 2 : détails ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Modal rappel Android */}
      <Modal visible={customReminderModal} transparent animationType="fade" onRequestClose={() => { setCustomReminderModal(false); router.back(); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>🔔 Rappel prochain entretien</Text>
            {reminderAutoLabel ? <Text style={[styles.modalSubtitle, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Recommandé : {reminderAutoLabel}</Text> : null}
            <TextInput
              style={[styles.modalInput, { backgroundColor: c.bg, borderColor: c.inputBorder, color: c.textPrimary }]}
              value={customReminderValue} onChangeText={setCustomReminderValue}
              placeholder="Date perso JJ/MM/AAAA (optionnel)" placeholderTextColor={c.textMuted}
              maxFontSizeMultiplier={1.3}
              accessibilityLabel="Date personnalisée pour le rappel"
            />
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: c.cardBorder }]}
              onPress={() => { setCustomReminderModal(false); router.back(); }}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer sans rappel"
            >
              <Text style={[styles.modalConfirmText, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Sans rappel</Text>
            </TouchableOpacity>
            {reminderAutoLabel ? (
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#22C55E' }]}
                onPress={handleReminderAuto}
                accessibilityRole="button"
                accessibilityLabel={`Utiliser la date automatique : ${reminderAutoLabel}`}
              >
                <Text style={styles.modalConfirmText} maxFontSizeMultiplier={1.3}>✅ Date auto ({reminderAutoLabel})</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: '#7C3AED' }]}
              onPress={handleReminderCustomConfirm}
              accessibilityRole="button"
              accessibilityLabel="Utiliser la date saisie pour le rappel"
            >
              <Text style={styles.modalConfirmText} maxFontSizeMultiplier={1.3}>📅 Utiliser la date saisie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setStep('type')}
            accessibilityRole="button"
            accessibilityLabel="Retour au choix du type d'intervention"
          >
            <Text style={styles.backText} maxFontSizeMultiplier={1.3}>← Changer</Text>
          </TouchableOpacity>
          <Text style={[styles.stepIndicator, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>Étape 2/2</Text>
        </View>
        <Text style={[styles.title, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>Détails de l'intervention</Text>

        <View style={[styles.selectedTypeBadge, { backgroundColor: c.card, borderColor: '#3B82F6' }]}>
          <Text style={styles.selectedTypeEmoji} accessibilityElementsHidden>{CATEGORY_EMOJI[selectedType?.category ?? 'autre']}</Text>
          <Text style={[styles.selectedTypeName, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{selectedType?.name}</Text>
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.btnDisabled]}
          onPress={handleScanInvoice}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scanner une facture pour remplir automatiquement les champs"
          accessibilityState={{ disabled: scanning }}
        >
          {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.scanBtnText} maxFontSizeMultiplier={1.3}>📸 Scanner une facture</Text>}
        </TouchableOpacity>

        <DatePickerField label="Date *" value={performedAt} onChange={setPerformedAt} />

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Kilométrage au moment de l'intervention</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            value={mileage} onChangeText={setMileage} keyboardType="numeric"
            placeholder="45000" placeholderTextColor={c.textMuted}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Kilométrage au moment de l'intervention"
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Montant (€)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
            placeholder="89.90" placeholderTextColor={c.textMuted}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Montant en euros"
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Garage / Prestataire</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            value={garageName} onChangeText={setGarageName}
            placeholder="Garage du Centre" placeholderTextColor={c.textMuted}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Nom du garage ou prestataire"
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            value={notes} onChangeText={setNotes}
            placeholder="Remarques, références pièces..." placeholderTextColor={c.textMuted}
            multiline numberOfLines={3}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Notes et remarques"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer l'intervention"
          accessibilityState={{ disabled: saving }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText} maxFontSizeMultiplier={1.3}>Enregistrer l'intervention</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  backText:          { color: '#3B82F6', fontSize: 15 },
  stepIndicator:     { fontSize: 13 },
  title:             { fontSize: 24, fontWeight: '700', paddingHorizontal: 24, marginBottom: 16 },
  typeList:          { paddingHorizontal: 24, paddingBottom: 48, gap: 20 },
  categoryGroup:     { gap: 8 },
  categoryLabel:     { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  typeCard:          { borderRadius: 12, padding: 14, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  typeCardActive:    { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  typeName:          { fontSize: 15, fontWeight: '500' },
  typeNameActive:    { color: '#fff' },
  inner:             { padding: 24, paddingBottom: 48, gap: 4 },
  selectedTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
  selectedTypeEmoji: { fontSize: 24 },
  selectedTypeName:  { fontSize: 16, fontWeight: '600' },
  field:             { gap: 6, marginBottom: 8 },
  label:             { fontSize: 13, fontWeight: '500' },
  input:             { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea:          { height: 80, textAlignVertical: 'top' },
  saveBtn:           { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16, minHeight: 44 },
  btnDisabled:       { opacity: 0.5 },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  scanBtn:           { backgroundColor: '#0F4C35', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#166634', marginBottom: 16, minHeight: 44 },
  scanBtnText:       { color: '#34D399', fontSize: 14, fontWeight: '600' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:          { borderRadius: 16, padding: 24, width: '100%', gap: 12, borderWidth: 1 },
  modalTitle:        { fontSize: 18, fontWeight: '700' },
  modalSubtitle:     { fontSize: 13 },
  modalInput:        { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons:      { flexDirection: 'row', gap: 12 },
  modalCancel:       { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText:   { fontWeight: '600' },
  modalConfirm:      { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  modalConfirmText:  { color: '#fff', fontWeight: '600' },
});
