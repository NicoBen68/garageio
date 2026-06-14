import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { fetchVehicleByPlate } from '../../lib/plateApi';
import { useAuthStore } from '../../store/authStore';

const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'];

export default function AddVehicleScreen() {
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
    if (plate.length < 5) {
      Alert.alert('Plaque invalide', 'Saisis une plaque au format AB-123-CD.');
      return;
    }
    setPlateLoading(true);
    setPlateFetched(false);

    const info = await fetchVehicleByPlate(plate);
    setPlateLoading(false);

    if (!info) {
      Alert.alert('Introuvable', 'Véhicule non trouvé. Tu peux remplir les champs manuellement.');
      return;
    }

    setBrand(info.brand);
    setModel(info.model);
    setYear(info.year > 0 ? String(info.year) : '');
    setFuelType(info.fuelType || 'essence');
    setColor(info.color);
    setVin(info.vin);
    setPlateFetched(true);
  };

  const handleSave = async () => {
    if (!plate || !brand || !model) {
      Alert.alert('Champs manquants', 'La plaque, la marque et le modèle sont obligatoires.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('vehicles').insert({
      user_id:         user!.id,
      license_plate:   plate.toUpperCase().replace(/\s/g, '-'),
      brand,
      model,
      year:            year ? parseInt(year) : null,
      fuel_type:       fuelType,
      color,
      vin:             vin || null,
      current_mileage: mileage ? parseInt(mileage) : 0,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ajouter un véhicule</Text>
        </View>

        {/* Plaque */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Recherche par plaque</Text>
          <View style={styles.plateRow}>
            <TextInput
              style={[styles.input, styles.plateInput]}
              placeholder="AB-123-CD"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              value={plate}
              onChangeText={setPlate}
            />
            <TouchableOpacity
              style={[styles.lookupBtn, plateLoading && styles.btnDisabled]}
              onPress={handleLookupPlate}
              disabled={plateLoading}
            >
              {plateLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.lookupBtnText}>Rechercher</Text>
              }
            </TouchableOpacity>
          </View>
          {plateFetched && (
            <View style={styles.successBadge}>
              <Text style={styles.successText}>✅ Infos récupérées automatiquement</Text>
            </View>
          )}
        </View>

        {/* Infos véhicule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Informations</Text>

          <Text style={styles.label}>Marque *</Text>
          <TextInput
            style={styles.input}
            placeholder="Renault"
            placeholderTextColor="#475569"
            value={brand}
            onChangeText={setBrand}
          />

          <Text style={styles.label}>Modèle *</Text>
          <TextInput
            style={styles.input}
            placeholder="Clio"
            placeholderTextColor="#475569"
            value={model}
            onChangeText={setModel}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Année</Text>
              <TextInput
                style={styles.input}
                placeholder="2020"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={year}
                onChangeText={setYear}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Couleur</Text>
              <TextInput
                style={styles.input}
                placeholder="Gris"
                placeholderTextColor="#475569"
                value={color}
                onChangeText={setColor}
              />
            </View>
          </View>

          <Text style={styles.label}>Kilométrage actuel</Text>
          <TextInput
            style={styles.input}
            placeholder="45000"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            value={mileage}
            onChangeText={setMileage}
          />
        </View>

        {/* Carburant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⛽ Carburant</Text>
          <View style={styles.fuelGrid}>
            {FUEL_TYPES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.fuelBtn, fuelType === f && styles.fuelBtnActive]}
                onPress={() => setFuelType(f)}
              >
                <Text style={[styles.fuelBtnText, fuelType === f && styles.fuelBtnTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Enregistrer le véhicule</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0F172A' },
  inner:       { padding: 24, paddingBottom: 48, gap: 24 },
  header:      { gap: 8 },
  backBtn:     { alignSelf: 'flex-start' },
  backText:    { color: '#3B82F6', fontSize: 15 },
  title:       { fontSize: 26, fontWeight: '700', color: '#F8FAFC' },
  section:     { gap: 10 },
  sectionTitle:{ fontSize: 15, fontWeight: '600', color: '#94A3B8', marginBottom: 4 },
  label:       { fontSize: 13, fontWeight: '500', color: '#CBD5E1', marginTop: 4 },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  plateRow:    { flexDirection: 'row', gap: 10 },
  plateInput:  { flex: 1, letterSpacing: 2, fontWeight: '700' },
  lookupBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  lookupBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDisabled:   { opacity: 0.5 },
  successBadge: {
    backgroundColor: '#0F4C35',
    borderRadius: 8,
    padding: 10,
  },
  successText:   { color: '#34D399', fontSize: 13 },
  row:           { flexDirection: 'row', gap: 12 },
  halfField:     { flex: 1 },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  fuelBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  fuelBtnText:       { color: '#94A3B8', fontSize: 13 },
  fuelBtnTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
