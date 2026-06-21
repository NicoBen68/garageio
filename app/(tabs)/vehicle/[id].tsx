import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useColors } from '../../../lib/colors';

const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'];
const FUEL_EMOJI: Record<string, string> = {
  essence: '⛽', diesel: '🛢️', hybride: '🔋', electrique: '⚡', gpl: '💨', autre: '🔧',
};

export default function VehicleDetailScreen() {
  const c      = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [brand,    setBrand]    = useState('');
  const [model,    setModel]    = useState('');
  const [year,     setYear]     = useState('');
  const [fuelType, setFuelType] = useState('essence');
  const [color,    setColor]    = useState('');
  const [mileage,  setMileage]  = useState('');
  const [plate,    setPlate]    = useState('');

  useEffect(() => { fetchVehicle(); }, [id]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
    if (error || !data) { Alert.alert('Erreur', 'Véhicule introuvable.'); router.back(); return; }
    setBrand(data.brand ?? ''); setModel(data.model ?? ''); setYear(data.year ? String(data.year) : '');
    setFuelType(data.fuel_type ?? 'essence'); setColor(data.color ?? '');
    setMileage(data.current_mileage ? String(data.current_mileage) : '0'); setPlate(data.license_plate ?? '');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!brand || !model) { Alert.alert('Champs manquants', 'La marque et le modèle sont obligatoires.'); return; }
    setSaving(true);
    const { error } = await supabase.from('vehicles').update({ brand, model, year: year ? parseInt(year) : null, fuel_type: fuelType, color, current_mileage: mileage ? parseInt(mileage) : 0 }).eq('id', id);
    setSaving(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    setEditing(false);
    Alert.alert('✅ Sauvegardé !', 'Les informations ont été mises à jour.');
  };

  const handleArchive = () => {
    Alert.alert('Archiver ce véhicule ?', "Il n'apparaîtra plus dans ta liste mais ses données seront conservées.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', style: 'destructive', onPress: async () => { await supabase.from('vehicles').update({ is_archived: true }).eq('id', id); router.back(); } },
    ]);
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator color="#3B82F6" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour à la liste des véhicules"
          >
            <Text style={styles.backText} maxFontSizeMultiplier={1.3}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => editing ? handleSave() : setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Sauvegarder les modifications' : 'Modifier les informations du véhicule'}
          >
            {saving ? <ActivityIndicator color="#3B82F6" /> : <Text style={styles.editBtn} maxFontSizeMultiplier={1.3}>{editing ? 'Sauvegarder' : 'Modifier'}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.vehicleTitle, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{brand} {model}</Text>
          <View style={[styles.plateBadge, { backgroundColor: c.card, borderColor: '#3B82F6' }]}>
            <Text style={styles.plateText} maxFontSizeMultiplier={1.2} accessibilityLabel={`Immatriculation : ${plate}`}>{plate}</Text>
          </View>
        </View>

        {/* Kilométrage */}
        <View style={[styles.mileageCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.mileageLabel, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>🛣️ Kilométrage actuel</Text>
          <View style={styles.mileageRow}>
            <TextInput
              style={[styles.mileageInput, { backgroundColor: c.bg, borderColor: c.inputBorder, color: c.textPrimary }]}
              keyboardType="numeric"
              value={mileage}
              onChangeText={setMileage}
              maxFontSizeMultiplier={1.3}
              accessibilityLabel="Kilométrage actuel"
            />
            <Text style={[styles.mileageUnit, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>km</Text>
          </View>
          {!editing && (
            <TouchableOpacity
              style={styles.mileageSaveBtn}
              onPress={async () => { await supabase.from('vehicles').update({ current_mileage: parseInt(mileage) || 0 }).eq('id', id); Alert.alert('✅ Kilométrage mis à jour !'); }}
              accessibilityRole="button"
              accessibilityLabel="Mettre à jour le kilométrage"
            >
              <Text style={styles.mileageSaveBtnText} maxFontSizeMultiplier={1.3}>Mettre à jour le km</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Infos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>Informations</Text>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Marque</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }, !editing && styles.inputDisabled]}
            value={brand} onChangeText={setBrand} editable={editing}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Marque du véhicule"
          />
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Modèle</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }, !editing && styles.inputDisabled]}
            value={model} onChangeText={setModel} editable={editing}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Modèle du véhicule"
          />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Année</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }, !editing && styles.inputDisabled]}
                keyboardType="numeric" value={year} onChangeText={setYear} editable={editing}
                maxFontSizeMultiplier={1.3}
                accessibilityLabel="Année du véhicule"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Couleur</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }, !editing && styles.inputDisabled]}
                value={color} onChangeText={setColor} editable={editing}
                maxFontSizeMultiplier={1.3}
                accessibilityLabel="Couleur du véhicule"
              />
            </View>
          </View>
        </View>

        {/* Carburant */}
        {editing ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>Carburant</Text>
            <View style={styles.fuelGrid}>
              {FUEL_TYPES.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.fuelBtn, { backgroundColor: c.card, borderColor: c.cardBorder }, fuelType === f && styles.fuelBtnActive]}
                  onPress={() => setFuelType(f)}
                  accessibilityRole="button"
                  accessibilityLabel={`Carburant : ${f}`}
                  accessibilityState={{ selected: fuelType === f }}
                >
                  <Text style={[styles.fuelBtnText, { color: c.textSecondary }, fuelType === f && styles.fuelBtnTextActive]} maxFontSizeMultiplier={1.3}>
                    {FUEL_EMOJI[f]} {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.infoRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.infoLabel, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>Carburant</Text>
            <Text style={[styles.infoValue, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>{FUEL_EMOJI[fuelType]} {fuelType}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.maintenanceBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          onPress={() => router.push(`/(tabs)/vehicle/${id}/maintenance`)}
          accessibilityRole="button"
          accessibilityLabel="Voir le carnet d'entretien de ce véhicule"
        >
          <Text style={[styles.maintenanceBtnText, { color: c.textPrimary }]} maxFontSizeMultiplier={1.3}>🔧 Voir le carnet d'entretien</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.archiveBtn}
          onPress={handleArchive}
          accessibilityRole="button"
          accessibilityLabel="Archiver ce véhicule"
          accessibilityHint="Le véhicule n'apparaîtra plus dans la liste, mais ses données seront conservées"
        >
          <Text style={styles.archiveBtnText} maxFontSizeMultiplier={1.3}>Archiver ce véhicule</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner:              { padding: 24, paddingBottom: 48, gap: 24 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  backText:           { color: '#3B82F6', fontSize: 15 },
  editBtn:            { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  titleBlock:         { gap: 10 },
  vehicleTitle:       { fontSize: 28, fontWeight: '700' },
  plateBadge:         { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  plateText:          { color: '#3B82F6', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  mileageCard:        { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  mileageLabel:       { fontSize: 14, fontWeight: '500' },
  mileageRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mileageInput:       { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 24, fontWeight: '700' },
  mileageUnit:        { fontSize: 16 },
  mileageSaveBtn:     { backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 10, alignItems: 'center', minHeight: 44 },
  mileageSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section:            { gap: 8 },
  sectionTitle:       { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label:              { fontSize: 13, marginTop: 6 },
  input:              { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  inputDisabled:      { opacity: 0.6 },
  row:                { flexDirection: 'row', gap: 12 },
  halfField:          { flex: 1 },
  fuelGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelBtn:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  fuelBtnActive:      { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  fuelBtnText:        { fontSize: 13 },
  fuelBtnTextActive:  { color: '#fff', fontWeight: '600' },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 12, padding: 14, borderWidth: 1 },
  infoLabel:          { fontSize: 14 },
  infoValue:          { fontSize: 14, fontWeight: '500' },
  maintenanceBtn:     { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, minHeight: 44 },
  maintenanceBtnText: { fontSize: 15, fontWeight: '600' },
  archiveBtn:         { borderWidth: 1, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, minHeight: 44 },
  archiveBtnText:     { color: '#EF4444', fontSize: 15, fontWeight: '500' },
});
