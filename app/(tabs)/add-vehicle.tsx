import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { fetchVehicleByPlate } from '../../lib/plateApi';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../lib/colors';

const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'];

export default function AddVehicleScreen() {
  const c       = useColors();
  const router  = useRouter();
  const { user } = useAuthStore();

  const [plate,        setPlate]        = useState('');
  const [brand,        setBrand]        = useState('');
  const [model,        setModel]        = useState('');
  const [year,         setYear]         = useState('');
  const [fuelType,     setFuelType]     = useState('essence');
  const [color,        setColor]        = useState('');
  const [mileage,      setMileage]      = useState('');
  const [vin,          setVin]          = useState('');
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateFetched, setPlateFetched] = useState(false);
  const [saving,       setSaving]       = useState(false);

  const handleLookupPlate = async () => {
    if (plate.length < 5) { Alert.alert('Plaque invalide', 'Saisis une plaque au format AB-123-CD.'); return; }
    setPlateLoading(true); setPlateFetched(false);
    const info = await fetchVehicleByPlate(plate);
    setPlateLoading(false);
    if (!info) { Alert.alert('Introuvable', 'Véhicule non trouvé. Tu peux remplir les champs manuellement.'); return; }
    setBrand(info.brand); setModel(info.model); setYear(info.year > 0 ? String(info.year) : '');
    setFuelType(info.fuelType || 'essence'); setColor(info.color); setVin(info.vin);
    setPlateFetched(true);
  };

  const handleSave = async () => {
    if (!plate || !brand || !model) { Alert.alert('Champs manquants', 'La plaque, la marque et le modèle sont obligatoires.'); return; }
    setSaving(true);
    const { error } = await supabase.from('vehicles').insert({
      user_id: user!.id, license_plate: plate.toUpperCase().replace(/\s/g, '-'),
      brand, model, year: year ? parseInt(year) : null, fuel_type: fuelType,
      color, vin: vin || null, current_mileage: mileage ? parseInt(mileage) : 0,
    });
    setSaving(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    router.back();
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.textPrimary }]}>Ajouter un véhicule</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>🔍 Recherche par plaque</Text>
          <View style={styles.plateRow}>
            <TextInput
              style={[styles.input, styles.plateInput, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
              placeholder="AB-123-CD" placeholderTextColor={c.textMuted}
              autoCapitalize="characters" value={plate} onChangeText={setPlate}
            />
            <TouchableOpacity style={[styles.lookupBtn, plateLoading && styles.btnDisabled]} onPress={handleLookupPlate} disabled={plateLoading}>
              {plateLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.lookupBtnText}>Rechercher</Text>}
            </TouchableOpacity>
          </View>
          {plateFetched && (
            <View style={styles.successBadge}>
              <Text style={styles.successText}>✅ Infos récupérées automatiquement</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>🚗 Informations</Text>
          <Text style={[styles.label, { color: c.textSecondary }]}>Marque *</Text>
          <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]} placeholder="Renault" placeholderTextColor={c.textMuted} value={brand} onChangeText={setBrand} />
          <Text style={[styles.label, { color: c.textSecondary }]}>Modèle *</Text>
          <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]} placeholder="Clio" placeholderTextColor={c.textMuted} value={model} onChangeText={setModel} />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Année</Text>
              <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]} placeholder="2020" placeholderTextColor={c.textMuted} keyboardType="numeric" value={year} onChangeText={setYear} />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Couleur</Text>
              <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]} placeholder="Gris" placeholderTextColor={c.textMuted} value={color} onChangeText={setColor} />
            </View>
          </View>
          <Text style={[styles.label, { color: c.textSecondary }]}>Kilométrage actuel</Text>
          <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]} placeholder="45000" placeholderTextColor={c.textMuted} keyboardType="numeric" value={mileage} onChangeText={setMileage} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>⛽ Carburant</Text>
          <View style={styles.fuelGrid}>
            {FUEL_TYPES.map((f) => (
              <TouchableOpacity key={f} style={[styles.fuelBtn, { backgroundColor: c.card, borderColor: c.cardBorder }, fuelType === f && styles.fuelBtnActive]} onPress={() => setFuelType(f)}>
                <Text style={[styles.fuelBtnText, { color: c.textSecondary }, fuelType === f && styles.fuelBtnTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer le véhicule</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  inner:             { padding: 24, paddingBottom: 48, gap: 24 },
  header:            { gap: 8 },
  backText:          { color: '#3B82F6', fontSize: 15 },
  title:             { fontSize: 26, fontWeight: '700' },
  section:           { gap: 10 },
  sectionTitle:      { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  label:             { fontSize: 13, fontWeight: '500', marginTop: 4 },
  input:             { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  plateRow:          { flexDirection: 'row', gap: 10 },
  plateInput:        { flex: 1, letterSpacing: 2, fontWeight: '700' },
  lookupBtn:         { backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  lookupBtnText:     { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDisabled:       { opacity: 0.5 },
  successBadge:      { backgroundColor: '#0F4C35', borderRadius: 8, padding: 10 },
  successText:       { color: '#34D399', fontSize: 13 },
  row:               { flexDirection: 'row', gap: 12 },
  halfField:         { flex: 1 },
  fuelGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelBtn:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  fuelBtnActive:     { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  fuelBtnText:       { fontSize: 13 },
  fuelBtnTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn:           { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});
